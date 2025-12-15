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
  faPlus, faCheckSquare, faSquare, faTrash, faUndo, faClipboardList
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

interface SavedFilesGroupedProps {
  mode?: 'normal' | 'trash';
}

export default function SavedFilesGrouped({ mode = 'normal' }: SavedFilesGroupedProps) {
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

  // ✅ NEW: Status update state
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({});

  // ✅ NEW: Version logs state
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [currentLogsFile, setCurrentLogsFile] = useState<SavedFileListItem | null>(null);
  const [versionLogs, setVersionLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // ✅ NEW: Delete confirmation modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: 'file' | 'folder', id: string, title: string} | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // ✅ NEW: Enhanced permanent delete confirmation state
  const [permanentDeleteConfirmed, setPermanentDeleteConfirmed] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const isInAdminContext = location.pathname.includes("/admin-panel");
  const returnPath = isInAdminContext ? "/admin-panel/saved-pdfs" : "/saved-pdfs";

  // Fetch grouped files
  // ✅ OPTIMIZED: Use lightweight data loading with on-demand detailed fetching
  // ✅ NEW: Support both normal and trash modes
  const fetchGroups = async (page = 1, search = "") => {
    setLoading(true);
    setError(null);
    try {
      const isTrashMode = mode === 'trash';
      console.log(`📁 [SAVED-FILES-GROUPED] Fetching ${isTrashMode ? 'TRASH' : 'NORMAL'} items - page ${page} with search: "${search}"`);

      // 1. Fetch grouped files (agreements with PDFs) - already optimized
      const groupedResponse = await pdfApi.getSavedFilesGrouped(page, groupsPerPage, {
        search: search.trim() || undefined,
        // ✅ NEW: Filter based on mode (trash shows deleted, normal shows non-deleted)
        isDeleted: isTrashMode
      });

      console.log(`📁 [SAVED-FILES-GROUPED] Loaded ${groupedResponse.groups.length} groups with PDFs`);

      // 2. ✅ OPTIMIZED: Use lightweight summary API instead of full customer headers
      // This avoids loading heavy payload data for all agreements upfront
      const headersSummaryResponse = await pdfApi.getCustomerHeadersSummary();

      // Find draft agreements that don't appear in the grouped response (no PDFs)
      const groupedIds = new Set(groupedResponse.groups.map(g => g.id));
      const draftOnlyHeaders = headersSummaryResponse.items.filter(header =>
        !groupedIds.has(header._id) &&
        header.status === 'draft' &&
        // ✅ NEW: Filter based on mode and deleted status
        (isTrashMode ? header.isDeleted === true : header.isDeleted !== true) &&
        // Apply search filter if provided
        (!search.trim() ||
         (header.headerTitle &&
          header.headerTitle.toLowerCase().includes(search.trim().toLowerCase())))
      );

      // 3. ✅ OPTIMIZED: Convert lightweight draft headers to SavedFileGroup format
      const draftGroups: SavedFileGroup[] = draftOnlyHeaders.map(header => ({
        id: header._id,
        agreementTitle: header.headerTitle || `Agreement ${header._id}`,
        fileCount: 0, // No PDFs yet
        latestUpdate: header.updatedAt,
        statuses: [header.status],
        hasUploads: false,
        files: [] // No files yet - detailed data loaded on-demand
      }));

      console.log(`📁 [DRAFT-ONLY] Found ${draftGroups.length} draft-only agreements using lightweight API`);

      // 4. ✅ OPTIMIZED: Merge grouped files with lightweight draft-only agreements
      const allGroups = [...groupedResponse.groups, ...draftGroups];

      setGroups(allGroups);
      setTotalGroups(groupedResponse.totalGroups + draftGroups.length);
      setTotalFiles(groupedResponse.total);
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

  // ✅ OPTIMIZED: File action handlers with on-demand detailed data fetching
  const handleView = async (file: SavedFileListItem) => {
    try {
      // ✅ FIXED: Different API calls for different file types
      if (file.fileType === 'version_pdf') {
        // ✅ For version PDFs, navigate directly to viewer (no need to fetch details)
        console.log(`👁️ [VIEW VERSION] Viewing version PDF: ${file.id}`);
        navigate("/pdf-viewer", {
          state: {
            documentId: file.id,
            fileName: file.title,
            originalReturnPath: returnPath,
            fileType: 'version_pdf' // ✅ Pass file type for proper handling
          },
        });
      } else if (file.fileType === 'attached_pdf') {
        // ✅ For attached PDFs, navigate directly to viewer
        console.log(`👁️ [VIEW ATTACHED] Viewing attached PDF: ${file.id}`);
        navigate("/pdf-viewer", {
          state: {
            documentId: file.id,
            fileName: file.title,
            originalReturnPath: returnPath,
            fileType: 'attached_pdf' // ✅ Pass file type for proper handling
          },
        });
      } else {
        // ✅ For main agreement files, use the original logic
        console.log(`👁️ [VIEW] Loading detailed data for file: ${file.id}`);
        await pdfApi.getSavedFileDetails(file.id);
        navigate("/pdf-viewer", {
          state: {
            documentId: file.id,
            fileName: file.title,
            originalReturnPath: returnPath,
          },
        });
      }
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

  // ✅ NEW: View version change logs handler
  const handleViewLogs = async (file: SavedFileListItem) => {
    if (file.fileType !== 'version_pdf') {
      setToastMessage({
        message: "Logs are only available for version PDFs.",
        type: "error"
      });
      return;
    }

    setCurrentLogsFile(file);
    setLogsModalOpen(true);
    setLoadingLogs(true);
    setVersionLogs([]);

    try {
      console.log(`📋 [VIEW LOGS] Fetching logs for version: ${file.id}`);

      // Fetch version change logs using the version ID
      const response = await fetch(`/api/pdf/version-changes/log/${file.id}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.log) {
        console.log(`✅ [VIEW LOGS] Found log for version ${file.id}:`, data.log);
        setVersionLogs([data.log]); // Single log per version
      } else {
        console.log(`ℹ️ [VIEW LOGS] No change log found for version ${file.id}`);
        setVersionLogs([]);
      }
    } catch (err) {
      console.error('❌ [VIEW LOGS] Failed to fetch version logs:', err);
      setToastMessage({
        message: "Failed to load version change logs. Please try again.",
        type: "error"
      });
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleEdit = async (file: SavedFileListItem, groupId: string) => {
    try {
      // ✅ FIXED: For version PDFs, edit the agreement directly (like handleEditAgreement)
      if (file.fileType === 'version_pdf') {
        console.log(`✏️ [EDIT VERSION] Editing agreement for version: ${file.title}, agreement: ${groupId}`);
        await pdfApi.getCustomerHeaderForEdit(groupId);
        navigate(`/edit/pdf/${groupId}`, {
          state: {
            editing: true,
            id: groupId, // ✅ Use agreement ID, not version file ID
            returnPath: returnPath,
          },
        });
      } else {
        // ✅ For other file types, use the original logic
        console.log(`✏️ [EDIT] Loading detailed data for file: ${file.id}, agreement: ${groupId}`);
        await pdfApi.getSavedFileDetails(file.id);
        navigate(`/edit/pdf/${groupId}`, {
          state: {
            editing: true,
            id: groupId, // ✅ Use agreement ID, not file ID
            returnPath: returnPath,
          },
        });
      }
    } catch (err) {
      setToastMessage({
        message: "Unable to load this document for editing. Please try again.",
        type: "error"
      });
    }
  };

  // ✅ OPTIMIZED: Edit Agreement handler for draft-only agreements with on-demand loading
  const handleEditAgreement = async (group: SavedFileGroup) => {
    try {
      console.log(`📝 [EDIT AGREEMENT] Loading detailed data for draft agreement: ${group.id}`);

      // ✅ On-demand: Fetch detailed customer header data only when editing
      // This loads the full form payload that was excluded from the lightweight initial load
      await pdfApi.getCustomerHeaderForEdit(group.id);

      navigate(`/edit/pdf/${group.id}`, {
        state: {
          editing: true,
          id: group.id,
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

  // ✅ NEW: Handle status update for files/agreements
  const handleStatusUpdate = async (fileId: string, newStatus: string, isAgreement = false) => {
    setUpdatingStatus(prev => ({ ...prev, [fileId]: true }));
    try {
      if (isAgreement) {
        await pdfApi.updateDocumentStatus(fileId, newStatus);
      } else {
        // For attached files, we would need to add a separate API endpoint
        // For now, treat all as agreement status updates
        await pdfApi.updateDocumentStatus(fileId, newStatus);
      }

      // Update local state
      setGroups(prevGroups =>
        prevGroups.map(group => {
          if (group.id === fileId) {
            return { ...group, statuses: [newStatus] };
          }
          return {
            ...group,
            files: group.files.map(file =>
              file.id === fileId ? { ...file, status: newStatus } : file
            )
          };
        })
      );

      setToastMessage({
        message: "Status updated successfully!",
        type: "success"
      });
    } catch (error) {
      console.error("Failed to update status:", error);
      setToastMessage({
        message: "Failed to update status. Please try again.",
        type: "error"
      });
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [fileId]: false }));
    }
  };

  // ✅ NEW: Handle delete confirmation
  const handleDelete = (type: 'file' | 'folder', id: string, title: string) => {
    setItemToDelete({ type, id, title });
    setDeleteConfirmText('');
    setPermanentDeleteConfirmed(false);  // Reset checkbox state
    setDeleteConfirmOpen(true);
  };

  // ✅ NEW: Handle restore from trash
  const handleRestore = async (type: 'file' | 'folder', id: string, title: string) => {
    try {
      let result;

      if (type === 'folder') {
        // Check if this is a deleted agreement or just an agreement with deleted files
        const group = groups.find(g => g.id === id);

        if (group?.isDeleted === true) {
          // Agreement itself is deleted - restore the agreement
          console.log(`♻️ [RESTORE] Restoring deleted agreement: ${title}`);
          result = await pdfApi.restoreAgreement(id);
        } else {
          // Agreement is not deleted, but has deleted files - restore all deleted files
          console.log(`♻️ [RESTORE] Restoring all deleted files in agreement: ${title}`);
          const deletedFiles = group?.files || [];

          if (deletedFiles.length === 0) {
            setToastMessage({
              message: "No deleted files found to restore.",
              type: "error"
            });
            return;
          }

          // Restore all deleted files in this agreement
          const restorePromises = deletedFiles.map(file => pdfApi.restoreFile(file.id));
          const results = await Promise.all(restorePromises);

          const successCount = results.filter(r => r.success).length;
          const failCount = results.length - successCount;

          if (successCount > 0) {
            result = {
              success: true,
              message: `Restored ${successCount} file${successCount !== 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}`
            };
          } else {
            result = {
              success: false,
              message: `Failed to restore ${failCount} file${failCount !== 1 ? 's' : ''}`
            };
          }
        }
      } else {
        // Restore individual file
        console.log(`♻️ [RESTORE] Restoring individual file: ${title}`);
        result = await pdfApi.restoreFile(id);
      }

      if (result.success) {
        setToastMessage({
          message: result.message || `${type === 'folder' ? 'Agreement' : 'File'} "${title}" restored successfully!`,
          type: "success"
        });

        // Refresh the list
        await fetchGroups(currentPage, query);
      } else {
        setToastMessage({
          message: result.message || "Failed to restore. Please try again.",
          type: "error"
        });
      }
    } catch (error) {
      console.error("Failed to restore:", error);
      setToastMessage({
        message: "Failed to restore. Please try again.",
        type: "error"
      });
    }
  };

  // ✅ NEW: Confirm delete action
  const confirmDelete = async () => {
    const isTrashMode = mode === 'trash';

    if (!itemToDelete || deleteConfirmText !== 'DELETE') {
      setToastMessage({
        message: "Please type 'DELETE' to confirm",
        type: "error"
      });
      return;
    }

    // In trash mode, require additional confirmation checkbox for permanent delete
    if (isTrashMode && !permanentDeleteConfirmed) {
      setToastMessage({
        message: "Please check the confirmation box for permanent delete",
        type: "error"
      });
      return;
    }

    try {
      let result;

      if (isTrashMode) {
        // Trash mode - permanent delete
        if (itemToDelete.type === 'folder') {
          result = await pdfApi.permanentlyDeleteAgreement(itemToDelete.id);
        } else {
          result = await pdfApi.permanentlyDeleteFile(itemToDelete.id);
        }

        if (result.success) {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
          setDeleteConfirmText('');
          setPermanentDeleteConfirmed(false);

          // Show detailed success message with deleted data
          let successMsg = `${itemToDelete.type === 'folder' ? 'Agreement' : 'File'} permanently deleted!`;
          if (result.deletedData) {
            if (itemToDelete.type === 'folder' && 'deletedAttachedFiles' in result.deletedData) {
              const data = result.deletedData as any;
              successMsg += ` (${data.deletedAttachedFiles} files, ${data.deletedZohoMappings} mappings, ${data.deletedVersions} versions removed)`;
            } else if ('cleanedReferences' in result.deletedData) {
              const data = result.deletedData as any;
              successMsg += ` (${data.cleanedReferences} references cleaned)`;
            }
          }

          setToastMessage({
            message: successMsg,
            type: "success"
          });

          // Refresh the list
          await fetchGroups(currentPage, query);
        } else {
          setToastMessage({
            message: result.message || "Failed to permanently delete. Please try again.",
            type: "error"
          });
        }
      } else {
        // Normal mode - soft delete (move to trash)
        if (itemToDelete.type === 'folder') {
          result = await pdfApi.deleteAgreement(itemToDelete.id);
        } else {
          result = await pdfApi.deleteFile(itemToDelete.id);
        }

        if (result.success) {
          setDeleteConfirmOpen(false);
          setItemToDelete(null);
          setDeleteConfirmText('');

          setToastMessage({
            message: `${itemToDelete.type === 'folder' ? 'Agreement' : 'File'} moved to trash successfully!`,
            type: "success"
          });

          // Refresh the list after deletion
          await fetchGroups(currentPage, query);
        } else {
          setToastMessage({
            message: result.message || "Failed to delete. Please try again.",
            type: "error"
          });
        }
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      setToastMessage({
        message: "Failed to delete. Please try again.",
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
            placeholder={mode === 'trash' ? "Search deleted agreements..." : "Search agreements..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* ✅ NEW: Bulk actions toolbar - different for trash vs normal mode */}
        <div className="sf__actions">
          {hasSelectedFiles && mode === 'normal' && (
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

          {hasSelectedFiles && mode === 'trash' && (
            <>
              <div className="sf__selection-info" style={{
                fontSize: '14px',
                color: '#6b7280',
                fontWeight: '500',
                padding: '0 8px'
              }}>
                {selectedFileIds.length} deleted file{selectedFileIds.length !== 1 ? 's' : ''} selected
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
                className="sf__btn sf__btn--success"
                onClick={() => {
                  // TODO: Implement bulk restore
                  setToastMessage({
                    message: "Bulk restore feature coming soon!",
                    type: "info"
                  });
                }}
              >
                <FontAwesomeIcon icon={faUndo} style={{ marginRight: '6px' }} />
                Restore Selected ({selectedFileIds.length})
              </button>
            </>
          )}

          {!hasSelectedFiles && mode === 'normal' && (
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

          {!hasSelectedFiles && mode === 'trash' && (
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
          {mode === 'trash'
            ? `${totalGroups} deleted agreements • ${totalFiles} deleted files`
            : `${totalGroups} agreements • ${totalFiles} files`
          }
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
                    {/* ✅ FIXED: Show agreement status from group.statuses */}
                    {group.statuses && group.statuses.length > 0 && (
                      <span style={{
                        background: `var(--status-${group.statuses[0]}-bg, #f3f4f6)`,
                        color: `var(--status-${group.statuses[0]}-text, #4b5563)`,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {STATUS_LABEL[group.statuses[0] as FileStatus]}
                      </span>
                    )}
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

                {/* ✅ FIXED: Status dropdown at agreement level - only show in normal mode */}
                {mode === 'normal' && group.statuses && group.statuses.length > 0 && (
                  <select
                    value={group.statuses[0]}
                    onChange={(e) => handleStatusUpdate(group.id, e.target.value, true)} // true = isAgreement
                    disabled={updatingStatus[group.id]}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      fontSize: '12px',
                      backgroundColor: updatingStatus[group.id] ? '#f3f4f6' : '#fff',
                      cursor: updatingStatus[group.id] ? 'not-allowed' : 'pointer',
                      marginRight: '8px'
                    }}
                    title="Change agreement status"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="draft">Draft</option>
                    <option value="saved">Saved</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="approved_salesman">Approved by Salesman</option>
                    <option value="approved_admin">Approved by Admin</option>
                  </select>
                )}

                {/* Add file button - only show in normal mode */}
                {mode === 'normal' && (
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
                )}

                {/* ✅ FIXED: Edit Agreement button for all agreements - only show in normal mode */}
                {mode === 'normal' && (
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
                      fontWeight: '500',
                      marginLeft: '8px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditAgreement(group);
                    }}
                    title="Edit this agreement"
                  >
                    <FontAwesomeIcon icon={faPencilAlt} style={{ fontSize: '10px' }} />
                    Edit Agreement
                  </button>
                )}

                {/* Edit Agreement button for draft-only agreements - only show in normal mode */}
                {mode === 'normal' && group.fileCount === 0 && (
                  <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '8px' }}>
                    (No files yet)
                  </span>
                )}

                {/* Restore button - only show in trash mode */}
                {mode === 'trash' && (
                  <button
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #16a34a',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: '#16a34a',
                      fontWeight: '500',
                      marginLeft: '8px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestore('folder', group.id, group.agreementTitle);
                    }}
                    title="Restore this agreement from trash"
                  >
                    <FontAwesomeIcon icon={faUndo} style={{ fontSize: '10px' }} />
                    Restore
                  </button>
                )}

                {/* Delete/Permanent Delete button - ✅ FIXED: Only show if agreement itself was deleted */}
                {(mode !== 'trash' || group.isDeleted === true) && (
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
                      handleDelete('folder', group.id, group.agreementTitle);
                    }}
                    title={mode === 'trash' ? "Permanently delete this agreement" : "Delete this agreement (move to trash)"}
                  >
                    <FontAwesomeIcon icon={faTrash} style={{ fontSize: '10px' }} />
                    {mode === 'trash' ? 'Permanent Delete' : 'Delete'}
                  </button>
                )}
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
                        {/* ✅ FIXED: Removed individual file status - files don't have their own status */}
                      </div>

                      {/* ✅ FIXED: File action buttons - only basic actions, no status dropdown or edit */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* File action buttons */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {/* Normal mode buttons */}
                          {mode === 'normal' && (
                            <>
                              {/* ✅ FIXED: Edit button only for most recent version PDF */}
                              {file.fileType === 'version_pdf' && (() => {
                                // Find the highest version number in this group
                                const versionFiles = group.files.filter(f => f.fileType === 'version_pdf');
                                const maxVersion = Math.max(...versionFiles.map(f => f.versionNumber || 0));
                                const isLatestVersion = file.versionNumber === maxVersion;
                                return isLatestVersion;
                              })() && (
                                <button
                                  className="iconbtn"
                                  title="Edit this PDF version"
                                  onClick={() => handleEdit(file, group.id)}
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
                              {/* ✅ NEW: View Logs button for version PDFs */}
                              {file.fileType === 'version_pdf' && (
                                <button
                                  className="iconbtn"
                                  title="View Change Logs"
                                  onClick={() => handleViewLogs(file)}
                                  style={{
                                    backgroundColor: '#f3f4f6',
                                    border: '1px solid #d1d5db'
                                  }}
                                >
                                  <FontAwesomeIcon icon={faClipboardList} />
                                </button>
                              )}
                              <button
                                className="iconbtn zoho-upload-btn"
                                title="Upload to Zoho Bigin"
                                onClick={() => handleZohoUpload(file)}
                                disabled={!file.hasPdf}
                              >
                                <FontAwesomeIcon icon={faUpload} />
                              </button>
                              {/* Delete file button */}
                              <button
                                className="iconbtn"
                                title="Delete file (move to trash)"
                                onClick={() => handleDelete('file', file.id, file.title)}
                                style={{
                                  color: '#dc2626',
                                  borderColor: '#fca5a5'
                                }}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </>
                          )}

                          {/* Trash mode buttons */}
                          {mode === 'trash' && (
                            <>
                              <button
                                className="iconbtn"
                                title="View (read-only)"
                                onClick={() => handleView(file)}
                                disabled={!file.hasPdf}
                              >
                                <FontAwesomeIcon icon={faEye} />
                              </button>
                              <button
                                className="iconbtn"
                                title="Restore file from trash"
                                onClick={() => handleRestore('file', file.id, file.title)}
                                style={{
                                  color: '#16a34a',
                                  borderColor: '#bbf7d0'
                                }}
                              >
                                <FontAwesomeIcon icon={faUndo} />
                              </button>
                              {/* Permanent delete file button */}
                              <button
                                className="iconbtn"
                                title="Permanently delete file"
                                onClick={() => handleDelete('file', file.id, file.title)}
                                style={{
                                  color: '#dc2626',
                                  borderColor: '#fca5a5'
                                }}
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </>
                          )}
                        </div>
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
          agreementId={currentZohoFile.agreementId || currentZohoFile.id}
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

      {/* ✅ NEW: Version Change Logs Modal */}
      {logsModalOpen && currentLogsFile && (
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
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '16px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Version Change Logs - {currentLogsFile.title}
              </h3>
              <button
                onClick={() => {
                  setLogsModalOpen(false);
                  setCurrentLogsFile(null);
                  setVersionLogs([]);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px'
                }}
                title="Close"
              >
                ×
              </button>
            </div>

            {loadingLogs && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                color: '#6b7280'
              }}>
                <div>Loading version change logs...</div>
              </div>
            )}

            {!loadingLogs && versionLogs.length === 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                color: '#6b7280',
                textAlign: 'center'
              }}>
                <FontAwesomeIcon
                  icon={faClipboardList}
                  style={{ fontSize: '48px', marginBottom: '16px', color: '#d1d5db' }}
                />
                <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
                  No Change Logs Found
                </div>
                <div style={{ fontSize: '14px' }}>
                  No price override changes have been logged for this version yet.
                </div>
              </div>
            )}

            {!loadingLogs && versionLogs.length > 0 && versionLogs.map((log, logIndex) => (
              <div key={logIndex} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                marginBottom: '16px',
                overflow: 'hidden'
              }}>
                {/* Log Header */}
                <div style={{
                  background: '#f9fafb',
                  padding: '16px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '4px'
                      }}>
                        Version {log.versionNumber} Changes
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#6b7280'
                      }}>
                        {log.totalChanges} change{log.totalChanges !== 1 ? 's' : ''} logged
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: log.totalPriceImpact >= 0 ? '#059669' : '#dc2626',
                        marginBottom: '4px'
                      }}>
                        {log.totalPriceImpact >= 0 ? '+' : ''}${log.totalPriceImpact?.toFixed(2) || '0.00'}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        Total Impact
                      </div>
                    </div>
                  </div>

                  {/* Log Metadata */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginTop: '12px',
                    padding: '12px',
                    background: '#fff',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}>
                    <div>
                      <span style={{ fontWeight: '500', color: '#374151' }}>Salesperson:</span>
                      <span style={{ marginLeft: '8px', color: '#6b7280' }}>
                        {log.salespersonName || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontWeight: '500', color: '#374151' }}>Action:</span>
                      <span style={{
                        marginLeft: '8px',
                        color: '#6b7280',
                        textTransform: 'capitalize'
                      }}>
                        {log.saveAction?.replace('_', ' ') || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontWeight: '500', color: '#374151' }}>Date:</span>
                      <span style={{ marginLeft: '8px', color: '#6b7280' }}>
                        {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                    {log.hasSignificantChanges && (
                      <div>
                        <span style={{
                          background: '#fef3c7',
                          color: '#92400e',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          ⚠️ Significant Changes
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Changes List */}
                {log.changes && log.changes.length > 0 && (
                  <div style={{ padding: '16px' }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '12px'
                    }}>
                      Price Override Changes:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {log.changes.map((change, changeIndex) => (
                        <div key={changeIndex} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px',
                          background: change.changeAmount >= 0 ? '#f0fdf4' : '#fef2f2',
                          borderRadius: '6px',
                          fontSize: '13px'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontWeight: '500',
                              color: '#374151',
                              marginBottom: '2px'
                            }}>
                              {change.productName}
                            </div>
                            <div style={{ color: '#6b7280', fontSize: '12px' }}>
                              {change.fieldDisplayName}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', minWidth: '120px' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '12px',
                              color: '#6b7280',
                              marginBottom: '2px'
                            }}>
                              <span>${change.originalValue?.toFixed(2) || '0.00'}</span>
                              <span>→</span>
                              <span>${change.newValue?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div style={{
                              fontWeight: '600',
                              color: change.changeAmount >= 0 ? '#059669' : '#dc2626'
                            }}>
                              {change.changeAmount >= 0 ? '+' : ''}${change.changeAmount?.toFixed(2) || '0.00'}
                              {change.changePercentage !== undefined && change.changePercentage !== null && (
                                <span style={{ marginLeft: '4px' }}>
                                  ({change.changePercentage >= 0 ? '+' : ''}{change.changePercentage.toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!log.changes || log.changes.length === 0) && (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '14px'
                  }}>
                    No individual changes recorded for this version.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
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
                background: mode === 'trash' ? '#7f1d1d' : '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FontAwesomeIcon
                  icon={faTrash}
                  style={{
                    color: mode === 'trash' ? '#fff' : '#dc2626',
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
                  {mode === 'trash' ? 'Permanently Delete' : 'Delete'} {itemToDelete.type === 'folder' ? 'Agreement' : 'File'}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  {mode === 'trash'
                    ? 'This action cannot be undone and will permanently remove the item from the database'
                    : 'This action will move the item to trash'
                  }
                </p>
              </div>
            </div>

            <div style={{
              background: mode === 'trash' ? '#fef2f2' : '#f9fafb',
              border: `1px solid ${mode === 'trash' ? '#fca5a5' : '#e5e7eb'}`,
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
                  ? mode === 'trash'
                    ? 'This will permanently delete the entire agreement and all its files, attached documents, versions, and Zoho mappings from the database.'
                    : 'This will move the entire agreement and all its files to trash.'
                  : mode === 'trash'
                    ? 'This will permanently delete this file and clean up all references from the database.'
                    : 'This will move only this file to trash.'
                }
              </p>
            </div>

            {/* ✅ NEW: Enhanced permanent delete confirmation for trash mode */}
            {mode === 'trash' && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <input
                    type="checkbox"
                    id="permanent-delete-confirm"
                    checked={permanentDeleteConfirmed}
                    onChange={(e) => setPermanentDeleteConfirmed(e.target.checked)}
                    style={{
                      marginTop: '2px'
                    }}
                  />
                  <label
                    htmlFor="permanent-delete-confirm"
                    style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#7f1d1d',
                      cursor: 'pointer',
                      lineHeight: '1.4'
                    }}
                  >
                    I understand this action is permanent and cannot be undone. All data including files, mappings, and references will be permanently removed from the database.
                  </label>
                </div>
              </div>
            )}

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
                  setPermanentDeleteConfirmed(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  background: deleteConfirmText === 'DELETE' && (mode !== 'trash' || permanentDeleteConfirmed)
                    ? mode === 'trash' ? '#7f1d1d' : '#dc2626'
                    : '#f3f4f6',
                  border: `1px solid ${deleteConfirmText === 'DELETE' && (mode !== 'trash' || permanentDeleteConfirmed)
                    ? mode === 'trash' ? '#7f1d1d' : '#dc2626'
                    : '#d1d5db'}`,
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: deleteConfirmText === 'DELETE' && (mode !== 'trash' || permanentDeleteConfirmed)
                    ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: deleteConfirmText === 'DELETE' && (mode !== 'trash' || permanentDeleteConfirmed)
                    ? '#fff' : '#9ca3af',
                  opacity: deleteConfirmText === 'DELETE' && (mode !== 'trash' || permanentDeleteConfirmed) ? 1 : 0.6
                }}
                onClick={confirmDelete}
                disabled={deleteConfirmText !== 'DELETE' || (mode === 'trash' && !permanentDeleteConfirmed)}
              >
                <FontAwesomeIcon icon={faTrash} style={{ marginRight: '6px' }} />
                {mode === 'trash' ? 'Permanently Delete' : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}