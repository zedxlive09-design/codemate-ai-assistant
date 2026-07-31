// Project Commands for Tauri
//
// These commands handle project-related operations:
// - Directory listing and file tree building
// - Project analysis (languages, stats, structure)
// - Code search functionality

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Maximum directory recursion depth.
///
/// Guards against symlink cycles (e.g. `a -> b -> a`, or `dir -> ..` -> parent)
/// which would otherwise cause unbounded recursion and stack-overflow the
/// backend. 50 levels is well above any real-world project depth but small
/// enough to fail fast on a cycle.
const MAX_DIR_DEPTH: usize = 50;

/// Soft cap on the number of search results returned by `search_code`.
/// Without this, a `.*` regex over a large file tree could OOM the
/// backend / frontend.
const MAX_SEARCH_RESULTS: usize = 1000;

/// Skip files larger than this when reading for analysis/search.
/// Prevents loading a multi-GB log/binary into RAM.
const MAX_READABLE_FILE_BYTES: u64 = 5 * 1024 * 1024;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectFile {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<ProjectFile>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectAnalysis {
    pub path: String,
    #[serde(rename = "totalFiles")]
    pub total_files: usize,
    #[serde(rename = "totalLines")]
    pub total_lines: usize,
    pub languages: Vec<LanguageStats>,
    pub structure: Vec<ProjectFile>,
    pub summary: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LanguageStats {
    pub language: String,
    pub files: usize,
    pub lines: usize,
    #[serde(rename = "percentage")]
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub file: String,
    pub line: u32,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileStats {
    pub lines: u32,
    pub size: u64,
    pub language: String,
}

// ============================================================================
// PATH SANDBOX HELPER (H7)
// ============================================================================

/// Canonicalize a user-supplied path string.
///
/// - Resolves `..` and `.` segments, symlinks, and relative paths against
///   the backend's CWD via `std::fs::canonicalize`.
/// - Returns an error if the path does not exist or contains a `..` that
///   would escape (canonicalize resolves `..` lexically first; combined
///   with the existence check this rejects traversal attempts that point
///   outside the filesystem).
///
/// NOTE: This is a best-effort hardening. The CodeMate app does not yet
/// maintain a per-session "project root" allowlist — that requires a
/// folder-picker-driven root that the orchestrator should wire in a
/// follow-up. Until then, callers should at least reject obvious `..`
/// traversal before invoking Rust.
pub fn canonicalize_safe(path: &str) -> Result<PathBuf, String> {
    // Quick lexical reject: if the path contains a `..` segment, require
    // the caller to canonicalize explicitly. This catches the common
    // `../../../etc/passwd` attack without needing a configured root.
    let p = Path::new(path);
    for comp in p.components() {
        if matches!(comp, std::path::Component::ParentDir) {
            return Err(format!(
                "Path contains '..' segment, which is not allowed: {}",
                path
            ));
        }
    }
    PathBuf::from(path)
        .canonicalize()
        .map_err(|e| format!("Cannot resolve path '{}': {}", path, e))
}

/// Return true if `entry.path()` is a symlink.
///
/// Uses `symlink_metadata` (NOT `metadata`) so the check does NOT follow
/// the link — this is what guards against cycles.
fn is_symlink_path(path: &Path) -> bool {
    std::fs::symlink_metadata(path)
        .map(|m| m.file_type().is_symlink())
        .unwrap_or(false)
}

/// List files in directory recursively
#[tauri::command]
pub async fn list_directory(
    path: String,
    recursive: Option<bool>,
) -> Result<Vec<ProjectFile>, String> {
    let path = canonicalize_safe(&path)?;

    if !path.exists() {
        return Err(format!("Path does not exist: {}", path.display()));
    }

    let recursive = recursive.unwrap_or(true);
    let files = build_file_tree(&path, &path, recursive, 0)?;

    Ok(files)
}

/// Analyze entire project
#[tauri::command]
pub async fn analyze_project(project_path: String) -> Result<ProjectAnalysis, String> {
    let path = canonicalize_safe(&project_path)?;

    if !path.exists() {
        return Err(format!("Project path does not exist: {}", project_path));
    }

    // Collect all files
    let mut all_files: Vec<(PathBuf, u64)> = Vec::new();
    collect_files(&path, &mut all_files, 0)?;

    // Count lines and detect languages
    let mut language_stats: std::collections::HashMap<String, (usize, usize)> = std::collections::HashMap::new();
    let mut total_lines = 0;

    for (file_path, size) in &all_files {
        // Skip files that would blow memory if read wholesale.
        if *size > MAX_READABLE_FILE_BYTES {
            continue;
        }
        if let Ok(content) = std::fs::read_to_string(file_path) {
            let line_count = content.lines().count();
            total_lines += line_count;

            let lang = detect_language(file_path);
            let entry = language_stats.entry(lang).or_insert((0, 0));
            entry.0 += 1; // files count
            entry.1 += line_count; // lines count
        }
    }

    // Calculate percentages
    let mut languages: Vec<LanguageStats> = language_stats
        .into_iter()
        .map(|(lang, (files, lines))| LanguageStats {
            language: lang,
            files,
            lines,
            percentage: if total_lines > 0 { (lines as f64 / total_lines as f64) * 100.0 } else { 0.0 },
        })
        .collect();

    // Sort by percentage descending
    languages.sort_by(|a, b| b.percentage.partial_cmp(&a.percentage).unwrap_or(std::cmp::Ordering::Equal));

    // Build structure (first level only for summary)
    let structure = build_file_tree(&path, &path, false, 0)?;

    // Generate summary
    let summary = generate_summary(&all_files.len(), &total_lines, &languages);

    Ok(ProjectAnalysis {
        path: project_path,
        total_files: all_files.len(),
        total_lines,
        languages,
        structure,
        summary,
    })
}

/// Search codebase for pattern
#[tauri::command]
pub async fn search_code(
    pattern: String,
    path: String,
    file_pattern: Option<String>,
) -> Result<Vec<SearchResult>, String> {
    let base_path = canonicalize_safe(&path)?;
    let mut results = Vec::new();

    // Build regex from pattern
    let regex = regex::Regex::new(&pattern).map_err(|e| format!("Invalid regex: {}", e))?;

    // Collect and search files
    let mut all_files: Vec<PathBuf> = Vec::new();
    collect_files_for_search(&base_path, &mut all_files, file_pattern.as_deref(), 0)?;

    for file_path in all_files {
        // Skip files that would blow memory if read wholesale.
        if let Ok(meta) = std::fs::metadata(&file_path) {
            if meta.len() > MAX_READABLE_FILE_BYTES {
                continue;
            }
        }
        if let Ok(content) = std::fs::read_to_string(&file_path) {
            for (line_num, line) in content.lines().enumerate() {
                if regex.is_match(line) {
                    results.push(SearchResult {
                        file: file_path.to_string_lossy().to_string(),
                        line: (line_num + 1) as u32,
                        content: line.to_string(),
                    });
                    // Early-exit on cap to bound memory/CPU.
                    if results.len() >= MAX_SEARCH_RESULTS {
                        return Ok(results);
                    }
                }
            }
        }
    }

    Ok(results)
}

/// Get file statistics
#[tauri::command]
pub async fn get_file_stats(path: String) -> Result<FileStats, String> {
    let path = canonicalize_safe(&path)?;

    if !path.exists() {
        return Err(format!("File does not exist: {}", path.display()));
    }

    let metadata = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;

    Ok(FileStats {
        lines: content.lines().count() as u32,
        size: metadata.len(),
        language: detect_language(&path),
    })
}

// Helper functions

#[allow(clippy::ptr_arg)]
fn build_file_tree(
    base_path: &PathBuf,
    current_path: &PathBuf,
    recursive: bool,
    depth: usize,
) -> Result<Vec<ProjectFile>, String> {
    // Hard stop on depth to prevent symlink-cycle stack overflow.
    if depth > MAX_DIR_DEPTH {
        return Err(format!(
            "Max directory depth ({}) exceeded at {} — possible symlink cycle",
            MAX_DIR_DEPTH,
            current_path.display()
        ));
    }

    let mut entries = Vec::new();

    let read_dir = std::fs::read_dir(current_path).map_err(|e| e.to_string())?;

    let mut dirs: Vec<_> = Vec::new();
    let mut files: Vec<_> = Vec::new();

    for entry in read_dir.flatten() {
        let path = entry.path();

        // Skip symlinks (H6) — symlink_metadata does not follow the link,
        // so a cycle a -> b -> a is detected and skipped instead of recursing.
        if is_symlink_path(&path) {
            continue;
        }

        // Skip hidden files/directories
        if path.file_name()
            .map(|n| n.to_string_lossy().starts_with('.'))
            .unwrap_or(false)
        {
            continue;
        }

        if path.is_dir() {
            dirs.push(entry);
        } else {
            files.push(entry);
        }
    }

    // Sort: directories first, then by name
    dirs.sort_by(|a, b| a.file_name().cmp(&b.file_name()));
    files.sort_by(|a, b| a.file_name().cmp(&b.file_name()));

    // Add directories
    for dir in dirs {
        let path = dir.path();
        let name = dir.file_name().to_string_lossy().to_string();
        let relative_path = path.strip_prefix(base_path)
            .unwrap_or(&path)
            .to_string_lossy()
            .to_string();

        let children = if recursive {
            Some(build_file_tree(base_path, &path, recursive, depth + 1)?)
        } else {
            None
        };

        entries.push(ProjectFile {
            name,
            path: relative_path,
            is_directory: true,
            size: None,
            modified: None,
            children,
            language: None,
        });
    }

    // Add files
    for file in files {
        let path = file.path();
        let name = file.file_name().to_string_lossy().to_string();
        let relative_path = path.strip_prefix(base_path)
            .unwrap_or(&path)
            .to_string_lossy()
            .to_string();

        let metadata = std::fs::metadata(&path).ok();
        let size = metadata.as_ref().map(|m| m.len());
        let modified = metadata.as_ref().and_then(|m| m.modified().ok()).map(|t| {
            // Format as relative time or absolute
            let now = std::time::SystemTime::now();
            let duration = now.duration_since(t).ok();
            match duration {
                Some(d) if d.as_secs() < 60 => "Just now".to_string(),
                Some(d) if d.as_secs() < 3600 => format!("{}m ago", d.as_secs() / 60),
                Some(d) if d.as_secs() < 86400 => format!("{}h ago", d.as_secs() / 3600),
                Some(d) if d.as_secs() < 604800 => format!("{}d ago", d.as_secs() / 86400),
                _ => format!("{:?}", t),
            }
        });

        entries.push(ProjectFile {
            name,
            path: relative_path,
            is_directory: false,
            size,
            modified,
            children: None,
            language: Some(detect_language(&path)),
        });
    }

    Ok(entries)
}

fn collect_files(dir: &PathBuf, files: &mut Vec<(PathBuf, u64)>, depth: usize) -> Result<(), String> {
    // Hard stop on depth to prevent symlink-cycle stack overflow.
    if depth > MAX_DIR_DEPTH {
        return Err(format!(
            "Max directory depth ({}) exceeded at {} — possible symlink cycle",
            MAX_DIR_DEPTH,
            dir.display()
        ));
    }

    let read_dir = std::fs::read_dir(dir).map_err(|e| e.to_string())?;

    for entry in read_dir.flatten() {
        let path = entry.path();

        // Skip symlinks (H6).
        if is_symlink_path(&path) {
            continue;
        }

        // Skip hidden and common non-source directories
        if path.file_name()
            .map(|n| {
                let name = n.to_string_lossy();
                name.starts_with('.') ||
                name == "node_modules" ||
                name == "target" ||
                name == ".git" ||
                name == "vendor" ||
                name == "__pycache__" ||
                name == "dist" ||
                name == "build"
            })
            .unwrap_or(false)
        {
            continue;
        }

        if path.is_dir() {
            collect_files(&path, files, depth + 1)?;
        } else if path.is_file() {
            if let Ok(metadata) = std::fs::metadata(&path) {
                files.push((path, metadata.len()));
            }
        }
    }

    Ok(())
}

fn collect_files_for_search(
    dir: &PathBuf,
    files: &mut Vec<PathBuf>,
    file_pattern: Option<&str>,
    depth: usize,
) -> Result<(), String> {
    // Hard stop on depth to prevent symlink-cycle stack overflow.
    if depth > MAX_DIR_DEPTH {
        return Err(format!(
            "Max directory depth ({}) exceeded at {} — possible symlink cycle",
            MAX_DIR_DEPTH,
            dir.display()
        ));
    }

    let read_dir = std::fs::read_dir(dir).map_err(|e| e.to_string())?;

    for entry in read_dir.flatten() {
        let path = entry.path();

        // Skip symlinks (H6).
        if is_symlink_path(&path) {
            continue;
        }

        if path.file_name()
            .map(|n| n.to_string_lossy().starts_with('.'))
            .unwrap_or(false)
        {
            continue;
        }

        if path.is_dir() {
            collect_files_for_search(&path, files, file_pattern, depth + 1)?;
        } else if path.is_file() {
            if let Some(pattern) = file_pattern {
                if let Some(ext) = path.extension() {
                    if ext.to_string_lossy().contains(pattern) || pattern == "*" {
                        files.push(path);
                    }
                }
            } else {
                files.push(path);
            }
        }
    }

    Ok(())
}

fn detect_language(path: &PathBuf) -> String {
    let ext = path.extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "ts" => "TypeScript".to_string(),
        "tsx" => "TypeScript JSX".to_string(),
        "js" => "JavaScript".to_string(),
        "jsx" => "JavaScript JSX".to_string(),
        "py" => "Python".to_string(),
        "rs" => "Rust".to_string(),
        "go" => "Go".to_string(),
        "java" => "Java".to_string(),
        "c" => "C".to_string(),
        "cpp" | "cc" | "cxx" => "C++".to_string(),
        "csharp" | "cs" => "C#".to_string(),
        "rb" => "Ruby".to_string(),
        "php" => "PHP".to_string(),
        "swift" => "Swift".to_string(),
        "kt" | "kts" => "Kotlin".to_string(),
        "scala" => "Scala".to_string(),
        "html" | "htm" => "HTML".to_string(),
        "css" | "scss" | "sass" | "less" => "CSS".to_string(),
        "json" => "JSON".to_string(),
        "yaml" | "yml" => "YAML".to_string(),
        "toml" => "TOML".to_string(),
        "md" | "markdown" => "Markdown".to_string(),
        "sh" | "bash" | "zsh" => "Shell".to_string(),
        "sql" => "SQL".to_string(),
        "r" => "R".to_string(),
        "lua" => "Lua".to_string(),
        "dart" => "Dart".to_string(),
        "vue" => "Vue".to_string(),
        "svelte" => "Svelte".to_string(),
        _ => "Other".to_string(),
    }
}

fn generate_summary(total_files: &usize, total_lines: &usize, languages: &[LanguageStats]) -> String {
    let top_lang = languages.first();
    let top_lang_str = top_lang.map(|l| l.language.as_str()).unwrap_or("Unknown");

    format!(
        "This is a {}-file project with approximately {} lines of code. \
         The primary language is {}, making up {:.1}% of the codebase. \
         The project uses {} distinct programming languages.",
        total_files,
        total_lines,
        top_lang_str,
        top_lang.map(|l| l.percentage).unwrap_or(0.0),
        languages.len()
    )
}
