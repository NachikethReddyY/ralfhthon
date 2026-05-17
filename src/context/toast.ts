import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  link?: { text: string; href: string };
}

export interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type: ToastType, duration?: number, link?: { text: string; href: string }) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
