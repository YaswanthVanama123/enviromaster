// src/components/SavedFiles/FileRow.tsx
// ✅ EXTRACTED: Memoized file row component for better performance
import { memo, useCallback, useMemo, ChangeEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileAlt, faEye, faDownload, faEnvelope,
  faPencilAlt, faUpload, faCheckSquare, faSquare,
  faTrash, faRedo
} from "@fortawesome/free-solid-svg-icons";
import type { SavedFileListItem } from "../../backendservice/api/pdfApi";
import "./FileRow.css";

const EXISTING_STATUSES: { value: string; label: string; color: string; canManuallySelect: boolean }[] = [
  { value: 'draft', label: 'Draft', color: '#6b7280', canManuallySelect: false },
  { value: 'saved', label: 'Saved', color: '#059669', canManuallySelect: false },
  { value: 'uploaded', label: 'Uploaded', color: '#3b82f6', canManuallySelect: false },
  { value: 'processing', label: 'Processing', color: '#f59e0b', canManuallySelect: false },
  { value: 'completed', label: 'Completed', color: '#10b981', canManuallySelect: false },
  { value: 'failed', label: 'Failed', color: '#ef4444', canManuallySelect: false },
  { value: 'pending_approval', label: 'Pending Approval', color: '#f59e0b', canManuallySelect: true },
  { value: 'approved_salesman', label: 'Approved by Salesman', color: '#3b82f6', canManuallySelect: true },
  { value: 'approved_admin', label: 'Approved by Admin', color: '#10b981', canManuallySelect: true },
  { value: 'attached', label: 'Attached File', color: '#8b5cf6', canManuallySelect: false },
];

const getStatusConfig = (status: string) => {
  return EXISTING_STATUSES.find(s => s.value === status) ||
         { value: status, label: status, color: '#6b7280', canManuallySelect: true };
};

const getAvailableStatusesForDropdown = (currentStatus: string, isLatestVersion: boolean = true, fileType?: string, isInAdminContext: boolean = false) => {
  return EXISTING_STATUSES.filter(status => {
    if (status.value === currentStatus) return true;
    if (!status.canManuallySelect) return false;
    if (!isInAdminContext && status.value === 'approved_admin') return false;
    if (isInAdminContext && status.value === 'approved_salesman') return false;
    if (fileType === 'attached_pdf') return true;
    if (isLatestVersion) return true;
    return false;
  });
};

function formatDeletionMeta(deletedBy?: string | null, deletedAt?: string | null) {
  const parts: string[] = [];
  if (deletedBy) parts.push(`by ${deletedBy}`);
  if (deletedAt) {
    const timestamp = new Date(deletedAt);
    if (!Number.isNaN(timestamp.getTime())) {
      parts.push(`on ${timestamp.toLocaleString()}`);
    }
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

interface FileRowProps {
  file: SavedFileListItem;
  isSelected: boolean;
  statusChangeLoading: boolean;
  isInAdminContext: boolean;
  watermarkEnabled: boolean;
  onToggleSelection: (fileId: string) => void;
  onView: (file: SavedFileListItem, watermark: boolean) => void;
  onDownload: (file: SavedFileListItem, watermark: boolean) => void;
  onEmail: (file: SavedFileListItem) => void;
  onZohoUpload: (file: SavedFileListItem) => void;
  onEdit: (file: SavedFileListItem) => void;
  onStatusChange: (file: SavedFileListItem, newStatus: string) => void;
  onWatermarkToggle: (fileId: string, checked: boolean) => void;
  onDelete: (type: 'file' | 'folder', id: string, title: string, fileType?: string) => void;
  onRestore: (type: 'file' | 'folder', id: string, title: string, fileType?: string) => void;
  isTrashView: boolean;
}

export const FileRow = memo((props: FileRowProps) => {
  const {
    file,
    isSelected,
    statusChangeLoading,
    isInAdminContext,
    watermarkEnabled,
    onToggleSelection,
    onView,
    onDownload,
    onEmail,
    onZohoUpload,
    onEdit,
    onStatusChange,
    onWatermarkToggle,
    onDelete,
    onRestore,
    isTrashView
  } = props;

  const fileDeletionInfo = isTrashView ? formatDeletionMeta(file.deletedBy, file.deletedAt) : null;

  const handleToggle = useCallback(() => onToggleSelection(file.id), [file.id, onToggleSelection]);
  const handleView = useCallback(() => onView(file, watermarkEnabled), [file, watermarkEnabled, onView]);
  const handleDownload = useCallback(() => onDownload(file, watermarkEnabled), [file, watermarkEnabled, onDownload]);
  const handleEmail = useCallback(() => onEmail(file), [file, onEmail]);
  const handleZohoUpload = useCallback(() => onZohoUpload(file), [file, onZohoUpload]);
  const handleEdit = useCallback(() => onEdit(file), [file, onEdit]);
  const handleDeleteClick = useCallback(() => onDelete('file', file.id, file.title, file.fileType), [file.id, file.title, file.fileType, onDelete]);
  const handleRestoreClick = useCallback(() => onRestore('file', file.id, file.title, file.fileType), [file.id, file.title, file.fileType, onRestore]);
  const handleStatusChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(file, e.target.value);
  }, [file, onStatusChange]);
  const handleWatermarkToggle = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation(); // Prevent event bubbling to parent elements
    e.nativeEvent.stopImmediatePropagation(); // Stop other listeners on the same element
    onWatermarkToggle(file.id, e.target.checked);
  }, [file.id, onWatermarkToggle]);

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
      className="file-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px',
        background: isSelected ? '#f0f9ff' : '#fafafa',
        border: '1px solid',
        borderColor: isSelected ? '#bae6fd' : '#f0f0f0',
        borderRadius: '8px',
        marginBottom: '8px', // ✅ RESTORED: Original spacing
        transition: 'all 0.2s ease'
      }}
    >
      {/* File checkbox */}
      <div className="file-row-checkbox" style={{ marginRight: '12px' }}>
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
      <div className="file-row-info" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div className="file-row-info-main" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
        <span
          className="file-row-name"
          style={{
            fontWeight: '500',
            color: '#374151'
          }}
        >
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

      {/* Watermark toggle (only for version PDFs) */}
      {file.fileType === 'version_pdf' && (
        <div
          className="file-row-watermark"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: watermarkEnabled ? 'rgba(59, 130, 246, 0.1)' : '#f3f4f6',
            border: `1px solid ${watermarkEnabled ? '#60a5fa' : '#d1d5db'}`,
            borderRadius: '6px',
            marginRight: '12px',
            transition: 'all 0.2s'
          }}
          onClick={(e) => e.stopPropagation()} // Prevent parent click handlers
        >
          <input
            type="checkbox"
            checked={watermarkEnabled}
            onChange={handleWatermarkToggle}
            onClick={(e) => {
              e.stopPropagation(); // Prevent bubbling
              // Don't preventDefault - let the checkbox toggle naturally
            }}
            style={{
              width: '14px',
              height: '14px',
              cursor: 'pointer',
              accentColor: '#3b82f6'
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: '500',
              color: watermarkEnabled ? '#2563eb' : '#6b7280',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling
              onWatermarkToggle(file.id, !watermarkEnabled);
            }}
          >
            {watermarkEnabled ? '💧 Draft' : '✨ Normal'}
          </span>
        </div>
      )}

      {/* File actions */}
      <div className="file-row-actions" style={{ display: 'flex', gap: '6px' }}>
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

        {/* Status Dropdown */}
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
              onClick={handleDeleteClick}
              style={{
                color: '#dc2626',
                borderColor: '#fca5a5'
              }}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </>
        ) : (
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
