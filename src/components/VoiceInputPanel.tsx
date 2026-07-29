import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useToast } from './Toast';

interface VoiceInputPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript: (text: string) => void;
}

export default function VoiceInputPanel({ isOpen, onClose, onTranscript }: VoiceInputPanelProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [supportedLanguages] = useState([
    { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
    { code: 'ur-PK', label: 'Urdu (Pakistan)', flag: '🇵🇰' },
    { code: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
    { code: 'ar-SA', label: 'Arabic', flag: '🇸🇦' },
    { code: 'hi-IN', label: 'Hindi', flag: '🇮🇳' },
  ]);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { showToast } = useToast();

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = selectedLanguage;

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';
        let maxConfidence = 0;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' ';
            if (result[0].confidence > maxConfidence) {
              maxConfidence = result[0].confidence;
            }
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript(finalTranscript + interimTranscript);
        setConfidence(maxConfidence);
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setError(`Error: ${event.error}`);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          showToast('Microphone permission denied. Please allow access.', 'error');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [selectedLanguage]);

  // Update language when changed
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = selectedLanguage;
    }
  }, [selectedLanguage]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      showToast('Speech recognition not supported in this browser', 'error');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      recognitionRef.current.start();
      setIsListening(true);
      showToast(`Listening in ${supportedLanguages.find(l => l.code === selectedLanguage)?.label}...`, 'info');
    }
  }, [isListening, selectedLanguage, supportedLanguages, showToast]);

  const handleSendTranscript = () => {
    if (transcript.trim()) {
      onTranscript(transcript.trim());
      setTranscript('');
      onClose();
      showToast('Voice input sent!', 'success');
    }
  };

  const handleClear = () => {
    setTranscript('');
    setConfidence(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-lg px-4">
      <div className="bg-dark-900/95 backdrop-blur-xl rounded-2xl border border-dark-700/80 shadow-2xl shadow-black/50 overflow-hidden scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-800 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isListening ? 'bg-red-500 animate-pulse' : 'bg-dark-700'
            }`}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Voice Input</h3>
              <p className="text-[10px] text-dark-400">
                {isListening ? 'Listening...' : 'Click to start'}
              </p>
            </div>
          </div>

          {/* Language Selector */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={isListening}
            className="px-2 py-1 bg-dark-800 border border-dark-600 rounded-lg text-xs text-white focus:border-primary-500 outline-none cursor-pointer"
          >
            {supportedLanguages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Visualizer / Status */}
        <div className="relative py-6 flex items-center justify-center bg-dark-950/30">
          {/* Sound waves animation when listening */}
          {isListening && (
            <div className="absolute inset-0 flex items-center justify-center gap-1 overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-primary-500 to-purple-500 rounded-full sound-wave-bar"
                  style={{
                    animationDelay: `${i * 0.05}s`,
                    height: `${Math.random() * 60 + 20}%`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Mic Button */}
          <button
            onClick={toggleListening}
            className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
              isListening 
                ? 'bg-red-500 shadow-lg shadow-red-500/40 scale-110' 
                : 'bg-gradient-to-br from-primary-500 to-purple-600 hover:shadow-xl hover:shadow-primary-500/30 hover:scale-105'
            }`}
          >
            {/* Pulse rings when active */}
            {isListening && (
              <>
                <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                <span className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
              </>
            )}
            
            <svg className={`w-8 h-8 text-white ${isListening ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        </div>

        {/* Transcript Display */}
        {(transcript || error) && (
          <div className="px-4 py-3 border-t border-dark-800 bg-dark-850/30">
            {error ? (
              <p className="text-sm text-red-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            ) : (
              <>
                <p className="text-sm text-dark-200 mb-2 min-h-[40px]">{transcript}</p>
                
                {/* Confidence indicator */}
                {confidence > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1.5 bg-dark-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-300"
                        style={{ width: `${Math.round(confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-emerald-400 font-mono">
                      {Math.round(confidence * 100)}%
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-dark-800 bg-dark-900/50">
          <button
            onClick={handleClear}
            disabled={!transcript}
            className="flex-1 py-2 px-4 rounded-xl bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          
          <button
            onClick={handleSendTranscript}
            disabled={!transcript.trim()}
            className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-400 hover:to-purple-500 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25"
          >
            Send as Message
          </button>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tips */}
        <div className="px-4 py-2 bg-dark-950/50 border-t border-dark-800/50">
          <p className="text-[10px] text-dark-500 text-center">
            💡 Speak clearly • Supports English & Urdu • Press Enter or click Send
          </p>
        </div>
      </div>
    </div>
  );
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}
