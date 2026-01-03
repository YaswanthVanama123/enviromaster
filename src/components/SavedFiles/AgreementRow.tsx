// src/components/SavedFiles/AgreementRow.tsx
// ✅ EXTRACTED: Memoized agreement row component for better performance
import { memo, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolder, faFolderOpen, faChevronDown, faChevronRight,
  faPlus, faCheckSquare, faSquare, faCloudUploadAlt,
  faTrash, faPencilAlt, faRedo
} from "@fortawesome/free-solid-svg-icons";
import type { SavedFileGroup, SavedFileListItem } from "../../backendservice/api/pdfApi";
import { FileRow } from "./FileRow";
import AgreementTimelineBadge from "../AgreementTimelineBadge";

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
  if (deletedBy) parts.push(`by ${deletedBy}`);
  if (deletedAt) {
    const timestamp = new Date(deletedAt);
    if (!Number.isNaN(timestamp.getTime())) {
      parts.push(`on ${timestamp.toLocaleString()}`);
    }
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

const getStatusConfig = (status: string) => {
  const EXISTING_STATUSES = [
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

  return EXISTING_STATUSES.find(s => s.value === status) ||
         { value: status, label: status, color: '#6b7280', canManuallySelect: true };
};

interface AgreementRowProps {
  agreement: SavedFileGroup;
  isExpanded: boolean;
  selectionState: 'none' | 'partial' | 'all';
  selectedFiles: Record<string, boolean>;
  statusChangeLoading: Record<string, boolean>;
  fileWatermarkStates: Map<string, boolean>;
  isInAdminContext: boolean;
  isTrashView: boolean;
  onToggleExpand: (agreementId: string) => void;
  onToggleSelection: (agreementId: string) => void;
  onFileToggleSelection: (fileId: string) => void;
  onAddFile: (agreement: SavedFileGroup) => void;
  onEditAgreement: (agreement: SavedFileGroup) => void;
  onDelete: (type: 'file' | 'folder', id: string, title: string, fileType?: string) => void;
  onAgreementZohoUpload: (agreement: SavedFileGroup) => void;
  onDateChange: (agreementId: string, newDate: string) => Promise<void>;
  onView: (file: SavedFileListItem, watermark: boolean) => void;
  onDownload: (file: SavedFileListItem, watermark: boolean) => void;
  onEmail: (file: SavedFileListItem) => void;
  onZohoUpload: (file: SavedFileListItem) => void;
  onEdit: (file: SavedFileListItem) => void;
  onStatusChange: (file: SavedFileListItem, newStatus: string) => void;
  onWatermarkToggle: (fileId: string, checked: boolean) => void;
  onRestore: (type: 'file' | 'folder', id: string, title: string, fileType?: string) => void;
}

export const AgreementRow = memo((props: AgreementRowProps) => {
  const {
    agreement,
    isExpanded,
    selectionState,
    selectedFiles,
    statusChangeLoading,
    fileWatermarkStates,
    isInAdminContext,
    isTrashView,
    onToggleExpand,
    onToggleSelection,
    onFileToggleSelection,
    onAddFile,
    onEditAgreement,
    onDelete,
    onAgreementZohoUpload,
    onDateChange,
    onView,
    onDownload,
    onEmail,
    onZohoUpload,
    onEdit,
    onStatusChange,
    onWatermarkToggle,
    onRestore
  } = props;

  const uploadableFiles = agreement.files.filter(file =>
    file.hasPdf || file.fileType === 'version_log' || file.fileType === 'attached_pdf'
  );

  const agreementDeletionInfo = isTrashView ? formatDeletionMeta(agreement.deletedBy, agreement.deletedAt) : null;
  const hasActiveVersions = agreement.files.some(file =>
    file.fileType === 'version_pdf' && file.isDeleted !== true
  );
  const showAgreementLevelEdit = !isTrashView && !hasActiveVersions;

  const handleToggleExpand = useCallback(() => onToggleExpand(agreement.id), [agreement.id, onToggleExpand]);
  const handleToggleSelection = useCallback(() => onToggleSelection(agreement.id), [agreement.id, onToggleSelection]);
  const handleAddFile = useCallback(() => onAddFile(agreement), [agreement, onAddFile]);
  const handleEditAgreement = useCallback(() => onEditAgreement(agreement), [agreement, onEditAgreement]);
  const handleDelete = useCallback(() => onDelete('folder', agreement.id, agreement.agreementTitle), [agreement.id, agreement.agreementTitle, onDelete]);
  const handleZohoUpload = useCallback(() => onAgreementZohoUpload(agreement), [agreement, onAgreementZohoUpload]);
  const handleDateChange = useCallback((newDate: string) => onDateChange(agreement.id, newDate), [agreement.id, onDateChange]);

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e6e6e6',
      borderRadius: '10px',
      marginBottom: '8px', // ✅ RESTORED: Original spacing
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      position: 'relative'
    }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px',
          cursor: 'pointer',
          borderBottom: isExpanded ? '1px solid #f0f0f0' : 'none'
        }}
      >
        {/* Agreement checkbox */}
        <div style={{ marginRight: '12px' }} onClick={(e) => e.stopPropagation()}>
          <FontAwesomeIcon
            icon={selectionState === 'none' ? faSquare : faCheckSquare}
            style={{
              color: selectionState !== 'none' ? '#3b82f6' : '#d1d5db',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            onClick={handleToggleSelection}
          />
        </div>

        {/* Expand/collapse arrow */}
        <FontAwesomeIcon
          icon={isExpanded ? faChevronDown : faChevronRight}
          style={{
            color: '#6b7280',
            fontSize: '14px',
            marginRight: '8px'
          }}
          onClick={handleToggleExpand}
        />

        {/* Folder icon */}
        <FontAwesomeIcon
          icon={isExpanded ? faFolderOpen : faFolder}
          style={{
            color: '#f59e0b',
            fontSize: '18px',
            marginRight: '12px'
          }}
        />

        {/* Agreement title and metadata */}
        <div style={{ flex: 1 }} onClick={handleToggleExpand}>
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

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {agreement.startDate && agreement.contractMonths && (
            <AgreementTimelineBadge
              startDate={agreement.startDate}
              contractMonths={agreement.contractMonths}
              compact={true}
              showCalendarIcon={!isTrashView}
              onDateChange={handleDateChange}
              agreementId={agreement.id}
            />
          )}

          {isTrashView ? (
            // ✅ TRASH VIEW: Show Restore button, and Permanent Delete only if agreement itself is deleted
            <>
              <button
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#10b981',
                  fontWeight: '500'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore('folder', agreement.id, agreement.agreementTitle);
                }}
                title="Restore this agreement"
              >
                <FontAwesomeIcon icon={faRedo} style={{ fontSize: '10px' }} />
                Restore
              </button>

              {/* ✅ FIXED: Only show Permanent Delete button if the agreement itself was deleted */}
              {agreement.isDeleted === true && (
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
                    fontWeight: '500'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  title="Permanently delete this agreement"
                >
                  <FontAwesomeIcon icon={faTrash} style={{ fontSize: '10px' }} />
                  Permanent Delete
                </button>
              )}
            </>
          ) : (
            // ✅ NORMAL VIEW: Show regular action buttons
            <>
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
                  handleZohoUpload();
                }}
                disabled={uploadableFiles.length === 0}
                title={`Upload ${uploadableFiles.length} files to Zoho Bigin`}
              >
                <FontAwesomeIcon icon={faCloudUploadAlt} style={{ fontSize: '10px' }} />
                Bigin
              </button>

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
                  handleAddFile();
                }}
                title="Add file to this agreement"
              >
                <FontAwesomeIcon icon={faPlus} style={{ fontSize: '10px' }} />
                Add
              </button>

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
                    handleEditAgreement();
                  }}
                  title="Edit this draft agreement"
                >
                  <FontAwesomeIcon icon={faPencilAlt} style={{ fontSize: '10px' }} />
                  Edit Agreement
                </button>
              )}

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
                  handleDelete();
                }}
                title="Delete this agreement (move to trash)"
              >
                <FontAwesomeIcon icon={faTrash} style={{ fontSize: '10px' }} />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Files list - ✅ LAZY RENDERING: Only create DOM elements when expanded */}
      {isExpanded && (
        <div style={{ padding: '0 16px 16px' }}>
          {agreement.files.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              isSelected={selectedFiles[file.id] || false}
              statusChangeLoading={statusChangeLoading[file.id] || false}
              isInAdminContext={isInAdminContext}
              watermarkEnabled={fileWatermarkStates.get(file.id) || false}
              onToggleSelection={onFileToggleSelection}
              onView={onView}
              onDownload={onDownload}
              onEmail={onEmail}
              onZohoUpload={onZohoUpload}
              onEdit={onEdit}
              onStatusChange={onStatusChange}
              onWatermarkToggle={onWatermarkToggle}
              onDelete={onDelete}
              onRestore={onRestore}
              isTrashView={isTrashView}
            />
          ))}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  // Only re-render if these specific props changed
  return (
    prevProps.agreement.id === nextProps.agreement.id &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.selectionState === nextProps.selectionState &&
    prevProps.agreement.latestUpdate === nextProps.agreement.latestUpdate &&
    prevProps.agreement.fileCount === nextProps.agreement.fileCount &&
    prevProps.isTrashView === nextProps.isTrashView &&
    JSON.stringify(prevProps.selectedFiles) === JSON.stringify(nextProps.selectedFiles) &&
    JSON.stringify(prevProps.statusChangeLoading) === JSON.stringify(nextProps.statusChangeLoading)
  );
});

AgreementRow.displayName = 'AgreementRow';
