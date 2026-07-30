// Model Commands for Tauri
//
// These commands handle LLM model operations:
// - Loading/unloading GGUF models (with real llama.cpp backend)
// - Text generation (streaming and non-streaming)
// - Listing available models
//
// PHASE 9: Real LLM Inference Implementation
// Updated for llama_cpp_rs 0.3.x

use tauri::{AppHandle, Emitter, State};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use crate::model::{
    ModelState, LoadedModel, InferenceSettings, LoadModelResult, ModelConfig, 
    GenerationProgress, ModelInfo,
    load_gguf_model, create_loaded_model, generate_text,
    scan_directory_for_models, get_default_model_dirs,
    extract_model_name, extract_parameters, extract_quantization
};

// ============================================================================
// EVENT CONSTANTS
// ============================================================================

pub const EVENT_GENERATION_TOKEN: &str = "model:generation-token";
pub const EVENT_GENERATION_COMPLETE: &str = "model:generation-complete";
pub const EVENT_GENERATION_ERROR: &str = "model:generation-error";
pub const EVENT_MODEL_STATUS_CHANGED: &str = "model:status-changed";

/// Extended state that holds the actual model + context
struct InferenceState {
    loaded_model: Option<LoadedModel>,
    model_path: Option<String>,
}

impl Default for InferenceState {
    fn default() -> Self {
        Self {
            loaded_model: None,
            model_path: None,
        }
    }
}

// ============================================================================
// TAURI COMMANDS - MODEL LOADING/UNLOADING
// ============================================================================

/// Load a GGUF model into memory with REAL llama.cpp backend
#[tauri::command]
pub async fn load_model(
    model_path: String,
    state: State<'_, Mutex<ModelState>>,
    app: AppHandle,
) -> Result<LoadModelResult, String> {
    log::info!(target: "command", "load_model called: {}", model_path);
    
    // Step 1: Validate and prepare the model
    let result = load_gguf_model(&model_path)?;
    
    if !result.success {
        return Ok(result);
    }
    
    // Step 2: Actually create the loaded model with context
    let model_info = result.model_info.as_ref().unwrap();
    
    match create_loaded_model(&model_path, model_info.context_length) {
        Ok(loaded_model) => {
            // Step 3: Update state with the real model
            let mut state = state.lock().map_err(|e| e.to_string())?;
            
            state.loaded_model = Some(loaded_model);
            state.model_path = Some(model_path.clone());
            
            drop(state);
            
            // Emit status change event
            let _ = app.emit(EVENT_MODEL_STATUS_CHANGED, serde_json::json!({
                "loaded": true,
                "model": result.model_info
            }));
            
            log::info!(target: "command", "Model loaded successfully: {}", model_info.name);
            Ok(result)
        }
        Err(e) => {
            log::error!(target: "command", "Failed to create model instance: {}", e);
            Ok(LoadModelResult {
                success: false,
                message: format!("Model validation passed but failed to initialize: {}", e),
                model_info: None,
            })
        }
    }
}

/// Unload current model from memory
#[tauri::command]
pub async fn unload_model(
    state: State<'_, Mutex<ModelState>>,
    app: AppHandle,
) -> Result<(), String> {
    log::info!(target: "command", "unload_model called");
    
    let mut state = state.lock().map_err(|e| e.to_string())?;
    
    // Drop the model (this frees the llama.cpp resources)
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
            quantization: extract_quantization(&model.path),
        })),
        None => Ok(None),
    }
}

// ============================================================================
// TAURI COMMANDS - TEXT GENERATION
// ============================================================================

/// Generate completion from the model (non-streaming, returns full response)
#[tauri::command]
pub async fn generate(
    prompt: String,
    settings: Option<InferenceSettings>,
    state: State<'_, Mutex<ModelState>>,
) -> Result<String, String> {
    log::info!(target: "command", "generate called (non-streaming), prompt length: {}", prompt.len());
    
    // Clone what we need from state
    let (model_clone, context_len) = {
        let state = state.lock().map_err(|e| e.to_string())?;
        
        match &state.loaded_model {
            Some(m) if m.is_real() => (true, m.context_length),
            Some(_) => (false, m.context_length),
            None => return Err("No model loaded. Please load a model first.".to_string()),
        }
    };
    
    let settings = settings.unwrap_or_default();
    let model_path = {
        let state = state.lock().map_err(|e| e.to_string())?;
        state.model_path.clone().ok_or("No model path")?
    };
    
    // Run generation in blocking thread (CPU-intensive work)
    tokio::task::spawn_blocking(move || {
        // Create fresh model for this generation
        let loaded = create_loaded_model(&model_path, context_len)?;
        
        generate_text(
            &prompt,
            &settings,
            &loaded,
            |_progress| {}, // Ignore progress in non-streaming mode
        )
    }).await.map_err(|e| format!("Generation task failed: {}", e))?
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
    
    // Check model is loaded and is real
    let (context_len, model_path) = {
        let state = state.lock().map_err(|e| e.to_string())?;
        
        match &state.loaded_model {
            Some(m) if m.is_real() => (m.context_length, state.model_path.clone().ok_or("No model path")?),
            Some(_) => return Err("Model is not properly initialized. Try reloading.".to_string()),
            None => return Err("No model loaded. Please load a model first.".to_string()),
        }
    };
    
    let settings = settings.unwrap_or_default();
    let app_clone = app.clone();
    
    // Run streaming generation in blocking thread
    let result = tokio::task::spawn_blocking(move || -> Result<String, String> {
        // Create fresh model context for this generation thread
        let loaded = create_loaded_model(&model_path, context_len)?;
        
        generate_text(
            &prompt,
            &settings,
            &loaded,
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
        )
    }).await;
    
    match result {
        Ok(inner_result) => inner_result,
        Err(e) => {
            log::error!(target: "command", "Streaming task failed: {}", e);
            let _ = app.emit(EVENT_GENERATION_ERROR, serde_json::json!({
                "message": format!("Task failed: {}", e)
            }));
            Err(format!("Generation failed: {}", e))
        }
    }
}

/// Stop current generation (cancellation)
#[tauri::command]
pub async fn stop_generation(
    _state: State<'_, Mutex<ModelState>>,
) -> Result<(), String> {
    log::info!(target: "command", "stop_generation called");
    
    // TODO: Implement cancellation via shared AtomicBool or similar
    // For now, this is a placeholder
    
    Ok(())
}

// ============================================================================
// TAURI COMMANDS - MODEL MANAGEMENT
// ============================================================================

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

/// List models in specific directory
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

/// Ensure model directory exists
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

/// Validate a GGUF model file
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
    
    // Try to validate GGUF header using llama.cpp
    let is_valid_gguf = validate_gguf_with_llama(&file_path);
    
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
            parameters: extract_parameters(&filename).unwrap_or_else(|| "Unknown".to_string()),
            context_length: 4096,
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

/// Validate GGUF file using llama.cpp's own validation
fn validate_gguf_with_llama(path: &std::path::Path) -> bool {
    use llama_cpp_rs::params::ModelParams;
    
    let params = ModelParams::default();
    match llama_cpp_rs::model::LlamaModel::load_from_file(path, &params) {
        Ok(_) => true,
        Err(e) => {
            log::debug!(target: "validation", "GGUF validation failed: {}", e);
            false
        }
    }
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
    
    // Detect GPU information
    let gpu_info = detect_gpu_info();
    
    Ok(InferenceSystemInfo {
        totalMemoryGb: total_memory_gb,
        availableMemoryGb: available_memory_gb,
        cpuCores: cpu_cores,
        cpuName: sys.cpus()
            .first()
            .map(|c| c.brand().to_string())
            .unwrap_or_else(|| "Unknown".to_string()),
        recommendedMaxParameters: calculate_recommended_max_params(available_memory_gb),
        canRun7b: available_memory_gb > 6.0 || (gpu_info.available && gpu_info.vramGb > 6.0),
        canRun13b: available_memory_gb > 12.0 || (gpu_info.available && gpu_info.vramGb > 12.0),
        canRun34b: available_memory_gb > 24.0 || (gpu_info.available && gpu_info.vramGb > 24.0),
        canRun70b: available_memory_gb > 48.0 || (gpu_info.available && gpu_info.vramGb > 48.0),
        // New GPU fields
        gpu: Some(gpu_info),
    })
}

/// Get detailed GPU information
#[tauri::command]
pub async fn get_gpu_info() -> Result<GpuInfo, String> {
    Ok(detect_gpu_info())
}

/// Detect GPU information from the system
fn detect_gpu_info() -> GpuInfo {
    // Method 1: Check for CUDA (NVIDIA)
    #[cfg(feature = "cuda")]
    {
        return GpuInfo {
            available: true,
            name: "CUDA GPU".to_string(),
            vendor: "NVIDIA".to_string(),
            vramGb: estimate_cuda_vram(),
            driverVersion: get_cuda_version(),
            computeCapability: None,
            supportedBackends: vec!["CUDA".to_string()],
            recommendedLayers: Some(35),
        };
    }
    
    // Method 2: Check environment variables and common paths
    if std::env::var("CUDA_PATH").is_ok() || std::env::var("CUDA_HOME").is_ok() {
        return GpuInfo {
            available: true,
            name: "NVIDIA GPU (detected via CUDA)".to_string(),
            vendor: "NVIDIA".to_string(),
            vramGb: estimate_nvidia_vram_from_env(),
            driverVersion: std::env::var("CUDA_VERSION").ok(),
            computeCapability: None,
            supportedBackends: vec!["CUDA".to_string()],
            recommendedLayers: Some(30),
        };
    }
    
    // Method 3: Check for Metal (macOS)
    #[cfg(target_os = "macos")]
    {
        if std::path::Path::new("/System/Library/Frameworks/Metal.framework").exists() {
            return GpuInfo {
                available: true,
                name: "Apple GPU (Metal)".to_string(),
                vendor: "Apple".to_string(),
                vramGb: get_metal_shared_memory(),
                driverVersion: Some("Metal".to_string()),
                computeCapability: None,
                supportedBackends: vec!["Metal".to_string()],
                recommendedLayers: Some(25),
            };
        }
    }
    
    // Method 4: Check for Vulkan / other GPUs
    if is_vulkan_available() {
        return GpuInfo {
            available: true,
            name: "Vulkan-compatible GPU".to_string(),
            vendor: "Unknown".to_string(),
            vramGb: 0.0,
            driverVersion: None,
            computeCapability: None,
            supportedBackends: vec!["Vulkan".to_string()],
            recommendedLayers: None,
        };
    }
    
    // Default: No GPU detected
    GpuInfo {
        available: false,
        name: String::new(),
        vendor: String::new(),
        vramGb: 0.0,
        driverVersion: None,
        computeCapability: None,
        supportedBackends: vec![],
        recommendedLayers: None,
    }
}

/// Estimate NVIDIA VRAM from environment or common values
fn estimate_nvidia_vram_from_env() -> f64 {
    if let Ok(output) = std::process::Command::new("nvidia-smi")
        .args(["--query-gpu=memory.total", "--format=csv,noheader,nounits"])
        .output() 
    {
        if let Ok(vram_str) = String::from_utf8(output.stdout) {
            if let Ok(vram_mb) = vram_str.trim().parse::<f64>() {
                return vram_mb / 1024.0;
            }
        }
    }
    
    8.0 // Default assumption
}

#[cfg(target_os = "macos")]
fn get_metal_shared_memory() -> f64 {
    let sys = sysinfo::System::new_with_specifics(
        sysinfo::RefreshKind::new().with_memory(sysinfo::MemoryRefreshKind::new())
    );
    sys.refresh_memory();
    sys.total_memory() as f64 * 0.75 / (1024.0 * 1024.0 * 1024.0)
}

fn is_vulkan_available() -> bool {
    cfg!(target_os = "linux") && std::path::Path::new("/usr/lib/libvulkan.so.1").exists()
        || std::path::Path::new("/usr/local/lib/libvulkan.so.1").exists()
}

/// System info for inference capabilities
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InferenceSystemInfo {
    pub totalMemoryGb: f64,
    pub availableMemoryGb: f64,
    pub cpuCores: usize,
    pub cpuName: String,
    pub recommendedMaxParameters: String,
    pub canRun7b: bool,
    pub canRun13b: bool,
    pub canRun34b: bool,
    pub canRun70b: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gpu: Option<GpuInfo>,
}

/// GPU Information structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GpuInfo {
    pub available: bool,
    pub name: String,
    pub vendor: String,
    pub vramGb: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub driverVersion: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub computeCapability: Option<String>,
    pub supportedBackends: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recommendedLayers: Option<u32>,
}

/// Calculate recommended max model parameters based on available RAM
fn calculate_recommended_max_params(available_ram_gb: f64) -> String {
    let usable_ram = available_ram_gb - 2.0;
    
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
