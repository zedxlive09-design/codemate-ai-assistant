// Model Commands for Tauri
//
// These commands handle LLM model operations:
// - Loading/unloading GGUF models
// - Text generation (streaming and non-streaming)
// - Listing available models

use tauri::State;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use crate::model::{ModelState, LoadedModel, InferenceSettings, LoadModelResult, ModelConfig};

/// Load a GGUF model into memory
#[tauri::command]
pub async fn load_model(
    model_path: String,
    state: State<'_, Mutex<ModelState>>,
) -> Result<LoadModelResult, String> {
    let mut state = state.lock().map_err(|e| e.to_string())?;
    
    // Check if file exists
    if !std::path::Path::new(&model_path).exists() {
        return Ok(LoadModelResult {
            success: false,
            message: format!("Model file not found: {}", model_path),
        });
    }
    
    // Get file metadata
    let metadata = std::fs::metadata(&model_path).map_err(|e| e.to_string())?;
    let filename = model_path.split('/').last().unwrap_or("unknown").to_string();
    
    // Extract model info from filename (simple heuristic)
    let name = extract_model_name(&filename);
    let parameters = extract_parameters(&filename);
    
    // In production, this would actually load the llama.cpp model here
    // For now, we simulate loading with metadata
    state.loaded_model = Some(LoadedModel {
        name: name.clone(),
        path: model_path.clone(),
        parameters: parameters.clone(),
        context_length: 8192, // Default context length
    });
    state.model_path = Some(model_path);
    
    Ok(LoadModelResult {
        success: true,
        message: format!("Successfully loaded model: {}", name),
    })
}

/// Unload current model from memory
#[tauri::command]
pub async fn unload_model(
    state: State<'_, Mutex<ModelState>>,
) -> Result<(), String> {
    let mut state = state.lock().map_err(|e| e.to_string())?;
    
    state.loaded_model = None;
    state.model_path = None;
    
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

/// Generate completion from the model
#[tauri::command]
pub async fn generate(
    prompt: String,
    settings: Option<InferenceSettings>,
    state: State<'_, Mutex<ModelState>>,
) -> Result<String, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    
    if state.loaded_model.is_none() {
        return Err("No model loaded. Please load a model first.".to_string());
    }
    
    let settings = settings.unwrap_or_default();
    
    // In production, this would call llama.cpp for actual inference
    // For demo purposes, return a simulated response
    Ok(generate_demo_response(&prompt))
}

/// List available models from default directories
#[tauri::command]
pub async fn list_models() -> Result<Vec<ModelConfig>, String> {
    let mut models = Vec::new();
    
    // Common model directories to check
    let model_dirs = vec![
        dirs::home_dir().map(|d| d.join(".codemate").join("models")),
        dirs::data_dir().map(|d| d.join("codemate").join("models")),
        Some(std::path::PathBuf::from("./models")),
    ];
    
    for dir_opt in model_dirs {
        if let Some(dir) = dir_opt {
            if dir.exists() {
                scan_directory_for_models(&dir, &mut models)?;
            }
        }
    }
    
    Ok(models)
}

// Helper functions

fn extract_model_name(filename: &str) -> String {
    filename
        .replace("-q4_k_m.gguf", "")
        .replace("-q5_k_m.gguf", "")
        .replace("-q8_0.gguf", "")
        .replace(".gguf", "")
        .replace("-", " ")
        .split_whitespace()
        .map(|w| {
            let mut chars = w.chars();
            match chars.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
            }
        })
        .collect()
}

fn extract_parameters(filename: &str) -> String {
    if filename.contains("7b") || filename.contains("7B") {
        "7B".to_string()
    } else if filename.contains("13b") || filename.contains("13B") {
        "13B".to_string()
    } else if filename.contains("70b") || filename.contains("70B") {
        "70B".to_string()
    } else if filename.contains("6.7") || filename.contains("6_7") {
        "6.7B".to_string()
    } else {
        "Unknown".to_string()
    }
}

fn scan_directory_for_models(dir: &std::path::Path, models: &mut Vec<ModelConfig>) -> Result<(), String> {
    if !dir.is_dir() {
        return Ok(());
    }
    
    let entries = std::fs::read_dir(dir).map_err(|e| e.to_string())?;
    
    for entry in entries.flatten() {
        let path = entry.path();
        
        if path.extension().map_or(false, |ext| ext == "gguf") {
            if let Ok(metadata) = std::fs::metadata(&path) {
                let filename = path.file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                
                models.push(ModelConfig {
                    id: filename.clone(),
                    name: extract_model_name(&filename),
                    filename: filename.clone(),
                    path: path.to_string_lossy().to_string(),
                    size_bytes: metadata.len(),
                    quantization_type: extract_quantization(&filename),
                    context_length: 8192,
                    parameters: extract_parameters(&filename),
                    description: "Local GGUF model".to_string(),
                    loaded: false,
                });
            }
        }
    }
    
    Ok(())
}

fn extract_quantization(filename: &str) -> String {
    let lower = filename.to_lowercase();
    if lower.contains("q4_k_m") {
        "Q4_K_M".to_string()
    } else if lower.contains("q4_k_s") {
        "Q4_K_S".to_string()
    } else if lower.contains("q5_k_m") {
        "Q5_K_M".to_string()
    } else if lower.contains("q5_k_s") {
        "Q5_K_S".to_string()
    } else if lower.contains("q8_0") {
        "Q8_0".to_string()
    } else if lower.contains("f16") {
        "F16".to_string()
    } else {
        "Unknown".to_string()
    }
}

fn generate_demo_response(prompt: &str) -> String {
    format!(r#"I understand you're asking about this topic. Let me help!

## Analysis

Based on your request about **{}**, here's what I can tell you:

### Key Points:
1. **Understanding**: I've analyzed your query carefully
2. **Solution**: Here's my recommended approach
3. **Implementation**: Code examples are provided below

### Example Code:

\`\`\`typescript
// Solution implementation
function solveProblem(input: string): Result {{
  // Step 1: Process input
  const processed = preprocess(input);
  
  // Step 2: Apply logic
  const result = applyLogic(processed);
  
  // Step 3: Return result
  return result;
}}

// Usage example
const output = solveProblem("example");
console.log(output);
\`\`\`

### Next Steps:
- Review the code above
- Adapt it to your specific needs
- Test thoroughly in your environment

> 💡 **Note**: This is a demo response. Connect a local LLM model for full AI capabilities!

---

*Generated by CodeMate - Your Offline AI Assistant*"#, prompt.chars().take(50).collect::<String>())
}
