import React, { useState } from 'react';
import {
  faExclamationTriangle,
  faTrash,
  faQuestion,
  faCheckCircle,
  faTimesCircle
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface TextConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  details?: string;

  // Text confirmation settings
  textConfirmation: {
    required: boolean;
    placeholder: string;
    expectedText?: string; // If provided, user must type this exact text
    label: string;
    description?: string;
  };
}

export const TextConfirmationModal: React.FC<TextConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  onConfirm,
  onCancel,
  loading = false,
  details,
  textConfirmation
}) => {
  const [inputText, setInputText] = useState('');

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

  // Check if confirmation is valid
  const isConfirmationValid = () => {
    if (!textConfirmation.required) return true;

    if (textConfirmation.expectedText) {
      return inputText.trim() === textConfirmation.expectedText;
    }

    return inputText.trim().length > 0;
  };

  const handleConfirm = () => {
    if (isConfirmationValid()) {
      onConfirm();
      setInputText(''); // Reset input
    }
  };

  const handleCancel = () => {
    setInputText(''); // Reset input
    onCancel();
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
      minWidth: '450px',
      maxWidth: '550px',
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
      marginBottom: details ? '16px' : '24px',
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
      whiteSpace: 'pre-line',
      marginBottom: '24px'
    },
    textConfirmationSection: {
      marginBottom: '16px'
    },
    textLabel: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '8px',
      display: 'block'
    },
    textDescription: {
      fontSize: '12px',
      color: '#6b7280',
      marginBottom: '8px'
    },
    textInput: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: '2px solid #e5e7eb',
      borderRadius: '6px',
      outline: 'none',
      transition: 'border-color 0.2s ease',
      boxSizing: 'border-box'
    },
    textInputFocused: {
      borderColor: '#3b82f6'
    },
    textInputInvalid: {
      borderColor: '#ef4444'
    },
    validationMessage: {
      fontSize: '12px',
      color: '#ef4444',
      marginTop: '4px'
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
      opacity: loading || !isConfirmationValid() ? 0.5 : 1,
      cursor: loading || !isConfirmationValid() ? 'not-allowed' : 'pointer'
    }
  };

  // Add hover styles
  const handleMouseEnter = (e: React.MouseEvent, hoverColor: string) => {
    if (!loading && isConfirmationValid()) {
      (e.target as HTMLElement).style.backgroundColor = hoverColor;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent, originalColor: string) => {
    if (!loading) {
      (e.target as HTMLElement).style.backgroundColor = originalColor;
    }
  };

  return (
    <div style={styles.overlay} onClick={handleCancel}>
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

          {textConfirmation.required && (
            <div style={styles.textConfirmationSection}>
              <label style={styles.textLabel}>
                {textConfirmation.label}
              </label>
              {textConfirmation.description && (
                <div style={styles.textDescription}>
                  {textConfirmation.description}
                </div>
              )}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={textConfirmation.placeholder}
                style={{
                  ...styles.textInput,
                  ...(textConfirmation.expectedText && inputText && !isConfirmationValid() ? styles.textInputInvalid : {})
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                }}
              />
              {textConfirmation.expectedText && inputText && !isConfirmationValid() && (
                <div style={styles.validationMessage}>
                  Please type "{textConfirmation.expectedText}" to confirm
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button
            style={{ ...styles.button, ...styles.cancelButton }}
            onClick={handleCancel}
            disabled={loading}
            onMouseEnter={(e) => handleMouseEnter(e, '#e5e7eb')}
            onMouseLeave={(e) => handleMouseLeave(e, '#f3f4f6')}
          >
            {cancelText}
          </button>
          <button
            style={{ ...styles.button, ...styles.confirmButton }}
            onClick={handleConfirm}
            disabled={loading || !isConfirmationValid()}
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