// CodeMate AI Assistant - Tauri Backend
//
// This module handles all backend operations for the AI assistant:
// - Model loading and inference (via Ollama)
// - File system operations
// - Project analysis
// - Terminal command execution

mod commands;
mod model;
mod project;

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // === MODEL COMMANDS ===
            commands::model::load_model,
            commands::model::unload_model,
            commands::model::is_model_loaded,
            commands::model::get_loaded_model_info,
            commands::model::generate,
            commands::model::generate_streaming,
            commands::model::stop_generation,
            commands::model::list_models,
            commands::model::list_models_in_directory,
            commands::model::get_model_directories,
            commands::model::ensure_model_directory,
            commands::model::validate_model_file,
            commands::model::check_ollama_available,
            commands::model::pull_ollama_model,
            commands::model::get_inference_system_info,
            commands::model::get_gpu_info,
            // === PROJECT COMMANDS ===
            commands::project::list_directory,
            commands::project::analyze_project,
            commands::project::search_code,
            commands::project::get_file_stats,
            // === SYSTEM COMMANDS ===
            commands::system::get_system_info,
            commands::system::execute_command,
            commands::system::get_app_version,
        ])
        .setup(|app| {
            // Initialize app state with model manager
            app.manage(model::ModelState::default());
            
            // Log startup info
            log::info!(target: "app", "CodeMate AI Assistant starting up...");
            
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
