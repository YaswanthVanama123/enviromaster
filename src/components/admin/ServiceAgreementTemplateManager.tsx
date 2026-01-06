// src/components/admin/ServiceAgreementTemplateManager.tsx
import React, { useState, useEffect } from 'react';
import { serviceAgreementTemplateApi, type ServiceAgreementTemplate } from '../../backendservice/api/serviceAgreementTemplateApi';
import { Toast } from './Toast';
import type { ToastType } from './Toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faUndo, faFileContract, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import './ServiceAgreementTemplateManager.css';

export const ServiceAgreementTemplateManager: React.FC = () => {
  const [template, setTemplate] = useState<ServiceAgreementTemplate | null>(null);
  const [formData, setFormData] = useState({
    // Terms
    term1: '',
    term2: '',
    term3: '',
    term4: '',
    term5: '',
    term6: '',
    term7: '',
    noteText: '',
    // Labels
    titleText: '',
    subtitleText: '',
    retainDispensersLabel: '',
    disposeDispensersLabel: '',
    emSalesRepLabel: '',
    insideSalesRepLabel: '',
    authorityText: '',
    customerContactLabel: '',
    customerSignatureLabel: '',
    customerDateLabel: '',
    emFranchiseeLabel: '',
    emSignatureLabel: '',
    emDateLabel: '',
    pageNumberText: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState<'terms' | 'labels'>('terms');

  // Load active template on component mount
  useEffect(() => {
    loadTemplate();
  }, []);

  // Track changes
  useEffect(() => {
    if (template) {
      const changed = Object.keys(formData).some(
        (key) => formData[key as keyof typeof formData] !== template[key as keyof ServiceAgreementTemplate]
      );
      setHasChanges(changed);
    }
  }, [formData, template]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const activeTemplate = await serviceAgreementTemplateApi.getActiveTemplate();
      setTemplate(activeTemplate);
      setFormData({
        term1: activeTemplate.term1,
        term2: activeTemplate.term2,
        term3: activeTemplate.term3,
        term4: activeTemplate.term4,
        term5: activeTemplate.term5,
        term6: activeTemplate.term6,
        term7: activeTemplate.term7,
        noteText: activeTemplate.noteText,
        titleText: activeTemplate.titleText,
        subtitleText: activeTemplate.subtitleText,
        retainDispensersLabel: activeTemplate.retainDispensersLabel,
        disposeDispensersLabel: activeTemplate.disposeDispensersLabel,
        emSalesRepLabel: activeTemplate.emSalesRepLabel,
        insideSalesRepLabel: activeTemplate.insideSalesRepLabel,
        authorityText: activeTemplate.authorityText,
        customerContactLabel: activeTemplate.customerContactLabel,
        customerSignatureLabel: activeTemplate.customerSignatureLabel,
        customerDateLabel: activeTemplate.customerDateLabel,
        emFranchiseeLabel: activeTemplate.emFranchiseeLabel,
        emSignatureLabel: activeTemplate.emSignatureLabel,
        emDateLabel: activeTemplate.emDateLabel,
        pageNumberText: activeTemplate.pageNumberText
      });
    } catch (error) {
      console.error('Error loading template:', error);
      setToastMessage({
        message: 'Failed to load service agreement template',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate all required fields
    const requiredFields = ['term1', 'term2', 'term3', 'term4', 'term5', 'term6', 'term7', 'noteText'];
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData].trim()) {
        setToastMessage({
          message: `${field} cannot be empty`,
          type: 'error'
        });
        return;
      }
    }

    try {
      setSaving(true);
      const result = await serviceAgreementTemplateApi.updateTemplate(formData);

      if (result.success) {
        setTemplate(result.template);
        setHasChanges(false);
        setToastMessage({
          message: 'Service agreement template saved successfully!',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setToastMessage({
        message: 'Failed to save service agreement template',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (template) {
      setFormData({
        term1: template.term1,
        term2: template.term2,
        term3: template.term3,
        term4: template.term4,
        term5: template.term5,
        term6: template.term6,
        term7: template.term7,
        noteText: template.noteText,
        titleText: template.titleText,
        subtitleText: template.subtitleText,
        retainDispensersLabel: template.retainDispensersLabel,
        disposeDispensersLabel: template.disposeDispensersLabel,
        emSalesRepLabel: template.emSalesRepLabel,
        insideSalesRepLabel: template.insideSalesRepLabel,
        authorityText: template.authorityText,
        customerContactLabel: template.customerContactLabel,
        customerSignatureLabel: template.customerSignatureLabel,
        customerDateLabel: template.customerDateLabel,
        emFranchiseeLabel: template.emFranchiseeLabel,
        emSignatureLabel: template.emSignatureLabel,
        emDateLabel: template.emDateLabel,
        pageNumberText: template.pageNumberText
      });
      setHasChanges(false);
      setToastMessage({
        message: 'Changes discarded',
        type: 'success'
      });
    }
  };

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="service-agreement-template-manager">
      <div className="sa-template-header">
        <div className="sa-template-title">
          <FontAwesomeIcon icon={faFileContract} />
          <h2>Service Agreement Template Manager</h2>
        </div>
        <div className="sa-template-info">
          <FontAwesomeIcon icon={faInfoCircle} />
          <span>This template will be used for all service agreements</span>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="sa-template-tabs">
        <button
          type="button"
          className={`sa-tab ${activeSection === 'terms' ? 'active' : ''}`}
          onClick={() => setActiveSection('terms')}
        >
          Terms & Conditions
        </button>
        <button
          type="button"
          className={`sa-tab ${activeSection === 'labels' ? 'active' : ''}`}
          onClick={() => setActiveSection('labels')}
        >
          Labels & Text
        </button>
      </div>

      <div className="sa-template-form">
        {loading ? (
          <div className="sa-template-loading-state">
            <div className="sa-template-spinner-inline">
              <span className="sa-template-sr-only">Loading template…</span>
            </div>
            <p className="sa-template-loading-text">Loading template data...</p>
          </div>
        ) : (
          <>
            {/* Terms Section */}
            {activeSection === 'terms' && (
              <div className="sa-section">
                <h3>Agreement Terms</h3>

                {/* Term 1 */}
                <div className="sa-template-field">
                  <label htmlFor="term1">
                    Term 1: Property Ownership
                    <span className="required">*</span>
                  </label>
                  <textarea
                    id="term1"
                    value={formData.term1}
                    onChange={(e) => handleFieldChange('term1', e.target.value)}
                    rows={3}
                    disabled={saving}
                    className="sa-template-textarea"
                  />
                </div>

                {/* Term 2 */}
                <div className="sa-template-field">
                  <label htmlFor="term2">
                    Term 2: Promise of Good Service
                    <span className="required">*</span>
                  </label>
                  <textarea
                    id="term2"
                    value={formData.term2}
                    onChange={(e) => handleFieldChange('term2', e.target.value)}
                    rows={3}
                    disabled={saving}
                    className="sa-template-textarea"
                  />
                </div>

                {/* Term 3 */}
                <div className="sa-template-field">
                  <label htmlFor="term3">
                    Term 3: Payment Terms
                    <span className="required">*</span>
                  </label>
                  <textarea
                    id="term3"
                    value={formData.term3}
                    onChange={(e) => handleFieldChange('term3', e.target.value)}
                    rows={5}
                    disabled={saving}
                    className="sa-template-textarea"
                  />
                </div>

                {/* Term 4 */}
                <div className="sa-template-field">
                  <label htmlFor="term4">
                    Term 4: Indemnification
                    <span className="required">*</span>
                  </label>
                  <textarea
                    id="term4"
                    value={formData.term4}
                    onChange={(e) => handleFieldChange('term4', e.target.value)}
                    rows={3}
                    disabled={saving}
                    className="sa-template-textarea"
                  />
                </div>

                {/* Term 5 */}
                <div className="sa-template-field">
                  <label htmlFor="term5">
                    Term 5: Expiration/Termination
                    <span className="required">*</span>
                  </label>
                  <textarea
                    id="term5"
                    value={formData.term5}
                    onChange={(e) => handleFieldChange('term5', e.target.value)}
                    rows={4}
                    disabled={saving}
                    className="sa-template-textarea"
                  />
                </div>

                {/* Term 6 */}
                <div className="sa-template-field">
                  <label htmlFor="term6">
                    Term 6: Install Warranty/Scope of Service
                    <span className="required">*</span>
                  </label>
                  <textarea
                    id="term6"
                    value={formData.term6}
                    onChange={(e) => handleFieldChange('term6', e.target.value)}
                    rows={3}
                    disabled={saving}
                    className="sa-template-textarea"
                  />
                </div>

                {/* Term 7 */}
                <div className="sa-template-field">
                  <label htmlFor="term7">
                    Term 7: Sale of Customer Business
                    <span className="required">*</span>
                  </label>
                  <textarea
                    id="term7"
                    value={formData.term7}
                    onChange={(e) => handleFieldChange('term7', e.target.value)}
                    rows={2}
                    disabled={saving}
                    className="sa-template-textarea"
                  />
                </div>

                {/* Note Text */}
                <div className="sa-template-field">
                  <label htmlFor="noteText">
                    Agreement Note/Duration Text
                    <span className="required">*</span>
                  </label>
                  <textarea
                    id="noteText"
                    value={formData.noteText}
                    onChange={(e) => handleFieldChange('noteText', e.target.value)}
                    rows={3}
                    disabled={saving}
                    className="sa-template-textarea"
                  />
                </div>
              </div>
            )}

            {/* Labels Section */}
            {activeSection === 'labels' && (
              <div className="sa-section">
                <h3>Document Labels</h3>

                {/* Header Labels */}
                <div className="sa-subsection">
                  <h4>Header Section</h4>

                  <div className="sa-template-field">
                    <label htmlFor="titleText">Title Text</label>
                    <input
                      id="titleText"
                      type="text"
                      value={formData.titleText}
                      onChange={(e) => handleFieldChange('titleText', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="subtitleText">Subtitle Text</label>
                    <input
                      id="subtitleText"
                      type="text"
                      value={formData.subtitleText}
                      onChange={(e) => handleFieldChange('subtitleText', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>
                </div>

                {/* Dispenser Options */}
                <div className="sa-subsection">
                  <h4>Dispenser Options</h4>

                  <div className="sa-template-field">
                    <label htmlFor="retainDispensersLabel">Retain Dispensers Label</label>
                    <input
                      id="retainDispensersLabel"
                      type="text"
                      value={formData.retainDispensersLabel}
                      onChange={(e) => handleFieldChange('retainDispensersLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="disposeDispensersLabel">Dispose Dispensers Label</label>
                    <input
                      id="disposeDispensersLabel"
                      type="text"
                      value={formData.disposeDispensersLabel}
                      onChange={(e) => handleFieldChange('disposeDispensersLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>
                </div>

                {/* Representative Labels */}
                <div className="sa-subsection">
                  <h4>Representative Labels</h4>

                  <div className="sa-template-field">
                    <label htmlFor="emSalesRepLabel">EM Sales Rep Label</label>
                    <input
                      id="emSalesRepLabel"
                      type="text"
                      value={formData.emSalesRepLabel}
                      onChange={(e) => handleFieldChange('emSalesRepLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="insideSalesRepLabel">Inside Sales Rep Label</label>
                    <input
                      id="insideSalesRepLabel"
                      type="text"
                      value={formData.insideSalesRepLabel}
                      onChange={(e) => handleFieldChange('insideSalesRepLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>
                </div>

                {/* Signature Labels */}
                <div className="sa-subsection">
                  <h4>Signature Section</h4>

                  <div className="sa-template-field">
                    <label htmlFor="authorityText">Authority Statement</label>
                    <input
                      id="authorityText"
                      type="text"
                      value={formData.authorityText}
                      onChange={(e) => handleFieldChange('authorityText', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="customerContactLabel">Customer Contact Label</label>
                    <input
                      id="customerContactLabel"
                      type="text"
                      value={formData.customerContactLabel}
                      onChange={(e) => handleFieldChange('customerContactLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="customerSignatureLabel">Customer Signature Label</label>
                    <input
                      id="customerSignatureLabel"
                      type="text"
                      value={formData.customerSignatureLabel}
                      onChange={(e) => handleFieldChange('customerSignatureLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="customerDateLabel">Customer Date Label</label>
                    <input
                      id="customerDateLabel"
                      type="text"
                      value={formData.customerDateLabel}
                      onChange={(e) => handleFieldChange('customerDateLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="emFranchiseeLabel">EM Franchisee Label</label>
                    <input
                      id="emFranchiseeLabel"
                      type="text"
                      value={formData.emFranchiseeLabel}
                      onChange={(e) => handleFieldChange('emFranchiseeLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="emSignatureLabel">EM Signature Label</label>
                    <input
                      id="emSignatureLabel"
                      type="text"
                      value={formData.emSignatureLabel}
                      onChange={(e) => handleFieldChange('emSignatureLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>

                  <div className="sa-template-field">
                    <label htmlFor="emDateLabel">EM Date Label</label>
                    <input
                      id="emDateLabel"
                      type="text"
                      value={formData.emDateLabel}
                      onChange={(e) => handleFieldChange('emDateLabel', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="sa-subsection">
                  <h4>Footer</h4>

                  <div className="sa-template-field">
                    <label htmlFor="pageNumberText">Page Number Text</label>
                    <input
                      id="pageNumberText"
                      type="text"
                      value={formData.pageNumberText}
                      onChange={(e) => handleFieldChange('pageNumberText', e.target.value)}
                      disabled={saving}
                      className="sa-template-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="sa-template-actions">
              <button
                type="button"
                className="sa-template-btn sa-template-btn--reset"
                onClick={handleReset}
                disabled={!hasChanges || saving}
              >
                <FontAwesomeIcon icon={faUndo} />
                Discard Changes
              </button>
              <button
                type="button"
                className="sa-template-btn sa-template-btn--save"
                onClick={handleSave}
                disabled={!hasChanges || saving}
              >
                <FontAwesomeIcon icon={faSave} />
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>

            {/* Last Updated Info */}
            {template && (
              <div className="sa-template-meta">
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

export default ServiceAgreementTemplateManager;
