import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  MessageSquare, 
  Brain, 
  Zap, 
  Palette, 
  Keyboard, 
  Check,
  ArrowRight,
  ArrowLeft,
  X,
  Bot,
  FolderOpen,
  Settings,
  Moon
} from 'lucide-react';

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: string;
  tips: string[];
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to CodeMate! 🎉',
    description: 'Your fully offline AI coding assistant that runs locally on your machine with complete privacy.',
    icon: <Bot className="w-8 h-8" />,
    tips: [
      'No internet connection required after setup',
      'All data stays on your device',
      'Powered by llama.cpp - open source AI'
    ]
  },
  {
    id: 'chat',
    title: 'Start Chatting',
    description: 'Type your questions or code requests in the chat input. CodeMate will help you write, debug, and understand code.',
    icon: <MessageSquare className="w-8 h-8" />,
    action: 'Try typing "Explain this code"',
    tips: [
      'Press Enter to send, Shift+Enter for new line',
      'Supports both English and Urdu',
      'Code blocks are syntax highlighted automatically'
    ]
  },
  {
    id: 'model',
    title: 'Load AI Model',
    description: 'Download and load a GGUF model to enable AI responses. CodeMate supports various model sizes.',
    icon: <Brain className="w-8 h-8" />,
    action: 'Open Model Manager (Ctrl+M)',
    tips: [
      'Smaller models are faster, larger are smarter',
      'GPU acceleration available if supported',
      'Models are loaded locally from your disk'
    ]
  },
  {
    id: 'memory',
    title: 'Project Memory System',
    description: 'CodeMate learns from your interactions and remembers project context. It understands preferences and coding patterns.',
    icon: <Sparkles className="w-8 h-8" />,
    action: 'Open Memory Panel (Ctrl+Shift+M)',
    tips: [
      'CODEMATE.md files store project instructions',
      'Auto-learns from your conversations',
      'Skills system for task-specific behavior'
    ]
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Power user? Use keyboard shortcuts to navigate faster and be more productive.',
    icon: <Keyboard className="w-8 h-8" />,
    action: 'Press Ctrl+/ to see all shortcuts',
    tips: [
      'Ctrl+K - Command Palette (search anything)',
      'Ctrl+N - New chat',
      'Ctrl+B - Toggle sidebar',
      'Ctrl+E - File explorer'
    ]
  },
  {
    id: 'customize',
    title: 'Make It Yours',
    description: 'Customize themes, fonts, and settings to match your preference. Choose from 14 beautiful color themes!',
    icon: <Palette className="w-8 h-8" />,
    action: 'Open Theme Customizer (Ctrl+Shift+T)',
    tips: [
      '14 built-in themes including Cyberpunk & Matrix',
      'Adjust font size and family',
      'Toggle dark/light mode'
    ]
  }
];

export default function OnboardingWizard({ isOpen, onClose }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSkipped, setIsSkipped] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsSkipped(false);
      setShowConfetti(false);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      setShowConfetti(true);
      setTimeout(() => {
        onClose();
        // Save to localStorage that onboarding was completed
        localStorage.setItem('codemate-onboarding-complete', 'true');
      }, 1000);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setIsSkipped(true);
    localStorage.setItem('codemate-onboarding-complete', 'true');
    onClose();
  };

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-lg bg-dark-900 rounded-2xl border border-dark-700 shadow-2xl overflow-hidden scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              currentStep === 0 ? 'bg-gradient-to-br from-primary-500 to-purple-600' :
              currentStep === 1 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
              currentStep === 2 ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
              currentStep === 3 ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
              currentStep === 4 ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
              'bg-gradient-to-br from-pink-500 to-rose-500'
            } text-white`}>
              {step.icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{step.title}</h2>
              <p className="text-xs text-dark-400 mt-0.5">Step {currentStep + 1} of {onboardingSteps.length}</p>
            </div>
          </div>
          
          <button
            onClick={handleSkip}
            className="text-sm text-dark-500 hover:text-white transition-colors"
            title="Skip onboarding"
          >
            Skip
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-dark-800">
          <div 
            className="h-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-dark-300 leading-relaxed mb-6">{step.description}</p>

          {/* Action Button */}
          {step.action && (
            <button
              onClick={handleNext}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-600/20 to-purple-600/20 hover:from-primary-600/30 hover:to-purple-600/30 border border-primary-500/30 text-primary-300 font-medium transition-all mb-6 flex items-center justify-center gap-2 group"
            >
              <Zap size={16} className="group-hover:rotate-12 transition-transform" />
              {step.action}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          {/* Tips */}
          <div className="space-y-2">
            {step.tips.map((tip, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-dark-800/50 border border-dark-700/50">
                <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-sm text-dark-300">{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-dark-800 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentStep === 0
                ? 'text-dark-600 cursor-not-allowed'
                : 'text-dark-400 hover:text-white hover:bg-dark-800'
            }`}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {/* Step Indicators */}
          <div className="flex items-center gap-2">
            {onboardingSteps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === currentStep
                    ? 'bg-primary-500 w-6'
                    : idx < currentStep
                    ? 'bg-emerald-500'
                    : 'bg-dark-700 hover:bg-dark-600'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 text-white text-sm font-medium shadow-lg shadow-primary-600/25 transition-all"
          >
            {isLastStep ? (
              <>
                <Check size={16} />
                Get Started!
              </>
            ) : (
              <>
                Next
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        {/* Confetti Animation */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-dark-900/90 backdrop-blur-sm">
            <div className="text-center animate-bounce">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-white mb-2">You're All Set!</h3>
              <p className="text-dark-400">Welcome to CodeMate</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook to check if onboarding should be shown
export function useShouldShowOnboarding(): boolean {
  const [shouldShow, setShouldShow] = useState(false);

  React.useEffect(() => {
    const completed = localStorage.getItem('codemate-onboarding-complete');
    setShouldShow(!completed);
  }, []);

  return shouldShow;
}
