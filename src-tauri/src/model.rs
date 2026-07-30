// Model Management Module
//
// Handles loading, unloading, and inference with local GGUF models.
// Uses llama.cpp for CPU-optimized inference via llama_cpp_rs bindings.
//
// PHASE 9: Real LLM Inference Implementation

use std::sync::Mutex;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

// Re-export llama_cpp_rs types for use in commands
pub use llama_cpp_rs;

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
    /// The actual llama.cpp model instance
    model: Option<llama_cpp_rs::LlamaModel>,
    /// The context for generation (created on demand or at load)
    context: Option<llama_cpp_rs::LlamaContext>,
}

impl LoadedModel {
    pub fn new(
        name: String, 
        path: String, 
        parameters: String, 
        context_length: u32,
        model: llama_cpp_rs::LlamaModel,
        context: llama_cpp_rs::LlamaContext,
    ) -> Self {
        Self {
            name,
            path,
            parameters,
            context_length,
            model: Some(model),
            context: Some(context),
        }
    }
    
    /// Get model info as a display string
    pub fn info(&self) -> String {
        format!("{} ({}) - Context: {}", self.name, self.parameters, self.context_length)
    }
    
    /// Check if model is actually loaded (has real backend)
    pub fn is_real(&self) -> bool {
        self.model.is_some() && self.context.is_some()
    }
    
    /// Get reference to model for inference
    pub fn get_model(&self) -> Option<&llama_cpp_rs::LlamaModel> {
        self.model.as_ref()
    }
    
    /// Get mutable reference to context for inference
    pub fn get_context_mut(&mut self) -> Option<&mut llama_cpp_rs::LlamaContext> {
        self.context.as_mut()
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
// MODEL LOADING AND INFERENCE ENGINE - REAL IMPLEMENTATION
// ============================================================================

/// Load a GGUF model from disk with actual llama.cpp backend
/// 
/// This function:
/// 1. Validates the file exists and is a valid GGUF
/// 2. Checks available system memory
/// 3. Loads the model into RAM using llama.cpp
/// 4. Creates a context for generation
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
    
    // Step 3: Actually load the model with llama.cpp
    log::info!(target: "model", "Loading model into memory ({:.2} MB)...", 
              file_size as f64 / (1024.0 * 1024.0));
    
    // Configure model parameters
    let model_params = llama_cpp_rs::ModelParams::default()
        .with_n_gpu_layers(0); // CPU only for now
    
    // Load the model
    let model = match llama_cpp_rs::LlamaModel::load_from_file(&path, model_params) {
        Ok(m) => m,
        Err(e) => {
            log::error!(target: "model", "Failed to load model: {}", e);
            return Ok(LoadModelResult {
                success: false,
                message: format!("Failed to load GGUF model: {}. Ensure the file is a valid GGUF format.", e),
                model_info: None,
            });
        }
    };
    
    log::info!(target: "model", "Model loaded successfully!");
    log::info!(target: "model", "  - Vocabulary size: {}", model.vocabulary_size());
    log::info!(target: "model", "  - Context size: {}", model.context_length());
    log::info!(target: "model", "  - Total parameters: {:?}", model.total_parameters());
    
    // Determine context length (use smaller of model max or our calculated value)
    let model_ctx_len = model.context_length();
    let calculated_ctx = calculate_context_length(file_size, available_memory);
    let context_length = model_ctx_len.min(calculated_ctx);
    
    // Step 4: Create context for generation
    let num_threads = num_cpus::get();
    
    let context_params = llama_cpp_rs::ContextParams::default()
        .with_n_ctx(context_length)
        .with_n_threads(num_threads);
    
    let context = match llama_cpp_rs::LlamaContext::new_with_model(&model, context_params) {
        Ok(ctx) => ctx,
        Err(e) => {
            log::error!(target: "model", "Failed to create context: {}", e);
            return Ok(LoadModelResult {
                success: false,
                message: format!("Failed to create inference context: {}", e),
                model_info: None,
            });
        }
    };
    
    log::info!(target: "model", "Context created with {} threads, {} context length", 
              num_threads, context_length);
    
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
            "Successfully loaded model: {} ({}, {}, {:.2} MB)",
            name,
            parameters,
            quantization,
            file_size as f64 / (1024.0 * 1024.0)
        ),
        model_info: Some(model_info),
    })
}

/// Create a loaded model instance from path (returns the actual model + context)
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
    
    // Load model
    let model_params = llama_cpp_rs::ModelParams::default().with_n_gpu_layers(0);
    let model = llama_cpp_rs::LlamaModel::load_from_file(&path, model_params)
        .map_err(|e| format!("Failed to load model: {}", e))?;
    
    // Create context
    let num_threads = num_cpus::get();
    let context_params = llama_cpp_rs::ContextParams::default()
        .with_n_ctx(context_length)
        .with_n_threads(num_threads);
    let context = llama_cpp_rs::LlamaContext::new_with_model(&model, context_params)
        .map_err(|e| format!("Failed to create context: {}", e))?;
    
    Ok(LoadModel::new(name, model_path.to_string(), parameters, context_length, model, context))
}

/// Generate text using the loaded model with REAL llama.cpp inference
/// 
/// This implements the complete generation loop:
/// 1. Tokenize the prompt
/// 2. Evaluate prompt tokens
/// 3. Generate tokens one by one with sampling
/// 4. Stream each token via callback
pub fn generate_text(
    prompt: &str,
    settings: &InferenceSettings,
    model: &llama_cpp_rs::LlamaModel,
    context: &mut llama_cpp_rs::LlamaContext,
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
    log::debug!(target: "inference", "Prompt length: {} chars", prompt.len());
    
    // Step 1: Tokenize the prompt
    let mut tokens = match model.tokenize(prompt, true) {
        Ok(t) => t,
        Err(e) => return Err(format!("Tokenization failed: {}", e)),
    };
    
    log::debug!(target: "inference", "Prompt tokenized into {} tokens", tokens.len());
    
    // Check we don't exceed context length
    let n_ctx = context.n_ctx();
    if tokens.len() + max_tokens as usize > n_ctx as usize {
        // Truncate prompt if needed
        let max_prompt_tokens = n_ctx as usize - max_tokens as usize - 10; // Leave some room
        if tokens.len() > max_prompt_tokens {
            log::warn!(target: "inference", "Truncating prompt from {} to {} tokens", 
                      tokens.len(), max_prompt_tokens);
            tokens = tokens.into_iter().rev().take(max_prompt_tokens).collect::<Vec<_>>();
            tokens.reverse();
        }
    }
    
    // Step 2: Evaluate all prompt tokens
    // Clear any existing context first
    context.clear();
    
    // Process tokens in batches (more efficient)
    let batch_size = 512.min(tokens.len());
    let mut processed = 0;
    
    while processed < tokens.len() {
        let end = (processed + batch_size).min(tokens.len());
        let batch_tokens = &tokens[processed..end];
        
        // Create batch and evaluate
        let mut batch = llama_cpp_rs::Batch::new(batch_size as i32, 0, 1);
        
        for &token in batch_tokens {
            batch.add(token, processed as i32, &[true], false);
        }
        
        if let Err(e) = context.decode(batch) {
            return Err(format!("Failed to decode prompt tokens: {}", e));
        }
        
        processed = end;
    }
    
    log::debug!(target: "inference", "Prompt evaluated, starting generation loop");
    
    // Step 3: Generation loop with sampling
    let mut generated_text = String::new();
    let mut generated_count: u32 = 0;
    
    // Get EOS token id
    let eos_token_id = model.token_eos();
    
    // Sampling config
    let temp = settings.temperature.max(0.0); // Clamp to non-negative
    
    // Track previously generated tokens for repeat penalty
    let mut prev_tokens: Vec<llama_cpp_rs::Token> = Vec::new();
    
    while generated_count < max_tokens {
        // Get logits for next token
        let logits = context.get_logits().ok_or("Failed to get logits")?;
        
        // Apply sampling
        let next_token = if temp <= 0.0 {
            // Greedy decoding when temperature is 0
            sample_greedy(logits)
        } else {
            // Sample with temperature, top_k, top_p, repeat_penalty
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
        if next_token == eos_token_id {
            log::info!(target: "inference", "EOS token received after {} tokens", generated_count);
            break;
        }
        
        // Convert token to string
        let token_str = match model.detokenize(Some(next_token), false) {
            Ok(s) => s,
            Err(_) => continue, // Skip invalid tokens
        };
        
        // Track this token for repeat penalty
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
        
        // Add token to context for next iteration
        let mut batch = llama_cpp_rs::Batch::new(1, tokens.len() as i32 + generated_count as i32, 1);
        batch.add(next_token, (tokens.len() + generated_count as usize - 1) as i32, &[true], true);
        
        if let Err(e) = context.decode(batch) {
            log::warn!(target: "inference", "Decode error during generation: {}", e);
            break;
        }
        
        // Check for stop sequences
        let should_stop = settings.stop_sequences.iter().any(|seq| {
            if seq.is_empty() { return false; }
            generated_text.contains(seq.as_str())
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
fn sample_greedy(logits: &[f32]) -> llama_cpp_rs::Token {
    let mut best_idx = 0usize;
    let mut best_score = f32::NEG_INFINITY;
    
    for (i, &score) in logits.iter().enumerate() {
        if score > best_score {
            best_score = score;
            best_idx = i;
        }
    }
    
    llama_cpp_rs::Token::new(best_idx as i32)
}

/// Sample a token with temperature, top-k, top-p filtering, and repeat penalty
fn sample_token(
    logits: &[f32],
    temperature: f64,
    top_k: u32,
    top_p: f64,
    repeat_penalty: f64,
    _eos_token: llama_cpp_rs::Token,
    prev_tokens: &[llama_cpp_rs::Token],
) -> llama_cpp_rs::Token {
    let vocab_size = logits.len();
    
    // Step 1: Apply repeat penalty to tokens that exist in previous context
    let mut penalized_logits: Vec<f32> = logits.to_vec();
    if repeat_penalty > 1.0 && !prev_tokens.is_empty() {
        let token_set: std::collections::HashSet<i32> = prev_tokens.iter()
            .map(|t| t.id())
            .collect();
        
        for (i, logit) in penalized_logits.iter_mut().enumerate() {
            if token_set.contains(&(i as i32)) {
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
    
    // Step 4: Apply top-k filter - set non-top-k logits to -infinity
    let k = top_k as usize.min(vocab_size);
    let mut filtered_logits = vec![f32::NEG_INFINITY; vocab_size];
    for (rank, &idx) in indices.iter().enumerate() {
        if rank < k {
            filtered_logits[idx] = scaled_logits[idx];
        } else {
            filtered_logits[idx] = f32::NEG_INFINITY;
        }
    }
    
    // Step 5: Convert to probabilities via softmax (with -inf handling)
    let mut probs: Vec<f32> = (0..vocab_size)
        .map(|i| {
            if filtered_logits[i] == f32::NEG_INFINITY {
                0.0f32
            } else {
                softmax_single(filtered_logits[i], &filtered_logits)
            }
        })
        .collect();
    
    // Step 6: Apply top-p (nucleus) filtering - sort by probability descending
    let mut prob_indices: Vec<(f32, usize)> = probs.iter().cloned().zip(0..vocab_size).collect();
    prob_indices.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
    
    let mut cumsum = 0.0f32;
    let mut cutoff_prob = top_p as f32;
    
    for &(prob, _) in &prob_indices {
        cumsum += prob;
        if cumsum > cutoff_prob {
            break;
        }
    }
    
    // Renormalize after top-p cutoff
    let total_prob: f32 = prob_indices.iter()
        .take_while(|&&(p, _)| { cumsum -= p; cumsum >= 0.0 })
        .map(|&(p, _)| p)
        .sum();
    
    // Simpler approach: just zero out beyond cumulative > top_p
    let mut final_probs = vec![0.0f32; vocab_size];
    let mut running_sum = 0.0f32;
    let mut tokens_included = 0usize;
    
    for &(prob, idx) in &prob_indices {
        if running_sum <= top_p as f32 || tokens_included < 2 {
            final_probs[idx] = prob;
            running_sum += prob;
            tokens_included += 1;
        }
    }
    
    // Normalize to sum to 1.0
    let sum: f32 = final_probs.iter().sum();
    if sum > 0.0 {
        for p in final_probs.iter_mut() {
            *p /= sum;
        }
    }
    
    // Step 7: Sample from final distribution
    let dist = rand_distr::Uniform::new(0.0f32, 1.0);
    let mut rng = rand::thread_rng();
    let rand_val: f32 = dist.sample(&mut rng);
    
    // Find token by cumulative probability
    let mut cumulative = 0.0f32;
    for (i, prob) in final_probs.iter().enumerate() {
        cumulative += prob;
        if cumulative >= rand_val || i == vocab_size - 1 {
            return llama_cpp_rs::Token::new(i as i32);
        }
    }
    
    // Fallback: return highest probability token
    llama_cpp_rs::Token::new(indices[0] as i32)
}

/// Softmax for a single element given all values
fn softmax_single(x: f32, all: &[f32]) -> f32 {
    let max_val = all.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
    let exp_sum: f32 = all.iter().map(|&v| (v - max_val).exp()).sum();
    ((x - max_val).exp()) / exp_sum
}

/// Sort values with their original indices
fn sort_with_indices(values: &[f32], descending: bool) -> Vec<(f32, usize)> {
    let mut indexed: Vec<(f32, usize)> = values.iter().clipped().zip(0..).collect();
    if descending {
        indexed.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
    } else {
        indexed.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
    }
    indexed
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Calculate appropriate context length based on model size and available memory
fn calculate_context_length(model_size_bytes: u64, available_memory_bytes: u64) -> u32 {
    let available_gb = available_memory_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
    let model_mb = model_size_bytes as f64 / (1024.0 * 1024.0);
    
    // Context needs roughly: tokens * 2 bytes per token * layers (rough estimate)
    // For 7B Q4: ~6 bytes per token of context
    let bytes_per_token = match model_mb {
        x if x > 20000.0 => 20.0,  // 70B models
        x if x > 10000.0 => 12.0,  // 30B models
        x if x > 5000.0 => 6.0,    // 13B models
        _ => 4.0,                    // 7B and smaller
    };
    
    let max_context_by_mem = (available_memory_bytes as f64 * 0.5) / bytes_per_token; // Use up to 50% of remaining RAM
    
    // Return reasonable context length
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
        Err(_) => 16_000_000_000, // Default 16GB if can't detect
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
    
    // Capitalize each word
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
pub fn extract_parameters(filename: &str) -> String {
    let lower = filename.to_lowercase();
    
    if lower.contains("70b") || lower.contains("70_b") {
        "70B".to_string()
    } else if lower.contains("34b") || lower.contains("34_b") {
        "34B".to_string()
    } else if lower.contains("27b") || lower.contains("27_b") {
        "27B".to_string()
    } else if lower.contains("14b") || lower.contains("14_b") {
        "14B".to_string()
    } else if lower.contains("13b") || lower.contains("13_b") {
        "13B".to_string()
    } else if lower.contains("12b") || lower.contains("12_b") {
        "12B".to_string()
    } else if lower.contains("11b") || lower.contains("11_b") {
        "11B".to_string()
    } else if lower.contains("9b") || lower.contains("9_b") || lower.contains("yi-9b") {
        "9B".to_string()
    } else if lower.contains("8b") || lower.contains("8_b") {
        "8B".to_string()
    } else if lower.contains("7b") || lower.contains("7_b") || lower.contains("mistral") {
        "7B".to_string()
    } else if lower.contains("6.7b") || lower.contains("6_7b") {
        "6.7B".to_string()
    } else if lower.contains("6b") || lower.contains("6_b") {
        "6B".to_string()
    } else if lower.contains("5b") || lower.contains("5_b") {
        "5B".to_string()
    } else if lower.contains("4b") || lower.contains("4_b") {
        "4B".to_string()
    } else if lower.contains("3b") || lower.contains("3_b") || lower.contains("phi-3") {
        "3B".to_string()
    } else if lower.contains("2.7b") || lower.contains("2_7b") {
        "2.7B".to_string()
    } else if lower.contains("2b") || lower.contains("2_b") {
        "2B".to_string()
    } else if lower.contains("1.8b") || lower.contains("1_8b") {
        "1.8B".to_string()
    } else if lower.contains("1b") || lower.contains("1_b") {
        "1B".to_string()
    } else if lower.contains("0.5b") || lower.contains("0_5b") {
        "0.5B".to_string()
    } else {
        "Unknown".to_string()
    }
}

/// Extract quantization type from filename
pub fn extract_quantization(filename: &str) -> String {
    let lower = filename.to_lowercase();
    
    if lower.contains("q8_0") {
        "Q8_0".to_string()
    } else if lower.contains("q6_k") {
        "Q6_K".to_string()
    } else if lower.contains("q5_k_m") {
        "Q5_K_M".to_string()
    } else if lower.contains("q5_k_s") {
        "Q5_K_S".to_string()
    } else if lower.contains("q5_0") {
        "Q5_0".to_string()
    } else if lower.contains("q5_1") {
        "Q5_1".to_string()
    } else if lower.contains("q4_k_m") {
        "Q4_K_M".to_string()
    } else if lower.contains("q4_k_s") {
        "Q4_K_S".to_string()
    } else if lower.contains("q4_0") {
        "Q4_0".to_string()
    } else if lower.contains("q4_1") {
        "Q4_1".to_string()
    } else if lower.contains("q3_k_m") {
        "Q3_K_M".to_string()
    } else if lower.contains("q3_k_s") {
        "Q3_K_S".to_string()
    } else if lower.contains("q3_k_l") {
        "Q3_K_L".to_string()
    } else if lower.contains("q2_k") {
        "Q2_K".to_string()
    } else if lower.contains("iq2_xxs") {
        "IQ2_XXS".to_string()
    } else if lower.contains("iq2_xs") {
        "IQ2_XS".to_string()
    } else if lower.contains("iq3_xxs") {
        "IQ3_XXS".to_string()
    } else if lower.contains("iq3_xs") {
        "IQ3_XS".to_string()
    } else if lower.contains("f16") || lower.contains("float16") {
        "F16".to_string()
    } else if lower.contains("f32") || lower.contains("float32") {
        "F32".to_string()
    } else {
        "Unknown".to_string()
    }
}

/// Scan a directory for GGUF model files
pub fn scan_directory_for_models(dir: &Path) -> Result<Vec<ModelConfig>, String> {
    let mut models = Vec::new();
    
    if !dir.is_dir() {
        return Ok(models);
    }
    
    let entries = std::fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {}", e))?;
    
    for entry in entries.flatten() {
        let path = entry.path();
        
        if path.extension().map_or(false, |ext| ext == "gguf") {
            if let Ok(metadata) = std::fs::metadata(&path) {
                let filename = path.file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                
                models.push(ModelConfig {
                    id: uuid::Uuid::new_v4().to_string(),
                    name: extract_model_name(&filename),
                    filename: filename.clone(),
                    path: path.to_string_lossy().to_string(),
                    size_bytes: metadata.len(),
                    quantization_type: extract_quantization(&filename),
                    context_length: calculate_context_length(metadata.len(), get_available_memory_bytes()),
                    parameters: extract_parameters(&filename),
                    description: format!("Local GGUF model ({})", extract_quantization(&filename)),
                    loaded: false,
                });
            }
        }
    }
    
    models.sort_by(|a, b| a.name.cmp(&b.name));
    
    Ok(models)
}

/// Get default model directories to scan
pub fn get_default_model_dirs() -> Vec<PathBuf> {
    let mut dirs = Vec::new();
    
    if let Some(home) = dirs::home_dir() {
        dirs.push(home.join(".codemate").join("models"));
    }
    
    if let Some(data_dir) = dirs::data_dir() {
        dirs.push(data_dir.join("codemate").join("models"));
    }
    
    dirs.push(PathBuf::from("./models"));
    
    dirs
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_extract_model_name() {
        assert_eq!(
            extract_model_name("Meta-Llama-3-8B-Instruct-Q4_K_M.gguf"),
            "Meta Llama 3 8B Instruct"
        );
        assert_eq!(
            extract_model_name("mistral-7b-instruct-v0.3-Q5_K_M.gguf"),
            "Mistral 7b Instruct V0.3"
        );
    }
    
    #[test]
    fn test_extract_parameters() {
        assert_eq!(extract_parameters("llama-3-8b-q4.gguf"), "8B");
        assert_eq!(extract_parameters("mistral-7b-v0.3.gguf"), "7B");
        assert_eq!(extract_parameters("codellama-70b-q4.gguf"), "70B");
    }
    
    #[test]
    fn test_extract_quantization() {
        assert_eq!(extract_quantization("model-Q4_K_M.gguf"), "Q4_K_M");
        assert_eq!(extract_quantization("model-Q8_0.gguf"), "Q8_0");
        assert_eq!(extract_quantization("model-f16.gguf"), "F16");
    }
}
