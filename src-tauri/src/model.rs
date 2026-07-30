// Model Management Module
//
// Handles loading, unloading, and inference with LLM models.
// Uses Ollama as the backend for local LLM inference.
// Ollama handles all the complex llama.cpp compilation and GPU support.
//
// PHASE 9+: Ollama Backend Implementation

use std::sync::Mutex;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use futures_util::StreamExt;

/// Default Ollama API endpoint
pub const OLLAMA_BASE_URL: &str = "http://localhost:11434";

/// Main model state holder - stored in Tauri managed state
#[derive(Default)]
pub struct ModelState {
    pub loaded_model: Option<LoadedModel>,
    pub model_path: Option<String>,
}

/// Represents a loaded/selected LLM model
pub struct LoadedModel {
    pub name: String,
    pub path: String,  // Model name for Ollama (e.g., "llama3.2:latest")
    pub parameters: String,
    pub context_length: u32,
    /// Whether this model is ready for use
    is_ready: bool,
}

impl LoadedModel {
    pub fn new(
        name: String, 
        path: String, 
        parameters: String, 
        context_length: u32,
    ) -> Self {
        Self {
            name,
            path,
            parameters,
            context_length,
            is_ready: true,
        }
    }
    
    /// Get model info as a display string
    pub fn info(&self) -> String {
        format!("{} ({}) - Context: {}", self.name, self.parameters, self.context_length)
    }
    
    /// Check if model is ready for use
    pub fn is_real(&self) -> bool {
        self.is_ready
    }
    
    /// Get context length
    pub fn get_context_length(&self) -> u32 {
        self.context_length
    }
}

/// Configuration for a model file on disk
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelConfig {
    pub id: String,
    pub name: String,
    pub filename: String,
    pub path: String,
    #[serde(rename = "size")]
    pub size_bytes: u64,
    #[serde(rename = "quantization")]
    pub quantization_type: String,
    #[serde(rename = "contextLength")]
    pub context_length: u32,
    pub parameters: String,
    pub description: String,
    pub loaded: bool,
}

/// Inference settings for generation
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InferenceSettings {
    #[serde(rename = "temperature", default = "default_temperature")]
    pub temperature: f64,
    #[serde(rename = "topP", default = "default_top_p")]
    pub top_p: f64,
    #[serde(rename = "topK", default = "default_top_k")]
    pub top_k: u32,
    #[serde(rename = "maxTokens", default = "default_max_tokens")]
    pub max_tokens: u32,
    #[serde(rename = "repeatPenalty", default = "default_repeat_penalty")]
    pub repeat_penalty: f64,
    #[serde(rename = "presencePenalty", default = "default_presence_penalty")]
    pub presence_penalty: f64,
    #[serde(rename = "frequencyPenalty", default = "default_frequency_penalty")]
    pub frequency_penalty: f64,
    #[serde(rename = "threads", default = "default_threads")]
    pub threads: i32,
    #[serde(rename = "gpuLayers", default = "default_gpu_layers")]
    pub gpu_layers: u32,
    #[serde(rename = "seed", default = "default_seed")]
    pub seed: u32,
    #[serde(rename = "stopSequences", default = "default_stop_sequences")]
    pub stop_sequences: Vec<String>,
}

fn default_temperature() -> f64 { 0.7 }
fn default_top_p() -> f64 { 0.9 }
fn default_top_k() -> u32 { 40 }
fn default_max_tokens() -> u32 { 4096 }
fn default_repeat_penalty() -> f64 { 1.1 }
fn default_presence_penalty() -> f64 { 0.0 }
fn default_frequency_penalty() -> f64 { 0.0 }
fn default_threads() -> i32 { -1 }
fn default_gpu_layers() -> u32 { 0 }
fn default_seed() -> u32 { 0xFFFFFFFF }
fn default_stop_sequences() -> Vec<String> { 
    vec!["</s>".to_string(), "<|eot_id|>".to_string(), "<|end_of_text|>".to_string()] 
}

impl Default for InferenceSettings {
    fn default() -> Self {
        Self {
            temperature: default_temperature(),
            top_p: default_top_p(),
            top_k: default_top_k(),
            max_tokens: default_max_tokens(),
            repeat_penalty: default_repeat_penalty(),
            presence_penalty: default_presence_penalty(),
            frequency_penalty: default_frequency_penalty(),
            threads: default_threads(),
            gpu_layers: default_gpu_layers(),
            seed: default_seed(),
            stop_sequences: default_stop_sequences(),
        }
    }
}

/// Result of a model load operation
#[derive(Debug, Serialize, Deserialize)]
pub struct LoadModelResult {
    pub success: bool,
    pub message: String,
    pub model_info: Option<ModelInfo>,
}

/// Information about a loaded model
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelInfo {
    pub name: String,
    pub parameters: String,
    pub context_length: u32,
    pub size_bytes: u64,
    pub quantization: String,
}

/// Progress update for streaming
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GenerationProgress {
    pub token: Option<String>,
    pub text: String,
    pub tokens_generated: u32,
    pub tokens_per_second: f64,
    pub is_complete: bool,
    pub is_error: bool,
    pub error_message: Option<String>,
}

impl GenerationProgress {
    pub fn token(token: String, total_tokens: u32, speed: f64) -> Self {
        Self {
            token: Some(token.clone()),
            text: token,
            tokens_generated: total_tokens,
            tokens_per_second: speed,
            is_complete: false,
            is_error: false,
            error_message: None,
        }
    }
    
    pub fn complete(total_tokens: u32, final_text: &str, speed: f64) -> Self {
        Self {
            token: None,
            text: final_text.to_string(),
            tokens_generated: total_tokens,
            tokens_per_second: speed,
            is_complete: true,
            is_error: false,
            error_message: None,
        }
    }
    
    pub fn error(message: &str) -> Self {
        Self {
            token: None,
            text: String::new(),
            tokens_generated: 0,
            tokens_per_second: 0.0,
            is_complete: true,
            is_error: true,
            error_message: Some(message.to_string()),
        }
    }
}

// ============================================================================
// OLLAMA API TYPES
// ============================================================================

/// Ollama list response
#[derive(Debug, Deserialize)]
struct OllamaListResponse {
    models: Vec<OllamaModelInfo>,
}

/// Ollama model info from list
#[derive(Debug, Deserialize, Clone)]
struct OllamaModelInfo {
    name: String,
    modified_at: String,
    size: u64,
    #[serde(default)]
    details: Option<OllamaModelDetails>,
}

/// Ollama model details
#[derive(Debug, Deserialize, Clone)]
struct OllamaModelDetails {
    #[serde(default)]
    parameter_size: Option<String>,
    #[serde(default)]
    quantization_level: Option<String>,
    family: Option<String>,
}

/// Ollama generate request
#[derive(Debug, Serialize)]
struct OllamaGenerateRequest {
    model: String,
    prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    stream: Option<bool>,
    options: OllamaGenerateOptions,
    #[serde(skip_serializing_if = "Option::is_none")]
    raw: Option<bool>,
}

/// Ollama generate options
#[derive(Debug, Serialize, Clone)]
struct OllamaGenerateOptions {
    temperature: f64,
    top_p: f64,
    top_k: u32,
    num_predict: u32,
    repeat_penalty: f64,
    presence_penalty: f64,
    frequency_penalty: f64,
    seed: u32,
    stop: Vec<String>,
}

impl From<&InferenceSettings> for OllamaGenerateOptions {
    fn from(s: &InferenceSettings) -> Self {
        Self {
            temperature: s.temperature,
            top_p: s.top_p,
            top_k: s.top_k,
            num_predict: s.max_tokens,
            repeat_penalty: s.repeat_penalty,
            presence_penalty: s.presence_penalty,
            frequency_penalty: s.frequency_penalty,
            seed: s.seed,
            stop: s.stop_sequences.clone(),
        }
    }
}

/// Ollama streaming response chunk
#[derive(Debug, Deserialize)]
struct OllamaStreamResponse {
    response: Option<String>,
    done: bool,
    #[serde(default)]
    error: Option<String>,
}

// ============================================================================
// MODEL LOADING AND INFERENCE ENGINE (OLLAMA BACKEND)
// ============================================================================

/// Load/select a model via Ollama
pub fn load_gguf_model(model_name: &str) -> Result<LoadModelResult, String> {
    log::info!(target: "model", "Loading model via Ollama: {}", model_name);
    
    // For Ollama, we just validate that the model exists or can be pulled
    let available_models = list_ollama_models()?;
    
    let model_info = available_models.iter()
        .find(|m| m.name == model_name || m.name.starts_with(model_name))
        .cloned();
    
    match model_info {
        Some(ollama_info) => {
            let name = extract_model_name_from_ollama(&ollama_info.name);
            let params = ollama_info.details
                .and_then(|d| d.parameter_size)
                .unwrap_or_else(|| estimate_params_from_size(ollama_info.size));
            let quant = ollama_info.details
                .and_then(|d| d.quantization_level)
                .unwrap_or_else(|| "Unknown".to_string());
            
            Ok(LoadModelResult {
                success: true,
                message: format!("Model ready: {} ({}, {:.2} MB)", name, quant, ollama_info.size as f64 / (1024.0 * 1024.0)),
                model_info: Some(ModelInfo {
                    name: name.clone(),
                    parameters: params.clone(),
                    context_length: 8192, // Default for most Ollama models
                    size_bytes: ollama_info.size,
                    quantization: quant,
                }),
            })
        }
        None => {
            // Model not found locally - it might need to be pulled first
            log::info!(target: "model", "Model {} not found locally, may need to pull first", model_name);
            
            Ok(LoadModelResult {
                success: false,
                message: format!(
                    "Model '{}' not found in Ollama. Run: ollama pull {}", 
                    model_name, model_name
                ),
                model_info: None,
            })
        }
    }
}

/// Create a loaded model instance
pub fn create_loaded_model(
    model_name: &str, 
    context_length: u32
) -> Result<LoadedModel, String> {
    let name = extract_model_name_from_ollama(model_name);
    let parameters = estimate_params_from_name(model_name);
    
    Ok(LoadedModel::new(
        name,
        model_name.to_string(),
        parameters,
        context_length,
    ))
}

/// Generate text using Ollama API (non-streaming)
pub async fn generate_text_async(
    prompt: &str,
    settings: &InferenceSettings,
    model: &LoadedModel,
) -> Result<String, String> {
    if prompt.is_empty() {
        return Err("Prompt cannot be empty".to_string());
    }
    
    let start_time = std::time::Instant::now();
    
    log::info!(target: "inference", "Starting generation with Ollama, model: {}, temp={}", 
              model.path, settings.temperature);
    
    let request = OllamaGenerateRequest {
        model: model.path.clone(),
        prompt: prompt.to_string(),
        stream: Some(false),
        options: OllamaGenerateOptions::from(settings),
        raw: Some(true),
    };
    
    let client = reqwest::Client::new();
    let url = format!("{}/api/generate", OLLAMA_BASE_URL);
    
    match client.post(&url).json(&request).send().await {
        Ok(response) => {
            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                return Err(format!("Ollama API error {}: {}", status, body));
            }
            
            let ollama_response: serde_json::Value = response.json().await
                .map_err(|e| format!("Failed to parse response: {}", e))?;
            
            let text = ollama_response.get("response")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            
            let elapsed = start_time.elapsed();
            let speed = text.split_whitespace().count() as f64 / elapsed.as_secs_f64().max(0.001);
            
            log::info!(target: "inference", "Generation complete in {:.2}s ({:.1} words/s)", 
                      elapsed.as_secs_f64(), speed);
            
            Ok(text)
        }
        Err(e) => Err(format!("Failed to connect to Ollama: {}. Is Ollama running?", e))
    }
}

/// Generate text using Ollama API (streaming)
pub async fn generate_text_streaming(
    prompt: &str,
    settings: &InferenceSettings,
    model: &LoadedModel,
    mut on_token: impl FnMut(GenerationProgress) -> () + Send + 'static,
) -> Result<String, String> {
    if prompt.is_empty() {
        return Err("Prompt cannot be empty".to_string());
    }
    
    let start_time = std::time::Instant::now();
    let mut generated_text = String::new();
    let mut token_count: u32 = 0;
    
    log::info!(target: "inference", "Starting streaming generation with Ollama");
    
    let request = OllamaGenerateRequest {
        model: model.path.clone(),
        prompt: prompt.to_string(),
        stream: Some(true),
        options: OllamaGenerateOptions::from(settings),
        raw: Some(true),
    };
    
    let client = reqwest::Client::new();
    let url = format!("{}/api/generate", OLLAMA_BASE_URL);
    
    match client.post(&url).json(&request).send().await {
        Ok(response) => {
            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                on_token(GenerationProgress::error(&format!("Ollama API error {}: {}", status, body)));
                return Err(format!("Ollama API error {}: {}", status, body));
            }
            
            // Process streaming chunks
            let mut stream = response.bytes_stream();
            
            while let Some(chunk_result) = stream.next().await {
                match chunk_result {
                    Ok(bytes) => {
                        let text = String::from_utf8_lossy(&bytes);
                        
                        // Parse each line as JSON (Ollama sends one JSON per line)
                        for line in text.lines() {
                            if line.trim().is_empty() { continue; }
                            
                            if let Ok(chunk_data) = serde_json::from_str::<OllamaStreamResponse>(line) {
                                if let Some(error) = chunk_data.error {
                                    on_token(GenerationProgress::error(&error));
                                    return Err(format!("Ollama error: {}", error));
                                }
                                
                                if let Some(token) = chunk_data.response {
                                    token_count += 1;
                                    generated_text.push_str(&token);
                                    
                                    let elapsed = start_time.elapsed();
                                    let speed = token_count as f64 / elapsed.as_secs_f64().max(0.001);
                                    
                                    on_token(GenerationProgress::token(
                                        token.clone(),
                                        token_count,
                                        speed,
                                    ));
                                }
                                
                                if chunk_data.done {
                                    let elapsed = start_time.elapsed();
                                    let final_speed = token_count as f64 / elapsed.as_secs_f64().max(0.001);
                                    
                                    on_token(GenerationProgress::complete(
                                        token_count,
                                        &generated_text,
                                        final_speed,
                                    ));
                                    
                                    log::info!(target: "inference", "Streaming complete: {} tokens in {:.2}s", 
                                              token_count, elapsed.as_secs_f64());
                                    
                                    return Ok(generated_text);
                                }
                            }
                        }
                    }
                    Err(e) => {
                        log::warn!(target: "inference", "Stream chunk error: {}", e);
                    }
                }
            }
            
            // If we exit loop without 'done', still return what we have
            let elapsed = start_time.elapsed();
            let final_speed = token_count as f64 / elapsed.as_secs_f64().max(0.001);
            on_token(GenerationProgress::complete(token_count, &generated_text, final_speed));
            
            Ok(generated_text)
        }
        Err(e) => {
            let err_msg = format!("Failed to connect to Ollama: {}. Is Ollama running? Start with: ollama serve", e);
            on_token(GenerationProgress::error(&err_msg));
            Err(err_msg)
        }
    }
}

/// Synchronous wrapper for non-streaming generation (for spawn_blocking compatibility)
pub fn generate_text(
    prompt: &str,
    settings: &InferenceSettings,
    model: &LoadedModel,
    _on_token: impl Fn(GenerationProgress) -> (),
) -> Result<String, String> {
    // This is a sync wrapper - in practice, use the async versions
    let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
    rt.block_on(generate_text_async(prompt, settings, model))
}

// ============================================================================
// OLLAMA HELPER FUNCTIONS
// ============================================================================

/// List all models available in Ollama
fn list_ollama_models() -> Result<Vec<OllamaModelInfo>, String> {
    let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
    
    rt.block_on(async {
        let client = reqwest::Client::new();
        let url = format!("{}/api/tags", OLLAMA_BASE_URL);
        
        match client.get(&url).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    let list: OllamaListResponse = response.json().await
                        .map_err(|e| format!("Failed to parse model list: {}", e))?;
                    Ok(list.models)
                } else {
                    Err(format!("Ollama returned status: {}", response.status()))
                }
            }
            Err(e) => Err(format!("Cannot connect to Ollama at {}. Is it running? Error: {}", 
                                  OLLAMA_BASE_URL, e))
        }
    })
}

/// Check if Ollama is running and accessible
pub fn check_ollama_status() -> Result<(), String> {
    let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
    
    rt.block_on(async {
        let client = reqwest::Client::new();
        let url = format!("{}/api/tags", OLLAMA_BASE_URL);
        
        match client.get(&url).send().await {
            Ok(response) if response.status().is_success() => Ok(()),
            Ok(_) => Err("Ollama responded but with an error".to_string()),
            Err(e) => Err(format!("Ollama not reachable: {}. Run 'ollama serve' to start.", e))
        }
    })
}

/// Pull a model from Ollama registry (async operation)
pub async fn pull_model(model_name: &str, mut on_progress: impl FnMut(String) + Send + 'static) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/pull", OLLAMA_BASE_URL);
    
    let request = serde_json::json!({
        "name": model_name,
        "stream": true
    });
    
    let response = client.post(&url).json(&request).send().await
        .map_err(|e| format!("Failed to start pull: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Pull failed: {}", response.status()));
    }
    
    let mut stream = response.bytes_stream();
    
    while let Some(chunk_result) = stream.next().await {
        if let Ok(bytes) = chunk_result {
            let text = String::from_utf8_lossy(&bytes);
            for line in text.lines() {
                if let Ok(status) = serde_json::from_str::<serde_json::Value>(line) {
                    if let Some(msg) = status.get("status").and_then(|v| v.as_str()) {
                        on_progress(msg.to_string());
                    }
                    
                    // Check for completion or error
                    if status.get("error").is_some() {
                        let err = status["error"].as_str().unwrap_or("Unknown error");
                        return Err(format!("Pull failed: {}", err));
                    }
                    
                    if status.get("status").and_then(|s| s.as_str()) == Some("success") {
                        return Ok(());
                    }
                }
            }
        }
    }
    
    Ok(())
}

// ============================================================================
// SCANNING LOCAL MODELS (for UI display)
// ============================================================================

/// Scan directory for GGUF model files (legacy support, now maps to Ollama)
pub fn scan_directory_for_models(dir: &Path) -> Result<Vec<ModelConfig>, String> {
    let mut models = Vec::new();
    
    // Try to get models from Ollama instead of scanning filesystem
    match list_ollama_models() {
        Ok(ollama_models) => {
            for om in ollama_models {
                let name = extract_model_name_from_ollama(&om.name);
                let params = om.details
                    .and_then(|d| d.parameter_size)
                    .unwrap_or_else(|| estimate_params_from_size(om.size));
                let quant = om.details
                    .and_then(|d| d.quantization_level)
                    .unwrap_or_else(|| "Q4".to_string());
                
                models.push(ModelConfig {
                    id: om.name.clone(),
                    name: name.clone(),
                    filename: om.name.clone(),
                    path: om.name.clone(), // Use Ollama model name as path
                    size_bytes: om.size,
                    quantization_type: quant,
                    context_length: 8192,
                    parameters: params,
                    description: format!("{} model (via Ollama)", name),
                    loaded: false,
                });
            }
        }
        Err(_) => {
            // Ollama not available, return empty
            log::warn!(target: "model", "Ollama not available, cannot list models");
        }
    }
    
    // Sort by name
    models.sort_by(|a, b| a.name.cmp(&b.name));
    
    Ok(models)
}

/// Get default directories to look for models
pub fn get_default_model_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    
    // Add common Ollama model storage locations
    #[cfg(target_os = "windows")] {
        if let Ok(appdata) = std::env::var("LOCALAPPDATA") {
            dirs.push(PathBuf::from(appdata).join(r"Ollama\models"));
        }
    }
    
    #[cfg(target_os = "macos")] {
        if let Ok(home) = std::env::var("HOME") {
            dirs.push(PathBuf::from(home).join(".ollama/models"));
        }
    }
    
    #[cfg(target_os = "linux")] {
        if let Ok(home) = std::env::var("HOME") {
            dirs.push(PathBuf::from(home).join(".ollama/models"));
        }
    }
    
    dirs
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Extract human-readable model name from Ollama model name
fn extract_model_name_from_ollama(ollama_name: &str) -> String {
    // Ollama names are like "llama3.2:latest" or "codellama:13b"
    let name = ollama_name
        .split(':')
        .next()
        .unwrap_or(ollama_name)
        .to_string();
    
    // Format nicely
    name.replace('-', " ")
        .replace('_', " ")
        .split_whitespace()
        .map(|w| {
            let mut chars = w.chars();
            match chars.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Estimate parameter count from model size in bytes
fn estimate_params_from_size(size_bytes: u64) -> String {
    let size_gb = size_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
    
    // Rough estimates based on Q4 quantization
    match size_gb {
        x if x > 35.0 => "70B".to_string(),
        x if x > 18.0 => "34B".to_string(),
        x if x > 8.0 => "13B".to_string(),
        x if x > 4.5 => "7B".to_string(),
        x if x > 2.0 => "3B".to_string(),
        _ => "~1-2B".to_string(),
    }
}

/// Estimate parameter count from model name
fn estimate_params_from_name(name: &str) -> String {
    let lower = name.to_lowercase();
    
    if lower.contains("70b") { "70B".to_string() }
    else if lower.contains("34b") { "34B".to_string() }
    else if lower.contains("27b") { "27B".to_string() }
    else if lower.contains("14b") || lower.contains("13b") { "13B".to_string() }
    else if lower.contains("12b") { "12B".to_string() }
    else if lower.contains("11b") { "11B".to_string() }
    else if lower.contains("9b") { "9B".to_string() }
    else if lower.contains("8b") { "8B".to_string() }
    else if lower.contains("7b") || lower.contains("mistral") || lower.contains("llama3") { "7B".to_string() }
    else if lower.contains("6") { "6B".to_string() }
    else if lower.contains("5b") { "5B".to_string() }
    else if lower.contains("4b") { "4B".to_string() }
    else if lower.contains("3b") || lower.contains("phi") { "3B".to_string() }
    else if lower.contains("2b") { "2B".to_string() }
    else if lower.contains("1b") || lower.contains("tiny") { "1B".to_string() }
    else { "Unknown".to_string() }
}

/// Get available system memory in bytes
fn get_available_memory_bytes() -> u64 {
    let mut sys = sysinfo::System::new_with_specifics(
        sysinfo::RefreshKind::new().with_memory(sysinfo::MemoryRefreshKind::new())
    );
    sys.refresh_memory();
    sys.available_memory()
}

/// Calculate appropriate context length based on model size and available memory
fn calculate_context_length(_model_size_bytes: u64, available_memory_bytes: u64) -> u32 {
    let available_gb = available_memory_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
    
    match available_gb {
        x if x >= 48.0 => 16384,
        x if x >= 24.0 => 8192,
        x if x >= 16.0 => 4096,
        x if x >= 8.0 => 2048,
        _ => 1024,
    }
}

/// Extract human-readable model name from filename (legacy)
pub fn extract_model_name(filename: &str) -> String {
    extract_model_name_from_ollama(filename)
}

/// Extract parameter count from filename (legacy)
pub fn extract_parameters(filename: &str) -> Option<String> {
    Some(estimate_params_from_name(filename))
}

/// Extract quantization type from filename (legacy)
pub fn extract_quantization(_filename: &str) -> String {
    "Via Ollama".to_string()
}
