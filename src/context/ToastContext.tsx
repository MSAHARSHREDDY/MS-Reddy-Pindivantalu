import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  duration?: number; // in ms
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, duration?: number, title?: string) => void;
  removeToast: (id: string) => void;
  toast: {
    error: (message: string, duration?: number, title?: string) => void;
    success: (message: string, duration?: number, title?: string) => void;
    warning: (message: string, duration?: number, title?: string) => void;
    info: (message: string, duration?: number, title?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Individual Toast Item with react-toastify style timer progress bar
const ToastCard: React.FC<{
  item: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ item, onDismiss }) => {
  const duration = item.duration ?? 3500;
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Set timeout to guarantee auto-dismiss
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(() => {
      onDismiss(item.id);
    }, remainingTimeRef.current);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPaused, item.id, onDismiss]);

  // Smooth progress bar update
  useEffect(() => {
    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      if (!isPaused) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, remainingTimeRef.current - elapsed);
        const currentPct = (remaining / duration) * 100;
        setProgress(currentPct);

        if (remaining <= 0) {
          clearInterval(interval);
          onDismiss(item.id);
        }
      }
    }, 25);

    return () => clearInterval(interval);
  }, [duration, isPaused, item.id, onDismiss]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    startTimeRef.current = Date.now();
    setIsPaused(false);
  };

  const getTheme = () => {
    switch (item.type) {
      case 'error':
        return {
          bg: 'bg-red-600 text-white shadow-xl shadow-red-950/30 border border-red-700',
          iconBg: 'bg-white/20 text-white border border-white/30',
          barColor: 'bg-white/90',
          textColor: 'text-white',
          subtitleColor: 'text-red-50',
          closeHover: 'hover:bg-white/20 text-white',
          Icon: AlertCircle,
          defaultTitle: 'Error',
        };
      case 'success':
        return {
          bg: 'bg-emerald-600 text-white shadow-xl shadow-emerald-950/30 border border-emerald-700',
          iconBg: 'bg-white/20 text-white border border-white/30',
          barColor: 'bg-white/90',
          textColor: 'text-white',
          subtitleColor: 'text-emerald-50',
          closeHover: 'hover:bg-white/20 text-white',
          Icon: CheckCircle2,
          defaultTitle: 'Success',
        };
      case 'warning':
        return {
          bg: 'bg-amber-500 text-white shadow-xl shadow-amber-950/30 border border-amber-600',
          iconBg: 'bg-white/20 text-white border border-white/30',
          barColor: 'bg-white/90',
          textColor: 'text-white',
          subtitleColor: 'text-amber-50',
          closeHover: 'hover:bg-white/20 text-white',
          Icon: AlertTriangle,
          defaultTitle: 'Warning',
        };
      case 'info':
      default:
        return {
          bg: 'bg-sky-600 text-white shadow-xl shadow-sky-950/30 border border-sky-700',
          iconBg: 'bg-white/20 text-white border border-white/30',
          barColor: 'bg-white/90',
          textColor: 'text-white',
          subtitleColor: 'text-sky-50',
          closeHover: 'hover:bg-white/20 text-white',
          Icon: Info,
          defaultTitle: 'Information',
        };
    }
  };

  const theme = getTheme();
  const Icon = theme.Icon;

  return (
    <div
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden w-[90vw] sm:w-[380px] max-w-md rounded-xl shadow-2xl transition-all duration-300 animate-in slide-in-from-top-4 sm:slide-in-from-right-8 fade-in ${theme.bg}`}
    >
      <div className="p-3.5 sm:p-4 flex items-start gap-3">
        {/* Status Icon */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${theme.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1.5">
            <h4 className={`text-xs font-bold tracking-tight capitalize ${theme.textColor}`}>
              {item.title || theme.defaultTitle}
            </h4>
          </div>
          <p className={`text-xs mt-0.5 leading-snug break-words ${theme.subtitleColor}`}>
            {item.message}
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => onDismiss(item.id)}
          className={`p-1 rounded-lg transition-colors shrink-0 cursor-pointer ${theme.closeHover}`}
          title="Dismiss"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* React-toastify Signature Countdown Progress Bar */}
      <div className="h-1 w-full bg-black/15 overflow-hidden">
        <div
          className={`h-full transition-all duration-75 ease-linear ${theme.barColor}`}
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 4000, title?: string) => {
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => {
        // Prevent duplicate messages in quick succession
        const exists = prev.some((t) => t.message === message && t.type === type);
        if (exists) return prev;
        return [...prev.slice(-4), { id, message, type, duration, title }]; // Keep max 5
      });
    },
    []
  );

  const toastMethods = {
    error: (msg: string, dur?: number, title?: string) => showToast(msg, 'error', dur, title),
    success: (msg: string, dur?: number, title?: string) => showToast(msg, 'success', dur, title),
    warning: (msg: string, dur?: number, title?: string) => showToast(msg, 'warning', dur, title),
    info: (msg: string, dur?: number, title?: string) => showToast(msg, 'info', dur, title),
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, toast: toastMethods }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
