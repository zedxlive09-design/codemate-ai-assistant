/**
 * useStreamingGeneration Hook
 * 
 * Custom hook for handling streaming LLM generation with Tauri events.
 * Provides real-time token-by-token updates to the UI.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { modelCommands, modelEvents } from '../lib/tauri';
import type { InferenceSettings } from '../types';

interface StreamingState {
  isGenerating: boolean;
  currentText: string;
  tokensGenerated: number;
  tokensPerSecond: number;
  error: string | null;
}

interface UseStreamingGenerationOptions {
  /** Called when generation starts */
  onStart?: () => void;
  /** Called on each token received */
  onToken?: (token: string, fullText: string) => void;
  /** Called when generation completes successfully */
  onComplete?: (text: string, stats: { tokensGenerated: number; tokensPerSecond: number }) => void;
  /** Called when an error occurs */
  onError?: (error: string) => void;
}

interface UseStreamingGenerationReturn {
  /** Current streaming state */
  state: StreamingState;
  /** Start streaming generation */
  generate: (prompt: string, settings?: Partial<InferenceSettings>) => Promise<string>;
  /** Stop current generation */
  stop: () => Promise<void>;
  /** Reset state */
  reset: () => void;
}

const initialState: StreamingState = {
  isGenerating: false,
  currentText: '',
  tokensGenerated: 0,
  tokensPerSecond: 0,
  error: null,
};

export function useStreamingGeneration(
  options: UseStreamingGenerationOptions = {}
): UseStreamingGenerationReturn {
  const [state, setState] = useState<StreamingState>(initialState);
  const unlistenRefs = useRef<Array<() => Promise<void>>>([]);
  const abortRef = useRef(false);

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      unlistenRefs.current.forEach(unlisten => unlisten());
    };
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    abortRef.current = false;
  }, []);

  const stop = useCallback(async () => {
    if (state.isGenerating) {
      abortRef.current = true;
      try {
        await modelCommands.stopGeneration();
      } catch (e) {
        console.error('Failed to stop generation:', e);
      }
    }
  }, [state.isGenerating]);

  const generate = useCallback(
    async (
      prompt: string,
      settings?: Partial<InferenceSettings>
    ): Promise<string> => {
      // Reset state for new generation
      abortRef.current = false;
      setState({
        ...initialState,
        isGenerating: true,
      });

      options.onStart?.();

      // Set up event listeners before starting generation
      let resolvePromise: ((value: string) => void) | null = null;
      const resultPromise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });

      try {
        // Listen for token events
        const unlistenToken = await modelEvents.onGenerationToken((event) => {
          if (abortRef.current) return;

          setState(prev => ({
            ...prev,
            currentText: event.text,
            tokensGenerated: event.tokensGenerated,
            tokensPerSecond: event.tokensPerSecond,
          }));

          if (event.token && options.onToken) {
            options.onToken(event.token, event.text);
          }
        });
        unlistenRefs.current.push(unlistenToken);

        // Listen for completion events
        const unlistenComplete = await modelEvents.onGenerationComplete((event) => {
          if (abortRef.current) return;

          setState(prev => ({
            ...prev,
            isGenerating: false,
            currentText: event.text,
            tokensGenerated: event.tokensGenerated,
            tokensPerSecond: event.tokensPerSecond,
          }));

          options.onComplete?.(event.text, {
            tokensGenerated: event.tokensGenerated,
            tokensPerSecond: event.tokensPerSecond,
          });

          resolvePromise?.(event.text);
        });
        unlistenRefs.current.push(unlistenComplete);

        // Listen for error events
        const unlistenError = await modelEvents.onGenerationError((event) => {
          setState(prev => ({
            ...prev,
            isGenerating: false,
            error: event.message,
          }));

          options.onError?.(event.message);
          resolvePromise?.('');
        });
        unlistenRefs.current.push(unlistenError);

        // Start the streaming generation
        await modelCommands.generateStreaming(prompt, settings);

        // If we get here without completion event, wait for it
        // The promise will be resolved by the event listener
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error: errorMessage,
        }));

        options.onError?.(errorMessage);
        return '';
      }

      return resultPromise;
    },
    [options]
  );

  return {
    state,
    generate,
    stop,
    reset,
  };
}

export default useStreamingGeneration;

// ============================================================
// SIMPLIFIED VERSION - For basic usage without hooks
// ============================================================

/**
 * Generate text with streaming via callback
 * This is a simpler API for one-off generations
 */
export async function generateWithStreaming(
  prompt: string,
  settings: Partial<InferenceSettings>,
  callbacks: {
    onToken?: (token: string, fullText: string) => void;
    onComplete?: (text: string) => void;
    onError?: (error: string) => void;
  }
): Promise<string> {
  let fullText = '';

  // Set up token listener
  const unlistenToken = await modelEvents.onGenerationToken((event) => {
    fullText = event.text;
    callbacks.onToken?.(event.token || '', event.text);
  });

  // Set up complete listener
  const unlistenComplete = await modelEvents.onGenerationComplete((event) => {
    callbacks.onComplete?.(event.text);
  });

  // Set up error listener
  const unlistenError = await modelEvents.onGenerationError((event) => {
    callbacks.onError?.(event.message);
  });

  try {
    await modelCommands.generateStreaming(prompt, settings);
  } finally {
    // Clean up listeners
    unlistenToken();
    unlistenComplete();
    unlistenError();
  }

  return fullText;
}
