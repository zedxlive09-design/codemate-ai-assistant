// Model Commands for Tauri
//
// These commands handle LLM model operations:
// - Loading/unloading GGUF models (with real validation)
// - Text generation with streaming via Tauri events
// - Listing available models from disk
// - Model information and status

use tauri::{AppHandle, State, Emitter};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use crate::model::{
    ModelState, LoadedModel, InferenceSettings, LoadModelResult, 
    ModelConfig, GenerationProgress, ModelInfo,
    load_gguf_model, generate_text_async, 
    scan_directory_for_models, get_default_model_dirs,
    extract_model_name, extract_parameters, extract_quantization
};

// ============================================================================
// EVENT CONSTANTS
// ============================================================================

/// Event name for streaming token updates
pub const EVENT_GENERATION_TOKEN: &str = "model:generation-token";
/// Event name for generation complete
pub const EVENT_GENERATION_COMPLETE: &str = "model:generation-complete";
/// Event name for generation error
pub const EVENT_GENERATION_ERROR: &str = "model:generation-error";
/// Event name for model loaded/unloaded
pub const EVENT_MODEL_STATUS_CHANGED: &str = "model:status-changed";

// ============================================================================
// TAURI COMMANDS
// ============================================================================

/// Load a GGUF model into memory with full validation
#[tauri::command]
pub async fn load_model(
    model_path: String,
    state: State<'_, Mutex<ModelState>>,
    app: AppHandle,
) -> Result<LoadModelResult, String> {
    log::info!(target: "command", "load_model called: {}", model_path);
    
    // Run the actual model loading (validates file, checks memory, etc.)
    let result = load_gguf_model(&model_path)?;
    
    if result.success {
        // Update state on success
        let mut state = state.lock().map_err(|e| e.to_string())?;
        
        let model_info = result.model_info.clone().unwrap_or_else(|| ModelInfo {
            name: extract_model_name(&model_path),
            parameters: extract_parameters(&model_path),
            context_length: 4096,
            size_bytes: 0,
            quantization: extract_quantization(&model_path),
        });
        
        state.loaded_model = Some(LoadedModel::new(
            model_info.name.clone(),
            model_path.clone(),
            model_info.parameters.clone(),
            model_info.context_length,
        ));
        state.model_path = Some(model_path);
        
        // Emit status change event
        let _ = app.emit(EVENT_MODEL_STATUS_CHANGED, serde_json::json!({
            "loaded": true,
            "model": model_info
        }));
        
        drop(state); // Release lock before logging
        log::info!(target: "command", "Model loaded successfully: {}", model_info.name);
    } else {
        log::warn!(target: "command", "Model loading failed: {}", result.message);
    }
    
    Ok(result)
}

/// Unload current model from memory
#[tauri::command]
pub async fn unload_model(
    state: State<'_, Mutex<ModelState>>,
    app: AppHandle,
) -> Result<(), String> {
    log::info!(target: "command", "unload_model called");
    
    let mut state = state.lock().map_err(|e| e.to_string())?;
    
    state.loaded_model = None;
    state.model_path = None;
    
    // Emit status change event
    let _ = app.emit(EVENT_MODEL_STATUS_CHANGED, serde_json::json!({
        "loaded": false,
        "model": null::<serde_json::Value>
    }));
    
    log::info!(target: "command", "Model unloaded");
    
    Ok(())
}

/// Check if a model is currently loaded
#[tauri::command]
pub async fn is_model_loaded(
    state: State<'_, Mutex<ModelState>>,
) -> Result<bool, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    Ok(state.loaded_model.is_some())
}

/// Get info about the currently loaded model
#[tauri::command]
pub async fn get_loaded_model_info(
    state: State<'_, Mutex<ModelState>>,
) -> Result<Option<ModelInfo>, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    
    match &state.loaded_model {
        Some(model) => Ok(Some(ModelInfo {
            name: model.name.clone(),
            parameters: model.parameters.clone(),
            context_length: model.context_length,
            size_bytes: 0, // Would need to re-stat the file
            quantization: String::new(), // Would need to parse filename again
        })),
        None => Ok(None),
    }
}

/// Generate completion from the model (non-streaming, returns full response)
#[tauri::command]
pub async fn generate(
    prompt: String,
    settings: Option<InferenceSettings>,
    state: State<'_, Mutex<ModelState>>,
) -> Result<String, String> {
    log::info!(target: "command", "generate called (non-streaming), prompt length: {}", prompt.len());
    
    let state = state.lock().map_err(|e| e.to_string())?;
    
    if state.loaded_model.is_none() {
        return Err("No model loaded. Please load a model first.".to_string());
    }
    
    let settings = settings.unwrap_or_default();
    let model_path = state.model_path.clone().unwrap_or_default();
    
    drop(state); // Release lock before long operation
    
    // Generate without streaming callback
    generate_text_async(
        prompt,
        settings,
        model_path,
        |_progress| {}, // Ignore progress in non-streaming mode
    ).await
}

/// Generate with streaming - emits tokens via Tauri events
/// 
/// Frontend should listen for:
/// - `model:generation-token` - Each token as it's generated
/// - `model:generation-complete` - When generation is done
/// - `model:generation-error` - If an error occurs
#[tauri::command]
pub async fn generate_streaming(
    prompt: String,
    settings: Option<InferenceSettings>,
    state: State<'_, Mutex<ModelState>>,
    app: AppHandle,
) -> Result<String, String> {
    log::info!(target: "command", "generate_streaming called, prompt length: {}", prompt.len());
    
    // Check model is loaded
    {
        let state = state.lock().map_err(|e| e.to_string())?;
        if state.loaded_model.is_none() {
            return Err("No model loaded. Please load a model first.".to_string());
        }
    }
    
    let settings = settings.unwrap_or_default();
    
    // Get model path (clone to avoid holding lock)
    let model_path = {
        let state = state.lock().map_err(|e| e.to_string())?;
        state.model_path.clone().ok_or("No model path available")?
    };
    
    // Clone app handle for use in closure
    let app_clone = app.clone();
    
    // Run streaming generation
    let result = generate_text_async(
        prompt,
        settings,
        model_path.clone(),
        move |progress| {
            if progress.is_error {
                let _ = app_clone.emit(EVENT_GENERATION_ERROR, serde_json::json!({
                    "message": progress.error_message.unwrap_or("Unknown error")
                }));
            } else if progress.is_complete {
                let _ = app_clone.emit(EVENT_GENERATION_COMPLETE, serde_json::json!({
                    "text": progress.text,
                    "tokensGenerated": progress.tokens_generated,
                    "tokensPerSecond": progress.tokens_per_second
                }));
            } else {
                // Token update
                let _ = app_clone.emit(EVENT_GENERATION_TOKEN, serde_json::json!({
                    "token": progress.token,
                    "text": progress.text,
                    "tokensGenerated": progress.tokens_generated,
                    "tokensPerSecond": progress.tokens_per_second
                }));
            }
        },
    ).await;
    
    match &result {
        Ok(text) => {
            log::info!(target: "command", "Streaming generation complete, {} chars", text.len());
        }
        Err(e) => {
            log::error!(target: "command", "Streaming generation failed: {}", e);
            let _ = app.emit(EVENT_GENERATION_ERROR, serde_json::json!({
                "message": e
            }));
        }
    }
    
    result
}

/// Stop current generation (cancellation)
#[tauri::command]
pub async fn stop_generation(
    state: State<'_, Mutex<ModelState>>,
) -> Result<(), String> {
    log::info!(target: "command", "stop_generation called");
    
    // TODO: Implement cancellation flag that generation loop checks
    // For now, this is a placeholder
    
    Ok(())
}

/// List available models from default directories
#[tauri::command]
pub async fn list_models() -> Result<Vec<ModelConfig>, String> {
    log::info!(target: "command", "list_models called");
    
    let mut all_models = Vec::new();
    let mut seen_paths = std::collections::HashSet::new();
    
    let dirs = get_default_model_dirs();
    
    for dir in &dirs {
        log::debug!(target: "command", "Scanning directory: {:?}", dir);
        
        match scan_directory_for_models(dir) {
            Ok(models) => {
                for model in models {
                    // Avoid duplicates (same file might be in multiple search paths)
                    if seen_paths.insert(model.path.clone()) {
                        all_models.push(model);
                    }
                }
            }
            Err(e) => {
                log::warn!(target: "command", "Failed to scan {:?}: {}", dir, e);
            }
        }
    }
    
    log::info!(target: "command", "Found {} models", all_models.len());
    
    Ok(all_models)
}

/// List models from a specific directory
#[tauri::command]
pub async fn list_models_in_directory(dir: String) -> Result<Vec<ModelConfig>, String> {
    log::info!(target: "command", "list_models_in_directory called: {}", dir);
    
    let path = std::path::PathBuf::from(dir);
    scan_directory_for_models(&path)
}

/// Get default model directories
#[tauri::command]
pub async fn get_model_directories() -> Result<Vec<String>, String> {
    let dirs = get_default_model_dirs();
    Ok(dirs.iter()
        .filter_map(|p| p.to_str().map(String::from))
        .collect())
}

/// Create models directory if it doesn't exist
#[tauri::command]
pub async fn ensure_model_directory() -> Result<String, String> {
    let model_dir = get_default_model_dirs()
        .into_iter()
        .next()
        .ok_or("Cannot determine model directory")?;
    
    if !model_dir.exists() {
        std::fs::create_dir_all(&model_dir)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
        log::info!(target: "command", "Created model directory: {:?}", model_dir);
    }
    
    Ok(model_dir.to_string_lossy().to_string())
}

/// Validate a model file without loading it
#[tauri::command]
pub async fn validate_model_file(path: String) -> Result<ModelValidationResult, String> {
    log::info!(target: "command", "validate_model_file called: {}", path);
    
    let file_path = std::path::PathBuf::from(&path);
    
    // Check existence
    if !file_path.exists() {
        return Ok(ModelValidationResult {
            valid: false,
            error: Some("File does not exist".to_string()),
            model_info: None,
        });
    }
    
    // Check it's a file
    if !file_path.is_file() {
        return Ok(ModelValidationResult {
            valid: false,
            error: Some("Path is not a file".to_string()),
            model_info: None,
        });
    }
    
    // Check extension
    let extension = file_path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    if extension != "gguf" {
        return Ok(ModelValidationResult {
            valid: false,
            error: Some(format!("Invalid extension: .{} (expected .gguf)", extension)),
            model_info: None,
        });
    }
    
    // Get file metadata
    let metadata = std::fs::metadata(&file_path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;
    
    let filename = file_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    // Try to validate GGUF header (basic check)
    let is_valid_gguf = validate_gguf_header(&file_path)?;
    
    if !is_valid_gguf {
        return Ok(ModelValidationResult {
            valid: false,
            error: Some("Invalid GGUF file format".to_string()),
            model_info: None,
        });
    }
    
    // Return model info
    Ok(ModelValidationResult {
        valid: true,
        error: None,
        model_info: Some(ModelInfo {
            name: extract_model_name(&filename),
            parameters: extract_parameters(&filename),
            context_length: 4096, // Default, would need to read from GGUF
            size_bytes: metadata.len(),
            quantization: extract_quantization(&filename),
        }),
    })
}

/// Result of model validation
#[derive(Debug, Serialize, Deserialize)]
pub struct ModelValidationResult {
    pub valid: bool,
    pub error: Option<String>,
    pub model_info: Option<ModelInfo>,
}

/// Basic GGUF header validation
fn validate_gguf_header(path: &std::path::Path) -> Result<bool, String> {
    use std::io::Read;
    
    let mut file = std::fs::File::open(path)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    
    // GGUF magic number: "GGUF" (0x46554747 in little-endian)
    let mut buffer = [0u8; 4];
    file.read_exact(&mut buffer)
        .map_err(|e| format!("Failed to read header: {}", e))?;
    
    // Check for GGUF magic
    let is_gguf = &buffer == b"GGUF";
    
    Ok(is_gguf)
}

/// Get system information relevant for model inference
#[tauri::command]
pub async fn get_inference_system_info() -> Result<InferenceSystemInfo, String> {
    let mut sys = sysinfo::System::new_with_specifics(
        sysinfo::RefreshKind::new()
            .with_memory(sysinfo::MemoryRefreshKind::new())
            .with_cpu(sysinfo::CpuRefreshKind::new())
    );
    sys.refresh_memory();
    sys.refresh_cpu();
    
    let total_memory_gb = sys.total_memory() as f64 / (1024.0 * 1024.0 * 1024.0);
    let available_memory_gb = sys.available_memory() as f64 / (1024.0 * 1024.0 * 1024.0);
    let cpu_cores = num_cpus::get();
    
    Ok(InferenceSystemInfo {
        total_memory_gb,
        available_memory_gb,
        cpu_cores,
        cpu_name: sys.cpus()
            .first()
            .map(|c| c.brand().to_string())
            .unwrap_or_else(|| "Unknown".to_string()),
        recommended_max_parameters: calculate_recommended_max_params(available_memory_gb),
        can_run_7b: available_memory_gb > 6.0,
        can_run_13b: available_memory_gb > 12.0,
        can_run_34b: available_memory_gb > 24.0,
        can_run_70b: available_memory_gb > 48.0,
    })
}

/// System info for inference capabilities
#[derive(Debug, Serialize, Deserialize)]
pub struct InferenceSystemInfo {
    pub total_memory_gb: f64,
    pub available_memory_gb: f64,
    pub cpu_cores: usize,
    pub cpu_name: String,
    pub recommended_max_parameters: String,
    pub can_run_7b: bool,
    pub can_run_13b: bool,
    pub can_run_34b: bool,
    pub can_run_70b: bool,
}

/// Calculate recommended max model parameters based on available RAM
fn calculate_recommended_max_params(available_ram_gb: f64) -> String {
    // Rough estimates for Q4_K_M quantization:
    // - 7B ~ 4.5 GB
    // - 13B ~ 8 GB  
    // - 34B ~ 20 GB
    // - 70B ~ 42 GB
    // Need extra RAM for context (~2-4 GB)
    
    let usable_ram = available_ram_gb - 2.0; // Reserve for OS/context
    
    if usable_ram >= 40.0 {
        "70B+ (Q4)".to_string()
    } else if usable_ram >= 18.0 {
        "34B (Q4)".to_string()
    } else if usable_ram >= 8.0 {
        "13B (Q4)".to_string()
    } else if usable_ram >= 4.5 {
        "7B (Q4)".to_string()
    } else if usable_ram >= 2.5 {
        "3B (Q4)".to_string()
    } else {
        "1-2B only".to_string()
    }
}
