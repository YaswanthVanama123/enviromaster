// src/components/ZohoUpload.tsx
import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faBuilding,
  faPlus,
  faUpload,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faHistory,
  faSearch,
  faFileAlt
} from "@fortawesome/free-solid-svg-icons";
import { zohoApi } from "../backendservice/api";
import type { ZohoCompany, ZohoUploadStatus, ZohoPipelineOptions } from "../backendservice/api";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import "./ZohoUpload.css";

interface ZohoUploadProps {
  agreementId: string;
  agreementTitle: string;
  onClose: () => void;
  onSuccess: () => void;
  // ✅ NEW: Optional bulk upload support using existing UI
  bulkFiles?: Array<{ id: string; fileName: string; title: string }>;
}

type UploadStep = 'loading' | 'first-time' | 'update' | 'uploading' | 'success' | 'error';

export const ZohoUpload: React.FC<ZohoUploadProps> = ({
  agreementId,
  agreementTitle,
  onClose,
  onSuccess,
  bulkFiles  // ✅ NEW: Optional bulk files array
}) => {
  // State management
  const [step, setStep] = useState<UploadStep>('loading');
  const [uploadStatus, setUploadStatus] = useState<ZohoUploadStatus | null>(null);
  const [companies, setCompanies] = useState<ZohoCompany[]>([]);
  const [pipelineOptions, setPipelineOptions] = useState<ZohoPipelineOptions | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  // Form data
  const [selectedCompany, setSelectedCompany] = useState<ZohoCompany | null>(null);
  const [dealName, setDealName] = useState('');
  const [pipelineName, setPipelineName] = useState('Sales Pipeline');
  const [stage, setStage] = useState('Proposal');
  const [noteText, setNoteText] = useState('');
  const [newCompany, setNewCompany] = useState({
    name: '',
    phone: '',
    email: '',
    website: '',
    address: ''
  });

  // Initialize component
  useEffect(() => {
    initializeUpload();
  }, [agreementId, bulkFiles]);  // ✅ Also watch bulkFiles changes

  const initializeUpload = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ BULK UPLOAD MODE: Skip status check, go directly to company selection
      if (bulkFiles && bulkFiles.length > 0) {
        // Load companies for bulk upload (same UI as single upload)
        const companiesResult = await zohoApi.getCompanies(1);

        if (!companiesResult.success) {
          throw new Error(companiesResult.error || 'Failed to load companies');
        }

        setCompanies(companiesResult.companies || []);

        // Set default deal name for bulk upload
        const defaultDealName = bulkFiles.length === 1
          ? bulkFiles[0].title
          : `Bulk Upload - ${bulkFiles.length} Documents`;
        setDealName(defaultDealName);

        setStep('first-time');
        return;
      }

      // ✅ SINGLE UPLOAD MODE: Original logic
      // Check upload status
      const statusResult = await zohoApi.getUploadStatus(agreementId);
      setUploadStatus(statusResult);

      if (statusResult.isFirstTime) {
        // Load companies for first-time upload
        const companiesResult = await zohoApi.getCompanies(1);

        if (!companiesResult.success) {
          throw new Error(companiesResult.error || 'Failed to load companies');
        }

        setCompanies(companiesResult.companies || []);
        // ✅ FIX: Don't load pipeline options here - wait for company selection

        // Generate default deal name
        const defaultDealName = generateDealName(statusResult.agreement?.headerTitle || agreementTitle);
        setDealName(defaultDealName);

        setStep('first-time');
      } else {
        // Update mode
        setStep('update');
      }
    } catch (err) {
      console.error('Failed to initialize upload:', err);

      // ✅ NEW: Show helpful error for OAuth issues
      if (err.message?.includes('authorization') || err.message?.includes('auth')) {
        setError('Zoho integration not set up. Please contact your administrator to configure Zoho Bigin access.');
      } else {
        setError('Failed to load upload options. Please try again.');
      }

      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Load pipeline options when company is selected
  useEffect(() => {
    const loadPipelineOptions = async () => {
      if (!selectedCompany) {
        // Clear pipeline options when no company selected
        setPipelineOptions({ success: false, pipelines: [], stages: [] });
        return;
      }

      try {
        console.log(`🔍 Loading pipeline options for company: ${selectedCompany.name} (${selectedCompany.id})`);
        const pipelineResult = await zohoApi.getCompanyPipelineOptions(selectedCompany.id);

        if (pipelineResult.success) {
          setPipelineOptions(pipelineResult);
          console.log(`✅ Loaded pipeline options:`, pipelineResult.pipelines?.length || 0, 'pipelines');

          // Set default values from the loaded options
          if (pipelineResult.pipelines?.length > 0) {
            setPipelineName(pipelineResult.pipelines[0].value);
          }
          if (pipelineResult.stages?.length > 0) {
            setStage(pipelineResult.stages[0].value);
          }
        } else {
          console.error('Failed to load pipeline options:', pipelineResult.error);
          // Keep existing fallback values
        }
      } catch (error) {
        console.error('Error loading pipeline options:', error);
        // Keep existing fallback values
      }
    };

    loadPipelineOptions();
  }, [selectedCompany]); // Trigger when company selection changes

  const generateDealName = (title: string) => {
    const cleanTitle = title?.trim() || 'Service Proposal';
    return `${cleanTitle} - EnviroMaster Services`;
  };

  const searchCompanies = useCallback(async (search: string) => {
    if (!search.trim()) {
      // Load default companies
      const result = await zohoApi.getCompanies(1);
      setCompanies(result.companies || []);
      return;
    }

    try {
      const result = await zohoApi.getCompanies(1, search);
      setCompanies(result.companies || []);
    } catch (err) {
      console.error('Failed to search companies:', err);
      setToastMessage({ message: 'Failed to search companies', type: 'error' });
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (step === 'first-time') {
        searchCompanies(searchTerm);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchCompanies, step]);

  const handleCreateCompany = async () => {
    if (!newCompany.name.trim()) {
      setToastMessage({ message: 'Company name is required', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      const result = await zohoApi.createCompany(newCompany);

      if (result.success && result.company) {
        setSelectedCompany(result.company);
        setCompanies(prev => [result.company!, ...prev]);
        setShowCreateCompany(false);
        setNewCompany({ name: '', phone: '', email: '', website: '', address: '' });
        setToastMessage({ message: 'Company created successfully', type: 'success' });
      } else {
        setToastMessage({ message: result.error || 'Failed to create company', type: 'error' });
      }
    } catch (err) {
      console.error('Failed to create company:', err);
      setToastMessage({ message: 'Failed to create company', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFirstTimeUpload = async () => {
    if (!selectedCompany) {
      setToastMessage({ message: 'Please select a company', type: 'error' });
      return;
    }
    if (!dealName.trim()) {
      setToastMessage({ message: 'Deal name is required', type: 'error' });
      return;
    }
    if (!noteText.trim()) {
      setToastMessage({ message: 'Please add notes about this proposal', type: 'error' });
      return;
    }

    try {
      setStep('uploading');

      // ✅ BULK UPLOAD MODE: Process multiple files
      if (bulkFiles && bulkFiles.length > 0) {
        let successCount = 0;
        let failCount = 0;

        for (const file of bulkFiles) {
          try {
            const result = await zohoApi.firstTimeUpload(file.id, {
              companyId: selectedCompany.id,
              companyName: selectedCompany.name,
              dealName: `${dealName.trim()} - ${file.fileName}`,
              pipelineName,
              stage,
              noteText: `${noteText.trim()}\n\nDocument: ${file.fileName}`
            });

            if (result.success) {
              successCount++;
            } else {
              failCount++;
              console.error(`Failed to upload ${file.fileName}:`, result.error);
            }
          } catch (err) {
            failCount++;
            console.error(`Error uploading ${file.fileName}:`, err);
          }
        }

        if (successCount > 0) {
          setStep('success');
          const message = failCount > 0
            ? `Uploaded ${successCount} files successfully, ${failCount} failed`
            : `Successfully uploaded all ${successCount} files to Zoho Bigin!`;
          setToastMessage({ message, type: successCount === bulkFiles.length ? 'success' : 'warning' });
          onSuccess();
        } else {
          setError('All uploads failed. Please check your connection and try again.');
          setStep('error');
        }
        return;
      }

      // ✅ SINGLE UPLOAD MODE: Original logic
      const result = await zohoApi.firstTimeUpload(agreementId, {
        companyId: selectedCompany.id,
        companyName: selectedCompany.name,
        dealName: dealName.trim(),
        pipelineName,
        stage,
        noteText: noteText.trim()
      });

      if (result.success) {
        setStep('success');
        setToastMessage({ message: 'Successfully uploaded to Zoho Bigin!', type: 'success' });
        onSuccess();
      } else {
        setError(result.error || 'Upload failed');
        setStep('error');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Upload failed. Please try again.');
      setStep('error');
    }
  };

  const handleUpdateUpload = async () => {
    if (!noteText.trim()) {
      setToastMessage({ message: 'Please add notes about what changed in this version', type: 'error' });
      return;
    }

    try {
      setStep('uploading');
      const result = await zohoApi.updateUpload(agreementId, {
        noteText: noteText.trim()
      });

      if (result.success) {
        setStep('success');
        setToastMessage({ message: `Successfully uploaded version ${uploadStatus?.mapping?.nextVersion || 'new'}!`, type: 'success' });
        onSuccess();
      } else {
        setError(result.error || 'Upload failed');
        setStep('error');
      }
    } catch (err) {
      console.error('Update upload failed:', err);
      setError('Upload failed. Please try again.');
      setStep('error');
    }
  };

  const renderLoadingStep = () => (
    <div className="zoho-upload__step zoho-upload__step--loading">
      <div className="zoho-upload__loading">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>Loading upload options...</p>
      </div>
    </div>
  );

  const renderFirstTimeStep = () => (
    <div className="zoho-upload__step zoho-upload__step--first-time">
      <div className="zoho-upload__header">
        <h3>
          <FontAwesomeIcon icon={faUpload} />
          {bulkFiles && bulkFiles.length > 0
            ? `Upload ${bulkFiles.length} Files to Zoho Bigin`
            : 'First-time Upload to Zoho Bigin'
          }
        </h3>
        <p>
          {bulkFiles && bulkFiles.length > 0
            ? `Upload ${bulkFiles.length} documents to your Zoho Bigin CRM.`
            : "This agreement hasn't been uploaded to Zoho yet. Let's set it up!"
          }
        </p>
      </div>

      {/* ✅ NEW: Show files list for bulk uploads using existing UI styles */}
      {bulkFiles && bulkFiles.length > 0 && (
        <div className="zoho-upload__section">
          <label className="zoho-upload__label">
            <FontAwesomeIcon icon={faFileAlt} />
            Documents to Upload
          </label>
          <div className="zoho-upload__files-preview">
            {bulkFiles.map((file, index) => (
              <div key={file.id} className="zoho-upload__file-preview">
                <FontAwesomeIcon icon={faFileAlt} className="file-icon" />
                <span className="file-name">{file.fileName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="zoho-upload__form">
        {/* Company Selection */}
        <div className="zoho-upload__section">
          <label className="zoho-upload__label">
            <FontAwesomeIcon icon={faBuilding} />
            Select Company
          </label>

          {!showCreateCompany ? (
            <>
              <div className="zoho-upload__search">
                <FontAwesomeIcon icon={faSearch} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="zoho-upload__search-input"
                />
              </div>

              <div className="zoho-upload__companies">
                {companies.length > 0 ? (
                  companies.map((company) => (
                    <div
                      key={company.id}
                      className={`zoho-upload__company ${selectedCompany?.id === company.id ? 'selected' : ''}`}
                      onClick={() => setSelectedCompany(company)}
                    >
                      <div className="company-name">{company.name}</div>
                      {company.phone && <div className="company-info">{company.phone}</div>}
                      {company.email && <div className="company-info">{company.email}</div>}
                    </div>
                  ))
                ) : (
                  <div className="zoho-upload__no-results">
                    {searchTerm ? `No companies found for "${searchTerm}"` : 'No companies found'}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="zoho-upload__btn zoho-upload__btn--secondary"
                onClick={() => setShowCreateCompany(true)}
              >
                <FontAwesomeIcon icon={faPlus} />
                Create New Company
              </button>
            </>
          ) : (
            <div className="zoho-upload__create-company">
              <h4>Create New Company</h4>
              <input
                type="text"
                placeholder="Company Name *"
                value={newCompany.name}
                onChange={(e) => setNewCompany(prev => ({ ...prev, name: e.target.value }))}
                className="zoho-upload__input"
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                value={newCompany.phone}
                onChange={(e) => setNewCompany(prev => ({ ...prev, phone: e.target.value }))}
                className="zoho-upload__input"
              />
              <input
                type="email"
                placeholder="Email"
                value={newCompany.email}
                onChange={(e) => setNewCompany(prev => ({ ...prev, email: e.target.value }))}
                className="zoho-upload__input"
              />
              <input
                type="url"
                placeholder="Website"
                value={newCompany.website}
                onChange={(e) => setNewCompany(prev => ({ ...prev, website: e.target.value }))}
                className="zoho-upload__input"
              />
              <input
                type="text"
                placeholder="Address"
                value={newCompany.address}
                onChange={(e) => setNewCompany(prev => ({ ...prev, address: e.target.value }))}
                className="zoho-upload__input"
              />

              <div className="zoho-upload__button-group">
                <button
                  type="button"
                  className="zoho-upload__btn zoho-upload__btn--primary"
                  onClick={handleCreateCompany}
                  disabled={loading || !newCompany.name.trim()}
                >
                  {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Create Company'}
                </button>
                <button
                  type="button"
                  className="zoho-upload__btn zoho-upload__btn--secondary"
                  onClick={() => setShowCreateCompany(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Deal Information */}
        {selectedCompany && !showCreateCompany && (
          <>
            <div className="zoho-upload__section">
              <label className="zoho-upload__label">Deal Name</label>
              <input
                type="text"
                value={dealName}
                onChange={(e) => setDealName(e.target.value)}
                className="zoho-upload__input"
                placeholder="Enter deal name"
                required
              />
            </div>

            <div className="zoho-upload__row">
              <div className="zoho-upload__col">
                <label className="zoho-upload__label">Pipeline</label>
                <select
                  value={pipelineName}
                  onChange={(e) => setPipelineName(e.target.value)}
                  className="zoho-upload__select"
                >
                  {pipelineOptions?.pipelines?.map((pipeline) => (
                    <option key={pipeline.value} value={pipeline.value}>
                      {pipeline.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="zoho-upload__col">
                <label className="zoho-upload__label">Stage</label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="zoho-upload__select"
                >
                  {pipelineOptions?.stages?.map((stageOption) => (
                    <option key={stageOption.value} value={stageOption.value}>
                      {stageOption.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="zoho-upload__section">
              <label className="zoho-upload__label">Notes *</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="zoho-upload__textarea"
                placeholder="Describe this proposal (e.g., services included, pricing details, special requirements...)"
                rows={4}
                required
              />
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderUpdateStep = () => (
    <div className="zoho-upload__step zoho-upload__step--update">
      <div className="zoho-upload__header">
        <h3>
          <FontAwesomeIcon icon={faHistory} />
          Upload Updated Version
        </h3>
        <p>This agreement has been uploaded before. Adding version {uploadStatus?.mapping?.nextVersion}.</p>
      </div>

      {uploadStatus?.mapping && (
        <div className="zoho-upload__existing-info">
          <div className="info-row">
            <strong>Company:</strong> {uploadStatus.mapping.companyName}
          </div>
          <div className="info-row">
            <strong>Deal:</strong> {uploadStatus.mapping.dealName}
          </div>
          <div className="info-row">
            <strong>Current Version:</strong> {uploadStatus.mapping.currentVersion}
          </div>
          <div className="info-row">
            <strong>Last Updated:</strong> {new Date(uploadStatus.mapping.lastUploadedAt).toLocaleDateString()}
          </div>
        </div>
      )}

      <div className="zoho-upload__form">
        <div className="zoho-upload__section">
          <label className="zoho-upload__label">
            What changed in this version? *
          </label>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="zoho-upload__textarea"
            placeholder="Describe what changed (e.g., updated pricing, added services, removed items, adjusted schedule...)"
            rows={4}
            required
          />
        </div>
      </div>
    </div>
  );

  const renderUploadingStep = () => (
    <div className="zoho-upload__step zoho-upload__step--uploading">
      <div className="zoho-upload__loading">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>Uploading to Zoho Bigin...</p>
        <small>Creating deal, adding notes, and uploading PDF...</small>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="zoho-upload__step zoho-upload__step--success">
      <div className="zoho-upload__result zoho-upload__result--success">
        <FontAwesomeIcon icon={faCheckCircle} size="3x" />
        <h3>Upload Successful!</h3>
        <p>
          Your document has been successfully uploaded to Zoho Bigin.
          {uploadStatus?.isFirstTime
            ? ' The deal has been created and the PDF is now available in Zoho.'
            : ` Version ${uploadStatus?.mapping?.nextVersion} has been added to the existing deal.`
          }
        </p>
      </div>
    </div>
  );

  const renderErrorStep = () => (
    <div className="zoho-upload__step zoho-upload__step--error">
      <div className="zoho-upload__result zoho-upload__result--error">
        <FontAwesomeIcon icon={faExclamationTriangle} size="3x" />
        <h3>Upload Failed</h3>
        <p>{error}</p>
        <button
          className="zoho-upload__btn zoho-upload__btn--primary"
          onClick={() => {
            setError(null);
            setStep(uploadStatus?.isFirstTime ? 'first-time' : 'update');
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );

  const renderActions = () => {
    if (step === 'loading' || step === 'uploading' || step === 'success') {
      return null;
    }

    if (step === 'error') {
      return (
        <div className="zoho-upload__actions">
          <button
            className="zoho-upload__btn zoho-upload__btn--secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      );
    }

    if (step === 'first-time') {
      return (
        <div className="zoho-upload__actions">
          <button
            className="zoho-upload__btn zoho-upload__btn--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="zoho-upload__btn zoho-upload__btn--primary"
            onClick={handleFirstTimeUpload}
            disabled={!selectedCompany || !dealName.trim() || !noteText.trim() || showCreateCompany}
          >
            <FontAwesomeIcon icon={faUpload} />
            Upload to Zoho
          </button>
        </div>
      );
    }

    if (step === 'update') {
      return (
        <div className="zoho-upload__actions">
          <button
            className="zoho-upload__btn zoho-upload__btn--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="zoho-upload__btn zoho-upload__btn--primary"
            onClick={handleUpdateUpload}
            disabled={!noteText.trim()}
          >
            <FontAwesomeIcon icon={faUpload} />
            Upload Version {uploadStatus?.mapping?.nextVersion}
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="zoho-upload">
      <div className="zoho-upload__overlay" onClick={onClose} />
      <div className="zoho-upload__modal">
        <div className="zoho-upload__modal-header">
          <h2>Upload to Zoho Bigin</h2>
          <button className="zoho-upload__close" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="zoho-upload__modal-body">
          {step === 'loading' && renderLoadingStep()}
          {step === 'first-time' && renderFirstTimeStep()}
          {step === 'update' && renderUpdateStep()}
          {step === 'uploading' && renderUploadingStep()}
          {step === 'success' && renderSuccessStep()}
          {step === 'error' && renderErrorStep()}
        </div>

        <div className="zoho-upload__modal-footer">
          {renderActions()}
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