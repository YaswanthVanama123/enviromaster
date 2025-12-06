import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPaperPlane, faFileAlt, faUser, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { Toast } from './admin/Toast';
import type { ToastType } from './admin/Toast';
import './EmailComposer.css';

export interface EmailAttachment {
  id: string;
  fileName: string;
  downloadUrl: string;
  blob?: Blob;
}

export interface EmailData {
  to: string;
  from: string;
  subject: string;
  body: string;
  attachment?: EmailAttachment;
}

export interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (emailData: EmailData) => Promise<void>;
  attachment?: EmailAttachment;
  defaultSubject?: string;
  defaultBody?: string;
  userEmail?: string; // Auto-populated from login
}

export const EmailComposer: React.FC<EmailComposerProps> = ({
  isOpen,
  onClose,
  onSend,
  attachment,
  defaultSubject = '',
  defaultBody = '',
  userEmail = ''
}) => {
  const [formData, setFormData] = useState<EmailData>({
    to: '',
    from: '',
    subject: '',
    body: ''
  });

  const [sending, setSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Auto-populate form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        to: '',
        from: userEmail || '',
        subject: defaultSubject,
        body: defaultBody,
        attachment: attachment
      });

      // Load PDF blob for attachment if provided
      if (attachment?.downloadUrl) {
        loadPdfBlob(attachment.downloadUrl);
      }
    }
  }, [isOpen, attachment, defaultSubject, defaultBody, userEmail]);

  const loadPdfBlob = async (url: string) => {
    try {
      setLoadingPdf(true);
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        setPdfBlob(blob);
      } else {
        throw new Error(`Failed to load PDF: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
      setToastMessage({
        message: 'Failed to load PDF attachment',
        type: 'error'
      });
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleInputChange = (field: keyof EmailData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSend = async () => {
    // Validation
    if (!formData.to.trim()) {
      setToastMessage({
        message: 'Please enter a recipient email address',
        type: 'error'
      });
      return;
    }

    if (!formData.from.trim()) {
      setToastMessage({
        message: 'Please enter a sender email address',
        type: 'error'
      });
      return;
    }

    if (!formData.subject.trim()) {
      setToastMessage({
        message: 'Please enter an email subject',
        type: 'error'
      });
      return;
    }

    try {
      setSending(true);

      // Prepare email data with blob if available
      const emailDataToSend: EmailData = {
        ...formData,
        attachment: attachment && pdfBlob ? {
          ...attachment,
          blob: pdfBlob
        } : attachment
      };

      await onSend(emailDataToSend);

      setToastMessage({
        message: 'Email sent successfully!',
        type: 'success'
      });

      // Close modal after successful send
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error sending email:', error);
      setToastMessage({
        message: 'Failed to send email. Please try again.',
        type: 'error'
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setFormData({
      to: '',
      from: '',
      subject: '',
      body: ''
    });
    setPdfBlob(null);
    setToastMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="email-composer-overlay">
      <div className="email-composer-modal">
        <div className="email-composer-header">
          <h2>
            <FontAwesomeIcon icon={faEnvelope} />
            Send Email
          </h2>
          <button
            className="email-composer-close"
            onClick={handleClose}
            disabled={sending}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="email-composer-body">
          {/* From Field */}
          <div className="email-composer-field">
            <label>
              <FontAwesomeIcon icon={faUser} />
              From:
            </label>
            <input
              type="email"
              value={formData.from}
              onChange={(e) => handleInputChange('from', e.target.value)}
              placeholder="your-email@enviromasternva.com"
              disabled={sending}
            />
          </div>

          {/* To Field */}
          <div className="email-composer-field">
            <label>
              <FontAwesomeIcon icon={faEnvelope} />
              To:
            </label>
            <input
              type="email"
              value={formData.to}
              onChange={(e) => handleInputChange('to', e.target.value)}
              placeholder="recipient@example.com"
              disabled={sending}
            />
          </div>

          {/* Subject Field */}
          <div className="email-composer-field">
            <label>Subject:</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="Enter email subject"
              disabled={sending}
            />
          </div>

          {/* Attachment Display */}
          {attachment && (
            <div className="email-composer-attachment">
              <FontAwesomeIcon icon={faFileAlt} />
              <span>Attachment: {attachment.fileName}</span>
              {loadingPdf && <span className="loading-pdf">Loading...</span>}
              {pdfBlob && !loadingPdf && (
                <span className="attachment-size">
                  ({(pdfBlob.size / 1024 / 1024).toFixed(1)} MB) ✅
                </span>
              )}
            </div>
          )}

          {/* Body Field */}
          <div className="email-composer-field">
            <label>Message:</label>
            <textarea
              value={formData.body}
              onChange={(e) => handleInputChange('body', e.target.value)}
              placeholder="Enter your message here..."
              rows={10}
              disabled={sending}
            />
          </div>
        </div>

        <div className="email-composer-footer">
          <button
            className="email-composer-btn email-composer-btn--cancel"
            onClick={handleClose}
            disabled={sending}
          >
            Cancel
          </button>
          <button
            className="email-composer-btn email-composer-btn--send"
            onClick={handleSend}
            disabled={sending || loadingPdf || !pdfBlob}
          >
            {sending ? (
              <>Sending...</>
            ) : (
              <>
                <FontAwesomeIcon icon={faPaperPlane} />
                Send Email with PDF
              </>
            )}
          </button>
        </div>

        {toastMessage && (
          <Toast
            message={toastMessage.message}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        )}
      </div>
    </div>
  );
};

export default EmailComposer;