import React from 'react';
import {
  faExclamationTriangle,
  faTrash,
  faQuestion,
  faCheckCircle,
  faTimesCircle
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  details?: string; // Additional details to show
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  onConfirm,
  onCancel,
  loading = false,
  details
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return { icon: faTrash, color: '#ef4444' };
      case 'warning':
        return { icon: faExclamationTriangle, color: '#f59e0b' };
      case 'info':
        return { icon: faQuestion, color: '#3b82f6' };
      case 'success':
        return { icon: faCheckCircle, color: '#10b981' };
      default:
        return { icon: faExclamationTriangle, color: '#f59e0b' };
    }
  };

  const getButtonStyles = () => {
    switch (type) {
      case 'danger':
        return {
          confirm: { backgroundColor: '#ef4444', color: 'white' },
          confirmHover: '#dc2626'
        };
      case 'warning':
        return {
          confirm: { backgroundColor: '#f59e0b', color: 'white' },
          confirmHover: '#d97706'
        };
      case 'info':
        return {
          confirm: { backgroundColor: '#3b82f6', color: 'white' },
          confirmHover: '#2563eb'
        };
      case 'success':
        return {
          confirm: { backgroundColor: '#10b981', color: 'white' },
          confirmHover: '#059669'
        };
      default:
        return {
          confirm: { backgroundColor: '#f59e0b', color: 'white' },
          confirmHover: '#d97706'
        };
    }
  };

  const iconConfig = getIcon();
  const buttonStyles = getButtonStyles();

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '0',
      minWidth: '400px',
      maxWidth: '500px',
      maxHeight: '90vh',
      overflow: 'hidden',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
      border: '1px solid #e5e7eb'
    },
    header: {
      padding: '24px',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    icon: {
      width: '24px',
      height: '24px',
      color: iconConfig.color
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1f2937',
      margin: 0
    },
    content: {
      padding: '24px'
    },
    message: {
      fontSize: '14px',
      color: '#374151',
      lineHeight: '1.5',
      marginBottom: details ? '16px' : '0',
      whiteSpace: 'pre-line'
    },
    details: {
      fontSize: '13px',
      color: '#6b7280',
      backgroundColor: '#f9fafb',
      padding: '12px',
      borderRadius: '6px',
      border: '1px solid #e5e7eb',
      fontFamily: 'Monaco, "Lucida Console", monospace',
      whiteSpace: 'pre-line'
    },
    footer: {
      padding: '16px 24px',
      backgroundColor: '#f9fafb',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px'
    },
    button: {
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      minWidth: '80px'
    },
    cancelButton: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db'
    },
    confirmButton: {
      ...buttonStyles.confirm,
      opacity: loading ? 0.7 : 1,
      cursor: loading ? 'not-allowed' : 'pointer'
    }
  };

  // Add hover styles
  const handleMouseEnter = (e: React.MouseEvent, hoverColor: string) => {
    if (!loading) {
      (e.target as HTMLElement).style.backgroundColor = hoverColor;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent, originalColor: string) => {
    if (!loading) {
      (e.target as HTMLElement).style.backgroundColor = originalColor;
    }
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <FontAwesomeIcon icon={iconConfig.icon} style={styles.icon} />
          <h3 style={styles.title}>{title}</h3>
        </div>

        <div style={styles.content}>
          <div style={styles.message}>{message}</div>
          {details && (
            <div style={styles.details}>{details}</div>
          )}
        </div>

        <div style={styles.footer}>
          <button
            style={{ ...styles.button, ...styles.cancelButton }}
            onClick={onCancel}
            disabled={loading}
            onMouseEnter={(e) => handleMouseEnter(e, '#e5e7eb')}
            onMouseLeave={(e) => handleMouseLeave(e, '#f3f4f6')}
          >
            {cancelText}
          </button>
          <button
            style={{ ...styles.button, ...styles.confirmButton }}
            onClick={onConfirm}
            disabled={loading}
            onMouseEnter={(e) => handleMouseEnter(e, buttonStyles.confirmHover)}
            onMouseLeave={(e) => handleMouseLeave(e, buttonStyles.confirm.backgroundColor as string)}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};