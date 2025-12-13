import React, { useState } from 'react';

interface CreateBackupModalProps {
  onClose: () => void;
  onCreate: (description?: string) => Promise<void>;
  loading: boolean;
}

export const CreateBackupModal: React.FC<CreateBackupModalProps> = ({
  onClose,
  onCreate,
  loading
}) => {
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreate(description || undefined);
  };

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
      padding: '24px',
      minWidth: '500px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '16px',
      borderBottom: '1px solid #e5e7eb'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1f2937',
      margin: 0
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#6b7280',
      padding: '0',
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px'
    },
    content: {
      marginBottom: '24px'
    },
    description: {
      fontSize: '14px',
      color: '#6b7280',
      marginBottom: '20px',
      lineHeight: '1.5'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '8px'
    },
    textarea: {
      width: '100%',
      minHeight: '100px',
      padding: '12px',
      fontSize: '14px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      resize: 'vertical',
      fontFamily: 'inherit'
    },
    helpText: {
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '4px'
    },
    infoBox: {
      backgroundColor: '#f0f9ff',
      border: '1px solid #bae6fd',
      borderRadius: '6px',
      padding: '12px',
      marginBottom: '20px'
    },
    infoText: {
      fontSize: '14px',
      color: '#0369a1',
      margin: 0
    },
    actions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      paddingTop: '20px',
      borderTop: '1px solid #e5e7eb'
    },
    button: {
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: '500',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    cancelButton: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db'
    },
    createButton: {
      backgroundColor: '#3b82f6',
      color: 'white'
    },
    disabledButton: {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Create Manual Backup</h2>
          <button
            style={styles.closeButton}
            onClick={onClose}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.infoBox}>
            <p style={styles.infoText}>
              📋 This will create a backup of all current pricing data (PriceFixes, Product Catalog, and Service Configs).
              Only one backup per day is allowed - if a backup already exists for today, this action will be skipped.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label} htmlFor="description">
                Change Description
              </label>
              <textarea
                id="description"
                style={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what changes prompted this manual backup..."
                disabled={loading}
              />
              <div style={styles.helpText}>
                Optional: Describe the reason for creating this manual backup
              </div>
            </div>

            <div style={styles.actions}>
              <button
                type="button"
                style={{
                  ...styles.button,
                  ...styles.cancelButton,
                  ...(loading ? styles.disabledButton : {})
                }}
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  ...styles.button,
                  ...styles.createButton,
                  ...(loading ? styles.disabledButton : {})
                }}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Backup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};