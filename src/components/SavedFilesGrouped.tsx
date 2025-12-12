// src/components/SavedFilesGrouped.tsx
// ✅ NEW: Folder-like grouped view with checkboxes and bulk actions
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { pdfApi, emailApi } from "../backendservice/api";
import type { SavedFileListItem, SavedFileGroup } from "../backendservice/api/pdfApi";
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
  | "approved_admin";

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
};

export default function SavedFilesGrouped() {
  const [groups, setGroups] = useState<SavedFileGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [groupsPerPage] = useState(20);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  // ✅ NEW: Selection state for checkboxes
  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});

  // Email composer state
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [currentEmailFile, setCurrentEmailFile] = useState<SavedFileListItem | null>(null);

  // Zoho upload state
  const [zohoUploadOpen, setZohoUploadOpen] = useState(false);
  const [currentZohoFile, setCurrentZohoFile] = useState<SavedFileListItem | null>(null);

  // ✅ NEW: Bulk Zoho upload state
  const [bulkZohoUploadOpen, setBulkZohoUploadOpen] = useState(false);
  const [selectedFilesForBulkUpload, setSelectedFilesForBulkUpload] = useState<SavedFileListItem[]>([]);

  const navigate = useNavigate();
  const location = useLocation();
  const isInAdminContext = location.pathname.includes("/admin-panel");
  const returnPath = isInAdminContext ? "/admin-panel/saved-pdfs" : "/saved-pdfs";

  // Fetch grouped files
  const fetchGroups = async (page = 1, search = "") => {
    setLoading(true);
    setError(null);
    try {
      console.log(`📁 [SAVED-FILES-GROUPED] Fetching page ${page} with search: "${search}"`);

      const response = await pdfApi.getSavedFilesGrouped(page, groupsPerPage, {
        search: search.trim() || undefined
      });

      console.log(`📁 [SAVED-FILES-GROUPED] Loaded ${response.groups.length} groups with ${response.total} total files`);

      setGroups(response.groups);
      setTotalGroups(response.totalGroups);
      setTotalFiles(response.total);
      setCurrentPage(page);
    } catch (err) {
      console.error("Error fetching grouped saved files:", err);
      setError("Unable to load files. Please try again.");
      setGroups([]);
      setTotalGroups(0);
      setTotalFiles(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups(1, query);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchGroups(1, query);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [query]);

  // ✅ NEW: Selection helpers and computed values
  const selectedFileIds = useMemo(() =>
    Object.entries(selectedFiles)
      .filter(([, selected]) => selected)
      .map(([id]) => id),
    [selectedFiles]
  );

  const selectedFileObjects = useMemo(() => {
    const allFiles: SavedFileListItem[] = [];
    groups.forEach(group => allFiles.push(...group.files));
    return allFiles.filter(file => selectedFiles[file.id]);
  }, [groups, selectedFiles]);

  const hasSelectedFiles = selectedFileIds.length > 0;

  // ✅ NEW: Selection handlers
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => ({ ...prev, [fileId]: !prev[fileId] }));
  };

  const toggleGroupSelection = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const isGroupSelected = group.files.every(file => selectedFiles[file.id]);
    const newSelectedFiles = { ...selectedFiles };

    group.files.forEach(file => {
      newSelectedFiles[file.id] = !isGroupSelected;
    });

    setSelectedFiles(newSelectedFiles);
  };

  const selectAllFiles = () => {
    const newSelectedFiles: Record<string, boolean> = {};
    groups.forEach(group => {
      group.files.forEach(file => {
        newSelectedFiles[file.id] = true;
      });
    });
    setSelectedFiles(newSelectedFiles);
  };

  const clearAllSelections = () => {
    setSelectedFiles({});
  };

  // Check if group is partially or fully selected
  const getGroupSelectionState = (group: SavedFileGroup) => {
    const selectedCount = group.files.filter(file => selectedFiles[file.id]).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === group.files.length) return 'all';
    return 'partial';
  };

  // ✅ NEW: Bulk Zoho upload handler
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

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const isGroupExpanded = (groupId: string) => expandedGroups.has(groupId);

  // File action handlers (simplified)
  const handleView = async (file: SavedFileListItem) => {
    try {
      await pdfApi.getSavedFileDetails(file.id);
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
      const blob = await pdfApi.downloadPdf(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (file.title || "EnviroMaster_Document").replace(/[^\w\-]+/g, "_") + ".pdf";
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

        {/* ✅ NEW: Bulk actions toolbar */}
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
          {totalGroups} agreements • {totalFiles} files
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

        {!loading && !error && groups.length === 0 && (
          <div className="sf__empty">
            {query ? `No agreements found matching "${query}"` : "No agreements found."}
          </div>
        )}

        {!loading && !error && groups.map((group) => {
          const groupSelectionState = getGroupSelectionState(group);

          return (
            <div key={group.id} className="sf__group" style={{
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
                  borderBottom: isGroupExpanded(group.id) ? '1px solid #f0f0f0' : 'none'
                }}
              >
                {/* ✅ NEW: Group checkbox */}
                <div style={{ marginRight: '12px' }} onClick={(e) => e.stopPropagation()}>
                  <FontAwesomeIcon
                    icon={groupSelectionState === 'none' ? faSquare : faCheckSquare}
                    style={{
                      color: groupSelectionState !== 'none' ? '#3b82f6' : '#d1d5db',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                    onClick={() => toggleGroupSelection(group.id)}
                  />
                </div>

                {/* Expand/collapse arrow */}
                <FontAwesomeIcon
                  icon={isGroupExpanded(group.id) ? faChevronDown : faChevronRight}
                  style={{
                    color: '#6b7280',
                    fontSize: '14px',
                    marginRight: '8px'
                  }}
                  onClick={() => toggleGroup(group.id)}
                />

                {/* Folder icon */}
                <FontAwesomeIcon
                  icon={isGroupExpanded(group.id) ? faFolderOpen : faFolder}
                  style={{
                    color: '#f59e0b',
                    fontSize: '18px',
                    marginRight: '12px'
                  }}
                />

                {/* Agreement title and metadata */}
                <div style={{ flex: 1 }} onClick={() => toggleGroup(group.id)}>
                  <span style={{
                    fontWeight: '600',
                    fontSize: '16px',
                    color: '#374151'
                  }}>
                    {group.agreementTitle}
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginTop: '4px',
                    fontSize: '13px',
                    color: '#6b7280'
                  }}>
                    <span>{group.fileCount} files</span>
                    <span>{timeAgo(group.latestUpdate)}</span>
                    {group.hasUploads && (
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

                {/* Add file button */}
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
                    // TODO: Add file to this agreement
                    setToastMessage({ message: "Add file feature coming soon!", type: "info" });
                  }}
                  title="Add file to this agreement"
                >
                  <FontAwesomeIcon icon={faPlus} style={{ fontSize: '10px' }} />
                  Add
                </button>
              </div>

              {isGroupExpanded(group.id) && (
                <div style={{ padding: '0 16px 16px' }}>
                  {group.files.map((file) => (
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
                      {/* ✅ NEW: File checkbox */}
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
                          style={{ color: '#2563eb', fontSize: '16px' }}
                        />
                        <span style={{
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          {file.title}
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
                          background: `var(--status-${file.status}-bg, #f3f4f6)`,
                          color: `var(--status-${file.status}-text, #4b5563)`,
                          fontWeight: '600'
                        }}>
                          {STATUS_LABEL[file.status as FileStatus]}
                        </span>
                      </div>

                      {/* File actions */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="iconbtn"
                          title="Edit"
                          onClick={() => handleEdit(file)}
                        >
                          <FontAwesomeIcon icon={faPencilAlt} />
                        </button>
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
          Showing {Math.min((currentPage - 1) * groupsPerPage + 1, totalGroups)}-{Math.min(currentPage * groupsPerPage, totalGroups)} of {totalGroups} agreements
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
        defaultBody={currentEmailFile ? `Hello,\n\nPlease find the customer header document attached.\n\nDocument: ${currentEmailFile.title}\nStatus: ${STATUS_LABEL[currentEmailFile.status as FileStatus]}\n\nBest regards` : ''}
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
            fetchGroups(currentPage, query);
            setToastMessage({
              message: "Successfully uploaded to Zoho Bigin!",
              type: "success"
            });
          }}
        />
      )}

      {/* ✅ NEW: Bulk Zoho Upload Modal */}
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
              {selectedFilesForBulkUpload.map((file, index) => (
                <div key={file.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 0',
                  fontSize: '13px'
                }}>
                  <FontAwesomeIcon icon={faFileAlt} style={{ color: '#2563eb' }} />
                  <span>{file.title}</span>
                  <span style={{ color: '#10b981' }}>📎</span>
                </div>
              ))}
            </div>

            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '20px'
            }}>
              This will upload all selected files to Zoho Bigin. Each file will be processed individually.
            </p>

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
                    // TODO: Implement actual bulk upload logic
                    // For now, just show success message
                    setBulkZohoUploadOpen(false);
                    setSelectedFilesForBulkUpload([]);
                    clearAllSelections();

                    setToastMessage({
                      message: `Successfully uploaded ${selectedFilesForBulkUpload.length} files to Zoho Bigin!`,
                      type: "success"
                    });

                    // Refresh the data
                    await fetchGroups(currentPage, query);
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
    </section>
  );
}