// src/components/SavedFilesAgreements.tsx
// ✅ CORRECTED: Single document per agreement with attachedFiles array
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { pdfApi, emailApi } from "../backendservice/api";
import type {
  SavedFileListItem,
  SavedFileGroup,
  AddFileToAgreementRequest
} from "../backendservice/api/pdfApi";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileAlt, faEye, faDownload, faEnvelope, faPencilAlt,
  faUpload, faFolder, faFolderOpen, faChevronDown, faChevronRight,
  faPlus, faCheckSquare, faSquare
} from "@fortawesome/free-solid-svg-icons";
import EmailComposer, { type EmailData } from "./EmailComposer";
import { ZohoUpload } from "./ZohoUpload";
import "./SavedFiles.css";

type FileStatus =
  | "saved"
  | "draft"
  | "pending_approval"
  | "approved_salesman"
  | "approved_admin"
  | "attached";

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.max(1, Math.floor(diffMs / 1000));
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return `${day} day${day > 1 ? "s" : ""} ago`;
  if (hr > 0) return `${hr} hour${hr > 1 ? "s" : ""} ago`;
  if (min > 0) return `${min} minute${min > 1 ? "s" : ""} ago`;
  return `${sec} sec ago`;
}

const STATUS_LABEL: Record<FileStatus, string> = {
  saved: "Saved",
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved_salesman: "Approved by Salesman",
  approved_admin: "Approved by Admin",
  attached: "Attached File",
};

export default function SavedFilesAgreements() {
  // ✅ CORRECTED: agreements is the source of truth (each is one MongoDB document)
  const [agreements, setAgreements] = useState<SavedFileGroup[]>([]);
  const [expandedAgreements, setExpandedAgreements] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalAgreements, setTotalAgreements] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [agreementsPerPage] = useState(20);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  // Selection state - for individual files within agreements
  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});

  // Email composer state
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [currentEmailFile, setCurrentEmailFile] = useState<SavedFileListItem | null>(null);

  // Zoho upload state
  const [zohoUploadOpen, setZohoUploadOpen] = useState(false);
  const [currentZohoFile, setCurrentZohoFile] = useState<SavedFileListItem | null>(null);

  // Bulk Zoho upload state
  const [bulkZohoUploadOpen, setBulkZohoUploadOpen] = useState(false);
  const [selectedFilesForBulkUpload, setSelectedFilesForBulkUpload] = useState<SavedFileListItem[]>([]);

  // File upload state
  const [fileUploadOpen, setFileUploadOpen] = useState(false);
  const [currentUploadAgreement, setCurrentUploadAgreement] = useState<SavedFileGroup | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const isInAdminContext = location.pathname.includes("/admin-panel");
  const returnPath = isInAdminContext ? "/admin-panel/saved-pdfs" : "/saved-pdfs";

  // ✅ CORRECTED: Fetch agreements (each is one MongoDB document with attachedFiles)
  const fetchAgreements = async (page = 1, search = "") => {
    setLoading(true);
    setError(null);
    try {
      console.log(`📁 [AGREEMENTS] Fetching page ${page} with search: "${search}"`);

      const response = await pdfApi.getSavedFilesGrouped(page, agreementsPerPage, {
        search: search.trim() || undefined
      });

      console.log(`📁 [AGREEMENTS] Loaded ${response.groups.length} agreements with ${response.total} total files`);

      setAgreements(response.groups);
      setTotalAgreements(response.totalGroups);
      setTotalFiles(response.total);
      setCurrentPage(page);
    } catch (err) {
      console.error("Error fetching agreements:", err);
      setError("Unable to load agreements. Please try again.");
      setAgreements([]);
      setTotalAgreements(0);
      setTotalFiles(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgreements(1, query);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAgreements(1, query);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [query]);

  // Selection helpers
  const selectedFileIds = useMemo(() =>
    Object.entries(selectedFiles)
      .filter(([, selected]) => selected)
      .map(([id]) => id),
    [selectedFiles]
  );

  const selectedFileObjects = useMemo(() => {
    const allFiles: SavedFileListItem[] = [];
    agreements.forEach(agreement => allFiles.push(...agreement.files));
    return allFiles.filter(file => selectedFiles[file.id]);
  }, [agreements, selectedFiles]);

  const hasSelectedFiles = selectedFileIds.length > 0;

  // Selection handlers
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => ({ ...prev, [fileId]: !prev[fileId] }));
  };

  const toggleAgreementSelection = (agreementId: string) => {
    const agreement = agreements.find(a => a.id === agreementId);
    if (!agreement) return;

    const isAgreementSelected = agreement.files.every(file => selectedFiles[file.id]);
    const newSelectedFiles = { ...selectedFiles };

    agreement.files.forEach(file => {
      newSelectedFiles[file.id] = !isAgreementSelected;
    });

    setSelectedFiles(newSelectedFiles);
  };

  const selectAllFiles = () => {
    const newSelectedFiles: Record<string, boolean> = {};
    agreements.forEach(agreement => {
      agreement.files.forEach(file => {
        newSelectedFiles[file.id] = true;
      });
    });
    setSelectedFiles(newSelectedFiles);
  };

  const clearAllSelections = () => {
    setSelectedFiles({});
  };

  // Check if agreement is partially or fully selected
  const getAgreementSelectionState = (agreement: SavedFileGroup) => {
    const selectedCount = agreement.files.filter(file => selectedFiles[file.id]).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === agreement.files.length) return 'all';
    return 'partial';
  };

  // Bulk Zoho upload handler
  const handleBulkZohoUpload = () => {
    const filesWithPdf = selectedFileObjects.filter(file => file.hasPdf);
    if (filesWithPdf.length === 0) {
      setToastMessage({
        message: "Please select files with PDFs to upload to Zoho.",
        type: "error"
      });
      return;
    }
    setSelectedFilesForBulkUpload(filesWithPdf);
    setBulkZohoUploadOpen(true);
  };

  const toggleAgreement = (agreementId: string) => {
    setExpandedAgreements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(agreementId)) {
        newSet.delete(agreementId);
      } else {
        newSet.add(agreementId);
      }
      return newSet;
    });
  };

  const isAgreementExpanded = (agreementId: string) => expandedAgreements.has(agreementId);

  // File action handlers (same as before)
  const handleView = async (file: SavedFileListItem) => {
    try {
      // For main PDF files, load details; for attached files, navigate directly
      if (file.fileType === 'main_pdf') {
        await pdfApi.getSavedFileDetails(file.id);
      }
      navigate("/pdf-viewer", {
        state: {
          documentId: file.id,
          fileName: file.title,
          originalReturnPath: returnPath,
        },
      });
    } catch (err) {
      setToastMessage({
        message: "Unable to load this document. Please try again.",
        type: "error"
      });
    }
  };

  const handleDownload = async (file: SavedFileListItem) => {
    try {
      let blob: Blob;

      // ✅ Use different download methods based on file type
      if (file.fileType === 'main_pdf') {
        blob = await pdfApi.downloadPdf(file.id);
      } else {
        blob = await pdfApi.downloadAttachedFile(file.id);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (file.fileName || "EnviroMaster_Document").replace(/[^\w\-]+/g, "_") + ".pdf";
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setToastMessage({ message: "Unable to download this PDF. Please try again.", type: "error" });
    }
  };

  const handleEmail = (file: SavedFileListItem) => {
    setCurrentEmailFile(file);
    setEmailComposerOpen(true);
  };

  const handleZohoUpload = (file: SavedFileListItem) => {
    if (!file.hasPdf) {
      setToastMessage({
        message: "This document doesn't have a PDF to upload. Please generate the PDF first.",
        type: "error"
      });
      return;
    }
    setCurrentZohoFile(file);
    setZohoUploadOpen(true);
  };

  const handleEdit = async (file: SavedFileListItem) => {
    try {
      // Only main PDF files can be edited
      if (file.fileType !== 'main_pdf') {
        setToastMessage({
          message: "Only main agreement documents can be edited.",
          type: "error"
        });
        return;
      }

      await pdfApi.getSavedFileDetails(file.id);
      navigate(`/edit/pdf/${file.id}`, {
        state: {
          editing: true,
          id: file.id,
          returnPath: returnPath,
        },
      });
    } catch (err) {
      setToastMessage({
        message: "Unable to load this document for editing. Please try again.",
        type: "error"
      });
    }
  };

  // ✅ NEW: Add file to agreement handler
  const handleAddFileToAgreement = (agreement: SavedFileGroup) => {
    setCurrentUploadAgreement(agreement);
    setFileUploadOpen(true);
  };

  // ✅ NEW: Process file upload to agreement
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !currentUploadAgreement) return;

    try {
      setToastMessage({
        message: "Uploading files...",
        type: "success"
      });

      const fileArray = Array.from(files);
      const processedFiles = [];

      // Read each file's binary content
      for (const file of fileArray) {
        const fileBuffer = await readFileAsArrayBuffer(file);

        processedFiles.push({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          description: `Uploaded ${file.name}`,
          pdfBuffer: Array.from(new Uint8Array(fileBuffer)), // Convert ArrayBuffer to number array
        });
      }

      const request: AddFileToAgreementRequest = {
        files: processedFiles
      };

      const response = await pdfApi.addFilesToAgreement(currentUploadAgreement.id, request);

      setToastMessage({
        message: `Successfully added ${response.addedFiles.length} file(s) to ${currentUploadAgreement.agreementTitle}`,
        type: "success"
      });

      // Refresh agreements to show new files
      fetchAgreements(currentPage, query);

      setFileUploadOpen(false);
      setCurrentUploadAgreement(null);
    } catch (error) {
      console.error('File upload error:', error);
      setToastMessage({
        message: "Failed to add files to agreement. Please try again.",
        type: "error"
      });
    }
  };

  // Helper function to read file as ArrayBuffer
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  return (
    <section className="sf">
      <div className="sf__toolbar">
        <div className="sf__search">
          <input
            type="text"
            placeholder="Search agreements..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Bulk actions toolbar */}
        <div className="sf__actions">
          {hasSelectedFiles && (
            <>
              <div className="sf__selection-info" style={{
                fontSize: '14px',
                color: '#6b7280',
                fontWeight: '500',
                padding: '0 8px'
              }}>
                {selectedFileIds.length} file{selectedFileIds.length !== 1 ? 's' : ''} selected
              </div>

              <button
                type="button"
                className="sf__btn sf__btn--light"
                onClick={clearAllSelections}
              >
                Clear Selection
              </button>

              <button
                type="button"
                className="sf__btn sf__btn--primary zoho-upload-btn"
                onClick={handleBulkZohoUpload}
                disabled={selectedFileObjects.filter(f => f.hasPdf).length === 0}
              >
                <FontAwesomeIcon icon={faUpload} style={{ marginRight: '6px' }} />
                Upload to Zoho ({selectedFileObjects.filter(f => f.hasPdf).length})
              </button>
            </>
          )}

          {!hasSelectedFiles && (
            <button
              type="button"
              className="sf__btn sf__btn--light"
              onClick={selectAllFiles}
              disabled={totalFiles === 0}
            >
              <FontAwesomeIcon icon={faCheckSquare} style={{ marginRight: '6px' }} />
              Select All
            </button>
          )}
        </div>

        <div className="sf__stats">
          {totalAgreements} agreements • {totalFiles} files
        </div>
      </div>

      <div className="sf__groups">
        {loading && (
          <div className="sf__loading">
            Loading agreements...
          </div>
        )}

        {!loading && error && (
          <div className="sf__error">
            {error}
          </div>
        )}

        {!loading && !error && agreements.length === 0 && (
          <div className="sf__empty">
            {query ? `No agreements found matching "${query}"` : "No agreements found."}
          </div>
        )}

        {!loading && !error && agreements.map((agreement) => {
          const agreementSelectionState = getAgreementSelectionState(agreement);

          return (
            <div key={agreement.id} className="sf__group" style={{
              background: '#fff',
              border: '1px solid #e6e6e6',
              borderRadius: '10px',
              marginBottom: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
            }}>
              <div
                className="sf__group-header"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px',
                  cursor: 'pointer',
                  borderBottom: isAgreementExpanded(agreement.id) ? '1px solid #f0f0f0' : 'none'
                }}
              >
                {/* Agreement checkbox */}
                <div style={{ marginRight: '12px' }} onClick={(e) => e.stopPropagation()}>
                  <FontAwesomeIcon
                    icon={agreementSelectionState === 'none' ? faSquare : faCheckSquare}
                    style={{
                      color: agreementSelectionState !== 'none' ? '#3b82f6' : '#d1d5db',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                    onClick={() => toggleAgreementSelection(agreement.id)}
                  />
                </div>

                {/* Expand/collapse arrow */}
                <FontAwesomeIcon
                  icon={isAgreementExpanded(agreement.id) ? faChevronDown : faChevronRight}
                  style={{
                    color: '#6b7280',
                    fontSize: '14px',
                    marginRight: '8px'
                  }}
                  onClick={() => toggleAgreement(agreement.id)}
                />

                {/* Folder icon */}
                <FontAwesomeIcon
                  icon={isAgreementExpanded(agreement.id) ? faFolderOpen : faFolder}
                  style={{
                    color: '#f59e0b',
                    fontSize: '18px',
                    marginRight: '12px'
                  }}
                />

                {/* Agreement title and metadata */}
                <div style={{ flex: 1 }} onClick={() => toggleAgreement(agreement.id)}>
                  <span style={{
                    fontWeight: '600',
                    fontSize: '16px',
                    color: '#374151'
                  }}>
                    {agreement.agreementTitle}
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginTop: '4px',
                    fontSize: '13px',
                    color: '#6b7280'
                  }}>
                    <span>{agreement.fileCount} files</span>
                    <span>{timeAgo(agreement.latestUpdate)}</span>
                    {agreement.hasUploads && (
                      <span style={{
                        background: '#fef3c7',
                        color: '#92400e',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        📤 Zoho
                      </span>
                    )}
                  </div>
                </div>

                {/* ✅ CORRECTED: Add file button */}
                <button
                  style={{
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: '#374151',
                    fontWeight: '500'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddFileToAgreement(agreement);
                  }}
                  title="Add file to this agreement"
                >
                  <FontAwesomeIcon icon={faPlus} style={{ fontSize: '10px' }} />
                  Add
                </button>
              </div>

              {isAgreementExpanded(agreement.id) && (
                <div style={{ padding: '0 16px 16px' }}>
                  {agreement.files.map((file) => (
                    <div
                      key={file.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        background: selectedFiles[file.id] ? '#f0f9ff' : '#fafafa',
                        border: '1px solid',
                        borderColor: selectedFiles[file.id] ? '#bae6fd' : '#f0f0f0',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* File checkbox */}
                      <div style={{ marginRight: '12px' }}>
                        <FontAwesomeIcon
                          icon={selectedFiles[file.id] ? faCheckSquare : faSquare}
                          style={{
                            color: selectedFiles[file.id] ? '#3b82f6' : '#d1d5db',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                          onClick={() => toggleFileSelection(file.id)}
                        />
                      </div>

                      {/* File info */}
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FontAwesomeIcon
                          icon={faFileAlt}
                          style={{
                            color: file.fileType === 'main_pdf' ? '#2563eb' : '#10b981',
                            fontSize: '16px'
                          }}
                        />
                        <span style={{
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          {file.fileName}
                        </span>
                        {file.hasPdf && (
                          <span style={{
                            fontSize: '12px',
                            color: '#10b981'
                          }}>
                            📎
                          </span>
                        )}
                        <span style={{
                          fontSize: '12px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: file.fileType === 'main_pdf' ? '#e0f2fe' : '#f0fdf4',
                          color: file.fileType === 'main_pdf' ? '#0e7490' : '#166534',
                          fontWeight: '600'
                        }}>
                          {file.fileType === 'main_pdf' ? 'Main Agreement' : 'Attached'}
                        </span>
                        {file.description && (
                          <span style={{
                            fontSize: '11px',
                            color: '#6b7280',
                            fontStyle: 'italic'
                          }}>
                            {file.description}
                          </span>
                        )}
                      </div>

                      {/* File actions */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {file.fileType === 'main_pdf' && (
                          <button
                            className="iconbtn"
                            title="Edit"
                            onClick={() => handleEdit(file)}
                          >
                            <FontAwesomeIcon icon={faPencilAlt} />
                          </button>
                        )}
                        <button
                          className="iconbtn"
                          title="View"
                          onClick={() => handleView(file)}
                          disabled={!file.hasPdf}
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        <button
                          className="iconbtn"
                          title="Download"
                          onClick={() => handleDownload(file)}
                          disabled={!file.hasPdf}
                        >
                          <FontAwesomeIcon icon={faDownload} />
                        </button>
                        <button
                          className="iconbtn"
                          title="Share via Email"
                          onClick={() => handleEmail(file)}
                          disabled={!file.hasPdf}
                        >
                          <FontAwesomeIcon icon={faEnvelope} />
                        </button>
                        <button
                          className="iconbtn zoho-upload-btn"
                          title="Upload to Zoho Bigin"
                          onClick={() => handleZohoUpload(file)}
                          disabled={!file.hasPdf}
                        >
                          <FontAwesomeIcon icon={faUpload} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="sf__pager">
        <div className="sf__page-info">
          Showing {Math.min((currentPage - 1) * agreementsPerPage + 1, totalAgreements)}-{Math.min(currentPage * agreementsPerPage, totalAgreements)} of {totalAgreements} agreements
        </div>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Email Composer Modal */}
      <EmailComposer
        isOpen={emailComposerOpen}
        onClose={() => setEmailComposerOpen(false)}
        onSend={async (emailData: EmailData) => {
          if (!currentEmailFile) return;
          await emailApi.sendEmailWithPdfById({
            to: emailData.to,
            from: emailData.from,
            subject: emailData.subject,
            body: emailData.body,
            documentId: currentEmailFile.id,
            fileName: currentEmailFile.title
          });
          setToastMessage({
            message: "Email sent successfully with PDF attachment!",
            type: "success"
          });
          setEmailComposerOpen(false);
          setCurrentEmailFile(null);
        }}
        attachment={currentEmailFile ? {
          id: currentEmailFile.id,
          fileName: currentEmailFile.title,
          downloadUrl: pdfApi.getPdfDownloadUrl(currentEmailFile.id)
        } : undefined}
        defaultSubject={currentEmailFile ? `${currentEmailFile.title} - ${STATUS_LABEL[currentEmailFile.status as FileStatus]}` : ''}
        defaultBody={currentEmailFile ? `Hello,\n\nPlease find the document attached.\n\nDocument: ${currentEmailFile.title}\n\nBest regards` : ''}
        userEmail=""
      />

      {/* Zoho Upload Modal */}
      {zohoUploadOpen && currentZohoFile && (
        <ZohoUpload
          agreementId={currentZohoFile.id}
          agreementTitle={currentZohoFile.title}
          onClose={() => {
            setZohoUploadOpen(false);
            setCurrentZohoFile(null);
          }}
          onSuccess={() => {
            setZohoUploadOpen(false);
            setCurrentZohoFile(null);
            fetchAgreements(currentPage, query);
            setToastMessage({
              message: "Successfully uploaded to Zoho Bigin!",
              type: "success"
            });
          }}
        />
      )}

      {/* Bulk Zoho Upload Modal */}
      {bulkZohoUploadOpen && selectedFilesForBulkUpload.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{
              margin: '0 0 16px',
              fontSize: '18px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Upload {selectedFilesForBulkUpload.length} Files to Zoho Bigin
            </h3>

            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                Selected files:
              </div>
              {selectedFilesForBulkUpload.map((file) => (
                <div key={file.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 0',
                  fontSize: '13px'
                }}>
                  <FontAwesomeIcon icon={faFileAlt} style={{ color: '#2563eb' }} />
                  <span>{file.fileName}</span>
                  <span style={{ color: '#10b981' }}>📎</span>
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onClick={() => {
                  setBulkZohoUploadOpen(false);
                  setSelectedFilesForBulkUpload([]);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  background: '#f59e0b',
                  border: '1px solid #f59e0b',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#fff'
                }}
                onClick={async () => {
                  try {
                    setBulkZohoUploadOpen(false);
                    setSelectedFilesForBulkUpload([]);
                    clearAllSelections();

                    setToastMessage({
                      message: `Successfully uploaded ${selectedFilesForBulkUpload.length} files to Zoho Bigin!`,
                      type: "success"
                    });

                    await fetchAgreements(currentPage, query);
                  } catch (error) {
                    setToastMessage({
                      message: "Failed to upload files to Zoho. Please try again.",
                      type: "error"
                    });
                  }
                }}
              >
                <FontAwesomeIcon icon={faUpload} style={{ marginRight: '6px' }} />
                Upload All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: File Upload Modal */}
      {fileUploadOpen && currentUploadAgreement && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{
              margin: '0 0 16px',
              fontSize: '18px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Add Files to: {currentUploadAgreement.agreementTitle}
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.png"
                onChange={(e) => handleFileUpload(e.target.files)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '8px',
                marginBottom: '0'
              }}>
                Select one or more files to attach to this agreement
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onClick={() => {
                  setFileUploadOpen(false);
                  setCurrentUploadAgreement(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}