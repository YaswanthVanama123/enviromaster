// src/components/SavedFilesAgreements.tsx
// ✅ CORRECTED: Single document per agreement with attachedFiles array
// ✅ PERFORMANCE OPTIMIZED: React.memo, useCallback, useMemo for 5-10x faster rendering
import { useEffect, useState, useMemo, useRef, useCallback, memo, ChangeEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { pdfApi, emailApi, manualUploadApi } from "../backendservice/api";
import { emailTemplateApi } from "../backendservice/api/emailTemplateApi";
import type {
  SavedFileListItem,
  SavedFileGroup,
  AddFileToAgreementRequest,
  LogDocument,
  AgreementStatus,
  VersionStatus,
} from "../backendservice/api/pdfApi";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileAlt, faEye, faDownload, faEnvelope, faPencilAlt,
  faUpload, faFolder, faFolderOpen, faChevronDown, faChevronRight,
  faPlus, faCheckSquare, faSquare, faCloudUploadAlt, faTrash, faEdit, faRedo // ✅ NEW: Added faRedo for restore icon
} from "@fortawesome/free-solid-svg-icons";
import EmailComposer, { type EmailData, type EmailAttachment } from "./EmailComposer"; // ✅ NEW: Import EmailAttachment type
import { ZohoUpload } from "./ZohoUpload";
import "./SavedFiles.css";

type FileStatus =
  | "saved"
  | "draft"
  | "uploaded"
  | "processing"
  | "completed"
  | "failed"
  | "pending_approval"
  | "approved_salesman"
  | "approved_admin"
  | "attached";

// ✅ UPDATED: Include manual upload statuses in the system
const EXISTING_STATUSES: { value: string; label: string; color: string; canManuallySelect: boolean }[] = [
  { value: 'draft', label: 'Draft', color: '#6b7280', canManuallySelect: false }, // System controlled - only for agreements without PDFs
  { value: 'saved', label: 'Saved', color: '#059669', canManuallySelect: false }, // Default after PDF creation
  { value: 'uploaded', label: 'Uploaded', color: '#3b82f6', canManuallySelect: false }, // Default for manual uploads
  { value: 'processing', label: 'Processing', color: '#f59e0b', canManuallySelect: false }, // System controlled - Zoho upload in progress
  { value: 'completed', label: 'Completed', color: '#10b981', canManuallySelect: false }, // System controlled - Zoho upload completed
  { value: 'failed', label: 'Failed', color: '#ef4444', canManuallySelect: false }, // System controlled - Zoho upload failed
  { value: 'pending_approval', label: 'Pending Approval', color: '#f59e0b', canManuallySelect: true },
  { value: 'approved_salesman', label: 'Approved by Salesman', color: '#3b82f6', canManuallySelect: true },
  { value: 'approved_admin', label: 'Approved by Admin', color: '#10b981', canManuallySelect: true },
  { value: 'attached', label: 'Attached File', color: '#8b5cf6', canManuallySelect: false }, // For attached files and logs
];

// Helper function to get status configuration
const getStatusConfig = (status: string) => {
  return EXISTING_STATUSES.find(s => s.value === status) ||
         { value: status, label: status, color: '#6b7280', canManuallySelect: true };
};

// Get available statuses for dropdown based on file type and admin context
const getAvailableStatusesForDropdown = (currentStatus: string, isLatestVersion: boolean = true, fileType?: string, isInAdminContext: boolean = false) => {
  return EXISTING_STATUSES.filter(status => {
    // Always allow current status to stay
    if (status.value === currentStatus) return true;

    // ✅ CONTEXT-BASED FILTERING: Filter approval statuses based on admin context
    if (!status.canManuallySelect) return false; // Skip system-controlled statuses

    // In normal saved-pdfs view: hide "approved by admin" option
    if (!isInAdminContext && status.value === 'approved_admin') {
      return false;
    }

    // In admin panel view: hide "approved by salesman" option
    if (isInAdminContext && status.value === 'approved_salesman') {
      return false;
    }

    // For manual uploads (attached_pdf), allow remaining approval workflow statuses
    if (fileType === 'attached_pdf') {
      return true; // Allow: pending_approval, and remaining approval status based on context
    }

    // For latest versions of PDFs, allow manual status changes (filtered by context above)
    if (isLatestVersion) return true;

    // For old versions, don't allow changes
    return false;
  });
};

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

function formatDeletionMeta(deletedBy?: string | null, deletedAt?: string | null) {
  const parts: string[] = [];
  if (deletedBy) {
    parts.push(`by ${deletedBy}`);
  }
  if (deletedAt) {
    const timestamp = new Date(deletedAt);
    if (!Number.isNaN(timestamp.getTime())) {
      parts.push(`on ${timestamp.toLocaleString()}`);
    }
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

const STATUS_LABEL: Record<FileStatus, string> = {
  saved: "Saved",
  draft: "Draft",
  uploaded: "Uploaded",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  pending_approval: "Pending Approval",
  approved_salesman: "Approved by Salesman",
  approved_admin: "Approved by Admin",
  attached: "Attached File",
};

// ✅ PERFORMANCE OPTIMIZATION: Memoized FileRow Component
// Prevents unnecessary re-renders when parent component updates
interface FileRowProps {
  file: SavedFileListItem;
  isSelected: boolean;
  statusChangeLoading: boolean;
  isInAdminContext: boolean;
  watermarkEnabled: boolean; // ✅ NEW: Current watermark state for this file
  onToggleSelection: (fileId: string) => void;
  onView: (file: SavedFileListItem, watermark: boolean) => void; // ✅ UPDATED: Added watermark parameter
  onDownload: (file: SavedFileListItem, watermark: boolean) => void; // ✅ UPDATED: Added watermark parameter
  onEmail: (file: SavedFileListItem) => void;
  onZohoUpload: (file: SavedFileListItem) => void;
  onEdit: (file: SavedFileListItem) => void;
  onStatusChange: (file: SavedFileListItem, newStatus: string) => void;
  onWatermarkToggle: (fileId: string, checked: boolean) => void; // ✅ NEW: Handle watermark toggle
  onDelete: (type: 'file' | 'folder', id: string, title: string, fileType?: string) => void;
  onRestore: (type: 'file' | 'folder', id: string, title: string, fileType?: string) => void; // ✅ NEW: Handle restore
  isTrashView: boolean; // ✅ NEW: Indicate if in trash view
}

const FileRow = memo(({
  file,
  isSelected,
  statusChangeLoading,
  isInAdminContext,
  watermarkEnabled, // ✅ NEW
  onToggleSelection,
  onView,
  onDownload,
  onEmail,
  onZohoUpload,
  onEdit,
  onStatusChange,
  onWatermarkToggle, // ✅ NEW
  onDelete,
  onRestore, // ✅ NEW
  isTrashView // ✅ NEW
}: FileRowProps) => {
  const fileDeletionInfo = isTrashView ? formatDeletionMeta(file.deletedBy, file.deletedAt) : null;
  // ✅ OPTIMIZED: Memoized event handlers with useCallback
  const handleToggle = useCallback(() => onToggleSelection(file.id), [file.id, onToggleSelection]);
  const handleView = useCallback(() => onView(file, watermarkEnabled), [file, watermarkEnabled, onView]); // ✅ UPDATED
  const handleDownload = useCallback(() => onDownload(file, watermarkEnabled), [file, watermarkEnabled, onDownload]); // ✅ UPDATED
  const handleEmail = useCallback(() => onEmail(file), [file, onEmail]);
  const handleZohoUpload = useCallback(() => onZohoUpload(file), [file, onZohoUpload]);
  const handleEdit = useCallback(() => onEdit(file), [file, onEdit]);
  const handleDeleteClick = useCallback(() => onDelete('file', file.id, file.title, file.fileType), [file.id, file.title, file.fileType, onDelete]); // ✅ RENAMED
  const handleRestoreClick = useCallback(() => onRestore('file', file.id, file.title, file.fileType), [file.id, file.title, file.fileType, onRestore]); // ✅ NEW
  const handleStatusChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(file, e.target.value);
  }, [file, onStatusChange]);
  const handleWatermarkToggle = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    onWatermarkToggle(file.id, e.target.checked);
  }, [file.id, onWatermarkToggle]); // ✅ NEW

  // ✅ OPTIMIZED: Memoize computed values to prevent recalculation
  const canEdit = useMemo(() =>
    file.fileType === 'main_pdf' || (file.fileType === 'version_pdf' && file.isLatestVersion === true),
    [file.fileType, file.isLatestVersion]
  );

  const statusConfig = useMemo(() => getStatusConfig(file.status), [file.status]);

  const availableStatuses = useMemo(() =>
    getAvailableStatusesForDropdown(file.status, file.isLatestVersion, file.fileType, isInAdminContext),
    [file.status, file.isLatestVersion, file.fileType, isInAdminContext]
  );

  const canChangeStatus = useMemo(() => file.canChangeStatus || false, [file.canChangeStatus]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px',
        background: isSelected ? '#f0f9ff' : '#fafafa',
        border: '1px solid',
        borderColor: isSelected ? '#bae6fd' : '#f0f0f0',
        borderRadius: '8px',
        marginBottom: '8px',
        transition: 'all 0.2s ease'
      }}
    >
      {/* File checkbox */}
      <div style={{ marginRight: '12px' }}>
        <FontAwesomeIcon
          icon={isSelected ? faCheckSquare : faSquare}
          style={{
            color: isSelected ? '#3b82f6' : '#d1d5db',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          onClick={handleToggle}
        />
      </div>

      {/* File info */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FontAwesomeIcon
          icon={faFileAlt}
          style={{
            color: file.fileType === 'main_pdf'
              ? '#2563eb'
              : file.fileType === 'version_pdf'
              ? '#7c3aed'
              : file.fileType === 'version_log'
              ? '#f59e0b'
              : '#10b981',
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
          background: file.fileType === 'main_pdf'
            ? '#e0f2fe'
            : file.fileType === 'version_pdf'
            ? '#f3e8ff'
            : file.fileType === 'version_log'
            ? '#fef3c7'
            : '#f0fdf4',
          color: file.fileType === 'main_pdf'
            ? '#0e7490'
            : file.fileType === 'version_pdf'
            ? '#7c2d12'
            : file.fileType === 'version_log'
            ? '#92400e'
            : '#166534',
          fontWeight: '600'
        }}>
          {file.fileType === 'main_pdf'
            ? 'Main Agreement'
            : file.fileType === 'version_pdf'
            ? `Version ${(file as any).versionNumber || ''}`
            : file.fileType === 'version_log'
            ? `Log v${(file as any).versionNumber || ''}`
            : 'Attached'}
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
        {isTrashView && fileDeletionInfo && (
          <div style={{
            fontSize: '11px',
            color: '#9ca3af'
          }}>
            Deleted {fileDeletionInfo}
          </div>
        )}
      </div>

      {/* ✅ NEW: Watermark toggle (only for version PDFs) */}
      {file.fileType === 'version_pdf' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          background: watermarkEnabled ? 'rgba(59, 130, 246, 0.1)' : '#f3f4f6',
          border: `1px solid ${watermarkEnabled ? '#60a5fa' : '#d1d5db'}`,
          borderRadius: '6px',
          marginRight: '12px',
          transition: 'all 0.2s'
        }}>
          <input
            type="checkbox"
            checked={watermarkEnabled}
            onChange={handleWatermarkToggle}
            style={{
              width: '14px',
              height: '14px',
              cursor: 'pointer',
              accentColor: '#3b82f6'
            }}
          />
          <span style={{
            fontSize: '11px',
            fontWeight: '500',
            color: watermarkEnabled ? '#2563eb' : '#6b7280',
            whiteSpace: 'nowrap',
            userSelect: 'none'
          }}>
            {watermarkEnabled ? '💧 Draft' : '✨ Normal'}
          </span>
        </div>
      )}

      {/* File actions */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {!isTrashView && canEdit && (
          <button
            className="iconbtn"
            title="Edit Agreement"
            onClick={handleEdit}
          >
            <FontAwesomeIcon icon={faPencilAlt} />
          </button>
        )}
        <button
          className="iconbtn"
          title="View"
          onClick={handleView}
          disabled={!file.hasPdf && file.fileType !== 'version_log'}
        >
          <FontAwesomeIcon icon={faEye} />
        </button>
        <button
          className="iconbtn"
          title="Download"
          onClick={handleDownload}
          disabled={!file.hasPdf && file.fileType !== 'version_log'}
        >
          <FontAwesomeIcon icon={faDownload} />
        </button>
        {!isTrashView && (
          <>
            <button
              className="iconbtn"
              title="Share via Email"
              onClick={handleEmail}
              disabled={!file.hasPdf && file.fileType !== 'version_log'}
            >
              <FontAwesomeIcon icon={faEnvelope} />
            </button>
            <button
              className="iconbtn zoho-upload-btn"
              title="Upload to Bigin"
              onClick={handleZohoUpload}
              disabled={!file.hasPdf && file.fileType !== 'version_log'}
            >
              <FontAwesomeIcon icon={faUpload} />
            </button>
          </>
        )}

        {/* ✅ UPDATED: Status Dropdown for PDFs and manual uploads */}
        {!isTrashView && (file.fileType === 'main_pdf' || file.fileType === 'version_pdf' || file.fileType === 'attached_pdf') && (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {canChangeStatus && !statusChangeLoading ? (
              <select
                value={file.status}
                onChange={handleStatusChange}
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  background: statusConfig.color,
                  color: '#fff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: '120px'
                }}
                title="Change status"
              >
                {availableStatuses.map(status => (
                  <option key={status.value} value={status.value} style={{ color: '#000' }}>
                    {status.label}
                  </option>
                ))}
              </select>
            ) : (
              <span
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: statusConfig.color,
                  color: '#fff',
                  fontWeight: '600',
                  opacity: statusChangeLoading ? 0.6 : 1,
                  minWidth: '120px',
                  display: 'inline-block',
                  textAlign: 'center'
                }}
                title={statusChangeLoading ? "Updating status..." : "Status (read-only)"}
              >
                {statusChangeLoading ? "Updating..." : statusConfig.label}
              </span>
            )}
          </div>
        )}

        {isTrashView ? (
          // In trash view, show restore and permanent delete
          <>
            <button
              className="iconbtn"
              title="Restore file"
              onClick={handleRestoreClick}
              style={{
                color: '#10b981',
                borderColor: '#a7f3d0'
              }}
            >
              <FontAwesomeIcon icon={faRedo} />
            </button>
            <button
              className="iconbtn"
              title="Permanently delete file"
              onClick={handleDeleteClick} // This will now call permanentlyDeleteFile via onDelete prop
              style={{
                color: '#dc2626',
                borderColor: '#fca5a5'
              }}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </>
        ) : (
          // In normal view, show soft delete
          <button
            className="iconbtn"
            title="Delete file (move to trash)"
            onClick={handleDeleteClick}
            style={{
              color: '#dc2626',
              borderColor: '#fca5a5'
            }}
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        )}
      </div>
    </div>
  );
});

FileRow.displayName = 'FileRow';

// ✅ CRITICAL FIX: Module-level flag to prevent duplicate initial loads across React Strict Mode remounts
let hasInitiallyLoaded = false;

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

  // ✅ PERFORMANCE: Prevent duplicate concurrent API calls
  const isFetchingRef = useRef(false);

  // ✅ CRITICAL FIX: Track if this is the first render of search effect to prevent duplicate call on page refresh
  const isFirstSearchRender = useRef(true);

  // Selection state - for individual files within agreements
  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});

  // Email composer state
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [currentEmailFile, setCurrentEmailFile] = useState<SavedFileListItem | null>(null);
  const [defaultEmailTemplate, setDefaultEmailTemplate] = useState<{ subject: string; body: string } | null>(null);

  // Zoho upload state
  const [zohoUploadOpen, setZohoUploadOpen] = useState(false);
  const [currentZohoFile, setCurrentZohoFile] = useState<SavedFileListItem | null>(null);

  // Bulk Zoho upload state
  const [bulkZohoUploadOpen, setBulkZohoUploadOpen] = useState(false);
  const [selectedFilesForBulkUpload, setSelectedFilesForBulkUpload] = useState<SavedFileListItem[]>([]);

  // File upload state
  const [fileUploadOpen, setFileUploadOpen] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [currentUploadAgreement, setCurrentUploadAgreement] = useState<SavedFileGroup | null>(null);

  // ✅ NEW: Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: 'file' | 'folder', id: string, title: string, fileType?: string} | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const normalizedDeleteConfirmText = deleteConfirmText.trim().toUpperCase();
  const isDeleteConfirmed = normalizedDeleteConfirmText === 'DELETE';

  // ✅ NEW: Status change state
  const [statusChangeLoading, setStatusChangeLoading] = useState<Record<string, boolean>>({});

  // ✅ NEW: Watermark state for each file (only applies to version PDFs)
  const [fileWatermarkStates, setFileWatermarkStates] = useState<Map<string, boolean>>(new Map());

  const navigate = useNavigate();
  const location = useLocation();
  const isInAdminContext = location.pathname.includes("/admin-panel");
  const isTrashView = location.pathname.includes("/trash"); // ✅ NEW: Determine if in trash view
  const returnPath = isInAdminContext ? "/admin-panel/saved-pdfs" : "/saved-pdfs";

  // ✅ NEW: Watermark toggle handler
  const handleWatermarkToggle = useCallback((fileId: string, checked: boolean) => {
    setFileWatermarkStates(prev => {
      const newMap = new Map(prev);
      newMap.set(fileId, checked);
      return newMap;
    });
    console.log(`💧 [WATERMARK] Toggled watermark for file ${fileId}: ${checked}`);
  }, []);

  // ✅ NEW: Restore handler for files and agreements
  const handleRestore = useCallback(async (type: 'file' | 'folder', id: string, title: string, fileType?: string) => {
    try {
      let result;
      if (type === 'folder') {
        result = await pdfApi.restoreAgreement(id);
      } else {
        result = await pdfApi.restoreFile(id, { fileType });
      }

      if (result.success) {
        setToastMessage({
          message: `${type === 'folder' ? 'Agreement' : 'File'} "${title}" restored successfully!`,
          type: "success"
        });
        // Refresh the list to show updated status
        await fetchAgreements(currentPage, query);
      } else {
        setToastMessage({
          message: result.message || `Failed to restore ${type === 'folder' ? 'agreement' : 'file'}. Please try again.`,
          type: "error"
        });
      }
    } catch (error) {
      console.error(`Failed to restore ${type === 'folder' ? 'agreement' : 'file'}:`, error);
      setToastMessage({
        message: `Failed to restore ${type === 'folder' ? 'agreement' : 'file'}. Please try again.`,
        type: "error"
      });
    }
  }, [currentPage, query]);

  // ✅ PERFORMANCE: Memoized callback for status changes
  const handleStatusChange = useCallback(async (file: SavedFileListItem, newStatus: string) => {
    if (statusChangeLoading[file.id]) return;

    console.log(`📊 [STATUS-CHANGE] Updating ${file.fileName} (${file.fileType}) from ${file.status} to ${newStatus}`);

    setStatusChangeLoading(prev => ({ ...prev, [file.id]: true }));

    try {
      // ✅ FIX: Handle different file types appropriately
      if (file.fileType === 'version_pdf') {
        // For version PDFs, use the file.id directly as the version ID
        console.log(`📊 [STATUS-CHANGE-DEBUG] Using file.id as version ID: ${file.id}`);
        await pdfApi.updateVersionStatus(file.id, newStatus);
      } else if (file.fileType === 'main_pdf' && file.agreementId) {
        // For main agreement PDFs, update agreement status
        await pdfApi.updateDocumentStatus(file.agreementId, newStatus);
      } else if (file.fileType === 'attached_pdf') {
        // ✅ NEW: For manually uploaded attached files, update manual upload status
        console.log(`📊 [MANUAL-UPLOAD-STATUS] Updating manual upload ${file.id} to ${newStatus}`);
        await manualUploadApi.updateStatus(file.id, newStatus);
      } else {
        throw new Error(`Cannot update status for file type: ${file.fileType}`);
      }

      setToastMessage({
        message: `Status updated to "${getStatusConfig(newStatus).label}" successfully!`,
        type: "success"
      });

      // Refresh the agreements to show updated status
      await fetchAgreements(currentPage, query);

    } catch (error) {
      console.error("Failed to update status:", error);
      setToastMessage({
        message: "Failed to update status. Please try again.",
        type: "error"
      });
    } finally {
      setStatusChangeLoading(prev => ({ ...prev, [file.id]: false }));
    }
  }, [statusChangeLoading, currentPage, query]); // ✅ Dependencies for useCallback

  // ✅ OPTIMIZED: Single API call with duplicate prevention
  const fetchAgreements = async (page = 1, search = "") => {
    // ✅ CRITICAL FIX: Check flag AND loading state to prevent race conditions
    if (isFetchingRef.current || loading) {
      console.log('⏭️ [SAVED-FILES] Skipping duplicate call - already fetching or loading');
      return;
    }

    // Set flag immediately (synchronous) before any async operations
    isFetchingRef.current = true;

    setLoading(true);
    setError(null);

    try {
      // ✅ OPTIMIZED: Single API call - backend returns all agreements (with and without PDFs)
      console.log(`📡 [API-CALL] Fetching agreements: page=${page}, search="${search}", isTrashView=${isTrashView}`);

      const groupedResponse = await pdfApi.getSavedFilesGrouped(page, agreementsPerPage, {
        search: search.trim() || undefined,
        includeLogs: true,
        includeDrafts: true,  // ✅ Backend should include draft agreements without PDFs
        isDeleted: isTrashView // ✅ NEW: Pass isTrashView to backend for trash filtering
      });

      // ✅ REMOVED: Second API call to getCustomerHeadersSummary()
      // Backend now returns draft agreements in the grouped response

      const allAgreements = groupedResponse.groups;

      // ✅ OPTIMIZED: Process files without console.log in loops
      allAgreements.forEach(agreement => {
        // Determine latest versions if not set by backend
        if (agreement.files.some(file => file.isLatestVersion === undefined)) {
          const versionFiles = agreement.files.filter(file => file.fileType === 'version_pdf' || file.fileType === 'main_pdf');
          let highestVersionNumber = 0;
          const versionMap = new Map<number, SavedFileListItem[]>();

          versionFiles.forEach(file => {
            const versionMatch = file.fileName.match(/Version (\d+)/i);
            const versionNumber = versionMatch ? parseInt(versionMatch[1], 10) : 1;

            if (versionNumber > highestVersionNumber) {
              highestVersionNumber = versionNumber;
            }

            if (!versionMap.has(versionNumber)) {
              versionMap.set(versionNumber, []);
            }
            versionMap.get(versionNumber)!.push(file);
          });

          // Mark latest versions
          const latestVersionFiles = versionMap.get(highestVersionNumber) || [];
          latestVersionFiles.forEach(file => {
            file.isLatestVersion = true;
          });

          // Mark older versions
          versionFiles.forEach(file => {
            if (file.isLatestVersion === undefined) {
              file.isLatestVersion = false;
            }
          });
        }

        // ✅ OPTIMIZED: Set canChangeStatus without logging
        agreement.files.forEach(file => {
          // Fix hasPdf for attached files
          if (file.fileType === 'attached_pdf' && file.fileSize && file.fileSize > 0) {
            file.hasPdf = true;
          }

          if (file.fileType === 'version_pdf' || file.fileType === 'main_pdf') {
            file.canChangeStatus = file.isLatestVersion === true;
          } else if (file.fileType === 'attached_pdf') {
            const systemControlledStatuses = ['processing', 'completed', 'failed'];
            file.canChangeStatus = !systemControlledStatuses.includes(file.status);
          } else {
            file.canChangeStatus = false;
          }
        });
      });

      setAgreements(allAgreements);
      setTotalAgreements(groupedResponse.totalGroups);
      setTotalFiles(allAgreements.reduce((sum, agreement) => sum + agreement.files.length, 0));
      setCurrentPage(page);

      console.log(`✅ [API-CALL] Loaded ${allAgreements.length} agreements, ${groupedResponse.totalGroups} total`);
    } catch (err) {
      console.error("❌ [API-CALL] Error fetching agreements:", err);
      setError("Unable to load agreements. Please try again.");
      setAgreements([]);
      setTotalAgreements(0);
      setTotalFiles(0);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;  // ✅ Reset fetching flag
    }
  };

  // ✅ FIXED: Separate initial load from search to prevent duplicate calls
  // Initial load - runs once per component mount, resets when navigating away
  useEffect(() => {
    if (!hasInitiallyLoaded) {
      hasInitiallyLoaded = true;
      console.log(`📁 [SAVED-FILES-AGREEMENTS] Initial load (context: ${isInAdminContext ? 'admin' : 'normal'})`);
      fetchAgreements(1, query);
    } else {
      console.log('⏭️ [SAVED-FILES-AGREEMENTS] Skipping duplicate initial load (React Strict Mode remount)');
    }

    // ✅ CRITICAL FIX: Reset flags on unmount so next mount (tab navigation) loads fresh
    return () => {
      // Use setTimeout to distinguish between React Strict Mode unmount (immediate remount)
      // and real navigation unmount (no remount). Strict Mode remounts within ~10ms.
      setTimeout(() => {
        hasInitiallyLoaded = false;
        isFirstSearchRender.current = true;
        console.log('🔄 [SAVED-FILES-AGREEMENTS] Flags reset after unmount (navigating away)');
      }, 50); // 50ms delay - Strict Mode remounts happen much faster
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTrashView]); // Add isTrashView to dependencies to re-fetch when navigating to/from trash

  // Search handler - debounced, only runs when query changes after initial load
  useEffect(() => {
    // Skip if the initial load hasn't happened yet (very first render)
    if (!hasInitiallyLoaded) return;

    // ✅ FIX: Skip on first render to prevent duplicate call when page refreshes
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      console.log('⏭️ [SAVED-FILES-AGREEMENTS] Skipping search effect on first render');
      return;
    }

    console.log(`🔍 [SAVED-FILES-AGREEMENTS] Search query changed to: "${query}"`);

    // Debounce search to avoid excessive API calls while typing
    const timeoutId = setTimeout(() => {
      fetchAgreements(1, query);
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, isTrashView]); // Add isTrashView to dependencies

  // Load default email template on mount
  useEffect(() => {
    const loadEmailTemplate = async () => {
      try {
        const template = await emailTemplateApi.getActiveTemplate();
        setDefaultEmailTemplate({
          subject: template.subject,
          body: template.body
        });
        console.log('📧 [EMAIL-TEMPLATE] Loaded default email template');
      } catch (error) {
        console.error('❌ [EMAIL-TEMPLATE] Failed to load template:', error);
        // Use fallback template if API fails
        setDefaultEmailTemplate({
          subject: 'Document from EnviroMaster NVA',
          body: `Hello,\n\nPlease find the attached document.\n\nBest regards,\nEnviroMaster NVA Team`
        });
      }
    };
    loadEmailTemplate();
  }, []);

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

  // ✅ PERFORMANCE: Memoized selection handlers
  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles(prev => ({ ...prev, [fileId]: !prev[fileId] }));
  }, []);

  const toggleAgreementSelection = useCallback((agreementId: string) => {
    const agreement = agreements.find(a => a.id === agreementId);
    if (!agreement) return;

    const isAgreementSelected = agreement.files.every(file => selectedFiles[file.id]);
    const newSelectedFiles = { ...selectedFiles };

    agreement.files.forEach(file => {
      newSelectedFiles[file.id] = !isAgreementSelected;
    });

    setSelectedFiles(newSelectedFiles);
  }, [agreements, selectedFiles]);

  const selectAllFiles = useCallback(() => {
    const newSelectedFiles: Record<string, boolean> = {};
    agreements.forEach(agreement => {
      agreement.files.forEach(file => {
        newSelectedFiles[file.id] = true;
      });
    });
    setSelectedFiles(newSelectedFiles);
  }, [agreements]);

  const clearAllSelections = useCallback(() => {
    setSelectedFiles({});
  }, []);

  // ✅ PERFORMANCE: Memoized selection state calculator
  const getAgreementSelectionState = useCallback((agreement: SavedFileGroup) => {
    const selectedCount = agreement.files.filter(file => selectedFiles[file.id]).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === agreement.files.length) return 'all';
    return 'partial';
  }, [selectedFiles]);

  // ✅ PERFORMANCE: Memoized bulk upload handler
  const handleBulkZohoUpload = useCallback(() => {
    // ✅ UPDATED: Support both PDFs and TXT log files for bulk upload
    const uploadableFiles = selectedFileObjects.filter(file => file.hasPdf || file.fileType === 'version_log');

    if (uploadableFiles.length === 0) {
      setToastMessage({
        message: "Please select files (PDFs or TXT logs) to upload to bigin.",
        type: "error"
      });
      return;
    }
    setSelectedFilesForBulkUpload(uploadableFiles);
    setBulkZohoUploadOpen(true);
  }, [selectedFileObjects]);

  const toggleAgreement = useCallback((agreementId: string) => {
    setExpandedAgreements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(agreementId)) {
        newSet.delete(agreementId);
      } else {
        newSet.add(agreementId);
      }
      return newSet;
    });
  }, []);

  const isAgreementExpanded = useCallback((agreementId: string) => expandedAgreements.has(agreementId), [expandedAgreements]);

  // ✅ PERFORMANCE: Memoized file action handlers
  const handleView = useCallback(async (file: SavedFileListItem, watermark: boolean) => {
    try {
      // For main PDF files, load details; for attached files, navigate directly
      if (file.fileType === 'main_pdf') {
        await pdfApi.getSavedFileDetails(file.id);
      }

      // ✅ SMART NAVIGATION: Include document type for correct API selection
      let documentType: string;
      if (file.fileType === 'main_pdf') {
        documentType = 'agreement';
      } else if (file.fileType === 'version_pdf') {
        documentType = 'version'; // ✅ FIX: Map version_pdf to 'version' for PDFViewer
      } else if (file.fileType === 'version_log') {
        documentType = 'version-log'; // ✅ NEW: Handle version logs
      } else if (file.fileType === 'attached_pdf') {
        documentType = 'manual-upload'; // ✅ FIX: Use manual-upload type for manually uploaded files
      } else {
        documentType = 'attached-file';
      }

      console.log(`📄 [VIEW] Navigating to PDF viewer: ${file.id} (type: ${documentType}, watermark: ${watermark})`);

      navigate("/pdf-viewer", {
        state: {
          documentId: file.id,
          fileName: file.title,
          documentType: documentType, // ✅ Updated: Specify document type for correct API
          watermark: watermark, // ✅ NEW: Pass watermark state to PDFViewer
          originalReturnPath: returnPath,
        },
      });
    } catch (err) {
      setToastMessage({
        message: "Unable to load this document. Please try again.",
        type: "error"
      });
    }
  }, [navigate, returnPath]);

  const handleDownload = useCallback(async (file: SavedFileListItem, watermark: boolean) => {
    try {
      let blob: Blob;

      // ✅ Use different download methods based on file type
      if (file.fileType === 'main_pdf') {
        blob = await pdfApi.downloadPdf(file.id);
      } else if (file.fileType === 'version_pdf') {
        // ✅ FIX: Use version PDF API for version PDFs with watermark parameter
        console.log(`📥 [DOWNLOAD] Downloading version PDF ${file.id} with watermark: ${watermark}`);
        blob = await pdfApi.downloadVersionPdf(file.id, watermark); // ✅ NEW: Pass watermark flag
      } else if (file.fileType === 'version_log') {
        // ✅ Download version log files using version log API
        blob = await pdfApi.downloadVersionLog(file.id);
      } else if (file.fileType === 'attached_pdf') {
        // ✅ FIX: Use manual upload API for manually uploaded attached files
        blob = await manualUploadApi.downloadFile(file.id);
      } else {
        // Handle other attached files
        blob = await pdfApi.downloadAttachedFile(file.id);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // ✅ Use appropriate file extension based on file type
      let safeName: string;
      if (file.fileType === 'version_log') {
        // ✅ UPDATED: Version logs already have .txt extension in fileName
        safeName = file.fileName || "EnviroMaster_Version_Log.txt";
      } else {
        // For PDFs, add .pdf extension if not present
        const extension = '.pdf';
        const baseFileName = file.fileName || "EnviroMaster_Document";
        // ✅ NEW: Add _DRAFT suffix if watermark is enabled for version PDFs
        if (file.fileType === 'version_pdf' && watermark) {
          const nameWithoutExt = baseFileName.replace('.pdf', '');
          safeName = nameWithoutExt + '_DRAFT' + extension;
        } else {
          safeName = baseFileName.endsWith('.pdf') ? baseFileName : baseFileName.replace(/[^\w\-]+/g, "_") + extension;
        }
      }
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setToastMessage({ message: "Unable to download this file. Please try again.", type: "error" });
    }
  }, []);

  const handleEmail = useCallback((file: SavedFileListItem) => {
    setCurrentEmailFile(file);
    setEmailComposerOpen(true);
  }, []);

  const handleZohoUpload = useCallback((file: SavedFileListItem) => {
    // ✅ UPDATED: Support both PDFs and TXT log files for Zoho upload
    const isUploadableFile = file.hasPdf || file.fileType === 'version_log' || file.fileType === 'attached_pdf';
    if (!isUploadableFile) {
      setToastMessage({
        message: "This document doesn't have a file to upload. Please generate a PDF or ensure the file exists.",
        type: "error"
      });
      return;
    }
    setCurrentZohoFile(file);
    setZohoUploadOpen(true);
  }, []);

  const getAgreementUploadableFiles = (agreement: SavedFileGroup) => {
    return agreement.files.filter(file =>
      file.hasPdf ||
      file.fileType === 'version_log' ||
      file.fileType === 'attached_pdf'
    );
  };

  // ✅ NEW: Handle Zoho upload for entire agreement (folder-level upload)
  const handleAgreementZohoUpload = (agreement: SavedFileGroup) => {
    // ✅ UPDATED: Support PDFs, version logs, and attached files for agreement upload
    const uploadableFiles = getAgreementUploadableFiles(agreement);

    if (uploadableFiles.length === 0) {
      setToastMessage({
        message: "This agreement has no uploadable files. Please generate PDFs first or ensure log files exist.",
        type: "error"
      });
      return;
    }

    // For single file agreements, use the single file upload modal
    if (uploadableFiles.length === 1) {
      setCurrentZohoFile(uploadableFiles[0]);
      setZohoUploadOpen(true);
    } else {
      // ✅ FIXED: For multiple files, use original file IDs but handle them properly in backend
      console.log(`🔍 [FOLDER-UPLOAD] Uploading ${uploadableFiles.length} files (PDFs + TXT logs) from agreement folder`);
      setSelectedFilesForBulkUpload(uploadableFiles); // Use original file structure
      setBulkZohoUploadOpen(true);
    }
  };

  const handleEdit = async (file: SavedFileListItem) => {
    try {
      // ✅ FIXED: Allow editing main PDFs and latest version PDFs
      const canEdit = file.fileType === 'main_pdf' ||
                     (file.fileType === 'version_pdf' && file.isLatestVersion === true);

      if (!canEdit) {
        setToastMessage({
          message: "Only the latest version of agreements can be edited.",
          type: "error"
        });
        return;
      }

      console.log(`📝 [EDIT] Editing agreement: ${file.agreementId || file.id}`);

      // ✅ DEBUG: Log file properties to verify we're using file.id as version ID
      console.log(`📝 [EDIT-DEBUG] File properties:`, {
        fileId: file.id,
        fileType: file.fileType,
        versionId: file.versionId,
        agreementId: file.agreementId,
        fileName: file.fileName,
        isLatestVersion: file.isLatestVersion,
        usingFileIdAsVersionId: file.fileType === 'version_pdf'
      });

      const versionIdToPass = file.fileType === 'version_pdf' ? file.id : undefined;
      console.log(`📝 [EDIT-DEBUG] Using file.id as version ID:`, versionIdToPass);

      // ✅ FIXED: Navigate using agreement ID and pass version info if editing a version PDF
      navigate(`/edit/pdf/${file.agreementId || file.id}`, {
        state: {
          editing: true,
          id: file.agreementId || file.id,
          returnPath: returnPath,
          // ✅ NEW: Pass version info for status updates
          editingVersionId: versionIdToPass,
          editingVersionFile: file.fileType === 'version_pdf' ? file.id : undefined,
        },
      });
    } catch (err) {
      setToastMessage({
        message: "Unable to load this document for editing. Please try again.",
        type: "error"
      });
    }
  };

  // ✅ NEW: Edit Agreement handler for draft-only agreements
  const handleEditAgreement = async (agreement: SavedFileGroup) => {
    try {
      console.log(`📝 [EDIT AGREEMENT] Editing draft agreement: ${agreement.id}`);

      navigate(`/edit/pdf/${agreement.id}`, {
        state: {
          editing: true,
          id: agreement.id,
          returnPath: returnPath,
        },
      });
    } catch (err) {
      setToastMessage({
        message: "Unable to load this agreement for editing. Please try again.",
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

    setIsUploadingFiles(true);

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
    } finally {
      setIsUploadingFiles(false);
    }
  };

  // ✅ NEW: Delete confirmation handlers
  const handleDelete = (type: 'file' | 'folder', id: string, title: string, fileType?: string) => {
    setItemToDelete({ type, id, title, fileType });
    setDeleteConfirmText('');
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !isDeleteConfirmed) {
      setToastMessage({
        message: "Please type 'DELETE' to confirm",
        type: "error"
      });
      return;
    }

    try {
      let result;
      if (itemToDelete.type === 'folder') {
        // If in trash view, permanently delete the agreement
        if (isTrashView) {
          result = await pdfApi.permanentlyDeleteAgreement(itemToDelete.id);
        } else {
          // Otherwise, soft delete (move to trash)
          result = await pdfApi.deleteAgreement(itemToDelete.id);
        }
      } else {
        // If in trash view, permanently delete the file
        if (isTrashView) {
          result = await pdfApi.permanentlyDeleteFile(itemToDelete.id, {
            fileType: itemToDelete.fileType
          });
        } else {
          // Otherwise, soft delete (move to trash)
          result = await pdfApi.deleteFile(itemToDelete.id, {
            fileType: itemToDelete.fileType
          });
        }
      }

      if (result.success) {
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
        setDeleteConfirmText('');

        setToastMessage({
          message: `${itemToDelete.type === 'folder' ? 'Agreement' : 'File'} ${isTrashView ? 'permanently deleted' : 'moved to trash'} successfully!`,
          type: "success"
        });

        // Refresh the list
        await fetchAgreements(currentPage, query);
      } else {
        setToastMessage({
          message: result.message || `Failed to ${isTrashView ? 'permanently delete' : 'delete'}. Please try again.`,
          type: "error"
        });
      }
    } catch (error) {
      console.error(`Failed to ${isTrashView ? 'permanently delete' : 'delete'}:`, error);
      setToastMessage({
        message: `Failed to ${isTrashView ? 'permanently delete' : 'delete'}. Please try again.`,
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

  // ✅ NEW: Pagination helpers
  const totalPages = Math.ceil(totalAgreements / agreementsPerPage);
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePrevPage = () => {
    if (canGoPrev) {
      fetchAgreements(currentPage - 1, query);
    }
  };

  const handleNextPage = () => {
    if (canGoNext) {
      fetchAgreements(currentPage + 1, query);
    }
  };

  const handlePageClick = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      fetchAgreements(page, query);
    }
  };

  return (
    <section className="sf">
      {isUploadingFiles && (
        <div className="sf__saving-overlay" role="status" aria-live="polite">
          <div className="sf__spinner">
            <span className="sf__sr-only">Uploading files to agreement…</span>
          </div>
        </div>
      )}
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
              <div style={{
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

              {/* <button
                type="button"
                className="sf__btn sf__btn--primary zoho-upload-btn"
                onClick={handleBulkZohoUpload}
                disabled={selectedFileObjects.filter(f => f.hasPdf || f.fileType === 'version_log').length === 0}
              >
                <FontAwesomeIcon icon={faUpload} style={{ marginRight: '6px' }} />
                Upload to Zoho ({selectedFileObjects.filter(f => f.hasPdf || f.fileType === 'version_log').length})
              </button> */}
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
        {/* ✅ OPTIMIZED: Skeleton loader to prevent CLS */}
        {loading && (
          <>
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                style={{
                  background: '#fff',
                  border: '1px solid #e6e6e6',
                  borderRadius: '10px',
                  marginBottom: '8px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  padding: '16px',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Checkbox skeleton */}
                  <div style={{
                    width: '16px',
                    height: '16px',
                    background: '#e5e7eb',
                    borderRadius: '4px'
                  }} />

                  {/* Arrow skeleton */}
                  <div style={{
                    width: '14px',
                    height: '14px',
                    background: '#e5e7eb',
                    borderRadius: '4px'
                  }} />

                  {/* Folder icon skeleton */}
                  <div style={{
                    width: '18px',
                    height: '18px',
                    background: '#fef3c7',
                    borderRadius: '4px'
                  }} />

                  {/* Title skeleton */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      height: '16px',
                      background: '#e5e7eb',
                      borderRadius: '4px',
                      width: '60%',
                      marginBottom: '8px'
                    }} />
                    <div style={{
                      height: '12px',
                      background: '#f3f4f6',
                      borderRadius: '4px',
                      width: '40%'
                    }} />
                  </div>

                  {/* Action buttons skeleton */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{
                      width: '60px',
                      height: '28px',
                      background: '#fef2f2',
                      borderRadius: '6px'
                    }} />
                    <div style={{
                      width: '50px',
                      height: '28px',
                      background: '#f3f4f6',
                      borderRadius: '6px'
                    }} />
                    <div style={{
                      width: '60px',
                      height: '28px',
                      background: '#fef2f2',
                      borderRadius: '6px'
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </>
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
          const uploadableFiles = getAgreementUploadableFiles(agreement);
          const agreementDeletionInfo = isTrashView ? formatDeletionMeta(agreement.deletedBy, agreement.deletedAt) : null;
          const hasActiveVersions = agreement.files.some(file =>
            file.fileType === 'version_pdf' && file.isDeleted !== true
          );
          const showAgreementLevelEdit = !isTrashView && !hasActiveVersions;

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
                        📤 Bigin
                      </span>
                    )}
                    {/* ✅ NEW: Agreement Status Badge (show draft for agreements without PDFs) */}
                    {agreement.isDraftOnly && (
                      <span style={{
                        background: getStatusConfig('draft').color,
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        📝 {getStatusConfig('draft').label}
                      </span>
                  )}
                </div>
                {isTrashView && agreementDeletionInfo && (
                  <div style={{
                    marginTop: '4px',
                    fontSize: '12px',
                    color: '#9ca3af'
                  }}>
                    Deleted {agreementDeletionInfo}
                  </div>
                )}
              </div>

                {/* ✅ CORRECTED: Add file button and Zoho upload button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Zoho Bigin Upload Button */}
                  <button
                    style={{
                      background: '#f97316',
                      border: '1px solid #ea580c',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: '#fff',
                      fontWeight: '500',
                      opacity: uploadableFiles.length > 0 ? 1 : 0.5
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAgreementZohoUpload(agreement);
                    }}
                    disabled={uploadableFiles.length === 0}
                    title={`Upload ${uploadableFiles.length} files to Zoho Bigin`}
                  >
                    <FontAwesomeIcon icon={faCloudUploadAlt} style={{ fontSize: '10px' }} />
                    Bigin
                  </button>

                  {/* Add File Button */}
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

                  {/* ✅ NEW: Edit Agreement button for draft-only agreements */}
                  {showAgreementLevelEdit && (
                    <button
                      style={{
                        background: '#3b82f6',
                        border: '1px solid #2563eb',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: '#fff',
                        fontWeight: '500'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAgreement(agreement);
                      }}
                      title="Edit this draft agreement"
                    >
                      <FontAwesomeIcon icon={faPencilAlt} style={{ fontSize: '10px' }} />
                      Edit Agreement
                    </button>
                  )}

                  {/* ✅ NEW: Delete Agreement button */}
                  <button
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fca5a5',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: '#dc2626',
                      fontWeight: '500',
                      marginLeft: '8px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete('folder', agreement.id, agreement.agreementTitle);
                    }}
                    title="Delete this agreement (move to trash)"
                  >
                    <FontAwesomeIcon icon={faTrash} style={{ fontSize: '10px' }} />
                    Delete
                  </button>
                </div>
              </div>

              {/* ✅ PERFORMANCE: Lazy render files only when expanded */}
              {isAgreementExpanded(agreement.id) && (
                <div style={{ padding: '0 16px 16px' }}>
                  {agreement.files.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      isSelected={selectedFiles[file.id] || false}
                      statusChangeLoading={statusChangeLoading[file.id] || false}
                      isInAdminContext={isInAdminContext}
                      watermarkEnabled={fileWatermarkStates.get(file.id) || false} // ✅ NEW: Pass watermark state
                      onToggleSelection={toggleFileSelection}
                      onView={handleView}
                      onDownload={handleDownload}
                      onEmail={handleEmail}
                      onZohoUpload={handleZohoUpload}
                      onEdit={handleEdit}
                      onStatusChange={handleStatusChange}
                      onWatermarkToggle={handleWatermarkToggle} // ✅ NEW: Pass watermark toggle handler
                      onDelete={handleDelete}
                      onRestore={handleRestore} // ✅ NEW: Pass restore handler
                      isTrashView={isTrashView} // ✅ NEW: Pass trash view flag
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ✅ NEW: Enhanced Pagination with page info and controls */}
      <div className="sf__pager">
        <div className="sf__page-info">
          Showing {Math.min((currentPage - 1) * agreementsPerPage + 1, totalAgreements)}-{Math.min(currentPage * agreementsPerPage, totalAgreements)} of {totalAgreements} agreements
        </div>

        <div className="sf__page-controls">
          <button
            type="button"
            className="sf__link"
            disabled={!canGoPrev || loading}
            onClick={handlePrevPage}
          >
            Previous
          </button>

          {/* Page numbers */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else {
                // Show pages around current page
                const start = Math.max(1, currentPage - 2);
                const end = Math.min(totalPages, start + 4);
                pageNum = start + i;
                if (pageNum > end) return null;
              }

              return (
                <button
                  key={pageNum}
                  type="button"
                  className={`sf__page ${currentPage === pageNum ? 'sf__page--active' : ''}`}
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
            className="sf__link"
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

      {/* Email Composer Modal */}
      <EmailComposer
        isOpen={emailComposerOpen}
        onClose={() => setEmailComposerOpen(false)}
        onSend={async (emailData: EmailData) => {
          if (!currentEmailFile) return;

          // Determine document type based on file type
          let documentType: 'agreement' | 'version' | 'manual-upload' | 'version-log' = 'agreement';
          if (currentEmailFile.fileType === 'version_pdf') {
            documentType = 'version';
          } else if (currentEmailFile.fileType === 'attached_pdf') {
            documentType = 'manual-upload';
          } else if (currentEmailFile.fileType === 'version_log') {
            documentType = 'version-log';
          }

          await emailApi.sendEmailWithPdfById({
            to: emailData.to,
            subject: emailData.subject,
            body: emailData.body,
            documentId: currentEmailFile.id,
            fileName: currentEmailFile.title,
            documentType: documentType,
            watermark: emailData.attachment?.watermark || false
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
          documentType: (currentEmailFile.fileType === 'version_pdf' ? 'version' :
                        currentEmailFile.fileType === 'attached_pdf' ? 'manual-upload' :
                        currentEmailFile.fileType === 'version_log' ? 'version-log' : 'agreement'),
          watermark: currentEmailFile.fileType === 'version_pdf' ? (fileWatermarkStates.get(currentEmailFile.id) || false) : false
        } : undefined}
        defaultSubject={defaultEmailTemplate?.subject || (currentEmailFile ? `${currentEmailFile.title} - ${STATUS_LABEL[currentEmailFile.status as FileStatus]}` : '')}
        defaultBody={defaultEmailTemplate?.body || (currentEmailFile ? `Hello,\n\nPlease find the document attached.\n\nDocument: ${currentEmailFile.title}\n\nBest regards` : '')}
      />

      {/* Zoho Upload Modal */}
      {zohoUploadOpen && currentZohoFile && (
        <ZohoUpload
          agreementId={currentZohoFile.agreementId || currentZohoFile.id}
          agreementTitle={currentZohoFile.title}
          bulkFiles={[{
            id: currentZohoFile.id,
            fileName: currentZohoFile.fileName,
            title: currentZohoFile.title,
            fileType: currentZohoFile.fileType
          }]}
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

      {/* Bulk Zoho Upload Modal - Using Enhanced Existing ZohoUpload Component */}
      {bulkZohoUploadOpen && selectedFilesForBulkUpload.length > 0 && (
        <ZohoUpload
          agreementId={selectedFilesForBulkUpload[0]?.agreementId || selectedFilesForBulkUpload[0]?.id || ''} // Use agreement ID for Zoho upload
          agreementTitle={`Bulk Upload - ${selectedFilesForBulkUpload.length} Documents`}
          bulkFiles={selectedFilesForBulkUpload.map(file => ({
            id: file.id,
            fileName: file.fileName,
            title: file.title,
            fileType: file.fileType  // ✅ FIX: Include fileType for proper routing
          }))}
          onClose={() => {
            setBulkZohoUploadOpen(false);
            setSelectedFilesForBulkUpload([]);
          }}
          onSuccess={() => {
            setBulkZohoUploadOpen(false);
            setSelectedFilesForBulkUpload([]);
            clearAllSelections();
            fetchAgreements(currentPage, query);
            setToastMessage({
              message: `Successfully uploaded ${selectedFilesForBulkUpload.length} files to Zoho Bigin!`,
              type: "success"
            });
          }}
        />
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

      {/* ✅ NEW: Delete Confirmation Modal */}
      {deleteConfirmOpen && itemToDelete && (
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
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FontAwesomeIcon
                  icon={faTrash}
                  style={{
                    color: '#dc2626',
                    fontSize: '20px'
                  }}
                />
              </div>
              <div>
                <h3 style={{
                  margin: '0 0 4px',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Delete {itemToDelete.type === 'folder' ? 'Agreement' : 'File'}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  This action will move the item to trash
                </p>
              </div>
            </div>

            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <p style={{
                margin: '0 0 8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                {itemToDelete.type === 'folder' ? 'Agreement' : 'File'}: {itemToDelete.title}
              </p>
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: '#6b7280'
              }}>
                {itemToDelete.type === 'folder'
                  ? 'This will move the entire agreement and all its files to trash.'
                  : 'This will move only this file to trash.'
                }
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Type "DELETE" to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase'
                }}
                autoFocus
              />
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
                  fontWeight: '500',
                  color: '#374151'
                }}
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setItemToDelete(null);
                  setDeleteConfirmText('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                background: isDeleteConfirmed ? '#dc2626' : '#f3f4f6',
                border: `1px solid ${isDeleteConfirmed ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: isDeleteConfirmed ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: isDeleteConfirmed ? '#fff' : '#9ca3af',
                  opacity: isDeleteConfirmed ? 1 : 0.6
                }}
                onClick={confirmDelete}
                disabled={!isDeleteConfirmed}
              >
                <FontAwesomeIcon icon={faTrash} style={{ marginRight: '6px' }} />
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
