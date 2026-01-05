// src/components/admin/EmailTemplateManager.tsx
import React, { useState, useEffect } from 'react';
import { emailTemplateApi, type EmailTemplate } from '../../backendservice/api/emailTemplateApi';
import { Toast } from './Toast';
import type { ToastType } from './Toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faUndo, faEnvelope, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import './EmailTemplateManager.css';

export const EmailTemplateManager: React.FC = () => {
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load active template on component mount
  useEffect(() => {
    loadTemplate();
  }, []);

  // Track changes
  useEffect(() => {
    if (template) {
      const changed = subject !== template.subject || body !== template.body;
      setHasChanges(changed);
    }
  }, [subject, body, template]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const activeTemplate = await emailTemplateApi.getActiveTemplate();
      setTemplate(activeTemplate);
      setSubject(activeTemplate.subject);
      setBody(activeTemplate.body);
    } catch (error) {
      console.error('Error loading template:', error);
      setToastMessage({
        message: 'Failed to load email template',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!subject.trim()) {
      setToastMessage({
        message: 'Subject cannot be empty',
        type: 'error'
      });
      return;
    }

    if (!body.trim()) {
      setToastMessage({
        message: 'Body cannot be empty',
        type: 'error'
      });
      return;
    }

    try {
      setSaving(true);
      const result = await emailTemplateApi.updateTemplate(subject, body);

      if (result.success) {
        setTemplate(result.template);
        setHasChanges(false);
        setToastMessage({
          message: 'Email template saved successfully!',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setToastMessage({
        message: 'Failed to save email template',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
      setHasChanges(false);
      setToastMessage({
        message: 'Changes discarded',
        type: 'success'
      });
    }
  };

  return (
    <div className="email-template-manager">
      <div className="email-template-header">
        <div className="email-template-title">
          <FontAwesomeIcon icon={faEnvelope} />
          <h2>Email Template Manager</h2>
        </div>
        <div className="email-template-info">
          <FontAwesomeIcon icon={faFileAlt} />
          <span>This template will be used as default for all email communications</span>
        </div>
      </div>

      <div className="email-template-form">
        {/* Loading State - Show spinner in place of form fields */}
        {loading ? (
          <div className="email-template-loading-state">
            <div className="email-template-spinner-inline">
              <span className="email-template-sr-only">Loading email template…</span>
            </div>
            <p className="email-template-loading-text">Loading template data...</p>
          </div>
        ) : (
          <>
            {/* Subject Field */}
            <div className="email-template-field">
              <label htmlFor="subject">
                Email Subject
                <span className="required">*</span>
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                disabled={saving}
                className="email-template-input"
              />
              <small className="field-hint">This subject will be pre-filled when sending emails</small>
            </div>

            {/* Body Field */}
            <div className="email-template-field">
              <label htmlFor="body">
                Email Body
                <span className="required">*</span>
              </label>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter email body..."
                rows={15}
                disabled={saving}
                className="email-template-textarea"
              />
              <small className="field-hint">
                This message will be pre-filled when sending emails. Salesmen can edit it before sending.
              </small>
            </div>

            {/* Template Variables Info */}
            <div className="email-template-variables">
              <h3>Template Tips</h3>
              <ul>
                <li>Keep the message professional and concise</li>
                <li>Salesmen can customize this template before sending</li>
                <li>The PDF attachment will be added automatically</li>
                <li>Changes take effect immediately for all users</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="email-template-actions">
              <button
                type="button"
                className="email-template-btn email-template-btn--reset"
                onClick={handleReset}
                disabled={!hasChanges || saving}
              >
                <FontAwesomeIcon icon={faUndo} />
                Discard Changes
              </button>
              <button
                type="button"
                className="email-template-btn email-template-btn--save"
                onClick={handleSave}
                disabled={!hasChanges || saving}
              >
                <FontAwesomeIcon icon={faSave} />
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>

            {/* Last Updated Info */}
            {template && (
              <div className="email-template-meta">
                Last updated: {new Date(template.updatedAt).toLocaleString()}
              </div>
            )}
          </>
        )}
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
};

export default EmailTemplateManager;
