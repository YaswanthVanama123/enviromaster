import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { pdfApi, emailApi } from "../backendservice/api";
import type { SavedFileListItem, SavedFileDetails, SavedFileGroup } from "../backendservice/api/pdfApi";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileAlt, faEye, faDownload, faEnvelope, faSave, faPencilAlt,
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

export default function SavedFiles() {
  // ✅ NEW: Use grouped data structure instead of flat files list
  const [groups, setGroups] = useState<SavedFileGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // ✅ NEW: Pagination state for groups
  const [currentPage, setCurrentPage] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [groupsPerPage] = useState(20);
  const [filesPerPage] = useState(20);

  // Search and sorting
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "status">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selection states - now per group and per file
  const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  // Email composer state
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [currentEmailFile, setCurrentEmailFile] = useState<SavedFileListItem | null>(null);

  // Zoho upload state
  const [zohoUploadOpen, setZohoUploadOpen] = useState(false);
  const [currentZohoFile, setCurrentZohoFile] = useState<SavedFileListItem | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Detect if we're in admin context
  const isInAdminContext = location.pathname.includes("/admin-panel");
  const returnPath = isInAdminContext ? "/admin-panel/saved-pdfs" : "/saved-pdfs";

  console.log("📍 SavedFiles context:", { isInAdminContext, returnPath, currentPath: location.pathname });

  // ✅ FIXED: Fetch grouped files AND draft-only agreements
  const fetchGroups = async (page = 1, search = "") => {
    setLoading(true);
    setError(null);
    try {
      console.log(`📁 [SAVED-FILES-GROUPED] Fetching page ${page} with search: "${search}"`);

      // 1. Fetch grouped files (agreements with PDFs)
      const groupedResponse = await pdfApi.getSavedFilesGrouped(page, groupsPerPage, {
        search: search.trim() || undefined
      });

      console.log(`📁 [SAVED-FILES-GROUPED] Loaded ${groupedResponse.groups.length} groups with PDFs`);

      // 2. ✅ NEW: Also fetch all customer headers to find draft-only agreements
      const headersResponse = await pdfApi.getCustomerHeaders();

      // Find draft agreements that don't appear in the grouped response (no PDFs)
      const groupedIds = new Set(groupedResponse.groups.map(g => g.id));
      const draftOnlyHeaders = headersResponse.items.filter(header =>
        !groupedIds.has(header._id) &&
        header.status === 'draft' &&
        // Apply search filter if provided
        (!search.trim() ||
         (header.payload?.headerTitle &&
          header.payload.headerTitle.toLowerCase().includes(search.trim().toLowerCase())))
      );

      // 3. ✅ NEW: Convert draft headers to SavedFileGroup format
      const draftGroups: SavedFileGroup[] = draftOnlyHeaders.map(header => ({
        id: header._id,
        agreementTitle: header.payload?.headerTitle || `Agreement ${header._id}`,
        fileCount: 0, // No PDFs yet
        latestUpdate: header.updatedAt,
        statuses: [header.status],
        hasUploads: false,
        files: [] // No files yet - this is the key issue we're fixing
      }));

      console.log(`📁 [DRAFT-ONLY] Found ${draftGroups.length} draft-only agreements`);

      // 4. ✅ NEW: Merge grouped files with draft-only agreements
      const allGroups = [...groupedResponse.groups, ...draftGroups];

      setGroups(allGroups);
      setTotalGroups(groupedResponse.totalGroups + draftGroups.length);
      setTotalFiles(groupedResponse.total);
      setCurrentPage(page);

      // Clear selection when changing pages/search
      setSelectedGroups({});
      setSelectedFiles({});
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

  // Initial load
  useEffect(() => {
    fetchGroups(1, query);
  }, []);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        fetchGroups(1, query);
      } else {
        // Reset to page 1 when searching
        fetchGroups(1, query);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  // ✅ CLIENT-SIDE SORTING: Sort current page groups
  const sortedGroups = useMemo(() => {
    let out = [...groups];

    // Sort by selected criteria
    out = out.sort((a, b) => {
      if (sortBy === "date") {
        // Sort by latest update date
        const dateA = new Date(a.latestUpdate).getTime();
        const dateB = new Date(b.latestUpdate).getTime();
        const order = dateB - dateA; // Default: newest first
        return sortDir === "desc" ? order : -order;
      } else {
        // Sort by most common status in group
        const statusA = a.statuses[0] || '';
        const statusB = b.statuses[0] || '';
        const order = statusA.localeCompare(statusB);
        return sortDir === "asc" ? order : -order;
      }
    });

    return out;
  }, [groups, sortBy, sortDir]);

  // ✅ FIXED: Flatten groups to get all files + create pseudo-files for draft-only agreements
  const sorted = useMemo(() => {
    const allFiles: SavedFileListItem[] = [];

    sortedGroups.forEach(group => {
      if (group.files.length > 0) {
        // Regular group with files
        allFiles.push(...group.files);
      } else {
        // ✅ NEW: Draft-only agreement with no files - create a pseudo-file for the table
        const pseudoFile: SavedFileListItem = {
          id: group.id, // Use agreement ID as file ID for editing
          fileName: `${group.agreementTitle}.pdf`,
          fileType: 'main_pdf' as const,
          title: group.agreementTitle,
          status: group.statuses[0] || 'draft',
          createdAt: group.latestUpdate,
          updatedAt: group.latestUpdate,
          createdBy: null,
          updatedBy: null,
          fileSize: 0,
          pdfStoredAt: null,
          hasPdf: false, // No PDF generated yet
          zohoInfo: {
            biginDealId: null,
            biginFileId: null,
            crmDealId: null,
            crmFileId: null,
          }
        };
        allFiles.push(pseudoFile);
      }
    });

    return allFiles;
  }, [sortedGroups]);

  // ✅ Selection helpers for backward compatibility
  const selected = useMemo(() => {
    const result: Record<string, boolean> = {};
    sorted.forEach(file => {
      result[file.id] = selectedFiles[file.id] || false;
    });
    return result;
  }, [sorted, selectedFiles]);

  const allSelected = useMemo(() => {
    return sorted.length > 0 && sorted.every(f => selected[f.id]);
  }, [sorted, selected]);

  const anySelected = useMemo(() => {
    return Object.values(selected).some(Boolean);
  }, [selected]);

  // ✅ NEW: Group expansion handlers
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

  // ✅ NEW: Selection helpers for groups and files
  const isGroupExpanded = (groupId: string) => expandedGroups.has(groupId);
  const isGroupSelected = (groupId: string) => selectedGroups[groupId] || false;
  const isFileSelected = (fileId: string) => selectedFiles[fileId] || false;

  function toggleSelectAll() {
    const next = { ...selectedFiles };
    const to = !allSelected;
    sorted.forEach((f) => (next[f.id] = to));
    setSelectedFiles(next);
  }

  function toggleRow(id: string) {
    setSelectedFiles((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // ✅ Status change with immediate UI update
  function changeStatus(id: string, next: FileStatus) {
    // Save to backend and refresh data
    saveStatusToBackend(id, next);
  }

  // ✅ Send for approval (batch operation)
  async function sendForApproval() {
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (ids.length === 0) return;

    try {
      setLoading(true);

      // Update all selected documents to pending_approval
      const updatePromises = ids.map(id =>
        pdfApi.updateDocumentStatus(id, "pending_approval")
      );

      await Promise.all(updatePromises);

      // Clear selection and refresh data
      setSelectedFiles({});

      setToastMessage({
        message: `Successfully sent ${ids.length} document${ids.length > 1 ? 's' : ''} for approval!`,
        type: "success"
      });

      // Refresh data from server
      fetchGroups(currentPage, query);
    } catch (err) {
      console.error("Error sending for approval:", err);
      setToastMessage({
        message: "Failed to update some documents. Please try again.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  }

  // ✅ NEW: View handler - Loads full details only when needed
  const handleView = async (file: SavedFileListItem) => {
    try {
      console.log(`👁️ [VIEW] Loading full details for file: ${file.id}`);

      // First try to get full details to ensure it exists and is accessible
      const response = await pdfApi.getSavedFileDetails(file.id);

      console.log(`👁️ [VIEW] Loaded ${response._metadata.payloadSize} bytes of payload data`);

      navigate("/pdf-viewer", {
        state: {
          documentId: file.id,
          fileName: file.title,
          originalReturnPath: returnPath,
          originalReturnState: null,
        },
      });
    } catch (err) {
      console.error("Error loading file details for view:", err);
      setToastMessage({
        message: "Unable to load this document. Please try again.",
        type: "error"
      });
    }
  };

  // ✅ Download handler (no changes needed - uses existing endpoint)
  const handleDownload = async (file: SavedFileListItem) => {
    try {
      setDownloadingId(file.id);

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
      console.error("Error downloading file:", err);
      setToastMessage({ message: "Unable to download this PDF. Please try again.", type: "error" });
    } finally {
      setDownloadingId(null);
    }
  };

  // ✅ Save status handler
  const saveStatusToBackend = async (id: string, status: FileStatus) => {
    try {
      setSavingStatusId(id);

      await pdfApi.updateDocumentStatus(id, status);
      console.log("Status updated successfully");
      setToastMessage({ message: "Status updated successfully!", type: "success" });

      // Refresh data to show updated status
      fetchGroups(currentPage, query);
    } catch (err) {
      console.error("Error updating status:", err);
      setToastMessage({ message: "Unable to update status. Please try again.", type: "error" });
    } finally {
      setSavingStatusId(null);
    }
  };

  // ✅ Email handler
  const handleEmail = (file: SavedFileListItem) => {
    setCurrentEmailFile(file);
    setEmailComposerOpen(true);
  };

  // ✅ Zoho upload handler
  const handleZohoUpload = (file: SavedFileListItem) => {
    // Only allow upload for files that have PDFs
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

  // ✅ Zoho upload success handler
  const handleZohoUploadSuccess = () => {
    setZohoUploadOpen(false);
    setCurrentZohoFile(null);

    // Refresh the files list to show updated Zoho status
    fetchGroups(currentPage, query);

    setToastMessage({
      message: "Successfully uploaded to Zoho Bigin!",
      type: "success"
    });
  };

  // ✅ Send email handler
  const handleSendEmail = async (emailData: EmailData) => {
    if (!currentEmailFile) return;

    try {
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

      // Close composer
      setEmailComposerOpen(false);
      setCurrentEmailFile(null);

    } catch (error) {
      console.error("Error sending email:", error);
      throw error; // Let EmailComposer handle the error display
    }
  };

  // ✅ Close email composer
  const handleCloseEmailComposer = () => {
    setEmailComposerOpen(false);
    setCurrentEmailFile(null);
  };

  // ✅ FIXED: Edit handler - Handles both regular files and draft-only agreements
  const handleEdit = async (file: SavedFileListItem) => {
    try {
      console.log(`✏️ [EDIT] Loading full details for file: ${file.id}`);

      // ✅ FIXED: Handle both regular files and draft-only pseudo-files
      let parentGroup: SavedFileGroup | undefined;
      let agreementId: string;

      if (!file.hasPdf && file.fileType === 'main_pdf') {
        // This is a draft-only pseudo-file - the file ID is the agreement ID
        parentGroup = groups.find(group => group.id === file.id);
        agreementId = file.id;
        console.log(`✏️ [EDIT] Draft-only agreement: ${agreementId}`);
      } else {
        // Regular file - find the group that contains this file
        parentGroup = groups.find(group =>
          group.files.some(f => f.id === file.id)
        );
        agreementId = parentGroup?.id || file.id;
        console.log(`✏️ [EDIT] Regular file, agreement: ${agreementId}`);
      }

      if (!parentGroup) {
        setToastMessage({
          message: "Cannot find agreement for this file.",
          type: "error"
        });
        return;
      }

      // Load full details to ensure all form data is available (for regular files)
      if (file.hasPdf) {
        const response = await pdfApi.getSavedFileDetails(file.id);
        console.log(`✏️ [EDIT] Loaded ${response._metadata.payloadSize} bytes of payload data for editing`);
      }

      console.log(`✏️ [EDIT] Editing agreement: ${agreementId} (was viewing file: ${file.id})`);

      // ✅ FIXED: Navigate using agreement ID, not file ID
      navigate(`/edit/pdf/${agreementId}`, {
        state: {
          editing: true,
          id: agreementId, // ✅ Use agreement ID, not file ID
          returnPath: returnPath,
          returnState: null,
        },
      });
    } catch (err) {
      console.error("Error loading file details for edit:", err);
      setToastMessage({
        message: "Unable to load this document for editing. Please try again.",
        type: "error"
      });
    }
  };

  // ✅ NEW: Pagination helpers
  const totalPages = Math.ceil(totalFiles / filesPerPage);
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePrevPage = () => {
    if (canGoPrev) {
      fetchGroups(currentPage - 1, query);
    }
  };

  const handleNextPage = () => {
    if (canGoNext) {
      fetchGroups(currentPage + 1, query);
    }
  };

  const handlePageClick = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      fetchGroups(page, query);
    }
  };

  return (
    <section className="sf">
      {/* <div className="sf__hero">Saved Files</div> */}

      <div className="sf__toolbar">
        <div className="sf__search">
          <input
            type="text"
            placeholder="Search files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="sf__actions">
          <button
            type="button"
            className="sf__btn sf__btn--light"
            onClick={() => {
              if (sortBy === "date") {
                setSortDir((d) => (d === "desc" ? "asc" : "desc"));
              } else {
                setSortBy("date");
                setSortDir("desc"); // Newest first when switching to date
              }
            }}
            style={sortBy === "date" ? { backgroundColor: "#3b82f6", color: "white" } : {}}
          >
            Sort by Date {sortBy === "date" && (sortDir === "desc" ? "↓" : "↑")}
          </button>

          <button
            type="button"
            className="sf__btn sf__btn--light"
            onClick={() => {
              if (sortBy === "status") {
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
              } else {
                setSortBy("status");
                setSortDir("asc");
              }
            }}
            style={sortBy === "status" ? { backgroundColor: "#3b82f6", color: "white" } : {}}
          >
            Sort by Status {sortBy === "status" && (sortDir === "asc" ? "↑" : "↓")}
          </button>

          <button
            type="button"
            className="sf__btn sf__btn--primary"
            disabled={!anySelected}
            onClick={sendForApproval}
          >
            Send for Approval
          </button>
        </div>
      </div>

      <div className="sf__tablewrap">
        <table className="sf__table">
          <thead>
            <tr>
              <th className="w-40">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>File Name</th>
              <th>Updated</th>
              <th className="w-220">Status</th>
              <th className="w-220">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="empty">
                  Loading files…
                </td>
              </tr>
            )}

            {!loading &&
              sorted.map((f) => (
                <tr key={f.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!selected[f.id]}
                      onChange={() => toggleRow(f.id)}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FontAwesomeIcon icon={faFileAlt} style={{ color: '#2563eb', fontSize: '18px' }} />
                      <span>{f.title}</span>
                      {f.hasPdf && (
                        <span style={{ fontSize: '12px', color: '#10b981', marginLeft: '4px' }}>
                          📎
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{timeAgo(f.updatedAt)}</td>
                  <td>
                    <select
                      className={`pill pill--${f.status}`}
                      value={f.status}
                      onChange={(e) =>
                        changeStatus(
                          f.id,
                          e.target.value as FileStatus
                        )
                      }
                    >
                      <option value="saved">Saved</option>
                      <option value="draft">Draft</option>
                      <option value="pending_approval">
                        Pending Approval
                      </option>
                      <option value="approved_salesman">
                        Approved by Salesman
                      </option>
                      <option value="approved_admin">
                        Approved by Admin
                      </option>
                    </select>
                  </td>
                  <td>
                    <div className="rowactions">
                      <button
                        className="iconbtn"
                        title="Edit"
                        type="button"
                        onClick={() => handleEdit(f)}
                      >
                        <FontAwesomeIcon icon={faPencilAlt} />
                      </button>
                      <button
                        className="iconbtn"
                        title="View"
                        type="button"
                        onClick={() => handleView(f)}
                        disabled={!f.hasPdf}
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button
                        className="iconbtn"
                        title="Download"
                        type="button"
                        onClick={() => handleDownload(f)}
                        disabled={downloadingId === f.id || !f.hasPdf}
                      >
                        {downloadingId === f.id ? "⏳" : <FontAwesomeIcon icon={faDownload} />}
                      </button>
                      <button
                        className="iconbtn"
                        title="Share via Email"
                        type="button"
                        onClick={() => handleEmail(f)}
                        disabled={!f.hasPdf}
                      >
                        <FontAwesomeIcon icon={faEnvelope} />
                      </button>
                      <button
                        className="iconbtn zoho-upload-btn"
                        title="Upload to Zoho Bigin"
                        type="button"
                        onClick={() => handleZohoUpload(f)}
                        disabled={!f.hasPdf}
                      >
                        <FontAwesomeIcon icon={faUpload} />
                      </button>
                      <button
                        className="iconbtn"
                        title="Status Auto-Saves"
                        type="button"
                        disabled
                      >
                        {savingStatusId === f.id ? "💾..." : <FontAwesomeIcon icon={faSave} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {!loading && !error && sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  {query ? `No files found matching "${query}"` : "No files found."}
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={5} className="empty">
                  {error}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ NEW: Enhanced Pagination with page info */}
      <div className="sf__pager">
        <div className="sf__page-info">
          Showing {Math.min((currentPage - 1) * filesPerPage + 1, totalFiles)}-{Math.min(currentPage * filesPerPage, totalFiles)} of {totalFiles} files
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
          <div className="sf__page-numbers">
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
        onClose={handleCloseEmailComposer}
        onSend={handleSendEmail}
        attachment={currentEmailFile ? {
          id: currentEmailFile.id,
          fileName: currentEmailFile.title,
          downloadUrl: pdfApi.getPdfDownloadUrl(currentEmailFile.id)
        } : undefined}
        defaultSubject={currentEmailFile ? `${currentEmailFile.title} - ${STATUS_LABEL[currentEmailFile.status as FileStatus]}` : ''}
        defaultBody={currentEmailFile ? `Hello,\n\nPlease find the customer header document attached.\n\nDocument: ${currentEmailFile.title}\nStatus: ${STATUS_LABEL[currentEmailFile.status as FileStatus]}\n\nBest regards` : ''}
        userEmail="" // TODO: Get from user login context
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
          onSuccess={handleZohoUploadSuccess}
        />
      )}
    </section>
  );
}
