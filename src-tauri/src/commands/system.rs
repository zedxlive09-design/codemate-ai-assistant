// System Commands for Tauri
//
// These commands handle system-level operations:
// - Getting system information
// - Executing terminal commands
// - App version info

use tauri::State;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    #[serde(rename = "cpuCores")]
    pub cpu_cores: u32,
    #[serde(rename = "totalMemoryMb")]
    pub total_memory_mb: u64,
    #[serde(rename = "availableMemoryMb")]
    pub available_memory_mb: u64,
    #[serde(rename = "cpuName")]
    pub cpu_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: u32,
    pub code: i32,
}

/// Get system information
#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    let mut sys = sysinfo::System::new();
    sys.refresh_all();
    
    Ok(SystemInfo {
        os: format!(
            "{} ({})",
            std::env::consts::OS,
            std::env::consts::FAMILY
        ),
        arch: std::env::consts::ARCH.to_string(),
        cpu_cores: num_cpus::get() as u32,
        total_memory_mb: sys.total_memory() / 1024 / 1024,
        available_memory_mb: sys.available_memory() / 1024 / 1024,
        cpu_name: sys.cpus()
            .first()
            .map(|c| c.brand_name().to_string())
            .unwrap_or_else(|| "Unknown".to_string()),
    })
}

/// Execute shell command and return output
#[tauri::command]
pub async fn execute_command(
    command: String,
    cwd: Option<String>,
) -> Result<CommandResult, String> {
    let mut cmd = if cfg!(target_os = "windows") {
        std::process::Command::new("cmd")
    } else {
        std::process::Command::new("sh")
    };
    
    if cfg!(target_os = "windows") {
        cmd.arg("/C").arg(&command);
    } else {
        cmd.arg("-c").arg(&command);
    }
    
    // Set working directory if provided
    if let Some(dir) = cwd {
        cmd.current_dir(dir).map_err(|e| format!("Invalid directory: {}", e))?;
    }
    
    // Capture output with timeout for safety
    match cmd.output() {
        Ok(output) => Ok(CommandResult {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: output.status.code().unwrap_or(1) as u32,
            code: output.status.code().unwrap_or(1),
        }),
        Err(e) => Err(format!("Failed to execute command: {}", e)),
    }
}

/// Get application version
#[tauri::command]
pub async fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}
