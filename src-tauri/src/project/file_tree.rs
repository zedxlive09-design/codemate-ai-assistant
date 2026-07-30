// File Tree Module
//
// Handles building and managing file tree structures

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: Option<u64>,
    pub children: Option<Vec<FileNode>>,
    pub language: Option<String>,
    pub depth: usize,
}

impl FileNode {
    pub fn new_file(name: String, path: String, size: u64) -> Self {
        Self {
            name,
            path,
            is_directory: false,
            size: Some(size),
            children: None,
            language: None,
            depth: 0,
        }
    }
    
    pub fn new_directory(name: String, path: String) -> Self {
        Self {
            name,
            path,
            is_directory: true,
            size: None,
            children: Some(Vec::new()),
            language: None,
            depth: 0,
        }
    }
    
    pub fn add_child(&mut self, mut child: FileNode) {
        if let Some(ref mut children) = self.children {
            child.depth = self.depth + 1;
            children.push(child);
        }
    }
    
    pub fn total_files(&self) -> usize {
        match &self.children {
            Some(children) => children.iter().map(|c| c.total_files()).sum(),
            None => 1,
        }
    }
}
