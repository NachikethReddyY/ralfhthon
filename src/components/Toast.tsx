import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { Toast as ToastType } from '../context/ToastContext';
import './Toast.css';

interface ToastItemProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

export function ToastItem({ toast, onRemove }: ToastItemProps) {
  const icons = {
    success: <CheckCircle2 size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  return (
    <motion.div
      className={`toast-item toast-item--${toast.type}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="toast-content">
        <div className="toast-icon">{icons[toast.type]}</div>
        <div className="toast-message-wrapper">
          <p className="toast-message">{toast.message}</p>
          {toast.link && (
            <a href={toast.link.href} className="toast-link" target="_blank" rel="noopener noreferrer">
              {toast.link.text}
            </a>
          )}
        </div>
      </div>
      <button className="toast-close" onClick={() => onRemove(toast.id)}>
        <X size={16} />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );
}
