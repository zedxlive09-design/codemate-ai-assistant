// Project Analysis Module
//
// Provides functionality for analyzing project structure,
// language distribution, code statistics, etc.
//
// NOTE: This module is currently UNUSED — `commands::project` defines its
// own `LanguageStats` struct and computes the breakdown inline. Kept as
// scaffolding for a future refactor. `#![allow(dead_code)]` silences the
// resulting warnings.

#![allow(dead_code)]

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageDistribution {
    pub language: String,
    pub file_count: usize,
    pub line_count: usize,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeStatistics {
    pub total_files: usize,
    pub total_lines: usize,
    pub total_bytes: u64,
    pub average_file_size: f64,
    pub languages: Vec<LanguageDistribution>,
}

impl Default for CodeStatistics {
    fn default() -> Self {
        Self {
            total_files: 0,
            total_lines: 0,
            total_bytes: 0,
            average_file_size: 0.0,
            languages: Vec::new(),
        }
    }
}
