// src/components/ServiceAgreement/ServiceAgreement.tsx
import React, { useEffect, useRef, useState } from 'react';
import './ServiceAgreement.css';
import logo from "../../assets/em-logo.png";
import { addTextChange } from '../../utils/fileLogger';
import { serviceAgreementTemplateApi } from '../../backendservice/api/serviceAgreementTemplateApi';
import type { ServiceAgreementTemplate } from '../../backendservice/api/serviceAgreementTemplateApi';

interface ServiceAgreementProps {
  /** Optional callback so the parent form can capture the agreement fields. */
  onAgreementChange?: (data: ServiceAgreementData) => void;
  /** Optional logo (URL). If omitted, a simple inline "EM" mark is shown. */
  logoSrc?: string;
  logoAlt?: string;
  /** ✅ Optional initial data for editing existing agreements */
  initialData?: ServiceAgreementData;
  /** ⚡ OPTIMIZED: Optional template data from combined API call (avoids separate fetch) */
  templateData?: ServiceAgreementTemplate | null;
  /** ⚡ OPTIMIZED: Loading state for template data (prevents premature separate fetch) */
  templateLoading?: boolean;
}

export interface ServiceAgreementData {
  // ✅ NEW: Flag to control whether to include service agreement in PDF
  includeInPdf: boolean;
  retainDispensers: boolean;
  disposeDispensers: boolean;
  customerContactName: string;
  customerSignature: string;
  customerSignatureDate: string;
  emFranchisee: string;
  emSignature: string;
  emSignatureDate: string;
  insideSalesRepresentative: string;
  emSalesRepresentative: string;
  // Editable terms
  term1: string;
  term2: string;
  term3: string;
  term4: string;
  term5: string;
  term6: string;
  term7: string;
  noteText: string;
  // Editable labels
  titleText: string;
  subtitleText: string;
  retainDispensersLabel: string;
  disposeDispensersLabel: string;
  emSalesRepLabel: string;
  insideSalesRepLabel: string;
  authorityText: string;
  customerContactLabel: string;
  customerSignatureLabel: string;
  customerDateLabel: string;
  emFranchiseeLabel: string;
  emSignatureLabel: string;
  emDateLabel: string;
  pageNumberText: string;
}

export const ServiceAgreement: React.FC<ServiceAgreementProps> = ({
  onAgreementChange,
  logoSrc,
  logoAlt,
  initialData, // ✅ Accept initial data prop
  templateData, // ⚡ OPTIMIZED: Accept template data from combined API call
  templateLoading = false, // ⚡ OPTIMIZED: Accept loading state (default false for backward compatibility)
}) => {
  // ✅ Initialize showAgreement from initialData if provided
  const [showAgreement, setShowAgreement] = useState(initialData?.includeInPdf ?? true);
  // ⚡ OPTIMIZED: Only show loading if we're waiting for template (not editing and template is loading)
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(!initialData && templateLoading);
  const [agreementData, setAgreementData] = useState<ServiceAgreementData>(() => {
    // ✅ If initialData is provided, use it (editing existing agreement)
    if (initialData) {
      return initialData;
    }

    // ✅ CHANGED: Return empty defaults - will be filled by template fetch
    return {
      includeInPdf: true,
      retainDispensers: true,
      disposeDispensers: false,
      customerContactName: '',
      customerSignature: '',
      customerSignatureDate: '',
      emFranchisee: '',
      emSignature: '',
      emSignatureDate: '',
      insideSalesRepresentative: '',
      emSalesRepresentative: '',
      // Temporary defaults - will be replaced by template
      term1: '',
      term2: '',
      term3: '',
      term4: '',
      term5: '',
      term6: '',
      term7: '',
      noteText: '',
      titleText: 'SERVICE AGREEMENT',
      subtitleText: 'Terms and Conditions',
      retainDispensersLabel: 'Customer desires to retain existing dispensers',
      disposeDispensersLabel: 'Customer desires to dispose of existing dispensers',
      emSalesRepLabel: 'EM Sales Representative',
      insideSalesRepLabel: 'Inside SalesRepresentative',
      authorityText: 'I HEREBY REPRESENT THAT I HAVE THE AUTHORITY TO SIGN THIS AGREEMENT:',
      customerContactLabel: 'Customer Contact Name:',
      customerSignatureLabel: 'Signature:',
      customerDateLabel: 'Date:',
      emFranchiseeLabel: 'EM Franchisee:',
      emSignatureLabel: 'Signature:',
      emDateLabel: 'Date:',
      pageNumberText: 'PAGE 4',
    };
  });

  // ⚡ OPTIMIZED: Load template data (from prop or backend fetch)
  useEffect(() => {
    const loadTemplate = async () => {
      // Skip if we have initialData (editing mode)
      if (initialData) {
        console.log('📄 [SERVICE-AGREEMENT] Using initial data from edit mode');
        return;
      }

      // ⚡ OPTIMIZED: Use template data from props if available (from combined API call)
      if (templateData) {
        console.log('⚡ [SERVICE-AGREEMENT] Using template from combined API call (no separate fetch needed)');

        // Update agreement data with template values
        setAgreementData(prev => ({
          ...prev,
          term1: templateData.term1,
          term2: templateData.term2,
          term3: templateData.term3,
          term4: templateData.term4,
          term5: templateData.term5,
          term6: templateData.term6,
          term7: templateData.term7,
          noteText: templateData.noteText,
          titleText: templateData.titleText,
          subtitleText: templateData.subtitleText,
          retainDispensersLabel: templateData.retainDispensersLabel,
          disposeDispensersLabel: templateData.disposeDispensersLabel,
          emSalesRepLabel: templateData.emSalesRepLabel,
          insideSalesRepLabel: templateData.insideSalesRepLabel,
          authorityText: templateData.authorityText,
          customerContactLabel: templateData.customerContactLabel,
          customerSignatureLabel: templateData.customerSignatureLabel,
          customerDateLabel: templateData.customerDateLabel,
          emFranchiseeLabel: templateData.emFranchiseeLabel,
          emSignatureLabel: templateData.emSignatureLabel,
          emDateLabel: templateData.emDateLabel,
          pageNumberText: templateData.pageNumberText,
        }));

        setIsLoadingTemplate(false);
        return;
      }

      // ⚡ CRITICAL: Wait if parent is still loading combined data - DON'T fetch separately yet!
      if (templateLoading) {
        console.log('⏳ [SERVICE-AGREEMENT] Waiting for combined API call to complete...');
        setIsLoadingTemplate(true);
        return;
      }

      // ⚠️ FALLBACK: Fetch from backend only if parent finished loading but no template provided
      // This shouldn't normally happen if parent uses the optimized hook
      if (!templateData && !templateLoading) {
        console.warn('⚠️ [SERVICE-AGREEMENT] Parent finished loading but no template provided - fetching separately (fallback)');
        try {
          setIsLoadingTemplate(true);
          const template = await serviceAgreementTemplateApi.getActiveTemplate();

          console.log('✅ [SERVICE-AGREEMENT] Template loaded via fallback fetch');

          // Update agreement data with template values
          setAgreementData(prev => ({
            ...prev,
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
            pageNumberText: template.pageNumberText,
          }));
        } catch (error) {
          console.error('❌ [SERVICE-AGREEMENT] Failed to load template:', error);
          // Keep existing default values if template fetch fails
        } finally {
          setIsLoadingTemplate(false);
        }
      }
    };

    loadTemplate();
  }, [initialData, templateData, templateLoading]); // ⚡ OPTIMIZED: Depend on templateLoading to know when to stop waiting

  // ✅ NEW: Track original term values for change logging
  const originalTermsRef = useRef<Record<string, string>>({});

  // Initialize original terms after data is loaded (either from template or initialData)
  useEffect(() => {
    if (Object.keys(originalTermsRef.current).length === 0 && agreementData.term1) {
      originalTermsRef.current = {
        term1: agreementData.term1,
        term2: agreementData.term2,
        term3: agreementData.term3,
        term4: agreementData.term4,
        term5: agreementData.term5,
        term6: agreementData.term6,
        term7: agreementData.term7,
        noteText: agreementData.noteText,
        titleText: agreementData.titleText,
        subtitleText: agreementData.subtitleText,
      };
    }
  }, [agreementData]); // Re-run when agreementData changes (after template loads)

  const prevDataRef = useRef<string>('');

  useEffect(() => {
    const dataStr = JSON.stringify(agreementData);
    if (dataStr !== prevDataRef.current && onAgreementChange) {
      prevDataRef.current = dataStr;
      onAgreementChange(agreementData);
    }
  }, [agreementData, onAgreementChange]);

  const handleCheckboxChange = (field: 'retainDispensers' | 'disposeDispensers') => {
    setAgreementData(prev => ({
      ...prev,
      retainDispensers: field === 'retainDispensers' ? !prev.retainDispensers : false,
      disposeDispensers: field === 'disposeDispensers' ? !prev.disposeDispensers : false,
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAgreementData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateClick = (fieldName: string) => {
    const today = new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    setAgreementData(prev => ({
      ...prev,
      [fieldName]: today,
    }));
  };

  const handleTextEdit = (field: keyof ServiceAgreementData, value: string) => {
    // ✅ NEW: Log text changes for agreement terms
    const fieldsToTrack = ['term1', 'term2', 'term3', 'term4', 'term5', 'term6', 'term7', 'noteText', 'titleText', 'subtitleText'];

    if (fieldsToTrack.includes(field)) {
      const originalValue = originalTermsRef.current[field] || '';

      // Only log if the value actually changed
      if (originalValue !== value && value.trim().length > 0) {
        const fieldDisplayNames: Record<string, string> = {
          term1: 'Agreement Term 1 (Property Ownership)',
          term2: 'Agreement Term 2 (Promise of Good Service)',
          term3: 'Agreement Term 3 (Payment Terms)',
          term4: 'Agreement Term 4 (Indemnification)',
          term5: 'Agreement Term 5 (Expiration/Termination)',
          term6: 'Agreement Term 6 (Install Warranty)',
          term7: 'Agreement Term 7 (Sale of Business)',
          noteText: 'Agreement Note Text',
          titleText: 'Agreement Title',
          subtitleText: 'Agreement Subtitle',
        };

        console.log(`📝 [SERVICE-AGREEMENT] Text change detected for ${field}:`, {
          from: originalValue.substring(0, 100) + (originalValue.length > 100 ? '...' : ''),
          to: value.substring(0, 100) + (value.length > 100 ? '...' : ''),
        });

        addTextChange({
          productKey: `serviceAgreement_${field}`,
          productName: `Service Agreement - ${fieldDisplayNames[field] || field}`,
          productType: 'agreement_text',
          fieldType: field,
          fieldDisplayName: fieldDisplayNames[field] || field,
          originalText: originalValue,
          newText: value,
          quantity: 1,
          frequency: '',
        });

        // Update the original value to the new value so subsequent edits track correctly
        originalTermsRef.current[field] = value;
      }
    }

    setAgreementData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div style={{ width: '100%', margin: '30px 0' }}>
      {/* Toggle Checkbox */}
      <div style={{
        padding: '20px',
        background: '#f5f5f5',
        borderRadius: '8px',
        marginBottom: showAgreement ? '20px' : '0'
      }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '600'
        }}>
          <input
            type="checkbox"
            checked={showAgreement}
            onChange={(e) => {
              const checked = e.target.checked;
              setShowAgreement(checked);
              // ✅ Update includeInPdf flag when checkbox changes
              setAgreementData(prev => ({
                ...prev,
                includeInPdf: checked
              }));
            }}
            style={{
              width: '20px',
              height: '20px',
              cursor: 'pointer'
            }}
          />
          <span>Include Service Agreement</span>
        </label>
      </div>

      {/* Loading State - Show while fetching template */}
      {isLoadingTemplate && showAgreement && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #f3f4f6',
            borderTopColor: '#059669',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}></div>
          <p style={{
            marginTop: '16px',
            fontSize: '14px',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            Loading service agreement template...
          </p>
          <style>
            {`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      )}

      {/* Agreement Content - Only show when checkbox is checked and template loaded */}
      {showAgreement && !isLoadingTemplate && (
        <div className="sa-page" role="group" aria-label="Service Agreement">
          <header className="sa-header">
            <div className="sa-logo" aria-label="Enviro-Master logo">
           
                <img src={logo} alt="Enviro-Master Logo" className="cua2__logo-img" />
           
                <svg className="sa-logo-fallback" viewBox="0 0 160 80" aria-hidden="true">
                  <rect x="0" y="0" width="160" height="80" fill="#ffffff" />
                  <g transform="translate(0,10)">
                    <rect x="0" y="0" width="90" height="12" fill="#d50000" />
                    <rect x="0" y="18" width="90" height="12" fill="#d50000" />
                    <rect x="0" y="36" width="90" height="12" fill="#d50000" />
                  </g>
                  <text x="102" y="48" fontFamily="Arial, Helvetica, sans-serif" fontSize="44" fontWeight="700" fill="#111">EM</text>
                </svg>
        
            </div>

            <div
              className="sa-title-box"
              aria-label="Document title"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleTextEdit('titleText', e.currentTarget.textContent || '')}
              style={{ outline: 'none', cursor: 'text' }}
            >
              {agreementData.titleText}
            </div>

            <div className="sa-header-spacer" aria-hidden="true" />
          </header>

          <div
            className="sa-subtitle"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleTextEdit('subtitleText', e.currentTarget.textContent || '')}
            style={{ outline: 'none', cursor: 'text' }}
          >
            {agreementData.subtitleText}
          </div>

          <div className="sa-terms" aria-label="Terms and Conditions">
            <p className="sa-term">
              <span className="sa-term-num">1.</span>
              <span
                className="sa-term-body"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleTextEdit('term1', e.currentTarget.textContent || '')}
                style={{ outline: 'none', cursor: 'text' }}
              >
                {agreementData.term1}
              </span>
            </p>

            <p className="sa-term">
              <span className="sa-term-num">2.</span>
              <span
                className="sa-term-body"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleTextEdit('term2', e.currentTarget.textContent || '')}
                style={{ outline: 'none', cursor: 'text' }}
              >
                {agreementData.term2}
              </span>
            </p>

            <p className="sa-term">
              <span className="sa-term-num">3.</span>
              <span
                className="sa-term-body"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleTextEdit('term3', e.currentTarget.textContent || '')}
                style={{ outline: 'none', cursor: 'text' }}
              >
                {agreementData.term3}
              </span>
            </p>

            <p className="sa-term">
              <span className="sa-term-num">4.</span>
              <span
                className="sa-term-body"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleTextEdit('term4', e.currentTarget.textContent || '')}
                style={{ outline: 'none', cursor: 'text' }}
              >
                {agreementData.term4}
              </span>
            </p>

            <p className="sa-term">
              <span className="sa-term-num">5.</span>
              <span
                className="sa-term-body"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleTextEdit('term5', e.currentTarget.textContent || '')}
                style={{ outline: 'none', cursor: 'text' }}
              >
                {agreementData.term5}
              </span>
            </p>

            <p className="sa-term">
              <span className="sa-term-num">6.</span>
              <span
                className="sa-term-body"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleTextEdit('term6', e.currentTarget.textContent || '')}
                style={{ outline: 'none', cursor: 'text' }}
              >
                {agreementData.term6}
              </span>
            </p>

            <p className="sa-term sa-term-last">
              <span className="sa-term-num">7.</span>
              <span
                className="sa-term-body"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleTextEdit('term7', e.currentTarget.textContent || '')}
                style={{ outline: 'none', cursor: 'text' }}
              >
                {agreementData.term7}
              </span>
            </p>
          </div>

          <div className="sa-dispenser-row" aria-label="Dispenser options">
            <label className="sa-dispenser-option">
              <span
                className="sa-dispenser-text"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleTextEdit('retainDispensersLabel', e.currentTarget.textContent || '')}
                style={{ outline: 'none', cursor: 'text' }}
              >
                <strong>{agreementData.retainDispensersLabel}</strong>
              </span>
              <input
                className="sa-checkbox"
                type="checkbox"
                checked={agreementData.retainDispensers}
                onChange={() => handleCheckboxChange('retainDispensers')}
              />
            </label>

            <label className="sa-dispenser-option">
              <span
                className="sa-dispenser-text"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleTextEdit('disposeDispensersLabel', e.currentTarget.textContent || '')}
                style={{ outline: 'none', cursor: 'text' }}
              >
                <strong>{agreementData.disposeDispensersLabel}</strong>
              </span>
              <input
                className="sa-checkbox"
                type="checkbox"
                checked={agreementData.disposeDispensers}
                onChange={() => handleCheckboxChange('disposeDispensers')}
              />
            </label>
          </div>

          <p
            className="sa-note"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleTextEdit('noteText', e.currentTarget.textContent || '')}
            style={{ outline: 'none', cursor: 'text' }}
          >
            {agreementData.noteText}
          </p>

          <div className="sa-reps-row" aria-label="Representatives">
            <div className="sa-line-field">
              <span
                className="sa-line-label"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleTextEdit('emSalesRepLabel', e.currentTarget.textContent || '')}
                style={{ outline: 'none', cursor: 'text' }}
              >
                {agreementData.emSalesRepLabel}
              </span>
              <input
                className="sa-line-input"
                type="text"
                name="emSalesRepresentative"
                value={agreementData.emSalesRepresentative}
                onChange={handleInputChange}
                aria-label="EM Sales Representative"
              />
            </div>

            <div className="sa-line-field">
              <span
                className="sa-line-label"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => handleTextEdit('insideSalesRepLabel', e.currentTarget.textContent || '')}
                style={{ outline: 'none', cursor: 'text' }}
              >
                {agreementData.insideSalesRepLabel}
              </span>
              <input
                className="sa-line-input"
                type="text"
                name="insideSalesRepresentative"
                value={agreementData.insideSalesRepresentative}
                onChange={handleInputChange}
                aria-label="Inside Sales Representative"
              />
            </div>
          </div>

          <div
            className="sa-authority"
            aria-label="Authority statement"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleTextEdit('authorityText', e.currentTarget.textContent || '')}
            style={{ outline: 'none', cursor: 'text' }}
          >
            {agreementData.authorityText}
          </div>

          <div className="sa-signatures" aria-label="Signature section">
            <div className="sa-sig-row">
              <div className="sa-inline-field sa-field-contact">
                <span
                  className="sa-inline-label"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleTextEdit('customerContactLabel', e.currentTarget.textContent || '')}
                  style={{ outline: 'none', cursor: 'text' }}
                >
                  {agreementData.customerContactLabel}
                </span>
                <input
                  className="sa-underline-input"
                  type="text"
                  name="customerContactName"
                  value={agreementData.customerContactName}
                  onChange={handleInputChange}
                />
              </div>
              <div className="sa-inline-field sa-field-sign">
                <span
                  className="sa-inline-label"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleTextEdit('customerSignatureLabel', e.currentTarget.textContent || '')}
                  style={{ outline: 'none', cursor: 'text' }}
                >
                  {agreementData.customerSignatureLabel}
                </span>
                <input
                  className="sa-underline-input sa-signature-input"
                  type="text"
                  name="customerSignature"
                  value={agreementData.customerSignature}
                  onChange={handleInputChange}
                />
              </div>
              <div className="sa-inline-field sa-field-date">
                <span
                  className="sa-inline-label"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleTextEdit('customerDateLabel', e.currentTarget.textContent || '')}
                  style={{ outline: 'none', cursor: 'text' }}
                >
                  {agreementData.customerDateLabel}
                </span>
                <input
                  className="sa-underline-input sa-date-input"
                  type="text"
                  name="customerSignatureDate"
                  value={agreementData.customerSignatureDate}
                  onChange={handleInputChange}
                  onClick={() => handleDateClick('customerSignatureDate')}
                  readOnly
                />
              </div>
            </div>

            <div className="sa-sig-row">
              <div className="sa-inline-field sa-field-contact">
                <span
                  className="sa-inline-label"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleTextEdit('emFranchiseeLabel', e.currentTarget.textContent || '')}
                  style={{ outline: 'none', cursor: 'text' }}
                >
                  {agreementData.emFranchiseeLabel}
                </span>
                <input
                  className="sa-underline-input"
                  type="text"
                  name="emFranchisee"
                  value={agreementData.emFranchisee}
                  onChange={handleInputChange}
                />
              </div>
              <div className="sa-inline-field sa-field-sign">
                <span
                  className="sa-inline-label"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleTextEdit('emSignatureLabel', e.currentTarget.textContent || '')}
                  style={{ outline: 'none', cursor: 'text' }}
                >
                  {agreementData.emSignatureLabel}
                </span>
                <input
                  className="sa-underline-input sa-signature-input"
                  type="text"
                  name="emSignature"
                  value={agreementData.emSignature}
                  onChange={handleInputChange}
                />
              </div>
              <div className="sa-inline-field sa-field-date">
                <span
                  className="sa-inline-label"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => handleTextEdit('emDateLabel', e.currentTarget.textContent || '')}
                  style={{ outline: 'none', cursor: 'text' }}
                >
                  {agreementData.emDateLabel}
                </span>
                <input
                  className="sa-underline-input sa-date-input"
                  type="text"
                  name="emSignatureDate"
                  value={agreementData.emSignatureDate}
                  onChange={handleInputChange}
                  onClick={() => handleDateClick('emSignatureDate')}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div
            className="sa-page-number"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleTextEdit('pageNumberText', e.currentTarget.textContent || '')}
            style={{ outline: 'none', cursor: 'text' }}
          >
            {agreementData.pageNumberText}
          </div>
        </div>
      )}
    </div>
  );
};
