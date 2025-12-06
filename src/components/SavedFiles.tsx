import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { pdfApi, emailApi } from "../backendservice/api";
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

type SavedFile = {
  id: string;
  fileName: string;
  updatedAt: string;
  status: FileStatus;

  createdAt?: string;
  headerTitle?: string;
  zoho?: {
    bigin: {
      dealId: string | null;
      fileId: string | null;
      url: string | null;
    };
    crm: {
      dealId: string | null;
      fileId: string | null;
      url: string | null;
    };
  };
};

type BackendItem = {
  id: string;
  headerTitle: string;
  status: FileStatus;
  createdAt: string;
  updatedAt: string;
  zoho: SavedFile["zoho"];
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

const STATUS_LABEL: Record<FileStatus, string> = {
  saved: "Saved",
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved_salesman: "Approved by Salesman",
  approved_admin: "Approved by Admin",
};

// Helper function to extract customer name from payload
function extractCustomerNameFromPayload(payload: any): string | null {
  if (!payload) return null;

  // Try customerName field first
  if (payload.customerName && payload.customerName.trim()) {
    return payload.customerName.trim();
  }

  // Fallback: search in headerRows for CUSTOMER NAME field
  const headerRows = payload.headerRows || [];
  for (const row of headerRows) {
    // Check left side
    if (row.labelLeft && row.labelLeft.toUpperCase().includes("CUSTOMER NAME")) {
      const name = row.valueLeft?.trim();
      if (name) return name;
    }
    // Check right side
    if (row.labelRight && row.labelRight.toUpperCase().includes("CUSTOMER NAME")) {
      const name = row.valueRight?.trim();
      if (name) return name;
    }
  }

  return null;
}

export default function SavedFiles() {
  const [files, setFiles] = useState<SavedFile[]>([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "status">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc"); // desc = newest first
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  // Email composer state
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [currentEmailFile, setCurrentEmailFile] = useState<SavedFile | null>(null);

  const navigate = useNavigate();

  // ---- Fetch from backend on mount ----
  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await pdfApi.getCustomerHeaders();
        const items = data.items || [];

        const mapped: SavedFile[] = items.map((item: any) => ({
          id: item._id || item.id,
          fileName: extractCustomerNameFromPayload(item.payload) || item.payload?.headerTitle || "Untitled",
          updatedAt: item.updatedAt,
          status: item.status ?? "saved", // Default to "saved" instead of "draft"
          createdAt: item.createdAt,
          headerTitle: item.payload?.headerTitle,
          zoho: item.zoho,
        }));

        setFiles(mapped);
      } catch (err) {
        console.error("Error fetching saved files:", err);
        setError("Unable to load files. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = files.filter((f) => f.fileName.toLowerCase().includes(q));

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
        const order = STATUS_LABEL[a.status].localeCompare(
          STATUS_LABEL[b.status]
        );
        return sortDir === "asc" ? order : -order;
      }
    });

    return out;
  }, [files, query, sortBy, sortDir]);

  const allSelected =
    filtered.length > 0 && filtered.every((f) => selected[f.id]);
  const anySelected = Object.values(selected).some(Boolean);

  function toggleSelectAll() {
    const next = { ...selected };
    const to = !allSelected;
    filtered.forEach((f) => (next[f.id] = to));
    setSelected(next);
  }

  function toggleRow(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function changeStatus(id: string, next: FileStatus) {
    // Update UI immediately
    setFiles((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: next } : it))
    );

    // Save to backend automatically
    saveStatusToBackend(id, next);
  }

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

  // ---- View handler (eye icon) ----
  const handleView = (file: SavedFile) => {
    navigate("/pdf-viewer", {
      state: {
        documentId: file.id,
        fileName: file.fileName,
      },
    });
  };

  // ---- Download handler ----
  const handleDownload = async (file: SavedFile) => {
    try {
      setDownloadingId(file.id);

      const blob = await pdfApi.downloadPdf(file.id);
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      const safeName =
        (file.fileName || "EnviroMaster_Document").replace(/[^\w\-]+/g, "_") +
        ".pdf";
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

  // ---- Save status handler ----
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

  const handleSaveStatus = async (file: SavedFile) => {
    // This function is now just for the save button (if needed)
    await saveStatusToBackend(file.id, file.status);
  };

  // ---- Email handler ----
  const handleEmail = (file: SavedFile) => {
    setCurrentEmailFile(file);
    setEmailComposerOpen(true);
  };

  // ---- Send email handler ----
  const handleSendEmail = async (emailData: EmailData) => {
    if (!currentEmailFile) return;

    try {
      await emailApi.sendEmailWithPdfById({
        to: emailData.to,
        from: emailData.from,
        subject: emailData.subject,
        body: emailData.body,
        documentId: currentEmailFile.id,
        fileName: currentEmailFile.fileName
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

  // ---- Close email composer ----
  const handleCloseEmailComposer = () => {
    setEmailComposerOpen(false);
    setCurrentEmailFile(null);
  };

  // ---- Edit handler ----
  const handleEdit = (file: SavedFile) => {
    navigate(`/edit/pdf/${file.id}`, {
      state: {
        editing: true,
        id: file.id,
        returnPath: "/saved-pdfs",
        returnState: null,
      },
    });
  };

  return (
    <section className="sf">
      {/* <div className="sf__hero">Saved Files</div> */}

      <div className="sf__toolbar">
        <div className="sf__search">
          <input
            type="text"
            placeholder="Search"
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
              filtered.map((f) => (
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
                      <span>{f.fileName}</span>
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
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button
                        className="iconbtn"
                        title="Download"
                        type="button"
                        onClick={() => handleDownload(f)}
                        disabled={downloadingId === f.id}
                      >
                        {downloadingId === f.id ? "⏳" : <FontAwesomeIcon icon={faDownload} />}
                      </button>
                      <button
                        className="iconbtn"
                        title="Share via Email"
                        type="button"
                        onClick={() => handleEmail(f)}
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

            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  No files found.
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

      <div className="sf__pager">
        <button type="button" className="sf__link" disabled>
          Previous
        </button>
        <span className="sf__page">1</span>
        <button type="button" className="sf__link" disabled>
          Next
        </button>
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
          fileName: currentEmailFile.fileName,
          downloadUrl: pdfApi.getPdfDownloadUrl(currentEmailFile.id)
        } : undefined}
        defaultSubject={currentEmailFile ? `${currentEmailFile.fileName} - ${STATUS_LABEL[currentEmailFile.status]}` : ''}
        defaultBody={currentEmailFile ? `Hello,\n\nPlease find the customer header document attached.\n\nDocument: ${currentEmailFile.fileName}\nStatus: ${STATUS_LABEL[currentEmailFile.status]}\n\nBest regards` : ''}
        userEmail="" // TODO: Get from user login context
      />
    </section>
  );
}
