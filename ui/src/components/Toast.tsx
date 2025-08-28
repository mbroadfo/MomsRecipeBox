import React, { useState, useEffect } from 'react';

export const ToastType = {
  Success: 'success',
  Error: 'error',
  Info: 'info'
} as const;

export type ToastType = typeof ToastType[keyof typeof ToastType];

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type = ToastType.Success,
  duration = 3000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        if (onClose) onClose();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getBgColor = () => {
    if (type === 'success') return 'bg-green-600';
    if (type === 'error') return 'bg-red-600';
    if (type === 'info') return 'bg-blue-600';
    return 'bg-green-600';
  };

  return (
    <div
      className={`fixed top-4 right-4 ${getBgColor()} text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity duration-300`}
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      {message}
    </div>
  );
};

// Static method to show a toast from anywhere
export const showToast = (message: string, type: ToastType = 'success', duration: number = 3000) => {
  const toastContainer = document.getElementById('toast-container') || (() => {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
  })();

  const toastId = `toast-${Date.now()}`;
  
  const toastElement = document.createElement('div');
  toastElement.id = toastId;
  toastContainer.appendChild(toastElement);
  
  // Create a simple styled div for the toast
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 ${type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'} text-white px-4 py-2 rounded shadow-lg z-50`;
  toast.style.transition = 'opacity 0.3s ease-in-out';
  toast.style.opacity = '0';
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Fade in
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);
  
  // Fade out and remove
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, duration);

  return toastId;
};

export default Toast;
