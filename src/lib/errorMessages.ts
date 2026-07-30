/**
 * Error Message Utilities
 * 
 * Provides user-friendly error messages with actionable suggestions
 * for common errors in the application.
 */

export interface ErrorSuggestion {
  message: string;
  suggestions: string[];
  icon?: 'warning' | 'error' | 'info';
  docLink?: string;
}

/**
 * Get a user-friendly error message with suggestions
 */
export function getFriendlyError(error: unknown, context?: string): ErrorSuggestion {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Model errors
  if (errorMessage.includes('model') || errorMessage.includes('GGUF')) {
    return handleModelError(errorMessage);
  }
  
  // Memory errors
  if (errorMessage.includes('memory') || errorMessage.includes('OOM')) {
    return handleMemoryError();
  }
  
  // File system errors
  if (errorMessage.includes('file') || errorMessage.includes('path')) {
    return handleFileError(errorMessage);
  }
  
  // Generation errors
  if (errorMessage.includes('generation') || errorMessage.includes('inference')) {
    return handleGenerationError(errorMessage);
  }
  
  // Network/download errors (for model downloads)
  if (errorMessage.includes('download') || errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return handleDownloadError(errorMessage);
  }
  
  // Default fallback
  return {
    message: `Something went wrong${context ? ` while ${context}` : ''}`,
    suggestions: [
      'Try again',
      'Restart the application',
      'Check the logs for more details',
    ],
    icon: 'error',
  };
}

function handleModelError(message: string): ErrorSuggestion {
  if (message.includes('not found')) {
    return {
      message: 'Model file not found',
      suggestions: [
        'Check that the model file exists in the specified location',
        'Try downloading a model from the Downloads panel',
        'Verify the file path is correct',
      ],
      icon: 'warning',
      docLink: '#models',
    };
  }
  
  if (message.includes('Invalid GGUF') || message.includes('invalid format')) {
    return {
      message: 'Invalid model file format',
      suggestions: [
        'Make sure the file is a valid .gguf file',
        'Re-download the model from HuggingFace',
        'Try a different quantization (Q4_K_M recommended)',
      ],
      icon: 'error',
      docLink: '#models',
    };
  }
  
  if (message.includes('Failed to load')) {
    return {
      message: 'Failed to load model',
      suggestions: [
        'Check if you have enough RAM (need ~2x model size)',
        'Close other applications to free memory',
        'Try a smaller model (3B or 7B instead of 13B+)',
      ],
      icon: 'error',
      docLink: '#models',
    };
  }

  return {
    message: 'Model error occurred',
    suggestions: [
      'Try reloading the model',
      'Check the model file is not corrupted',
      'See logs for technical details',
    ],
    icon: 'error',
  };
}

function handleMemoryError(): ErrorSuggestion {
  return {
    message: 'Not enough memory to load this model',
    suggestions: [
      'Close other applications to free RAM',
      'Try a smaller model (7B Q4 needs ~6GB)',
      'Use a more aggressive quantization (Q2_K, Q3_K_S)',
      'Increase your system RAM if possible',
    ],
    icon: 'warning',
    docLink: '#system-requirements',
  };
}

function handleFileError(message: string): ErrorSuggestion {
  if (message.includes('permission') || message.includes('access')) {
    return {
      message: 'File access denied',
      suggestions: [
        'Check file permissions',
        'Run as administrator if needed',
        'Choose a different location',
      ],
      icon: 'warning',
    };
  }

  return {
    message: 'File operation failed',
    suggestions: [
      'Check if the path exists and is accessible',
      'Ensure you have write permissions',
      'Try using a different folder',
    ],
    icon: 'error',
  };
}

function handleGenerationError(message: string): ErrorSuggestion {
  if (message.includes('context') || message.includes('overflow')) {
    return {
      message: 'Context window exceeded',
      suggestions: [
        'Reduce max tokens in settings',
        'Shorten your conversation',
        'Start a new conversation',
      ],
      icon: 'warning',
      docLink: '#settings',
    };
  }

  if (message.includes('stopped') || message.includes('cancelled')) {
    return {
      message: 'Generation was stopped',
      suggestions: [
        'Your message was cut off - try sending again',
        'The stop button was pressed during generation',
      ],
      icon: 'info',
    };
  }

  return {
    message: 'Generation failed',
    suggestions: [
      'Check that the model is still loaded',
      'Try reducing max tokens in settings',
      'Reload the model and try again',
    ],
    icon: 'error',
  };
}

function handleDownloadError(message: string): ErrorSuggestion {
  if (message.includes('timeout') || message.includes('network')) {
    return {
      message: 'Download failed - network issue',
      suggestions: [
        'Check your internet connection',
        'Try downloading again (resumes if supported)',
        'Use a VPN if HuggingFace is blocked in your region',
      ],
      icon: 'warning',
    };
  }

  if (message.includes('disk') || message.includes('space')) {
    return {
      message: 'Download failed - not enough disk space',
      suggestions: [
        'Free up disk space on your drive',
        'Choose a different download location',
        'Try a smaller model',
      ],
      icon: 'error',
    };
  }

  return {
    message: 'Model download failed',
    suggestions: [
      'Check your internet connection',
      'Try downloading again',
      'Manually download from HuggingFace',
    ],
    icon: 'error',
    docLink: '#downloads',
  };
}

/**
 * Render an error component with suggestions
 */
export function renderErrorWithSuggestions(error: ErrorSuggestion) {
  const iconMap = {
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️',
  };

  const colorMap = {
    warning: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    error: 'text-red-400 bg-red-500/10 border-red-500/30',
    info: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  };

  const icon = error.icon || 'error';
  
  return `
    <div class="p-4 rounded-xl border ${colorMap[icon]}">
      <div class="flex items-start gap-3">
        <span class="text-lg">${iconMap[icon]}</span>
        <div class="flex-1">
          <p class="font-medium ${icon === 'error' ? 'text-red-300' : ''}">${error.message}</p>
          ${error.suggestions.length > 0 ? `
            <ul class="mt-2 space-y-1">
              ${error.suggestions.map(s => `<li class="text-sm text-dark-400 flex items-center gap-2"><span class="w-1 h-1 rounded-full bg-current opacity-50"></span>${s}</li>`).join('')}
            </ul>
          ` : ''}
          ${error.docLink ? `<a href="${error.docLink}" class="inline-flex items-center gap-1 mt-2 text-sm text-primary-400 hover:text-primary-300">Learn more →</a>` : ''}
        </div>
      </div>
    </div>
  `;
}
