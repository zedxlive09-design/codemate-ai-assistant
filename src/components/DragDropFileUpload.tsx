import React, { useState, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';

interface DragDropFileUploadProps {
  onFilesSelected?: (files: File[]) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  multiple?: boolean;
}

interface UploadedFile {
  id: string;
  file: File;
  preview: string | null;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  error?: string;
}

export default function DragDropFileUpload({
  onFilesSelected,
  acceptedTypes = ['.txt', '.md', '.json', '.csv', '.py', '.js', '.ts', '.tsx', '.jsx', '.rs', '.go'],
  maxSize = 10,
  multiple = true,
}: DragDropFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { showToast } = useToast();

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const icons: Record<string, string> = {
      txt: '📄',
      md: '📝',
      json: '📋',
      csv: '📊',
      py: '🐍',
      js: '🟨',
      ts: '🔷',
      tsx: '⚛️',
      jsx: '⚛️',
      rs: '🦀',
      go: '🐹',
      html: '🌐',
      css: '🎨',
      sql: '🗃️',
      yaml: '⚙️',
      yml: '⚙️',
    };
    return icons[ext] || '📁';
  };

  const getFileTypeColor = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const colors: Record<string, string> = {
      txt: 'text-dark-300',
      md: 'text-blue-400',
      json: 'text-yellow-400',
      csv: 'text-emerald-400',
      py: 'text-emerald-400',
      js: 'text-yellow-400',
      ts: 'text-blue-400',
      tsx: 'text-cyan-400',
      jsx: 'text-cyan-400',
      rs: 'text-orange-500',
      go: 'text-sky-400',
    };
    return colors[ext] || 'text-dark-400';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateAndProcessFiles = useCallback((fileList: FileList | File[]): File[] => {
    const files = Array.from(fileList);
    const validFiles: File[] = [];
    
    for (const file of files) {
      // Check size
      if (file.size > maxSize * 1024 * 1024) {
        showToast(`${file.name} exceeds ${maxSize}MB limit`, 'error');
        continue;
      }

      // Check type
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedTypes.includes(ext)) {
        showToast(`${file.name} is not a supported file type`, 'warning');
        continue;
      }

      validFiles.push(file);
    }

    return validFiles;
  }, [maxSize, acceptedTypes, showToast]);

  const handleFiles = useCallback((files: File[]) => {
    const validFiles = validateAndProcessFiles(files);
    
    if (validFiles.length === 0) return;

    const newUploadedFiles: UploadedFile[] = validFiles.map(file => ({
      id: generateId(),
      file,
      preview: null,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
    
    // Simulate upload progress
    newUploadedFiles.forEach(uploadedFile => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30 + 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setUploadedFiles(prev => prev.map(f => 
            f.id === uploadedFile.id 
              ? { ...f, progress: 100, status: 'complete' }
              : f
          ));
        } else {
          setUploadedFiles(prev => prev.map(f => 
            f.id === uploadedFile.id 
              ? { ...f, progress }
              : f
          ));
        }
      }, 200);
    });

    onFilesSelected?.(validFiles);
    showToast(`${validFiles.length} file(s) added`, 'success');
  }, [validateAndProcessFiles, onFilesSelected, showToast]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, [handleFiles]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    setUploadedFiles([]);
  };

  return (
    <div className="drag-drop-upload-container">
      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 cursor-pointer ${
          isDragging
            ? 'border-primary-500 bg-primary-500/10 scale-[1.02]'
            : 'border-dark-600 bg-dark-800/30 hover:border-dark-500 hover:bg-dark-800/50'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        {/* Upload Icon */}
        <div className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-300 ${
          isDragging 
            ? 'bg-primary-500/20 text-primary-400 scale-110' 
            : 'bg-dark-700/50 text-dark-400'
        }`}>
          {isDragging ? (
            <svg className="w-7 h-7 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          ) : (
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          )}
        </div>

        <p className="text-sm font-medium text-white mb-1">
          {isDragging ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-xs text-dark-500 mb-3">
          or click to browse
        </p>

        {/* Accepted Types */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto">
          {acceptedTypes.slice(0, 8).map(type => (
            <span key={type} className="px-1.5 py-0.5 bg-dark-700/50 rounded text-[10px] font-mono text-dark-500">
              {type}
            </span>
          ))}
          {acceptedTypes.length > 8 && (
            <span className="text-[10px] text-dark-600">+{acceptedTypes.length - 8} more</span>
          )}
        </div>
        
        <p className="text-[10px] text-dark-600 mt-2">
          Max size: {maxSize}MB per file • {multiple ? 'Multiple files allowed' : 'Single file only'}
        </p>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2 slide-down">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-medium text-dark-400">
              {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
            </span>
            <button
              onClick={clearAll}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear all
            </button>
          </div>

          {uploadedFiles.map(uploadedFile => (
            <div
              key={uploadedFile.id}
              className="group flex items-center gap-3 p-3 bg-dark-800/50 border border-dark-700/50 rounded-lg hover:border-dark-600 transition-all"
            >
              {/* File Icon */}
              <span className={`text-xl ${getFileTypeColor(uploadedFile.file.name)}`}>
                {getFileIcon(uploadedFile.file.name)}
              </span>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {uploadedFile.file.name}
                </p>
                <p className="text-xs text-dark-500">
                  {formatFileSize(uploadedFile.file.size)}
                  {uploadedFile.status === 'complete' && ' • Ready'}
                  {uploadedFile.status === 'uploading' && ` • Uploading...`}
                </p>
                
                {/* Progress Bar */}
                {uploadedFile.status === 'uploading' && (
                  <div className="mt-2 h-1 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-200"
                      style={{ width: `${uploadedFile.progress}%` }}
                    />
                  </div>
                )}

                {uploadedFile.status === 'error' && (
                  <p className="mt-1 text-xs text-red-400">{uploadedFile.error}</p>
                )}
              </div>

              {/* Status Icon */}
              <div className="shrink-0">
                {uploadedFile.status === 'complete' && (
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                {uploadedFile.status === 'uploading' && (
                  <svg className="w-5 h-5 text-primary-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
              </div>

              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(uploadedFile.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/20 text-dark-500 hover:text-red-400 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
