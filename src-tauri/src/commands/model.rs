// Model Commands for Tauri
//
// These commands handle LLM model operations via Ollama:
// - Loading/selecting models
// - Text generation (streaming and non-streaming)
// - Listing available models from Ollama
//
// PHASE 9+: Ollama Backend Implementation

use tauri::{AppHandle, Emitter, State};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use crate::model::{
    ModelState, LoadedModel, InferenceSettings, LoadModelResult, ModelConfig, 
    GenerationProgress, ModelInfo,
    load_gguf_model, create_loaded_model,
    generate_text_async, generate_text_streaming,
    scan_directory_for_models, get_default_model_dirs,
    check_ollama_status, pull_model,
    extract_model_name, extract_parameters, extract_quantization
};

// ============================================================================
// EVENT CONSTANTS
// ============================================================================

pub const EVENT_GENERATION_TOKEN: &str = "model:generation-token";
pub const EVENT_GENERATION_COMPLETE: &str = "model:generation-complete";
pub const EVENT_GENERATION_ERROR: &str = "model:generation-error";
pub const EVENT_MODEL_STATUS_CHANGED: &str = "model:status-changed";

// ============================================================================
// TAURI COMMANDS - MODEL LOADING/UNLOADING
// ============================================================================

/// Load a model (select it for use with Ollama)
#[tauri::command]
pub async fn load_model(
    model_path: String,
    state: State<'_, Mutex<ModelState>>,
    app: AppHandle,
) -> Result<LoadModelResult, String> {
    log::info!(target: "command", "load_model called: {}", model_path);
    
    // Validate the model exists in Ollama
    let result = load_gguf_model(&model_path)?;
    
    if !result.success {
        return Ok(result);
    }
    
    // Create loaded model instance
    let model_info = result.model_info.as_ref().unwrap();
    
    match create_loaded_model(&model_path, model_info.context_length) {
        Ok(loaded_model) => {
            let mut state = state.lock().map_err(|e| e.to_string())?;
            
            state.loaded_model = Some(loaded_model);
            state.model_path = Some(model_path.clone());
            
            drop(state);
            
            // Emit status change event
            let _ = app.emit(EVENT_MODEL_STATUS_CHANGED, serde_json::json!({
                "loaded": true,
                "model": result.model_info
            }));
            
            log::info!(target: "command", "Model selected successfully: {}", model_info.name);
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

/// Unload current model
#[tauri::command]
pub async fn unload_model(
    state: State<'_, Mutex<ModelState>>,
    app: AppHandle,
) -> Result<(), String> {
    log::info!(target: "command", "unload_model called");
    
    let mut state = state.lock().map_err(|e| e.to_string())?;
    
    state.loaded_model = None;
    state.model_path = None;
    
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
            size_bytes: 0,
            quantization: extract_quantization(&model.path),
        })),
        None => Ok(None),
    }
}

// ============================================================================
// TAURI COMMANDS - TEXT GENERATION
// ============================================================================

/// Generate completion (non-streaming)
#[tauri::command]
pub async fn generate(
    prompt: String,
    settings: Option<InferenceSettings>,
    state: State<'_, Mutex<ModelState>>,
) -> Result<String, String> {
    log::info!(target: "command", "generate called (non-streaming), prompt length: {}", prompt.len());
    
    let model = {
        let state = state.lock().map_err(|e| e.to_string())?;
        
        match &state.loaded_model {
            Some(m) if m.is_real() => m.clone(),
            Some(_) => return Err("Model is not properly initialized. Try reloading.".to_string()),
            None => return Err("No model loaded. Please load a model first.".to_string()),
        }
    };
    
    let settings = settings.unwrap_or_default();
    
    generate_text_async(&prompt, &settings, &model).await
}

/// Generate with streaming - emits tokens via Tauri events
#[tauri::command]
pub async fn generate_streaming(
    prompt: String,
    settings: Option<InferenceSettings>,
    state: State<'_, Mutex<ModelState>>,
    app: AppHandle,
) -> Result<String, String> {
    log::info!(target: "command", "generate_streaming called, prompt length: {}", prompt.len());
    
    let model = {
        let state = state.lock().map_err(|e| e.to_string())?;
        
        match &state.loaded_model {
            Some(m) if m.is_real() => m.clone(),
            Some(_) => return Err("Model is not properly initialized. Try reloading.".to_string()),
            None => return Err("No model loaded. Please load a model first.".to_string()),
        }
    };
    
    let settings = settings.unwrap_or_default();
    let app_clone = app.clone();
    
    generate_text_streaming(&prompt, &settings, &model, move |progress| {
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
            let _ = app_clone.emit(EVENT_GENERATION_TOKEN, serde_json::json!({
                "token": progress.token,
                "text": progress.text,
                "tokensGenerated": progress.tokens_generated,
                "tokensPerSecond": progress.tokens_per_second
            }));
        }
    }).await
}

/// Stop current generation (cancellation)
#[tauri::command]
pub async fn stop_generation(
    _state: State<'_, Mutex<ModelState>>,
) -> Result<(), String> {
    log::info!(target: "command", "stop_generation called");
    
    // Note: Ollama doesn't support cancellation mid-stream easily
    // The frontend should just ignore further tokens
    
    Ok(())
}

// ============================================================================
// TAURI COMMANDS - MODEL MANAGEMENT
// ============================================================================

/// List available models from Ollama
#[tauri::command]
pub async fn list_models() -> Result<Vec<ModelConfig>, String> {
    log::info!(target: "command", "list_models called");
    
    let mut all_models = Vec::new();
    let mut seen_paths = std::collections::HashSet::new();
    
    // Get models from Ollama
    match scan_directory_for_models(std::path::Path::new("")) {
        Ok(models) => {
            for model in models {
                if seen_paths.insert(model.path.clone()) {
                    all_models.push(model);
                }
            }
        }
        Err(e) => {
            log::warn!(target: "command", "Failed to list models: {}", e);
        }
    }
    
    log::info!(target: "command", "Found {} models", all_models.len());
    
    Ok(all_models)
}

/// List models in specific directory (legacy, now uses Ollama)
#[tauri::command]
pub async fn list_models_in_directory(_dir: String) -> Result<Vec<ModelConfig>, String> {
    list_models().await
}

/// Get default model directories
#[tauri::command]
pub async fn get_model_directories() -> Result<Vec<String>, String> {
    let dirs = get_default_model_dirs();
    Ok(dirs.iter()
        .filter_map(|p| p.to_str().map(String::from))
        .collect())
}

/// Ensure model directory exists (no-op for Ollama)
#[tauri::command]
pub async fn ensure_model_directory() -> Result<String, String> {
    Ok("Ollama manages its own model storage".to_string())
}

/// Validate a model file/check if model exists in Ollama
#[tauri::command]
pub async fn validate_model_file(path: String) -> Result<ModelValidationResult, String> {
    log::info!(target: "command", "validate_model_file called: {}", path);
    
    // Check if this is an Ollama model name or file path
    if path.contains('/') || path.contains('\\') || path.ends_with(".gguf") {
        // It's a file path
        let file_path = std::path::PathBuf::from(&path);
        
        if !file_path.exists() {
            return Ok(ModelValidationResult {
                valid: false,
                error: Some("File does not exist".to_string()),
                model_info: None,
            });
        }
        
        return Ok(ModelValidationResult {
            valid: true,
            error: None,
            model_info: Some(ModelInfo {
                name: extract_model_name(&path),
                parameters: extract_parameters(&path).unwrap_or_else(|| "Unknown".to_string()),
                context_length: 4096,
                size_bytes: std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0),
                quantization: extract_quantization(&path),
            }),
        });
    }
    
    // Treat as Ollama model name
    match load_gguf_model(&path) {
        Ok(result) => Ok(ModelValidationResult {
            valid: result.success,
            error: if result.success { None } else { Some(result.message) },
            model_info: result.model_info,
        }),
        Err(e) => Ok(ModelValidationResult {
            valid: false,
            error: Some(e),
            model_info: None,
        }),
    }
}

/// Result of model validation
#[derive(Debug, Serialize, Deserialize)]
pub struct ModelValidationResult {
    pub valid: bool,
    pub error: Option<String>,
    pub model_info: Option<ModelInfo>,
}

/// Check if Ollama is available
#[tauri::command]
pub async fn check_ollama_available() -> Result<OllamaStatus, String> {
    match check_ollama_status() {
        Ok(()) => {
            // Get version info
            let rt = tokio::runtime::Runtime::new().unwrap();
            let version = rt.block_on(async {
                let client = reqwest::Client::new();
                match client.get(format!("{}/api/version", crate::model::OLLAMA_BASE_URL)).send().await {
                    Ok(resp) => resp.json::<serde_json::Value>().await.ok(),
                    Err(_) => None,
                }
            });
            
            Ok(OllamaStatus {
                available: true,
                version: version.and_then(|v| v.get("version").and_then(|v| v.as_str())).map(String::from),
                error: None,
            })
        }
        Err(e) => Ok(OllamaStatus {
            available: false,
            version: None,
            error: Some(e),
        })
    }
}

/// Ollama status information
#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaStatus {
    pub available: bool,
    pub version: Option<String>,
    pub error: Option<String>,
}

/// Pull a model from Ollama registry
#[tauri::command]
pub async fn pull_ollama_model(
    model_name: String,
    app: AppHandle,
) -> Result<(), String> {
    log::info!(target: "command", "pull_ollama_model called: {}", model_name);
    
    let app_clone = app.clone();
    
    pull_model(&model_name, move |status| {
        let _ = app_clone.emit("model:pull-progress", serde_json::json!({
            "status": status
        }));
    }).await
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
    
    // Check Ollama status
    let ollama_available = check_ollama_status().is_ok();
    
    Ok(InferenceSystemInfo {
        totalMemoryGb: total_memory_gb,
        availableMemoryGb: available_memory_gb,
        cpuCores: cpu_cores,
        cpuName: sys.cpus()
            .first()
            .map(|c| c.brand().to_string())
            .unwrap_or_else(|| "Unknown".to_string()),
        recommendedMaxParameters: calculate_recommended_max_params(available_memory_gb),
        canRun7b: available_memory_gb > 6.0,
        canRun13b: available_memory_gb > 12.0,
        canRun34b: available_memory_gb > 24.0,
        canRun70b: available_memory_gb > 48.0,
        ollamaAvailable: ollama_available,
        backend: if ollama_available { "Ollama".to_string() } else { "None".to_string() },
    })
}

/// Get detailed GPU info (via Ollama's detection)
#[tauri::command]
pub async fn get_gpu_info() -> Result<GpuInfo, String> {
    // Try to get GPU info from Ollama
    let rt = tokio::runtime::Runtime::new().unwrap();
    
    rt.block_on(async {
        let client = reqwest::Client::new();
        match client.get(format!("{}/api/gpu", crate::model::OLLAMA_BASE_URL)).send().await {
            Ok(resp) if resp.status().is_success() => {
                match resp.json::<serde_json::Value>().await {
                    Ok(info) => {
                        // Parse Ollama GPU info
                        Ok(GpuInfo {
                            available: true,
                            name: info.get("name").and_then(|v| v.as_str()).unwrap_or("GPU").to_string(),
                            vendor: info.get("vendor").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string(),
                            vramGb: info.get("vram").and_then(|v| v.as_f64()).unwrap_or(0.0),
                            driverVersion: info.get("driver_version").and_then(|v| v.as_str()).map(String::from),
                            computeCapability: None,
                            supportedBackends: vec!["CUDA".to_string(), "Vulkan".to_string()],
                            recommendedLayers: info.get("recommended_layers").and_then(|v| v.as_u64()).map(|l| l as u32),
                        })
                    }
                    Err(_) => Ok(default_gpu_info())
                }
            }
            _ => Ok(default_gpu_info())
        }
    })
}

fn default_gpu_info() -> GpuInfo {
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
    #[serde(rename = "ollamaAvailable")]
    pub ollama_available: bool,
    pub backend: String,
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
