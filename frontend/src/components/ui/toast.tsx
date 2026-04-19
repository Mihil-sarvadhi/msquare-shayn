import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

let _addToast: ((message: string, variant: ToastVariant) => void) | null = null;
let _counter = 0;

export const toast = {
  success: (message: string) => _addToast?.(message, 'success'),
  error: (message: string) => _addToast?.(message, 'error'),
  info: (message: string) => _addToast?.(message, 'info'),
  warning: (message: string) => _addToast?.(message, 'warning'),
};

const variantStyles: Record<ToastVariant, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
  warning: 'bg-amber-500 text-white',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant) => {
    const id = ++_counter;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  _addToast = addToast;

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-3 text-sm shadow-lg transition-all ${variantStyles[t.variant]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
