import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { pdfApi, emailApi } from "../backendservice/api";
import type { SavedFileListItem, SavedFileDetails } from "../backendservice/api/pdfApi";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileAlt, faEye, faDownload, faEnvelope, faSave, faPencilAlt } from "@fortawesome/free-solid-svg-icons";
import EmailComposer, { type EmailData } from "./EmailComposer";
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
  // ✅ NEW: Use lightweight list data structure
  const [files, setFiles] = useState<SavedFileListItem[]>([]);

  // ✅ NEW: Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  const [filesPerPage] = useState(20);

  // Search and sorting (client-side for current page)
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "status">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selection and loading states
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  // Email composer state
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [currentEmailFile, setCurrentEmailFile] = useState<SavedFileListItem | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Detect if we're in admin context
  const isInAdminContext = location.pathname.includes("/admin-panel");
  const returnPath = isInAdminContext ? "/admin-panel/saved-pdfs" : "/saved-pdfs";

  console.log("📍 SavedFiles context:", { isInAdminContext, returnPath, currentPath: location.pathname });

  // ✅ NEW: Fetch files using lightweight API with pagination
  const fetchFiles = async (page = 1, search = "") => {
    setLoading(true);
    setError(null);
    try {
      console.log(`📄 [SAVED-FILES] Fetching page ${page} with search: "${search}"`);

      const response = await pdfApi.getSavedFilesList(page, filesPerPage, {
        search: search.trim() || undefined
      });

      console.log(`📄 [SAVED-FILES] Loaded ${response.files.length} files (lightweight) from ${response.total} total`);

      setFiles(response.files);
      setTotalFiles(response.total);
      setCurrentPage(page);

      // Clear selection when changing pages/search
      setSelected({});
    } catch (err) {
      console.error("Error fetching saved files:", err);
      setError("Unable to load files. Please try again.");
      setFiles([]);
      setTotalFiles(0);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchFiles(1, query);
  }, []);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        fetchFiles(1, query);
      } else {
        // Reset to page 1 when searching
        fetchFiles(1, query);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  // ✅ CLIENT-SIDE SORTING: Sort current page results only
  const sorted = useMemo(() => {
    let out = [...files];

    // Sort by selected criteria
    out = out.sort((a, b) => {
      if (sortBy === "date") {
        // Sort by updatedAt date
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        const order = dateB - dateA; // Default: newest first
        return sortDir === "desc" ? order : -order;
      } else {
        // Sort by status
        const order = STATUS_LABEL[a.status as FileStatus].localeCompare(
          STATUS_LABEL[b.status as FileStatus]
        );
        return sortDir === "asc" ? order : -order;
      }
    });

    return out;
  }, [files, sortBy, sortDir]);

  // Selection helpers
  const allSelected = sorted.length > 0 && sorted.every((f) => selected[f.id]);
  const anySelected = Object.values(selected).some(Boolean);

  function toggleSelectAll() {
    const next = { ...selected };
    const to = !allSelected;
    sorted.forEach((f) => (next[f.id] = to));
    setSelected(next);
  }

  function toggleRow(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // ✅ Status change with immediate UI update
  function changeStatus(id: string, next: FileStatus) {
    // Update UI immediately
    setFiles((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: next } : it))
    );

    // Save to backend automatically
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

      // Update local state - change status for all selected documents
      setFiles(prevFiles =>
        prevFiles.map(file =>
          ids.includes(file.id)
            ? { ...file, status: "pending_approval" }
            : file
        )
      );

      // Clear selection
      setSelected({});

      setToastMessage({
        message: `Successfully sent ${ids.length} document${ids.length > 1 ? 's' : ''} for approval!`,
        type: "success"
      });
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

  // ✅ NEW: Edit handler - Loads full details only when needed
  const handleEdit = async (file: SavedFileListItem) => {
    try {
      console.log(`✏️ [EDIT] Loading full details for file: ${file.id}`);

      // Load full details to ensure all form data is available
      const response = await pdfApi.getSavedFileDetails(file.id);

      console.log(`✏️ [EDIT] Loaded ${response._metadata.payloadSize} bytes of payload data for editing`);

      navigate(`/edit/pdf/${file.id}`, {
        state: {
          editing: true,
          id: file.id,
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
      fetchFiles(currentPage - 1, query);
    }
  };

  const handleNextPage = () => {
    if (canGoNext) {
      fetchFiles(currentPage + 1, query);
    }
  };

  const handlePageClick = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      fetchFiles(page, query);
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
    </section>
  );
}
