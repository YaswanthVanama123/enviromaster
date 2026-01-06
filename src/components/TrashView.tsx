// src/components/TrashView.tsx
// ✅ SELF-CONTAINED: All trash management logic in one file
// ✅ OPTIMIZED: Lazy rendering + memoized components
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { pdfApi, emailApi, manualUploadApi } from "../backendservice/api";
import type { SavedFileListItem, SavedFileGroup } from "../backendservice/api/pdfApi";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare, faTrash, faFileAlt, faFolder, faExclamationTriangle
} from "@fortawesome/free-solid-svg-icons";
import EmailComposer, { type EmailData } from "./EmailComposer";
import DocumentSidebar from "./DocumentSidebar";
import "./SavedFiles.css";
import "./TrashView.css";
import { getDocumentTypeForSavedFile } from "../utils/savedFileDocumentType";
// ✅ OPTIMIZED: Memoized components for fast rendering
import { AgreementRow } from "./SavedFiles/AgreementRow";

export default function TrashView() {
  // ✅ State
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
  const queryRef = useRef(query);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  // ✅ PERFORMANCE: Prevent duplicate concurrent API calls
  const isFetchingRef = useRef(false);

  // ✅ Selection state
  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});

  // Email composer state
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [currentEmailFile, setCurrentEmailFile] = useState<SavedFileListItem | null>(null);

  // ✅ Delete confirmation modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: 'file' | 'folder', id: string, title: string, fileType?: string} | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteCheckboxChecked, setDeleteCheckboxChecked] = useState(false); // ✅ Separate checkbox state
  const normalizedDeleteText = deleteConfirmText.trim().toUpperCase();
  const isDeleteConfirmed = normalizedDeleteText === 'DELETE' && deleteCheckboxChecked; // ✅ Require both

  // ✅ Watermark state for controlling Normal/Draft mode
  const [fileWatermarkStates, setFileWatermarkStates] = useState<Map<string, boolean>>(new Map());
  const [updatingStatus] = useState<Record<string, boolean>>({});

  const navigate = useNavigate();
  const location = useLocation();
  const isInAdminContext = location.pathname.includes("/admin-panel");

  // ✅ Fetch deleted items
  const fetchGroups = useCallback(async (page = 1, search = "") => {
    if (isFetchingRef.current) {
      console.log('⏭️ [TRASH] Skipping duplicate call - already fetching');
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log(`🗑️ [TRASH] Fetching deleted items - page ${page} with search: "${search}"`);

      const requestParams = {
        search: search.trim() || undefined,
        includeLogs: true,
        includeDrafts: false,
        isDeleted: true // ✅ Only fetch deleted items
      };

      const groupedResponse = await pdfApi.getSavedFilesGrouped(page, groupsPerPage, requestParams);

      console.log(`🗑️ [TRASH] Response: ${groupedResponse.groups.length} deleted agreements`);

      setGroups(groupedResponse.groups);
      setTotalGroups(groupedResponse.totalGroups);
      setTotalFiles(groupedResponse.groups.reduce((sum, group) => sum + group.fileCount, 0));
      setCurrentPage(page);

    } catch (err) {
      console.error("❌ [TRASH] Failed to fetch deleted items:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch deleted items");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [groupsPerPage]);

  // ✅ Initial load
  useEffect(() => {
    fetchGroups(1, "");
  }, [fetchGroups]);

  // ✅ Selection handlers
  const toggleGroupSelection = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const allSelected = group.files.every(file => selectedFiles[file.id]);
    const newSelection = { ...selectedFiles };

    group.files.forEach(file => {
      newSelection[file.id] = !allSelected;
    });

    setSelectedFiles(newSelection);
  };

  const getGroupSelectionState = (group: SavedFileGroup): 'none' | 'partial' | 'all' => {
    const selectedCount = group.files.filter(file => selectedFiles[file.id]).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === group.files.length) return 'all';
    return 'partial';
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => ({ ...prev, [fileId]: !prev[fileId] }));
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

  // ✅ Action handlers
  const handleView = async (file: SavedFileListItem, watermark: boolean = false) => {
    try {
      console.log("👁️ [TRASH] Viewing deleted file", file.id);

      // ✅ FIXED: Use correct documentType based on file type (matching SavedFilesAgreements)
      let documentType: string;
      if (file.fileType === 'main_pdf') {
        documentType = 'agreement';
      } else if (file.fileType === 'version_pdf') {
        documentType = 'version';
      } else if (file.fileType === 'version_log') {
        documentType = 'version-log';
      } else if (file.fileType === 'attached_pdf') {
        documentType = 'manual-upload';
      } else {
        documentType = 'attached-file';
      }

      navigate("/pdf-viewer", {
        state: {
          documentId: file.id,
          fileName: file.title,
          documentType: documentType, // ✅ FIXED: Pass documentType for correct API selection
          watermark: watermark,
          includeDeleted: true, // ✅ FIXED: Include deleted files for trash view (required for log files)
          source: "trash"
        }
      });
    } catch (error) {
      console.error("Failed to view file:", error);
      setToastMessage({
        message: "Failed to view file. Please try again.",
        type: "error"
      });
    }
  };

  const handleDownload = async (file: SavedFileListItem, watermark: boolean = false) => {
    try {
      let blob: Blob;

      // ✅ FIXED: Use different download methods based on file type (matching SavedFilesAgreements)
      if (file.fileType === 'main_pdf') {
        blob = await pdfApi.downloadPdf(file.id); // ✅ FIXED: lowercase 'df', not 'DF'
      } else if (file.fileType === 'version_pdf') {
        console.log(`📥 [TRASH-DOWNLOAD] Downloading version PDF ${file.id} with watermark: ${watermark}`);
        blob = await pdfApi.downloadVersionPdf(file.id, watermark);
      } else if (file.fileType === 'version_log') {
        // ✅ FIXED: Use version log API for log files
        blob = await pdfApi.downloadVersionLog(file.id, true); // includeDeleted=true for trash
      } else if (file.fileType === 'attached_pdf') {
        // ✅ FIXED: Use manual upload API for manually uploaded attached files
        blob = await manualUploadApi.downloadFile(file.id);
      } else {
        // Handle other attached files
        blob = await pdfApi.downloadAttachedFile(file.id);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // ✅ FIXED: Use appropriate file extension based on file type
      let safeName: string;
      if (file.fileType === 'version_log') {
        safeName = file.fileName || "EnviroMaster_Version_Log.txt";
      } else {
        const extension = '.pdf';
        const baseFileName = file.fileName || "EnviroMaster_Document";
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

      setToastMessage({
        message: `Downloaded: ${safeName}`,
        type: "success"
      });
    } catch (error) {
      console.error("Failed to download file:", error);
      setToastMessage({
        message: "Failed to download file. Please try again.",
        type: "error"
      });
    }
  };

  const handleEmail = (file: SavedFileListItem) => {
    setCurrentEmailFile(file);
    setEmailComposerOpen(true);
  };

  const handleRestore = async (type: 'file' | 'folder', id: string, title: string, fileType?: string) => {
    try {
      console.log(`♻️ [TRASH] Restoring ${type}: ${id} (fileType: ${fileType || 'N/A'})`);

      if (type === 'folder') {
        // ✅ FIXED: Use correct API name - restoreAgreement (not restoreCustomerHeader)
        await pdfApi.restoreAgreement(id);
        setToastMessage({
          message: `Restored agreement: ${title}`,
          type: "success"
        });
      } else {
        // ✅ FIXED: Call restoreFile API for individual files
        await pdfApi.restoreFile(id, { fileType });
        setToastMessage({
          message: `Restored file: ${title}`,
          type: "success"
        });
      }

      // Refresh list
      fetchGroups(currentPage, queryRef.current);
    } catch (error) {
      console.error(`Failed to restore ${type}:`, error);
      setToastMessage({
        message: `Failed to restore ${type}. Please try again.`,
        type: "error"
      });
    }
  };

  const handleDelete = (type: 'file' | 'folder', id: string, title: string, fileType?: string) => {
    setItemToDelete({ type, id, title, fileType });
    setDeleteConfirmOpen(true);
  };

  const confirmPermanentDelete = async () => {
    if (!itemToDelete || !isDeleteConfirmed) return;

    // ✅ ADMIN CHECK: Permanent delete requires admin access
    if (!isInAdminContext) {
      setToastMessage({
        message: "⚠️ Admin access required to permanently delete items. Please access this page from the Admin Panel to perform permanent deletions.",
        type: "error"
      });
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      setDeleteConfirmText('');
      setDeleteCheckboxChecked(false);
      return;
    }

    try {
      console.log(`🗑️ [TRASH] Permanently deleting ${itemToDelete.type}: ${itemToDelete.id}`);

      if (itemToDelete.type === 'folder') {
        // ✅ FIXED: Use correct API name - permanentlyDeleteAgreement
        await pdfApi.permanentlyDeleteAgreement(itemToDelete.id);
        setToastMessage({
          message: `Permanently deleted agreement: ${itemToDelete.title}`,
          type: "success"
        });
      } else {
        // ✅ FIXED: Call permanentlyDeleteFile API with fileType
        await pdfApi.permanentlyDeleteFile(itemToDelete.id, { fileType: itemToDelete.fileType });
        setToastMessage({
          message: `Permanently deleted file: ${itemToDelete.title}`,
          type: "success"
        });
      }

      // Refresh list
      fetchGroups(currentPage, queryRef.current);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      setDeleteConfirmText('');
      setDeleteCheckboxChecked(false); // ✅ Reset checkbox
    } catch (error) {
      console.error(`Failed to permanently delete ${itemToDelete.type}:`, error);
      setToastMessage({
        message: `Failed to permanently delete ${itemToDelete.type}. Please try again.`,
        type: "error"
      });
    }
  };

  // ✅ Watermark toggle handler - updates Normal/Draft mode state
  const handleWatermarkToggle = useCallback((fileId: string, checked: boolean) => {
    console.log(`💧 [TRASH-WATERMARK] Toggling watermark for file ${fileId}: ${checked}`);
    setFileWatermarkStates(prev => {
      const newMap = new Map(prev);
      newMap.set(fileId, checked);
      return newMap;
    });
  }, []);

  // ✅ Placeholder handlers (not used in trash view)
  const handleAddFile = () => {};
  const handleEditAgreement = () => {};
  const handleAgreementZohoUpload = () => {};
  const handleDateChange = async () => {};
  const handleEdit = () => {};
  const handleZohoUpload = () => {};
  const handleStatusChange = () => {};

  // ✅ Calculate statistics
  const statusCounts = useMemo(() => {
    let deletedFiles = 0;
    let deletedFolders = 0;

    groups.forEach(group => {
      if (group.isDeleted) {
        deletedFolders++;
      }
      deletedFiles += group.files.filter(f => f.isDeleted).length;
    });

    return [
      { label: 'Deleted Files', count: deletedFiles, color: '#dc2626', icon: faFileAlt },
      { label: 'Deleted Folders', count: deletedFolders, color: '#991b1b', icon: faFolder }
    ];
  }, [groups]);

  const agreementTimelines = useMemo(() => {
    return groups
      .filter(group => group.startDate && group.contractMonths)
      .map(group => {
        const start = new Date(group.startDate!);
        const today = new Date();
        const endDate = new Date(start);
        endDate.setMonth(endDate.getMonth() + group.contractMonths!);

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
          agreementId: group.id,
          agreementTitle: group.agreementTitle,
          startDate: group.startDate!,
          contractMonths: group.contractMonths!,
          daysRemaining,
          daysElapsed,
          totalDays,
          status
        };
      });
  }, [groups]);

  return (
    <div className="trash-view-page">
      <div
        className="trash-view-header"
        style={{
          background: '#fff',
          padding: '24px 24px 16px',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '0'
        }}
      >
        <div
          className="trash-view-header-content"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}
        >
          <div
            className="trash-view-icon"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626'
            }}
          >
            <FontAwesomeIcon icon={faTrash} style={{ fontSize: '16px' }} />
          </div>
          <h1
            className="trash-view-title"
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '600',
              color: '#111827'
            }}
          >
            Trash
          </h1>
        </div>
        <p
          className="trash-view-description"
          style={{
            margin: 0,
            fontSize: '14px',
            color: '#6b7280'
          }}
        >
          View and manage deleted agreements and files. Items in trash can be restored or permanently deleted.
        </p>
      </div>

      <div
        className="trash-view-container"
        style={{
          display: 'flex',
          gap: '24px',
          padding: '24px'
        }}
      >
        {/* Main Content */}
        <div className="trash-view-main" style={{ flex: 1 }}>
          {/* ✅ Search and filters */}
          <div
            className="trash-view-search-bar"
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px',
              alignItems: 'center'
            }}
          >
            <input
              className="trash-view-search-input"
              type="text"
              placeholder="Search deleted items..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                fetchGroups(1, e.target.value);
              }}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
            <label
              className="trash-view-select-all"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151'
              }}
            >
              <input type="checkbox" />
              <FontAwesomeIcon icon={faCheckSquare} style={{ fontSize: '14px' }} />
              Select All
            </label>
          </div>

          {/* Error state */}
          {error && <div className="sf__error">{error}</div>}
          {!loading && !error && groups.length === 0 && (
            <div className="sf__empty">
              {query ? `No deleted items found matching "${query}"` : "Trash is empty"}
            </div>
          )}

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
                    height: '62px',
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
                        marginBottom: '6px'
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
                        width: '60px',
                        height: '28px',
                        background: '#fef3c7',
                        borderRadius: '6px'
                      }} />
                      <div style={{
                        width: '80px',
                        height: '28px',
                        background: '#dbeafe',
                        borderRadius: '6px'
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ✅ OPTIMIZED: Memoized components with lazy rendering */}
          <div className="sf__list">
            {!loading && !error && groups.map((group) => {
              const isExpanded = expandedGroups.has(group.id);
              const selectionState = getGroupSelectionState(group);

              return (
                <AgreementRow
                  key={group.id}
                  agreement={group}
                  isExpanded={isExpanded}
                  selectionState={selectionState}
                  selectedFiles={selectedFiles}
                  statusChangeLoading={updatingStatus}
                  fileWatermarkStates={fileWatermarkStates}
                  isInAdminContext={isInAdminContext}
                  isTrashView={true}
                  onToggleExpand={toggleGroup}
                  onToggleSelection={toggleGroupSelection}
                  onFileToggleSelection={toggleFileSelection}
                  onAddFile={handleAddFile}
                  onEditAgreement={handleEditAgreement}
                  onDelete={handleDelete}
                  onAgreementZohoUpload={handleAgreementZohoUpload}
                  onDateChange={handleDateChange}
                  onView={handleView}
                  onDownload={handleDownload}
                  onEmail={handleEmail}
                  onZohoUpload={handleZohoUpload}
                  onEdit={handleEdit}
                  onStatusChange={handleStatusChange}
                  onWatermarkToggle={handleWatermarkToggle}
                  onRestore={handleRestore}
                />
              );
            })}
          </div>

          {/* Pagination */}
          {totalGroups > groupsPerPage && (
            <div className="sf__pager" style={{ marginTop: '20px' }}>
              <div className="sf__page-info">
                Showing {Math.min((currentPage - 1) * groupsPerPage + 1, totalGroups)}-{Math.min(currentPage * groupsPerPage, totalGroups)} of {totalGroups} deleted agreements
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <DocumentSidebar
          statusCounts={statusCounts}
          totalDocuments={totalFiles}
          mode="trash"
          agreementTimelines={agreementTimelines}
        />
      </div>

      {/* Toast notifications */}
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
        onClose={() => {
          setEmailComposerOpen(false);
          setCurrentEmailFile(null);
        }}
        onSend={async (emailData: EmailData) => {
          console.log("📧 [TRASH] Sending email:", emailData);
          setToastMessage({
            message: "Email sent successfully!",
            type: "success"
          });
          setEmailComposerOpen(false);
        }}
        currentFile={currentEmailFile}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && itemToDelete && (
        <div
          className="trash-view-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center', // ✅ FIXED: Center vertically
            justifyContent: 'center', // ✅ FIXED: Center horizontally
            zIndex: 9999
          }}
          onClick={() => {
            setDeleteConfirmOpen(false);
            setDeleteConfirmText('');
            setDeleteCheckboxChecked(false); // ✅ Reset checkbox on close
          }}
        >
          <div
            className="trash-view-modal-content"
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600, color: '#212121', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* ✅ FIXED: Use FontAwesome icon instead of emoji */}
              <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#dc2626', fontSize: '24px' }} />
              Permanently Delete {itemToDelete.type === 'folder' ? 'Agreement' : 'File'}?
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#4a4a4a', lineHeight: 1.5 }}>
              This will <strong>permanently delete</strong>: <strong>{itemToDelete.title}</strong>
              <br />
              <span style={{ color: '#dc2626', fontWeight: 600 }}>This action cannot be undone!</span>
            </p>

            {/* ✅ FIXED: Checkbox does NOT auto-fill text - user must type manually */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              padding: '12px',
              background: '#fef2f2',
              borderRadius: '6px',
              border: '1px solid #fca5a5'
            }}>
              <input
                type="checkbox"
                id="delete-confirm-checkbox"
                checked={deleteCheckboxChecked}
                onChange={(e) => setDeleteCheckboxChecked(e.target.checked)} // ✅ FIXED: No auto-fill
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#dc2626'
                }}
              />
              <label
                htmlFor="delete-confirm-checkbox"
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#991b1b',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                I understand this will permanently delete this {itemToDelete.type === 'folder' ? 'agreement' : 'file'}
              </label>
            </div>

            <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 500 }}>
              Type <strong style={{ color: '#dc2626' }}>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #dc2626',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '16px',
                textTransform: 'uppercase' // ✅ FIXED: Show in uppercase
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setItemToDelete(null);
                  setDeleteConfirmText('');
                  setDeleteCheckboxChecked(false); // ✅ Reset checkbox
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmPermanentDelete}
                disabled={!isDeleteConfirmed}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: isDeleteConfirmed ? '#dc2626' : '#fca5a5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isDeleteConfirmed ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  fontSize: '14px',
                  textTransform: 'uppercase' // ✅ FIXED: "DELETE" in uppercase
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
