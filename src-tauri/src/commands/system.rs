// System Commands for Tauri
//
// These commands handle system-level operations:
// - Getting system information
// - Executing terminal commands
// - Killing a process by PID
// - Opening an external URL in the user's default browser
// - App version info

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::Duration;
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

/// Maximum wall-clock time a single `execute_command` invocation may take.
/// Anything still running after this is killed and surfaced as a timeout
/// error so a hung child process can never stall the Tokio worker thread
/// (and therefore every other Tauri command) indefinitely.
const COMMAND_TIMEOUT_SECS: u64 = 60;

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

/// Result of `execute_command`.
///
/// `stdout` / `stderr` are the captured UTF-8 decoded child streams. `code`
/// is the exit status (negative on Unix signal termination, e.g. -9 for
/// SIGKILL). The frontend `src/lib/tauri.ts` types `stderr` as `number`,
/// which is a legacy misnomer — the orchestrator will update the TS type
/// to `string` to match this corrected Rust definition.
#[derive(Debug, Serialize, Deserialize)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

/// Get system information
#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    // sysinfo refresh is blocking on process enumeration; run on a worker
    // thread so we don't stall the Tokio runtime's async executor.
    let sys = tokio::task::spawn_blocking(|| {
        let mut sys = sysinfo::System::new();
        sys.refresh_all();
        sys
    })
    .await
    .map_err(|e| format!("System info task failed: {}", e))?;

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
        cpu_name: sys
            .cpus()
            .first()
            .map(|c| c.brand().to_string())
            .unwrap_or_else(|| "Unknown".to_string()),
    })
}

/// Execute a shell command and return its captured output.
///
/// SECURITY/RELIABILITY NOTES:
/// - The command string is forwarded to `sh -c` / `cmd /C`. Callers MUST
///   treat any user-controlled input as shell-injected. The frontend
///   terminal panel is the only legitimate caller; this command is NOT
///   safe to expose to web content you don't control.
/// - Uses `tokio::process::Command` (NOT `std::process::Command`) so the
///   Tokio worker thread is never blocked. The child is killed if it
///   exceeds `COMMAND_TIMEOUT_SECS`.
/// - `cwd` is canonicalized before being passed to the child so a caller
///   cannot trick the OS into resolving a relative path against the
///   backend's CWD.
#[tauri::command]
pub async fn execute_command(
    command: String,
    cwd: Option<String>,
) -> Result<CommandResult, String> {
    use std::process::Stdio;
    use tokio::process::Command;
    use tokio::time::timeout;

    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("cmd");
        c.arg("/C").arg(&command);
        c
    } else {
        let mut c = Command::new("sh");
        c.arg("-c").arg(&command);
        c
    };

    // Canonicalize cwd if provided. Reject if it doesn't exist.
    if let Some(dir) = cwd {
        let path = PathBuf::from(&dir);
        let canonical = path
            .canonicalize()
            .map_err(|e| format!("Directory cannot be resolved ({}): {}", dir, e))?;
        if !canonical.is_dir() {
            return Err(format!("Not a directory: {}", canonical.display()));
        }
        cmd.current_dir(canonical);
    }

    cmd.stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        // If the timeout below fires, the `wait_with_output` future is
        // dropped, which drops the Child handle. `kill_on_drop(true)`
        // makes that drop send SIGKILL/TerminateProcess so we do not
        // leak orphaned child processes when a command hangs.
        .kill_on_drop(true);

    // Spawn first so we own a Child we can kill on timeout.
    let child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn command: {}", e))?;

    // `wait_with_output` consumes the child and reads stdout/stderr to EOF.
    let result = timeout(
        Duration::from_secs(COMMAND_TIMEOUT_SECS),
        child.wait_with_output(),
    )
    .await;

    match result {
        Ok(Ok(output)) => Ok(CommandResult {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            code: output.status.code().unwrap_or(-1),
        }),
        Ok(Err(e)) => Err(format!("Command failed to complete: {}", e)),
        Err(_) => {
            // Timeout elapsed. The future has been dropped, which drops
            // the Child, which (because of `kill_on_drop(true)` above)
            // terminates the child process.
            Err(format!(
                "Command timed out after {}s",
                COMMAND_TIMEOUT_SECS
            ))
        }
    }
}

/// Kill a process by PID.
///
/// Used by the terminal panel to stop a long-running command started via
/// `execute_command`. The PID must belong to a process visible to the
/// current user — we do not grant elevated kill capability.
#[tauri::command]
pub async fn kill_process(pid: u32) -> Result<(), String> {
    use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate};

    // sysinfo refresh is blocking; run on a worker thread.
    let pid_usize = pid as usize;
    let killed = tokio::task::spawn_blocking(move || -> Result<bool, String> {
        let mut sys = sysinfo::System::new();
        // sysinfo 0.32.x signature:
        //   refresh_processes_specifics(ProcessesToUpdate, refresh_users: bool, ProcessRefreshKind)
        // We only need the process table populated enough to find the PID,
        // so use a no-op refresh kind (we don't need cpu/memory stats).
        sys.refresh_processes_specifics(
            ProcessesToUpdate::All,
            true,
            ProcessRefreshKind::new(),
        );
        match sys.process(Pid::from_u32(pid)) {
            Some(proc) => {
                // `Process::kill` on sysinfo 0.32 sends the platform's
                // default termination signal (SIGTERM on Unix, TerminateProcess on Windows).
                let did = proc.kill();
                Ok(did)
            }
            None => Err(format!("No process found with PID {}", pid_usize)),
        }
    })
    .await
    .map_err(|e| format!("Kill task failed: {}", e))??;

    if killed {
        Ok(())
    } else {
        Err(format!(
            "Failed to kill process {} (permission denied or already exited)",
            pid
        ))
    }
}

/// Open an external URL in the user's default browser / handler.
///
/// Uses `tauri_plugin_shell::open`, which respects the `shell:allow-open`
/// capability grant in `capabilities/default.json`. The URL is validated
/// to start with `http://`, `https://`, or `mailto:` to prevent arbitrary
/// `file://` / `smb://` / `javascript:` schemes from being launched.
#[tauri::command]
pub async fn open_external(app: AppHandle, url: String) -> Result<(), String> {
    let lower = url.to_lowercase();
    let allowed = lower.starts_with("https://")
        || lower.starts_with("http://")
        || lower.starts_with("mailto:");
    if !allowed {
        return Err(format!(
            "Refusing to open URL with disallowed scheme: {}",
            url
        ));
    }
    app.shell()
        .open(url, None)  // deprecated in tauri-plugin-shell 2.x but functional;
                          // migrate to tauri-plugin-opener in a future release.
        .map_err(|e| format!("Failed to open URL: {}", e))
}

/// Get application version
#[tauri::command]
pub async fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}
