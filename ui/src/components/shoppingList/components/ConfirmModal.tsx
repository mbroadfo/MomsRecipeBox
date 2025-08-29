import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'default';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default'
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap and escape key handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        padding: '24px'
      }}
      aria-modal="true"
      role="dialog"
      onClick={(e) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
          onCancel();
        }
      }}
    >
      <div
        ref={modalRef}
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          border: '3px solid #e2e8f0',
          overflow: 'hidden'
        }}
        role="alertdialog"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '24px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#ffffff'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            paddingLeft: '8px'
          }}>
            {isDanger && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fee2e2',
                borderRadius: '12px',
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.05)'
              }}>
                <AlertTriangle size={28} color="#dc2626" />
              </div>
            )}
            <h3
              id="modal-title"
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: isDanger ? '#b91c1c' : '#1e40af',
                margin: 0
              }}
            >
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            style={{
              padding: '8px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer'
            }}
            aria-label="Close modal"
          >
            <X size={20} color="#64748b" />
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '32px',
          backgroundColor: '#ffffff'
        }}>
          <p
            id="modal-description"
            style={{
              color: '#334155',
              fontSize: '18px',
              lineHeight: 1.6,
              margin: 0
            }}
          >
            {message}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '16px',
          padding: '24px 32px',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              color: '#2563eb',
              backgroundColor: '#ffffff',
              border: '2px solid #bfdbfe',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              color: '#ffffff',
              backgroundColor: isDanger ? '#dc2626' : '#2563eb',
              background: isDanger 
                ? 'linear-gradient(to bottom right, #ef4444, #b91c1c)'
                : 'linear-gradient(to bottom right, #3b82f6, #1d4ed8)',
              border: '2px solid',
              borderColor: isDanger ? '#b91c1c' : '#1d4ed8',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 3px 6px rgba(0, 0, 0, 0.1)'
            }}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
      
      {/* Live region for accessibility */}
      <div aria-live="polite" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
        Modal {isOpen ? 'opened' : 'closed'}
      </div>
    </div>
  );
};

export default ConfirmModal;
