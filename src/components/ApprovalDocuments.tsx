import React, { useEffect, useMemo, useState, useRef, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "../backendservice/hooks";
import { pdfApi, emailApi, manualUploadApi } from "../backendservice/api";
import type {
  SavedFileListItem,
  SavedFileGroup,
  AgreementStatus,
  VersionStatus,
} from "../backendservice/api/pdfApi";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileAlt, faEye, faDownload, faEnvelope, faSave, faFolder, faFolderOpen,
  faChevronDown, faChevronRight, faCheckSquare, faSquare, faCheckCircle, faClock, faExclamationCircle
} from "@fortawesome/free-solid-svg-icons";
import AgreementTimelineBadge from "./AgreementTimelineBadge";
import DocumentSidebar from "./DocumentSidebar";
import "./ApprovalDocuments.css";
import { getDocumentTypeForSavedFile } from "../utils/savedFileDocumentType";

const EmailComposer = lazy(() => import("./EmailComposer"));

import type { EmailData } from "./EmailComposer";

type FileStatus =
  | "draft"
  | "uploaded"
  | "processing"
  | "completed"
  | "failed"
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
  draft: "Draft",
  uploaded: "Uploaded",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  pending_approval: "Pending Approval",
  approved_salesman: "Approved by Salesman",
  approved_admin: "Approved by Admin",
};

const STATUS_COLORS: Record<FileStatus, string> = {
  draft: '#6b7280',
  uploaded: '#3b82f6',
  processing: '#f59e0b',
  completed: '#10b981',
  failed: '#ef4444',
  pending_approval: '#f59e0b',
  approved_salesman: '#3b82f6',
  approved_admin: '#10b981',
};

const getStatusClassName = (status: string) => {
  return status?.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
};

const getAvailableStatusesForDropdown = (currentStatus: string, isInAdminContext: boolean = false) => {
  const approvalStatuses = [
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'approved_salesman', label: 'Approved by Salesman' },
    { value: 'approved_admin', label: 'Approved by Admin' },
  ];

  const normalizedCurrent = currentStatus?.toLowerCase().replace(/\s+/g, '_');

  return approvalStatuses.filter(status => {
    const normalizedStatus = status.value.toLowerCase().replace(/\s+/g, '_');

    if (normalizedStatus === normalizedCurrent) return true;

    if (isInAdminContext) {
      const adminAllowedStatuses = [
        'approved_admin',
        'pending_approval',
        'draft'
      ];
      return adminAllowedStatuses.includes(status.value);
    } else {
      const salesmanAllowedStatuses = [
        'approved_salesman',
        'pending_approval',
        'draft'
      ];
      return salesmanAllowedStatuses.includes(status.value);
    }
  });
};

export default function ApprovalDocuments() {
  const [agreements, setAgreements] = useState<SavedFileGroup[]>([]);
  const [expandedAgreements, setExpandedAgreements] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(20);

  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [currentEmailFile, setCurrentEmailFile] = useState<SavedFileListItem | null>(null);

  const [totalFiles, setTotalFiles] = useState(0);
  const [totalAgreements, setTotalAgreements] = useState(0);

  const hasLoadedRef = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAdminAuth();

  const isInAdminContext = location.pathname.includes("/admin-panel");
  const returnPath = isInAdminContext ? "/admin-panel/approval-documents" : "/approval-documents";

  console.log("📍 ApprovalDocuments context:", { isInAdminContext, returnPath, currentPath: location.pathname });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/admin-login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;

      const fetchApprovalDocuments = async () => {
        setLoading(true);
        setError(null);
        try {
          console.log("📋 [APPROVAL-DOCS] Fetching approval documents...");

          const data = await pdfApi.getApprovalDocumentsGrouped();
          const groups = data.groups || [];

          console.log("📋 [APPROVAL-DOCS] Fetched approval documents:", {
            totalGroups: data.totalGroups,
            totalFiles: data.totalFiles,
            groups: groups.length,
            sampleGroup: groups[0] ? {
              id: groups[0].id,
              title: groups[0].agreementTitle,
              fileCount: groups[0].fileCount,
              files: groups[0].files.length
            } : null
          });

          setAgreements(groups);
          setTotalAgreements(data.totalGroups || 0);
          setTotalFiles(data.totalFiles || 0);
        } catch (err) {
          console.error("❌ [APPROVAL-DOCS] Error fetching approval documents:", err);
          setError("Unable to load approval documents. Please try again.");
        } finally {
          setLoading(false);
        }
      };

      fetchApprovalDocuments();
    } else {
      console.log('⏭️ [APPROVAL-DOCS] Skipping duplicate call (React Strict Mode)');
    }
  }, []);

  const filteredAgreements = useMemo(() => {
    const q = query.trim().toLowerCase();

    const approvalStatuses = ['pending_approval', 'Pending Approval'];

    let filteredList = agreements.map(agreement => {
      const approvalFiles = agreement.files.filter(file => {
        const status = file.status?.trim();

        return approvalStatuses.includes(status) ||
          status?.toLowerCase().replace(/\s+/g, '_') === 'pending_approval';
      });

      return {
        ...agreement,
        files: approvalFiles,
        fileCount: approvalFiles.length
      };
    }).filter(agreement => agreement.fileCount > 0);

    if (q) {
      filteredList = filteredList.filter(agreement =>
        agreement.agreementTitle.toLowerCase().includes(q) ||
        agreement.files.some(file => file.fileName.toLowerCase().includes(q))
      );
    }

    return filteredList;
  }, [agreements, query]);

  const paginatedAgreements = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAgreements.slice(startIndex, endIndex);
  }, [filteredAgreements, currentPage, itemsPerPage]);

  useEffect(() => {
    const pages = Math.ceil(filteredAgreements.length / itemsPerPage);
    setTotalPages(pages);

    console.log("📄 [APPROVAL-PAGINATION]", {
      filteredCount: filteredAgreements.length,
      totalPages: pages,
      currentPage,
      paginatedCount: paginatedAgreements.length,
      samplePaginated: paginatedAgreements[0] ? {
        id: paginatedAgreements[0].id,
        title: paginatedAgreements[0].agreementTitle,
        fileCount: paginatedAgreements[0].fileCount
      } : null
    });

    if (currentPage > pages && pages > 0) {
      setCurrentPage(1);
    }
  }, [filteredAgreements.length, itemsPerPage, currentPage, paginatedAgreements, filteredAgreements]);

  const allFiles = useMemo(() => {
    return paginatedAgreements.flatMap(agreement => agreement.files);
  }, [paginatedAgreements]);

  const allSelected = allFiles.length > 0 && allFiles.every((f) => selected[f.id]);
  const anySelected = Object.values(selected).some(Boolean);

  function toggleSelectAll() {
    const next = { ...selected };
    const to = !allSelected;
    allFiles.forEach((f) => (next[f.id] = to));
    setSelected(next);
  }

  function toggleRow(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleAgreement(agreementId: string) {
    setExpandedAgreements(prev => {
      const next = new Set(prev);
      if (next.has(agreementId)) {
        next.delete(agreementId);
      } else {
        next.add(agreementId);
      }
      return next;
    });
  }

  async function changeFileStatus(file: SavedFileListItem, newStatus: string) {
    try {
      setSavingStatusId(file.id);

      if (file.fileType === 'main_pdf') {
        await pdfApi.updateDocumentStatus(file.id, newStatus);
      } else if (file.fileType === 'version_pdf') {
        await pdfApi.updateVersionStatus(file.id, newStatus);
      } else if (file.fileType === 'attached_pdf') {
        await manualUploadApi.updateStatus(file.id, newStatus);
      }

      setAgreements(prev => prev.map(agreement => ({
        ...agreement,
        files: agreement.files.map(f =>
          f.id === file.id ? { ...f, status: newStatus } : f
        )
      })));

      const approvalStatuses = ['pending_approval'];
      if (!approvalStatuses.includes(newStatus)) {
        setAgreements(prev => prev.map(agreement => ({
          ...agreement,
          files: agreement.files.filter(f => f.id !== file.id),
          fileCount: agreement.files.filter(f => f.id !== file.id).length
        })).filter(agreement => agreement.fileCount > 0));

        setTotalFiles(prev => prev - 1);
      }

      setToastMessage({ message: "Status updated successfully!", type: "success" });
    } catch (err) {
      console.error("Error updating status:", err);
      setToastMessage({ message: "Unable to update status. Please try again.", type: "error" });
    } finally {
      setSavingStatusId(null);
    }
  }

  function approveSelected() {
    const selectedFiles = allFiles.filter(file => selected[file.id]);
    if (selectedFiles.length === 0) return;

    selectedFiles.forEach((file) => changeFileStatus(file, "approved_admin"));
    setSelected({});
  }

  const handleView = (file: SavedFileListItem) => {
    let documentType: 'agreement' | 'manual-upload' | 'attached-file' | 'version' | undefined = undefined;

    if (file.fileType === 'main_pdf') {
      documentType = 'agreement';
    } else if (file.fileType === 'attached_pdf') {
      documentType = 'attached-file';
    } else if (file.fileType === 'version_pdf') {
      documentType = 'version';
    }

    console.log(`📄 [APPROVAL-VIEW] Viewing document ${file.id} (file type: ${file.fileType} → PDFViewer type: ${documentType || 'auto-detect'})`);

    navigate("/pdf-viewer", {
      state: {
        documentId: file.id,
        fileName: file.fileName,
        documentType: documentType,
        originalReturnPath: returnPath,
        originalReturnState: null,
      },
    });
  };

  const handleDownload = async (file: SavedFileListItem) => {
    try {
      setDownloadingId(file.id);

      let blob: Blob;
      if (file.fileType === 'attached_pdf') {
        blob = await pdfApi.downloadAttachedFile(file.id);
      } else if (file.fileType === 'version_pdf') {
        blob = await pdfApi.downloadVersionPdf(file.id);
      } else {
        blob = await pdfApi.downloadPdf(file.id);
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
      console.error("Error downloading file:", err);
      setToastMessage({ message: "Unable to download this PDF. Please try again.", type: "error" });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleEmail = (file: SavedFileListItem) => {
    setCurrentEmailFile(file);
    setEmailComposerOpen(true);
  };

  const handleSendEmail = async (emailData: EmailData) => {
    if (!currentEmailFile) return;

    try {
      const documentType = getDocumentTypeForSavedFile(currentEmailFile);
      await emailApi.sendEmailWithPdfById({
        to: emailData.to,
        from: emailData.from,
        subject: emailData.subject,
          body: emailData.body,
          documentId: currentEmailFile.id,
          fileName: currentEmailFile.fileName,
          documentType,
        });

      setToastMessage({
        message: "Approval request email sent successfully with PDF attachment!",
        type: "success"
      });

      setEmailComposerOpen(false);
      setCurrentEmailFile(null);

    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  };

  const handleCloseEmailComposer = () => {
    setEmailComposerOpen(false);
    setCurrentEmailFile(null);
  };

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePrevPage = () => {
    if (canGoPrev) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (canGoNext) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePageClick = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const statusCountsData = useMemo(() => {
    const counts: { [key: string]: number } = {
      pending_approval: 0,
      approved_salesman: 0,
      approved_admin: 0
    };

    filteredAgreements.forEach(agreement => {
      agreement.files.forEach(file => {
        const normalizedStatus = file.status?.toLowerCase().replace(/\s+/g, '_');
        if (counts[normalizedStatus] !== undefined) {
          counts[normalizedStatus]++;
        }
      });
    });

    return [
      { label: 'Pending Approval', count: counts.pending_approval, color: '#f59e0b', icon: faClock },
      { label: 'Approved by Salesman', count: counts.approved_salesman, color: '#3b82f6', icon: faCheckCircle },
      { label: 'Approved by Admin', count: counts.approved_admin, color: '#10b981', icon: faCheckCircle }
    ];
  }, [filteredAgreements]);

  const agreementTimelinesData = useMemo(() => {
    return filteredAgreements
      .filter(agreement => agreement.startDate && agreement.contractMonths)
      .map(agreement => {
        const start = new Date(agreement.startDate!);
        const today = new Date();
        const endDate = new Date(start);
        endDate.setMonth(endDate.getMonth() + agreement.contractMonths!);

        const totalDays = Math.floor((endDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const daysElapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let status: 'active' | 'expiring-soon' | 'expired' = 'active';
        if (daysRemaining < 0) {
          status = 'expired';
        } else if (daysRemaining <= 30) {
          status = 'expiring-soon';
        }

        return {
          agreementId: agreement.id,
          agreementTitle: agreement.agreementTitle,
          startDate: agreement.startDate!,
          contractMonths: agreement.contractMonths!,
          daysRemaining,
          daysElapsed,
          totalDays,
          status
        };
      });
  }, [filteredAgreements]);

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      <section className="ad" style={{ flex: 1 }}>

      <div className="ad__toolbar">
        <input
          type="text"
          className="ad__search"
          placeholder="🔍 Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="ad__actions">
          <div className="ad__stats">
            <span>{totalAgreements} agreements</span>
            <span>{totalFiles} files pending approval</span>
          </div>
          <button
            className="ad__btn ad__btn--primary"
            disabled={!anySelected}
            onClick={approveSelected}
          >
            Approve Selected ({Object.values(selected).filter(Boolean).length})
          </button>
        </div>
      </div>

      <div className="ad__tablewrap">
        <table className="ad__table">
          <thead>
            <tr>
              <th className="w-40" style={{ background: '#f5f6f8' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
              </th>
              <th style={{ background: '#f5f6f8' }}>Agreement / File Name</th>
              <th style={{ background: '#f5f6f8' }}>Type</th>
              <th style={{ background: '#f5f6f8' }}>Updated</th>
              <th style={{ background: '#f5f6f8' }}>Status</th>
              <th style={{ background: '#f5f6f8' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="skeleton-row">
                    <td>
                      <div className="skeleton skeleton-checkbox"></div>
                    </td>
                    <td>
                      <div className="skeleton skeleton-text" style={{ width: '70%' }}></div>
                    </td>
                    <td>
                      <div className="skeleton skeleton-text" style={{ width: '100px' }}></div>
                    </td>
                    <td>
                      <div className="skeleton skeleton-text" style={{ width: '80px' }}></div>
                    </td>
                    <td>
                      <div className="skeleton skeleton-text" style={{ width: '140px' }}></div>
                    </td>
                    <td>
                      <div className="skeleton skeleton-actions"></div>
                    </td>
                  </tr>
                ))}
              </>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={6} className="empty error">
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && filteredAgreements.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No documents pending approval found.
                </td>
              </tr>
            )}

            {!loading && !error && paginatedAgreements.map((agreement) => (
              <React.Fragment key={agreement.id}>
                <tr className="agreement-header">
                  <td>
                    <input
                      type="checkbox"
                      checked={agreement.files.every(f => selected[f.id])}
                      onChange={() => {
                        const allSelected = agreement.files.every(f => selected[f.id]);
                        const next = { ...selected };
                        agreement.files.forEach(f => next[f.id] = !allSelected);
                        setSelected(next);
                      }}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                         onClick={() => toggleAgreement(agreement.id)}>
                      <FontAwesomeIcon
                        icon={expandedAgreements.has(agreement.id) ? faFolderOpen : faFolder}
                        style={{ color: '#f59e0b', fontSize: '18px' }}
                      />
                      <FontAwesomeIcon
                        icon={expandedAgreements.has(agreement.id) ? faChevronDown : faChevronRight}
                        style={{ fontSize: '12px', color: '#6b7280' }}
                      />
                      <strong>{agreement.agreementTitle}</strong>
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>
                        ({agreement.fileCount} file{agreement.fileCount !== 1 ? 's' : ''})
                      </span>
                      {agreement.startDate && agreement.contractMonths && (
                        <AgreementTimelineBadge
                          startDate={agreement.startDate}
                          contractMonths={agreement.contractMonths}
                          compact={true}
                          showCalendarIcon={false}
                          agreementId={agreement.id}
                        />
                      )}
                    </div>
                  </td>
                  <td>Agreement</td>
                  <td style={{ fontSize: "13px" }}>{timeAgo(agreement.latestUpdate)}</td>
                  <td></td>
                  <td></td>
                </tr>

                {expandedAgreements.has(agreement.id) && agreement.files.map((file) => (
                  <tr key={file.id} className="file-row">
                    <td style={{ paddingLeft: '40px' }}>
                      <input
                        type="checkbox"
                        checked={!!selected[file.id]}
                        onChange={() => toggleRow(file.id)}
                      />
                    </td>
                    <td style={{ paddingLeft: '40px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FontAwesomeIcon
                          icon={faFileAlt}
                          style={{
                            color: file.fileType === 'version_pdf' ? '#8b5cf6' :
                                   file.fileType === 'attached_pdf' ? '#10b981' : '#2563eb',
                            fontSize: '16px'
                          }}
                        />
                        <span>{file.fileName}</span>
                        {file.description && (
                          <span style={{ color: '#6b7280', fontSize: '12px' }}>
                            - {file.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '12px',
                        color: file.fileType === 'version_pdf' ? '#8b5cf6' :
                               file.fileType === 'attached_pdf' ? '#10b981' : '#2563eb'
                      }}>
                        {file.fileType === 'main_pdf' ? 'Main PDF' :
                         file.fileType === 'version_pdf' ? `Version ${file.versionNumber || ''}` :
                         file.fileType === 'attached_pdf' ? 'Attached' :
                         file.fileType}
                      </span>
                    </td>
                    <td style={{ fontSize: "11px" }}>{timeAgo(file.updatedAt)}</td>
                    <td>
                      <select
                        className="dropdown"
                        value={file.status}
                        onChange={(e) => changeFileStatus(file, e.target.value)}
                        style={{ fontSize: "11px" }}
                        disabled={savingStatusId === file.id}
                      >
                        {getAvailableStatusesForDropdown(file.status, isInAdminContext).map(status => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="rowactions">
                        <button
                          className="iconbtn"
                          title="View"
                          type="button"
                          onClick={() => handleView(file)}
                          disabled={!file.hasPdf}
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        <button
                          className="iconbtn"
                          title="Download"
                          type="button"
                          onClick={() => handleDownload(file)}
                          disabled={downloadingId === file.id || !file.hasPdf}
                        >
                          {downloadingId === file.id ? "⏳" : <FontAwesomeIcon icon={faDownload} />}
                        </button>
                        <button
                          className="iconbtn"
                          title="Email"
                          type="button"
                          onClick={() => handleEmail(file)}
                          disabled={!file.hasPdf}
                        >
                          <FontAwesomeIcon icon={faEnvelope} />
                        </button>
                        <button
                          className="iconbtn"
                          title="Status Auto-Saves"
                          type="button"
                          disabled
                        >
                          {savingStatusId === file.id ? "💾…" : <FontAwesomeIcon icon={faSave} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ad__pager">
        <div className="ad__page-info">
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAgreements.length)}-{Math.min(currentPage * itemsPerPage, filteredAgreements.length)} of {filteredAgreements.length} agreements ({totalFiles} files)
        </div>

        <div className="ad__page-controls">
          <button
            type="button"
            className="ad__link"
            disabled={!canGoPrev || loading}
            onClick={handlePrevPage}
          >
            Previous
          </button>

          <div className="ad__page-numbers">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else {
                const start = Math.max(1, currentPage - 2);
                const end = Math.min(totalPages, start + 4);
                pageNum = start + i;
                if (pageNum > end) return null;
              }

              return (
                <button
                  key={pageNum}
                  type="button"
                  className={`ad__page ${currentPage === pageNum ? 'ad__page--active' : ''}`}
                  onClick={() => handlePageClick(pageNum)}
                  disabled={loading}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="ad__link"
            disabled={!canGoNext || loading}
            onClick={handleNextPage}
          >
            Next
          </button>
        </div>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      <Suspense fallback={null}>
        <EmailComposer
          isOpen={emailComposerOpen}
          onClose={handleCloseEmailComposer}
          onSend={handleSendEmail}
          attachment={currentEmailFile ? {
            id: currentEmailFile.id,
            fileName: currentEmailFile.fileName,
            downloadUrl: currentEmailFile.fileType === 'attached_pdf'
              ? pdfApi.getPdfDownloadUrl(currentEmailFile.id)
              : pdfApi.getPdfDownloadUrl(currentEmailFile.id),
            documentType: getDocumentTypeForSavedFile(currentEmailFile)
          } : undefined}
          defaultSubject={currentEmailFile ? `${currentEmailFile.fileName} - Approval Request` : ''}
          defaultBody={currentEmailFile ? `Hello,

Please review the following document for approval.

Document: ${currentEmailFile.fileName}
Type: ${currentEmailFile.fileType === 'main_pdf' ? 'Main Agreement PDF' :
         currentEmailFile.fileType === 'version_pdf' ? `Version ${currentEmailFile.versionNumber || ''} PDF` :
         currentEmailFile.fileType === 'attached_pdf' ? 'Attached PDF' : 'Document'}
Status: ${STATUS_LABEL[currentEmailFile.status as FileStatus] || currentEmailFile.status}
Updated: ${timeAgo(currentEmailFile.updatedAt)}

Best regards` : ''}
          userEmail=""
        />
      </Suspense>
    </section>

    <DocumentSidebar
      statusCounts={statusCountsData}
      totalDocuments={totalFiles}
      mode="approval"
      agreementTimelines={agreementTimelinesData}
    />
  </div>
  );
}
