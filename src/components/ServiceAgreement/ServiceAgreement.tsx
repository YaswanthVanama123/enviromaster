// src/components/ServiceAgreement/ServiceAgreement.tsx
import React, { useEffect, useRef, useState } from 'react';
import './ServiceAgreement.css';

interface ServiceAgreementProps {
  /** Optional callback so the parent form can capture the agreement fields. */
  onAgreementChange?: (data: ServiceAgreementData) => void;
  /** Optional logo (URL). If omitted, a simple inline "EM" mark is shown. */
  logoSrc?: string;
  logoAlt?: string;
}

export interface ServiceAgreementData {
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
}) => {
  const [showAgreement, setShowAgreement] = useState(false);
  const [agreementData, setAgreementData] = useState<ServiceAgreementData>({
    retainDispensers: false,
    disposeDispensers: false,
    customerContactName: '',
    customerSignature: '',
    customerSignatureDate: '',
    emFranchisee: '',
    emSignature: '',
    emSignatureDate: '',
    insideSalesRepresentative: '',
    emSalesRepresentative: '',
    // Default terms
    term1: 'All dispensers installed under this Agreement are owned by and shall remain the property of Enviro-Master Services, here noted as the Company. Damage to any Company dispenser due to vandalism, abuse, or theft, Company will replace the dispenser(s) at the then current replacement rate.',
    term2: "Enviro-Master Promise of Good Service. In the event that Customer: (1) provides a written material complaint to Company; (2) Company does not cure, address or resolve the Complaint within a fifteen-day period of receipt; and, 3) Customer has paid all fees and provided Company the opportunity to retrieve its dispensers from Customer premises in good condition – Customer may then terminate Company's services by providing thirty (30) days written notice of its intention to do so.",
    term3: "Payment Terms. If Customer has elected credit card payment through Company's eBill program, customer agrees to submit payment by the first business day of each month for Company's services/products provided in the previous month. If Customer has elected Net 30 payment terms, then Company will invoice Customer on the first business day of each month for services/products provided during the previous month. Customer agrees to pay monthly statement no later than the first business day of the following month. If the outstanding balance is not paid in full within 45 days of billing, Company has the right to terminate this Agreement. All invoices shall be deemed true and correct unless Customer provides a written objection to an invoice to Company within thirty (30) days of the due date of such invoice. Any invoice not paid within thirty (30) days of billing shall be subject to a finance charge equal to 1.5 percent per month or the highest amount allowed by law, whichever is less. Should any check remittance be returned for insufficient funds (\"ISF\"), Customer expressly authorizes Company to electronically debit or draft from its bank account the amount of such check remittance, plus any ISF fees incurred by Company. Customer agrees to pay all reasonable attorney fees and costs to enforce this Agreement. Company may increase charges from time to time by notifying Customer in writing which may be on Customer's invoice or monthly statement. Customer agrees to pay a $10 charge for each incident in which Customer refuses Company's scheduled services.",
    term4: "Indemnification. Customer shall protect, defend, indemnify, and hold Company harmless from all third-party claims, losses, damages, costs, and expenses (including attorney's fees) and which arise in connection with this Agreement and with Customer's interim cleaning and use of any products in its restroom facilities. The Customer acknowledges and understands that Enviro-Master makes no additional representations of any kind or nature regarding the use of the Vaporizer/Sani-Guard disinfectants beyond those made by the manufacturer as to its EPA registration status and safety.",
    term5: "Expiration/Termination. Upon the expiration or termination of this Agreement, Customer shall remit any unpaid charges and immediately, permit Company to retrieve all dispensers on its premises. Company has no obligation to reinstall Customer's dispensers. Company is not liable for damages to Customer's property (except for gross negligence) should Company removes its dispensers. If this Agreement is terminated early for any reason, other than under the Enviro- Master Promise of Good Service, Customer will pay Company, as liquidated damages, 50% of its average weekly invoice (over the previous thirteen-week period) and multiplied by the number of weeks remaining in the unexpired Agreement term, plus the replacement cost of all dispensers in service.",
    term6: "Install Warranty/Scope of Service. Company's install warranty to repair or replace dispensers refers to normal wear and tear, manufacture malfunction or defect. Company's warranty does not cover vandalism or abuse. Company will perform all work set forth in its cleaning/sanitizing scope of service for Customer in a good and workman-like manner.",
    term7: "Sale of Customer Business. If Customer sells or transfers its business (whether by asset sale, stock sale or otherwise), new owner or operator will assume this agreement.",
    noteText: "Agreement term shall be for thirty-six (36) months from execution and shall automatically renew for another like term unless Enviro-Master is provided written notice of Customer's desire to discontinue service thirty (30) days prior to expiration of any term. This Agreement is subject to the terms and conditions on its reverse side.",
    // Default labels
    titleText: "SERVICE AGREEMENT",
    subtitleText: "Terms and Conditions",
    retainDispensersLabel: "Customer desires to retain existing dispensers",
    disposeDispensersLabel: "Customer desires to dispose of existing dispensers",
    emSalesRepLabel: "EM Sales Representative",
    insideSalesRepLabel: "Inside SalesRepresentative",
    authorityText: "I HEREBY REPRESENT THAT I HAVE THE AUTHORITY TO SIGN THIS AGREEMENT:",
    customerContactLabel: "Customer Contact Name:",
    customerSignatureLabel: "Signature:",
    customerDateLabel: "Date:",
    emFranchiseeLabel: "EM Franchisee:",
    emSignatureLabel: "Signature:",
    emDateLabel: "Date:",
    pageNumberText: "Page #2",
  });

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
            onChange={(e) => setShowAgreement(e.target.checked)}
            style={{
              width: '20px',
              height: '20px',
              cursor: 'pointer'
            }}
          />
          <span>Include Service Agreement</span>
        </label>
      </div>

      {/* Agreement Content - Only show when checkbox is checked */}
      {showAgreement && (
        <div className="sa-page" role="group" aria-label="Service Agreement">
          <header className="sa-header">
            <div className="sa-logo" aria-label="Enviro-Master logo">
              {logoSrc ? (
                <img className="sa-logo-img" src={logoSrc} alt={logoAlt ?? 'EM'} />
              ) : (
                <svg className="sa-logo-fallback" viewBox="0 0 160 80" aria-hidden="true">
                  <rect x="0" y="0" width="160" height="80" fill="#ffffff" />
                  <g transform="translate(0,10)">
                    <rect x="0" y="0" width="90" height="12" fill="#d50000" />
                    <rect x="0" y="18" width="90" height="12" fill="#d50000" />
                    <rect x="0" y="36" width="90" height="12" fill="#d50000" />
                  </g>
                  <text x="102" y="48" fontFamily="Arial, Helvetica, sans-serif" fontSize="44" fontWeight="700" fill="#111">EM</text>
                </svg>
              )}
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
