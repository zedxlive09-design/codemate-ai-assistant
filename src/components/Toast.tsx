import React, { createContext, useContext, useState, useCallback } from 'react';

// Types
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Hook for using toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Icon component
function ToastIcon({ type }: { type: Toast['type'] }) {
  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    loading: (
      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="10" strokeWidth={3} className="opacity-25" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v3m4 0v6m0 4v3" />
      </svg>
    ),
  };

  return icons[type] as React.ReactNode;
}

const colorStyles = {
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: 'text-emerald-400',
    text: 'text-emerald-200',
    progress: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-400',
    text: 'text-red-200',
    progress: 'bg-gradient-to-r from-red-400 to-red-600',
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-400',
    text: 'text-amber-200',
    progress: 'bg-gradient-to-r from-amber-400 to-amber-600',
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
    text: 'text-blue-200',
    progress: 'bg-gradient-to-r from-blue-400 to-blue-600',
  },
  loading: {
    bg: 'bg-primary-500/10',
    border: 'border-primary-500/30',
    icon: 'text-primary-400 animate-spin',
    text: 'text-primary-200',
    progress: 'bg-gradient-to-r from-primary-400 to-primary-600',
  },
};

// Single Toast Component
function ToastItem({
  toast,
  removeToast,
}: {
  toast: Toast;
  removeToast: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const colors = colorStyles[toast.type];
  const duration = toast.duration ?? 5000;
  const toastId = toast.id;

  // Depend only on stable/scalar values so timers don't reset on parent re-render.
  React.useEffect(() => {
    const exitTimer = setTimeout(() => setIsExiting(true), duration - 300);
    const removeTimer = setTimeout(() => removeToast(toastId), duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [duration, toastId, removeToast]);

  return (
    <div
      className={`
        group relative flex items-start gap-3 px-4 py-3 rounded-xl
        backdrop-blur-xl border shadow-lg
        min-w-[320px] max-w-[420px]
        transition-all duration-300 ease-out
        ${colors.bg} ${colors.border}
        ${isExiting ? 'opacity-0 translate-x-full scale-95' : 'opacity-100 translate-x-0 scale-100'}
      `}
    >
      {/* Progress bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl ${colors.progress}`}
        style={{ 
          animation: `toast-progress ${duration}ms linear forwards` 
        }}
      />

      {/* Icon */}
      <div className={`shrink-0 mt-0.5 ${colors.icon}`}>
        <ToastIcon type={toast.type} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className={`font-semibold text-sm ${colors.text}`}>
          {toast.title}
        </p>
        {toast.message && (
          <p className="mt-1 text-xs text-dark-400 leading-relaxed">
            {toast.message}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => removeToast(toastId), 300);
        }}
        className="shrink-0 p-1 -mr-1 -mt-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-dark-700/50"
      >
        <svg className="w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Container Component
function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto slide-down">
          <ToastItem toast={toast} removeToast={removeToast} />
        </div>
      ))}
    </div>
  );
}

// Provider
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'success', title, message }),
    [addToast]
  );
  const error = useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'error', title, message }),
    [addToast]
  );
  const warning = useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'warning', title, message }),
    [addToast]
  );
  const info = useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'info', title, message }),
    [addToast]
  );

  // Generic showToast method for convenience
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    addToast({ type, title: message });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info, showToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export default ToastProvider;
