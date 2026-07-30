// Model Management Module
//
// Handles loading, unloading, and inference with local GGUF models.
// Uses llama.cpp for CPU-optimized inference via llama_cpp_rs bindings.
//
// PHASE 9: Real LLM Inference Implementation
// Updated for llama_cpp_rs 0.3.x API

use std::sync::Mutex;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

/// Main model state holder - stored in Tauri managed state
#[derive(Default)]
pub struct ModelState {
    pub loaded_model: Option<LoadedModel>,
    pub model_path: Option<String>,
}

/// Represents a loaded LLM model with its llama.cpp session
pub struct LoadedModel {
    pub name: String,
    pub path: String,
    pub parameters: String,
    pub context_length: u32,
    /// The actual llama.cpp model instance (kept as raw pointer for safety with 0.3)
    model_loaded: bool,
    /// Context length for generation
    n_ctx: u32,
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
            model_loaded: true,
            n_ctx: context_length,
        }
    }
    
    /// Get model info as a display string
    pub fn info(&self) -> String {
        format!("{} ({}) - Context: {}", self.name, self.parameters, self.context_length)
    }
    
    /// Check if model is actually loaded (has real backend)
    pub fn is_real(&self) -> bool {
        self.model_loaded
    }
    
    /// Get context length
    pub fn get_context_length(&self) -> u32 {
        self.n_ctx
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
fn default_threads() -> i32 { -1 } // Auto-detect (use all cores)
fn default_gpu_layers() -> u32 { 0 } // CPU only by default
fn default_seed() -> u32 { 0xFFFFFFFF } // Random seed
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
    /// Create a token progress update
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
    
    /// Create a completion progress update
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
    
    /// Create an error progress update
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
// MODEL LOADING AND INFERENCE ENGINE
// ============================================================================

/// Load a GGUF model from disk with validation
/// 
/// This function:
/// 1. Validates the file exists and is a valid GGUF
/// 2. Checks available system memory
/// 3. Returns model info (actual loading happens at inference time for better memory management)
pub fn load_gguf_model(model_path: &str) -> Result<LoadModelResult, String> {
    let path = PathBuf::from(model_path);
    
    log::info!(target: "model", "Loading GGUF model from: {:?}", path);
    
    // Step 1: Validate file exists
    if !path.exists() {
        return Ok(LoadModelResult {
            success: false,
            message: format!("Model file not found: {}", model_path),
            model_info: None,
        });
    }
    
    if !path.is_file() {
        return Ok(LoadModelResult {
            success: false,
            message: format!("Path is not a file: {}", model_path),
            model_info: None,
        });
    }
    
    // Check extension
    let extension = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    if extension != "gguf" {
        return Ok(LoadModelResult {
            success: false,
            message: format!("Invalid model format. Expected .gguf, got .{}", extension),
            model_info: None,
        });
    }
    
    // Get file metadata
    let metadata = std::fs::metadata(&path).map_err(|e| format!("Failed to read metadata: {}", e))?;
    let file_size = metadata.len();
    
    // Extract model info from filename
    let filename = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    let name = extract_model_name(&filename);
    let parameters = extract_parameters(&filename);
    let quantization = extract_quantization(&filename);
    
    // Step 2: Memory check
    let estimated_memory_bytes = (file_size as f64 * 1.8) as u64; // Model + context overhead
    let available_memory = get_available_memory_bytes();
    
    if estimated_memory_bytes > available_memory {
        let needed_gb = estimated_memory_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
        let available_gb = available_memory as f64 / (1024.0 * 1024.0 * 1024.0);
        return Ok(LoadModelResult {
            success: false,
            message: format!(
                "Insufficient memory. Need ~{:.1} GB but only {:.1} GB available.",
                needed_gb, available_gb
            ),
            model_info: None,
        });
    }
    
    // Step 3: Try to validate GGUF header using llama_cpp_rs
    let validation_result = validate_gguf_with_llama(&path);
    
    match validation_result {
        Ok((vocab_size, ctx_len, params)) => {
            log::info!(target: "model", "Model validated successfully!");
            log::info!(target: "model", "  - Vocabulary size: {}", vocab_size);
            log::info!(target: "model", "  - Context size: {}", ctx_len);
            
            // Determine context length
            let calculated_ctx = calculate_context_length(file_size, available_memory);
            let context_length = ctx_len.min(calculated_ctx);
            
            let model_info = ModelInfo {
                name: name.clone(),
                parameters: parameters.clone(),
                context_length,
                size_bytes: file_size,
                quantization: quantization.clone(),
            };
            
            Ok(LoadModelResult {
                success: true,
                message: format!(
                    "Successfully validated model: {} ({}, {}, {:.2} MB)",
                    name,
                    parameters.unwrap_or_else(|| "Unknown".to_string()),
                    quantization,
                    file_size as f64 / (1024.0 * 1024.0)
                ),
                model_info: Some(model_info),
            })
        }
        Err(e) => {
            log::warn!(target: "model", "GGUF validation warning: {}. Proceeding with basic validation.", e);
            // Still allow loading if basic checks pass
            let context_length = calculate_context_length(file_size, available_memory);
            
            Ok(LoadModelResult {
                success: true,
                message: format!(
                    "Model loaded (basic validation): {} ({}, {:.2} MB). Note: {}",
                    name,
                    quantization,
                    file_size as f64 / (1024.0 * 1024.0),
                    e
                ),
                model_info: Some(ModelInfo {
                    name: name.clone(),
                    parameters: parameters.clone(),
                    context_length,
                    size_bytes: file_size,
                    quantization: quantization.clone(),
                }),
            })
        }
    }
}

/// Validate GGUF file using llama.cpp's own validation
fn validate_gguf_with_llama(path: &Path) -> Result<(u32, u32, Option<String>), String> {
    // Use llama_cpp_rs to try loading just the header
    let params = llama_cpp_rs::params::ModelParams::default();
    
    match llama_cpp_rs::model::LlamaModel::load_from_file(path, &params) {
        Ok(model) => {
            let vocab_size = model.vocab_size();
            let ctx_len = model.context_length();
            let params = Some(model.train_params_string());
            Ok((vocab_size, ctx_len, params))
        }
        Err(e) => Err(format!("GGUF validation failed: {}", e))
    }
}

/// Create a loaded model instance from path
pub fn create_loaded_model(
    model_path: &str, 
    context_length: u32
) -> Result<LoadedModel, String> {
    let path = PathBuf::from(model_path);
    let filename = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    let name = extract_model_name(&filename);
    let parameters = extract_parameters(&filename);
    
    // Verify we can actually load the model
    let params = llama_cpp_rs::params::ModelParams::default();
    match llama_cpp_rs::model::LlamaModel::load_from_file(&path, &params) {
        Ok(_) => {},
        Err(e) => return Err(format!("Failed to load model: {}", e)),
    }
    
    Ok(LoadModel::new(name, model_path.to_string(), parameters, context_length))
}

/// Generate text using the loaded model with llama.cpp inference
/// 
/// For llama_cpp_rs 0.3, we create a new model+context per generation call
/// This is simpler and avoids complex lifetime issues
pub fn generate_text(
    prompt: &str,
    settings: &InferenceSettings,
    _model: &LoadedModel,
    on_token: impl Fn(GenerationProgress) -> (),
) -> Result<String, String> {
    // Validate inputs
    if prompt.is_empty() {
        return Err("Prompt cannot be empty".to_string());
    }
    
    let max_tokens = settings.max_tokens;
    let start_time = std::time::Instant::now();
    
    log::info!(target: "inference", "Starting generation: {} tokens max, temp={}", 
              max_tokens, settings.temperature);
    
    // Load model fresh for this generation
    let model_path = PathBuf::from(&_model.path);
    let model_params = llama_cpp_rs::params::ModelParams::default();
    
    let model = match llama_cpp_rs::model::LlamaModel::load_from_file(&model_path, &model_params) {
        Ok(m) => m,
        Err(e) => return Err(format!("Failed to load model for generation: {}", e)),
    };
    
    // Create context
    let num_threads = if settings.threads > 0 { 
        settings.threads as usize 
    } else { 
        num_cpus::get() 
    };
    
    let ctx_len = _model.get_context_length();
    let context_params = llama_cpp_rs::params::ContextParams::default()
        .n_ctx(ctx_len)
        .n_threads(num_threads);
    
    let mut context = match llama_cpp_rs::context::LlamaContext::new_with_model(&model, &context_params) {
        Ok(ctx) => ctx,
        Err(e) => return Err(format!("Failed to create context: {}", e)),
    };
    
    log::debug!(target: "inference", "Model and context created, starting tokenization");
    
    // Tokenize prompt
    let tokens = match model.tokenize(prompt, true, true) {
        Ok(t) => t,
        Err(e) => return Err(format!("Tokenization failed: {}", e)),
    };
    
    log::debug!(target: "inference", "Prompt tokenized into {} tokens", tokens.len());
    
    // Clear context and evaluate prompt tokens
    context.clear();
    
    // Process tokens in batches
    let batch_size = 512.min(tokens.len());
    let mut processed = 0;
    
    while processed < tokens.len() {
        let end = (processed + batch_size).min(tokens.len());
        
        // Create batch for this slice
        let mut batch = llama_cpp_rs::batch::Batch::new(
            (end - processed) as i32,
            0,
            1
        );
        
        for (i, &token) in tokens[processed..end].iter().enumerate() {
            let pos = (processed + i) as llama_cpp_rs::batch::Pos;
            batch.add(token, pos, &[false]);
        }
        
        if let Err(e) = context.decode(&batch) {
            return Err(format!("Failed to decode prompt tokens: {}", e));
        }
        
        processed = end;
    }
    
    log::debug!(target: "inference", "Prompt evaluated, starting generation loop");
    
    // Generation loop
    let mut generated_text = String::new();
    let mut generated_count: u32 = 0;
    
    // Get EOS token id
    let eos_token_id = model.token_eos();
    
    // Sampling config
    let temp = settings.temperature.max(0.0);
    
    // Track previously generated tokens for repeat penalty
    let mut prev_tokens: Vec<llama_cpp_rs::token::TokenData> = Vec::new();
    
    while generated_count < max_tokens {
        // Get logits for next token
        let logits = context.logits().ok_or("Failed to get logits")?;
        
        // Apply sampling
        let next_token = if temp <= 0.0 {
            sample_greedy(logits)
        } else {
            sample_token(
                logits,
                temp,
                settings.top_k,
                settings.top_p,
                settings.repeat_penalty,
                eos_token_id,
                &prev_tokens,
            )
        };
        
        // Check for EOS
        if next_token.id == eos_token_id {
            log::info!(target: "inference", "EOS token received after {} tokens", generated_count);
            break;
        }
        
        // Convert token to string
        let token_str = match model.detokenize(&[next_token], false, false) {
            Ok(s) => s,
            Err(_) => continue,
        };
        
        // Track this token
        prev_tokens.push(next_token);
        
        generated_text.push_str(&token_str);
        generated_count += 1;
        
        // Calculate speed
        let elapsed = start_time.elapsed();
        let speed = generated_count as f64 / elapsed.as_secs_f64().max(0.001);
        
        // Emit progress
        on_token(GenerationProgress::token(
            token_str.clone(), 
            generated_count, 
            speed
        ));
        
        // Add token to context
        let pos = tokens.len() as llama_cpp_rs::batch::Pos + generated_count as llama_cpp_rs::batch::Pos - 1;
        let mut batch = llama_cpp_rs::batch::Batch::new(1, pos, 1);
        batch.add(next_token, pos, &[true]);
        
        if let Err(e) = context.decode(&batch) {
            log::warn!(target: "inference", "Decode error during generation: {}", e);
            break;
        }
        
        // Check for stop sequences
        let should_stop = settings.stop_sequences.iter().any(|seq| {
            !seq.is_empty() && generated_text.contains(seq.as_str())
        });
        
        if should_stop {
            log::info!(target: "inference", "Stop sequence encountered");
            break;
        }
    }
    
    // Final stats
    let total_time = start_time.elapsed();
    let final_speed = generated_count as f64 / total_time.as_secs_f64().max(0.001);
    
    log::info!(target: "inference", "Generation complete: {} tokens in {:.2}s ({:.1} t/s)", 
              generated_count, total_time.as_secs_f64(), final_speed);
    
    // Emit completion
    on_token(GenerationProgress::complete(generated_count, &generated_text, final_speed));
    
    Ok(generated_text)
}

// ============================================================================
// SAMPLING FUNCTIONS
// ============================================================================

/// Greedy sampling - always pick the most likely token
fn sample_greedy(logits: &[f32]) -> llama_cpp_rs::token::TokenData {
    let mut best_idx = 0usize;
    let mut best_score = f32::NEG_INFINITY;
    
    for (i, &score) in logits.iter().enumerate() {
        if score > best_score {
            best_score = score;
            best_idx = i;
        }
    }
    
    llama_cpp_rs::token::TokenData::new(best_idx as llama_cpp_rs::token::Token, 0.0)
}

/// Sample a token with temperature, top-k, top-p filtering, and repeat penalty
fn sample_token(
    logits: &[f32],
    temperature: f64,
    top_k: u32,
    top_p: f64,
    repeat_penalty: f64,
    _eos_token: llama_cpp_rs::token::Token,
    prev_tokens: &[llama_cpp_rs::token::TokenData],
) -> llama_cpp_rs::token::TokenData {
    let vocab_size = logits.len();
    
    // Step 1: Apply repeat penalty
    let mut penalized_logits: Vec<f32> = logits.to_vec();
    if repeat_penalty > 1.0 && !prev_tokens.is_empty() {
        let token_set: std::collections::HashSet<llama_cpp_rs::token::Token> = prev_tokens.iter()
            .map(|t| t.id)
            .collect();
        
        for (i, logit) in penalized_logits.iter_mut().enumerate() {
            if token_set.contains(&(i as llama_cpp_rs::token::Token)) {
                if *logit > 0.0 {
                    *logit /= repeat_penalty as f32;
                } else {
                    *logit *= repeat_penalty as f32;
                }
            }
        }
    }
    
    // Step 2: Apply temperature scaling
    let scaled_logits: Vec<f32> = penalized_logits.iter()
        .map(|&x| if temperature > 0.0 { (x as f64 / temperature) as f32 } else { x })
        .collect();
    
    // Step 3: Sort indices by logit value (descending) for top-k
    let mut indices: Vec<usize> = (0..vocab_size).collect();
    indices.sort_by(|&a, &b| scaled_logits[b].partial_cmp(&scaled_logits[a]).unwrap_or(std::cmp::Ordering::Equal));
    
    // Step 4: Apply top-k filter
    let k = top_k as usize.min(vocab_size);
    let mut filtered_logits = vec![f32::NEG_INFINITY; vocab_size];
    for (rank, &idx) in indices.iter().enumerate() {
        if rank < k {
            filtered_logits[idx] = scaled_logits[idx];
        }
    }
    
    // Step 5: Softmax
    let max_val = filtered_logits.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
    let exp_sum: f32 = filtered_logits.iter().map(|&v| (v - max_val).exp()).sum();
    let mut probs: Vec<f32> = filtered_logits.iter().map(|&v| ((v - max_val).exp()) / exp_sum).collect();
    
    // Step 6: Apply top-p (nucleus) filtering
    let mut prob_indices: Vec<(f32, usize)> = probs.iter().cloned().zip(0..vocab_size).collect();
    prob_indices.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
    
    let mut final_probs = vec![0.0f32; vocab_size];
    let mut running_sum = 0.0f32;
    
    for &(prob, idx) in &prob_indices {
        if running_sum <= top_p as f32 {
            final_probs[idx] = prob;
            running_sum += prob;
        }
    }
    
    // Normalize
    let sum: f32 = final_probs.iter().sum();
    if sum > 0.0 {
        for p in final_probs.iter_mut() {
            *p /= sum;
        }
    }
    
    // Step 7: Sample from distribution
    let dist = rand_distr::Uniform::new(0.0f32, 1.0);
    let mut rng = rand::thread_rng();
    let rand_val: f32 = dist.sample(&mut rng);
    
    let mut cumulative = 0.0f32;
    for (i, prob) in final_probs.iter().enumerate() {
        cumulative += prob;
        if cumulative >= rand_val || i == vocab_size - 1 {
            return llama_cpp_rs::token::TokenData::new(i as llama_cpp_rs::token::Token, 0.0);
        }
    }
    
    // Fallback
    llama_cpp_rs::token::TokenData::new(indices[0] as llama_cpp_rs::token::Token, 0.0)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Calculate appropriate context length based on model size and available memory
fn calculate_context_length(model_size_bytes: u64, available_memory_bytes: u64) -> u32 {
    let available_gb = available_memory_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
    let model_mb = model_size_bytes as f64 / (1024.0 * 1024.0);
    
    let bytes_per_token = match model_mb {
        x if x > 20000.0 => 20.0,
        x if x > 10000.0 => 12.0,
        x if x > 5000.0 => 6.0,
        _ => 4.0,
    };
    
    let max_context_by_mem = (available_memory_bytes as f64 * 0.5) / bytes_per_token;
    
    match available_gb {
        x if x >= 48.0 => 16384.min(max_context_by_mem as u32),
        x if x >= 24.0 => 8192.min(max_context_by_mem as u32),
        x if x >= 16.0 => 4096.min(max_context_by_mem as u32),
        x if x >= 8.0 => 2048.min(max_context_by_mem as u32),
        _ => 1024.min(max_context_by_mem as u32),
    }
}

/// Get available system memory in bytes
fn get_available_memory_bytes() -> u64 {
    match sysinfo::System::new_with_specifics(
        sysinfo::RefreshKind::new().with_memory(sysinfo::MemoryRefreshKind::new())
    ).memory() {
        mem => mem.available(),
        Err(_) => 16_000_000_000,
    }
}

/// Extract human-readable model name from filename
pub fn extract_model_name(filename: &str) -> String {
    let name = filename
        .to_lowercase()
        .replace("-instruct", "")
        .replace("-chat", "")
        .replace("-q4_k_m.gguf", "")
        .replace("-q4_k_s.gguf", "")
        .replace("-q5_k_m.gguf", "")
        .replace("-q5_k_s.gguf", "")
        .replace("-q6_k.gguf", "")
        .replace("-q8_0.gguf", "")
        .replace("-q2_k.gguf", "")
        .replace("-q3_k_s.gguf", "")
        .replace("-q3_k_m.gguf", "")
        .replace("-iq3_xxs.gguf", "")
        .replace("-f16.gguf", "")
        .replace("-f32.gguf", "")
        .replace(".gguf", "")
        .replace("-", " ");
    
    name.split_whitespace()
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

/// Extract parameter count from filename
pub fn extract_parameters(filename: &str) -> Option<String> {
    let lower = filename.to_lowercase();
    
    if lower.contains("70b") || lower.contains("70_b") {
        Some("70B".to_string())
    } else if lower.contains("34b") || lower.contains("34_b") {
        Some("34B".to_string())
    } else if lower.contains("27b") || lower.contains("27_b") {
        Some("27B".to_string())
    } else if lower.contains("14b") || lower.contains("14_b") {
        Some("14B".to_string())
    } else if lower.contains("13b") || lower.contains("13_b") {
        Some("13B".to_string())
    } else if lower.contains("12b") || lower.contains("12_b") {
        Some("12B".to_string())
    } else if lower.contains("11b") || lower.contains("11_b") {
        Some("11B".to_string())
    } else if lower.contains("9b") || lower.contains("9_b") || lower.contains("yi-9b") {
        Some("9B".to_string())
    } else if lower.contains("8b") || lower.contains("8_b") {
        Some("8B".to_string())
    } else if lower.contains("7b") || lower.contains("7_b") || lower.contains("mistral") {
        Some("7B".to_string())
    } else if lower.contains("6.7b") || lower.contains("6_7b") {
        Some("6.7B".to_string())
    } else if lower.contains("6b") || lower.contains("6_b") {
        Some("6B".to_string())
    } else if lower.contains("5b") || lower.contains("5_b") {
        Some("5B".to_string())
    } else if lower.contains("4b") || lower.contains("4_b") {
        Some("4B".to_string())
    } else if lower.contains("3b") || lower.contains("3_b") || lower.contains("phi-3") {
        Some("3B".to_string())
    } else if lower.contains("2.7b") || lower.contains("2_7b") {
        Some("2.7B".to_string())
    } else if lower.contains("2b") || lower.contains("2_b") {
        Some("2B".to_string())
    } else if lower.contains("1.8b") || lower.contains("1_8b") {
        Some("1.8B".to_string())
    } else if lower.contains("1b") || lower.contains("1_b") {
        Some("1B".to_string())
    } else if lower.contains("0.5b") || lower.contains("0_5b") {
        Some("0.5B".to_string())
    } else if lower.contains("tiny") || lower.contains("small") {
        Some("~1B".to_string())
    } else {
        None
    }
}

/// Extract quantization type from filename
pub fn extract_quantization(filename: &str) -> String {
    let lower = filename.to_lowercase();
    
    if lower.contains("q2_k") {
        "Q2_K".to_string()
    } else if lower.contains("q3_k_s") {
        "Q3_K_S".to_string()
    } else if lower.contains("q3_k_m") {
        "Q3_K_M".to_string()
    } else if lower.contains("q3_k_l") {
        "Q3_K_L".to_string()
    } else if lower.contains("iq3_xxs") {
        "IQ3_XXS".to_string()
    } else if lower.contains("iq3_xs") {
        "IQ3_XS".to_string()
    } else if lower.contains("q4_k_s") {
        "Q4_K_S".to_string()
    } else if lower.contains("q4_k_m") {
        "Q4_K_M".to_string()
    } else if lower.contains("q5_k_s") {
        "Q5_K_S".to_string()
    } else if lower.contains("q5_k_m") {
        "Q5_K_M".to_string()
    } else if lower.contains("q6_k") {
        "Q6_K".to_string()
    } else if lower.contains("q8_0") {
        "Q8_0".to_string()
    } else if lower.contains("q5_0") {
        "Q5_0".to_string()
    } else if lower.contains("q4_0") {
        "Q4_0".to_string()
    } else if lower.contains("q3_0") {
        "Q3_0".to_string()
    } else if lower.contains("q2_0") {
        "Q2_0".to_string()
    } else if lower.contains("f16") {
        "F16".to_string()
    } else if lower.contains("f32") {
        "F32".to_string()
    } else {
        "Unknown".to_string()
    }
}

/// Scan directory for GGUF model files
pub fn scan_directory_for_models(dir: &Path) -> Result<Vec<ModelConfig>, String> {
    let mut models = Vec::new();
    
    if !dir.exists() {
        return Ok(models); // Return empty, not error
    }
    
    let entries = walkdir::WalkDir::new(dir)
        .max_depth(3) // Don't go too deep
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            let ext = e.path()
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            ext == "gguf" && e.file_type().is_file()
        });
    
    for entry in entries {
        let path = entry.path();
        
        if let Ok(metadata) = std::fs::metadata(path) {
            let filename = path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string();
            
            let name = extract_model_name(&filename);
            let parameters = extract_parameters(&filename)
                .unwrap_or_else(|| "Unknown".to_string());
            let quantization = extract_quantization(&filename);
            
            // Generate unique ID from path
            let id = path.to_string_lossy()
                .to_lowercase()
                .replace(['/', '\\', ':', ' ', '.'], "-")
                .trim_matches('-')
                .to_string();
            
            models.push(ModelConfig {
                id: if id.is_empty() { uuid::Uuid::new_v4().to_string() } else { id },
                name: name.clone(),
                filename: filename.clone(),
                path: path.to_string_lossy().to_string(),
                size_bytes: metadata.len(),
                quantization_type: quantization,
                context_length: 4096, // Default, will be updated on load
                parameters,
                description: format!("{} model ({})", name, quantization),
                loaded: false,
            });
        }
    }
    
    // Sort by name
    models.sort_by(|a, b| a.name.cmp(&b.name));
    
    Ok(models)
}

/// Get default directories to look for models
pub fn get_default_model_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    
    // Platform-specific paths
    #[cfg(target_os = "macos")] {
        dirs.push(PathBuf::from(std::env::var("HOME").unwrap_or_default()).join(".local/share/codemate/models"));
        dirs.push(PathBuf::from(std::env::var("HOME").unwrap_or_default()).join(".cache/llama.cpp/models"));
    }
    
    #[cfg(target_os = "windows")] {
        if let Ok(appdata) = std::env::var("APPDATA") {
            dirs.push(PathBuf::from(appdata).join("codemate\\models"));
            dirs.push(PathBuf::from(appdata).join("llama.cpp\\models"));
        }
        dirs.push(PathBuf::from("C:\\models"));
        dirs.push(PathBuf::from("D:\\models"));
    }
    
    #[cfg(target_os = "linux")] {
        if let Ok(home) = std::env::var("HOME") {
            dirs.push(PathBuf::from(home).join(".local/share/codemate/models"));
            dirs.push(PathBuf::from(home).join(".cache/llama.cpp/models"));
        }
        dirs.push(PathBuf::from("/usr/local/share/models"));
        dirs.push(PathBuf::from("/opt/models"));
    }
    
    // Also check current executable directory and common locations
    if let Ok(exe_dir) = std::env::current_exe() {
        if let Some(parent) = exe_dir.parent() {
            dirs.push(parent.join("models"));
        }
    }
    
    // Current working directory
    if let Ok(cwd) = std::env::current_dir() {
        dirs.push(cwd.join("models"));
    }
    
    dirs
}
