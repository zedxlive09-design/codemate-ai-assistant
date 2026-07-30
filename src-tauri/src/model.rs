// Model Management Module
//
// Handles loading, unloading, and inference with local GGUF models.
// Uses llama.cpp for CPU-optimized inference.

use std::sync::Mutex;
use serde::{Deserialize, Serialize};

#[derive(Default)]
pub struct ModelState {
    pub loaded_model: Option<LoadedModel>,
    pub model_path: Option<String>,
}

pub struct LoadedModel {
    pub name: String,
    pub path: String,
    // In production, this would hold the actual llama.cpp model instance
    // For now, we simulate with metadata
    pub parameters: String,
    pub context_length: u32,
}

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

#[derive(Debug, Serialize, Deserialize)]
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
    #[serde(rename = "threads", default = "default_threads")]
    pub threads: i32,
    #[serde(rename = "gpuLayers", default = "default_gpu_layers")]
    pub gpu_layers: u32,
}

fn default_temperature() -> f64 { 0.7 }
fn default_top_p() -> f64 { 0.9 }
fn default_top_k() -> u32 { 40 }
fn default_max_tokens() -> u32 { 4096 }
fn default_repeat_penalty() -> f64 { 1.1 }
fn default_threads() -> i32 { -1 } // Auto-detect
fn default_gpu_layers() -> u32 { 0 } // CPU only

impl Default for InferenceSettings {
    fn default() -> Self {
        Self {
            temperature: default_temperature(),
            top_p: default_top_p(),
            top_k: default_top_k(),
            max_tokens: default_max_tokens(),
            repeat_penalty: default_repeat_penalty(),
            threads: default_threads(),
            gpu_layers: default_gpu_layers(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoadModelResult {
    pub success: bool,
    pub message: String,
}
