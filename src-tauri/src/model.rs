// Model Management Module
//
// Handles loading, unloading, and inference with LLM models.
// Uses Ollama as the backend for local LLM inference.
// Ollama handles all the complex llama.cpp compilation and GPU support.
//
// PHASE 9+: Ollama Backend Implementation

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
#[derive(Clone)]
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
    #[allow(dead_code)] // Reserved for future debug/diagnostics UI; not currently called by commands.
    pub fn info(&self) -> String {
        format!("{} ({}) - Context: {}", self.name, self.parameters, self.context_length)
    }

    /// Check if model is ready for use
    pub fn is_real(&self) -> bool {
        self.is_ready
    }

    /// Get context length
    #[allow(dead_code)] // Callers currently read `model.context_length` directly; kept as a future-proof accessor.
    pub fn get_context_length(&self) -> u32 {
        self.context_length
    }
}

// ============================================================================
// DATA STRUCTURES FOR OLLAMA API
// ============================================================================

/// Settings for text generation/inference
///
/// Wire format is camelCase to match the TypeScript `InferenceSettings`
/// interface in `src/types/index.ts` (`topP`, `topK`, `maxTokens`,
/// `repeatPenalty`, `threads`, `gpuLayers`). Unknown fields sent by the
/// frontend (e.g. `threads`, `gpuLayers` which Ollama does not consume)
/// are silently ignored by serde, and missing fields fall back to their
/// `Default` value, so a partial object never breaks deserialization.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct InferenceSettings {
    pub temperature: f64,
    pub top_p: f64,
    pub top_k: u32,
    pub max_tokens: u32,
    pub repeat_penalty: f64,
    pub presence_penalty: f64,
    pub frequency_penalty: f64,
}

impl InferenceSettings {
    pub fn new() -> Self {
        Self::default()
    }
    
    pub fn creative() -> Self {
        Self {
            temperature: 0.9,
            top_p: 0.95,
            top_k: 40,
            max_tokens: 2048,
            repeat_penalty: 1.1,
            presence_penalty: 0.0,
            frequency_penalty: 0.3,
        }
    }
    
    pub fn balanced() -> Self {
        Self {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 30,
            max_tokens: 1024,
            repeat_penalty: 1.15,
            presence_penalty: 0.0,
            frequency_penalty: 0.2,
        }
    }
    
    pub fn precise() -> Self {
        Self {
            temperature: 0.3,
            top_p: 0.85,
            top_k: 20,
            max_tokens: 512,
            repeat_penalty: 1.2,
            presence_penalty: 0.0,
            frequency_penalty: 0.1,
        }
    }
}

/// Result of loading a model
///
/// `rename_all = "camelCase"` makes `model_info` serialize as `modelInfo`
/// to match `LoadModelResult` in `src/lib/tauri.ts`. `default` lets the
/// frontend send a partial object without breaking deserialization.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct LoadModelResult {
    pub success: bool,
    pub message: String,
    pub model_info: Option<ModelInfo>,
}

/// Information about a model
///
/// Wire format is camelCase (`contextLength`, `sizeBytes`) to match
/// `ModelInfo` in `src/lib/tauri.ts`.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct ModelInfo {
    pub name: String,
    pub parameters: String,
    pub context_length: u32,
    pub size_bytes: u64,
    pub quantization: String,
}

/// Configuration for a model (used in UI)
///
/// Wire format is camelCase. Two fields are renamed explicitly to match
/// `ModelConfig` in `src/types/index.ts`:
///   - `size_bytes`     → serialized as `size`         (NOT `sizeBytes`)
///   - `quantization_type` → serialized as `quantization` (NOT `quantizationType`)
/// `default` lets the frontend send a partial object without breaking
/// deserialization.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct ModelConfig {
    pub id: String,
    pub name: String,
    pub filename: String,
    pub path: String,
    #[serde(rename = "size")]
    pub size_bytes: u64,
    #[serde(rename = "quantization")]
    pub quantization_type: String,
    pub context_length: u32,
    pub parameters: String,
    pub description: String,
    pub loaded: bool,
}

/// Progress during generation
#[derive(Debug, Clone)]
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
    pub fn token(token: String, tokens: u32, speed: f64) -> Self {
        Self {
            token: Some(token.clone()),
            text: token,
            tokens_generated: tokens,
            tokens_per_second: speed,
            is_complete: false,
            is_error: false,
            error_message: None,
        }
    }
    
    pub fn complete(tokens: u32, text: &str, speed: f64) -> Self {
        Self {
            token: None,
            text: text.to_string(),
            tokens_generated: tokens,
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
            is_complete: false,
            is_error: true,
            error_message: Some(message.to_string()),
        }
    }
}

// ============================================================================
// OLLAMA API REQUEST/RESPONSE TYPES
// ============================================================================

/// Request body for Ollama generate API
#[derive(Debug, Clone, Serialize, Deserialize)]
struct OllamaGenerateRequest {
    model: String,
    prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    stream: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    options: Option<OllamaGenerateOptions>,
    #[serde(skip_serializing_if = "Option::is_none")]
    raw: Option<bool>,
}

/// Options for generation
#[derive(Debug, Clone, Serialize, Deserialize)]
struct OllamaGenerateOptions {
    #[serde(rename = "temperature", skip_serializing_if = "Option::is_none")]
    temperature: Option<f64>,
    #[serde(rename = "top_p", skip_serializing_if = "Option::is_none")]
    top_p: Option<f64>,
    #[serde(rename = "top_k", skip_serializing_if = "Option::is_none")]
    top_k: Option<u32>,
    #[serde(rename = "num_predict", skip_serializing_if = "Option::is_none")]
    num_predict: Option<u32>,
    #[serde(rename = "repeat_penalty", skip_serializing_if = "Option::is_none")]
    repeat_penalty: Option<f64>,
}

impl From<&InferenceSettings> for OllamaGenerateOptions {
    fn from(s: &InferenceSettings) -> Self {
        Self {
            temperature: Some(s.temperature),
            top_p: Some(s.top_p),
            top_k: Some(s.top_k),
            num_predict: Some(s.max_tokens),
            repeat_penalty: Some(s.repeat_penalty),
        }
    }
}

/// Response from streaming generate API
#[derive(Debug, Clone, Deserialize)]
struct OllamaStreamResponse {
    #[serde(default)]
    response: Option<String>,
    #[serde(default)]
    done: bool,
    #[serde(default)]
    error: Option<String>,
}

/// Response from list models API
#[derive(Debug, Clone, Deserialize)]
struct OllamaListResponse {
    models: Vec<OllamaModelInfo>,
}

/// Model info from Ollama
#[derive(Debug, Clone, Deserialize)]
struct OllamaModelInfo {
    name: String,
    #[serde(default)]
    size: u64,
    #[serde(default)]
    details: Option<OllamaModelDetails>,
}

/// Details about a model from Ollama
#[derive(Debug, Clone, Deserialize)]
struct OllamaModelDetails {
    #[serde(default)]
    format: Option<String>,
    #[serde(default)]
    family: Option<String>,
    #[serde(rename = "parameter_size", default)]
    parameter_size: Option<String>,
    #[serde(rename = "quantization_level", default)]
    quantization_level: Option<String>,
}

// ============================================================================
// MODEL LOADING AND INFERENCE ENGINE (OLLAMA BACKEND)
// ============================================================================

/// Load/select a model via Ollama (async version) - more robust with fallback
pub async fn load_gguf_model(model_name: &str) -> Result<LoadModelResult, String> {
    log::info!(target: "model", "Loading model via Ollama: {}", model_name);
    
    // Try to get models from Ollama for validation
    match list_ollama_models().await {
        Ok(available_models) => {
            // Try to find exact or partial match
            let model_info = available_models.iter()
                .find(|m| m.name == model_name || m.name.starts_with(model_name) || model_name.starts_with(&m.name))
                .cloned();
            
            match model_info {
                Some(ollama_info) => {
                    let name = extract_model_name_from_ollama(&ollama_info.name);
                    let params = ollama_info.details.as_ref()
                        .and_then(|d| d.parameter_size.as_ref())
                        .cloned()
                        .unwrap_or_else(|| estimate_params_from_size(ollama_info.size));
                    let quant = ollama_info.details.as_ref()
                        .and_then(|d| d.quantization_level.as_ref())
                        .cloned()
                        .unwrap_or_else(|| "Q4_K_M".to_string());
                    
                    return Ok(LoadModelResult {
                        success: true,
                        message: format!("Model ready: {} ({}, {:.2} MB)", name, quant, ollama_info.size as f64 / (1024.0 * 1024.0)),
                        model_info: Some(ModelInfo {
                            name: name.clone(),
                            parameters: params.clone(),
                            context_length: 8192,
                            size_bytes: ollama_info.size,
                            quantization: quant,
                        }),
                    });
                }
                None => {
                    // Model not in list but might still work - try loading anyway
                    log::warn!(target: "model", "Model {} not in Ollama list, will try anyway", model_name);
                }
            }
        }
        Err(e) => {
            log::warn!(target: "model", "Could not reach Ollama for validation: {}, proceeding anyway", e);
        }
    }
    
    // Fallback: Just trust the model name and try to use it
    let name = extract_model_name_from_ollama(model_name);
    let params = estimate_params_from_name(model_name);
    
    Ok(LoadModelResult {
        success: true,
        message: format!("Model selected: {} ({})", name, params),
        model_info: Some(ModelInfo {
            name: name.clone(),
            parameters: params,
            context_length: 8192,
            size_bytes: 0,
            quantization: "Via Ollama".to_string(),
        }),
    })
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
        options: Some(OllamaGenerateOptions::from(settings)),
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
        options: Some(OllamaGenerateOptions::from(settings)),
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
            
            // Process streaming chunks.
            //
            // Ollama sends newline-delimited JSON objects (one per line).
            // `bytes_stream()` yields arbitrary byte chunks that do NOT
            // align with line boundaries — a single JSON object can be
            // split across two chunks, or a single chunk can contain
            // several JSON objects. To parse correctly we maintain a
            // `buf` String across chunks: append each incoming chunk,
            // split on `\n`, parse complete lines, keep the trailing
            // partial line for the next iteration. (Fixes H8: silent
            // token loss at chunk boundaries.)
            let mut stream = response.bytes_stream();
            let mut buf = String::new();

            while let Some(chunk_result) = stream.next().await {
                match chunk_result {
                    Ok(bytes) => {
                        buf.push_str(&String::from_utf8_lossy(&bytes));

                        // Parse every complete line currently in the buffer.
                        while let Some(idx) = buf.find('\n') {
                            let line: String = buf.drain(..=idx).collect();
                            let line = line.trim();
                            if line.is_empty() { continue; }

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
                            } else {
                                // Malformed JSON line — log and continue rather
                                // than silently dropping subsequent tokens.
                                log::warn!(target: "inference", "Failed to parse stream line: {}", line);
                            }
                        }
                    }
                    Err(e) => {
                        log::warn!(target: "inference", "Stream chunk error: {}", e);
                    }
                }
            }

            // Drain any trailing partial line left in the buffer (Ollama
            // sometimes omits the final `\n` before closing the stream).
            let trailing = buf.trim();
            if !trailing.is_empty() {
                if let Ok(chunk_data) = serde_json::from_str::<OllamaStreamResponse>(trailing) {
                    if let Some(error) = chunk_data.error {
                        on_token(GenerationProgress::error(&error));
                        return Err(format!("Ollama error: {}", error));
                    }
                    if let Some(token) = chunk_data.response {
                        token_count += 1;
                        generated_text.push_str(&token);
                        let elapsed = start_time.elapsed();
                        let speed = token_count as f64 / elapsed.as_secs_f64().max(0.001);
                        on_token(GenerationProgress::token(token, token_count, speed));
                    }
                    if chunk_data.done {
                        let elapsed = start_time.elapsed();
                        let final_speed = token_count as f64 / elapsed.as_secs_f64().max(0.001);
                        on_token(GenerationProgress::complete(token_count, &generated_text, final_speed));
                        log::info!(target: "inference", "Streaming complete (trailing): {} tokens in {:.2}s",
                                  token_count, elapsed.as_secs_f64());
                        return Ok(generated_text);
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

/// Synchronous wrapper for non-streaming generation (delegates to async version)
#[allow(dead_code)] // Kept for API symmetry with `generate_text_streaming`; the `generate` Tauri command calls `generate_text_async` directly.
pub async fn generate_text(
    prompt: &str,
    settings: &InferenceSettings,
    model: &LoadedModel,
    _on_token: impl Fn(GenerationProgress) -> (),
) -> Result<String, String> {
    // Delegate to the async version
    generate_text_async(prompt, settings, model).await
}

// ============================================================================
// OLLAMA HELPER FUNCTIONS (ALL ASYNC)
// ============================================================================

/// List all models available in Ollama (async version)
async fn list_ollama_models() -> Result<Vec<OllamaModelInfo>, String> {
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
}

/// Check if Ollama is running and accessible (async version)
pub async fn check_ollama_status() -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/tags", OLLAMA_BASE_URL);
    
    match client.get(&url).send().await {
        Ok(response) if response.status().is_success() => Ok(()),
        Ok(_) => Err("Ollama responded but with an error".to_string()),
        Err(e) => Err(format!("Ollama not reachable: {}. Run 'ollama serve' to start.", e))
    }
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
    
    // Stream newline-delimited JSON status objects from Ollama.
    // Maintain a `buf` across chunks: chunks do NOT align with line
    // boundaries, so a status object split across two chunks would be
    // silently dropped by `for line in text.lines()`. (Fixes H8.)
    let mut stream = response.bytes_stream();
    let mut buf = String::new();

    while let Some(chunk_result) = stream.next().await {
        if let Ok(bytes) = chunk_result {
            buf.push_str(&String::from_utf8_lossy(&bytes));

            while let Some(idx) = buf.find('\n') {
                let line: String = buf.drain(..=idx).collect();
                let line = line.trim();
                if line.is_empty() { continue; }

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
                } else {
                    log::warn!(target: "model", "Failed to parse pull status line: {}", line);
                }
            }
        }
    }

    // Drain any trailing partial line.
    let trailing = buf.trim();
    if !trailing.is_empty() {
        if let Ok(status) = serde_json::from_str::<serde_json::Value>(trailing) {
            if let Some(msg) = status.get("status").and_then(|v| v.as_str()) {
                on_progress(msg.to_string());
            }
            if status.get("error").is_some() {
                let err = status["error"].as_str().unwrap_or("Unknown error");
                return Err(format!("Pull failed: {}", err));
            }
            if status.get("status").and_then(|s| s.as_str()) == Some("success") {
                return Ok(());
            }
        }
    }

    Ok(())
}

// ============================================================================
// SCANNING LOCAL MODELS (for UI display)
// ============================================================================

/// Scan directory for GGUF model files (legacy support, now maps to Ollama) (async version)
pub async fn scan_directory_for_models(_dir: &Path) -> Result<Vec<ModelConfig>, String> {
    let mut models = Vec::new();
    
    // Try to get models from Ollama instead of scanning filesystem
    match list_ollama_models().await {
        Ok(ollama_models) => {
            for om in ollama_models {
                let name = extract_model_name_from_ollama(&om.name);
                let params = om.details.as_ref()
                    .and_then(|d| d.parameter_size.as_ref())
                    .cloned()
                    .unwrap_or_else(|| estimate_params_from_size(om.size));
                let quant = om.details.as_ref()
                    .and_then(|d| d.quantization_level.as_ref())
                    .cloned()
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
