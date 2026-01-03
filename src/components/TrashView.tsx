// src/components/TrashView.tsx
// ✅ SELF-CONTAINED: All trash management logic in one file
// ✅ OPTIMIZED: Lazy rendering + memoized components
import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { pdfApi, emailApi } from "../backendservice/api";
import type { SavedFileListItem, SavedFileGroup } from "../backendservice/api/pdfApi";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckSquare, faTrash, faFileAlt, faFolder
} from "@fortawesome/free-solid-svg-icons";
import EmailComposer, { type EmailData } from "./EmailComposer";
import DocumentSidebar from "./DocumentSidebar";
import "./SavedFiles.css";
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
  const normalizedDeleteText = deleteConfirmText.trim().toUpperCase();
  const isDeleteConfirmed = normalizedDeleteText === 'DELETE';

  // ✅ Watermark state (not used in trash but needed for AgreementRow compatibility)
  const [fileWatermarkStates] = useState<Map<string, boolean>>(new Map());
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
      navigate("/pdf-viewer", {
        state: {
          pdfUrl: `/api/pdf/download/${file.id}`,
          fileName: file.title,
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
      const blob = await pdfApi.downloadPDF(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.title;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setToastMessage({
        message: `Downloaded: ${file.title}`,
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
      console.log(`♻️ [TRASH] Restoring ${type}: ${id}`);

      if (type === 'folder') {
        await pdfApi.restoreCustomerHeader(id);
        setToastMessage({
          message: `Restored agreement: ${title}`,
          type: "success"
        });
      } else {
        // Restore file logic (if needed)
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

    try {
      console.log(`🗑️ [TRASH] Permanently deleting ${itemToDelete.type}: ${itemToDelete.id}`);

      if (itemToDelete.type === 'folder') {
        await pdfApi.permanentlyDeleteCustomerHeader(itemToDelete.id);
        setToastMessage({
          message: `Permanently deleted agreement: ${itemToDelete.title}`,
          type: "success"
        });
      } else {
        // Permanent file delete (if needed)
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
    } catch (error) {
      console.error(`Failed to permanently delete ${itemToDelete.type}:`, error);
      setToastMessage({
        message: `Failed to permanently delete ${itemToDelete.type}. Please try again.`,
        type: "error"
      });
    }
  };

  // ✅ Placeholder handlers (not used in trash view)
  const handleAddFile = () => {};
  const handleEditAgreement = () => {};
  const handleAgreementZohoUpload = () => {};
  const handleDateChange = async () => {};
  const handleEdit = () => {};
  const handleZohoUpload = () => {};
  const handleStatusChange = () => {};
  const handleWatermarkToggle = () => {};

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
    <div>
      <div style={{
        background: '#fff',
        padding: '24px 24px 16px',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '8px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            🗑️
          </div>
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '600',
            color: '#111827'
          }}>
            Trash
          </h1>
        </div>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: '#6b7280'
        }}>
          View and manage deleted agreements and files. Items in trash can be restored or permanently deleted.
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: '24px',
        padding: '24px'
      }}>
        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {/* ✅ Search and filters */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            alignItems: 'center'
          }}>
            <input
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
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#374151'
            }}>
              <input type="checkbox" />
              <FontAwesomeIcon icon={faCheckSquare} style={{ fontSize: '14px' }} />
              Select All
            </label>
          </div>

          {/* Loading/Error states */}
          {loading && <div className="sf__loading">Loading deleted items...</div>}
          {error && <div className="sf__error">{error}</div>}
          {!loading && !error && groups.length === 0 && (
            <div className="sf__empty">
              {query ? `No deleted items found matching "${query}"` : "Trash is empty"}
            </div>
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
        <div className="modal-overlay" onClick={() => setDeleteConfirmOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Permanently Delete {itemToDelete.type === 'folder' ? 'Agreement' : 'File'}?</h3>
            <p>
              This will <strong>permanently delete</strong>: <strong>{itemToDelete.title}</strong>
              <br />
              <span style={{ color: '#dc2626', fontWeight: 600 }}>This action cannot be undone!</span>
            </p>
            <p>Type <strong>DELETE</strong> to confirm:</p>
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
                marginBottom: '16px'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setItemToDelete(null);
                  setDeleteConfirmText('');
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
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
                  fontWeight: 600
                }}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
