import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { HiDocumentText, HiDownload, HiMail, HiEye, HiSave } from "react-icons/hi";
import "./SavedFiles.css";

type FileStatus =
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
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved_salesman: "Approved by Salesman",
  approved_admin: "Approved by Admin",
};

export default function SavedFiles() {
  const [files, setFiles] = useState<SavedFile[]>([]);
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  const navigate = useNavigate();

  // ---- Fetch from backend on mount ----
  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          "http://localhost:5000/api/pdf/customer-headers",
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Failed with status ${res.status}`);
        }

        const data = await res.json();
        const items = data.items || [];

        const mapped: SavedFile[] = items.map((item: any) => ({
          id: item._id || item.id,
          fileName: item.payload?.headerTitle ?? "Untitled",
          updatedAt: item.updatedAt,
          status: item.status ?? "draft",
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
    out = out.sort((a, b) => {
      const order = STATUS_LABEL[a.status].localeCompare(
        STATUS_LABEL[b.status]
      );
      return sortDir === "asc" ? order : -order;
    });
    return out;
  }, [files, query, sortDir]);

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

  function sendForApproval() {
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (ids.length === 0) return;
    setToastMessage({ message: `Send for approval:\n${ids.join(", ")}`, type: "info" });
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

      const res = await fetch(
        `http://localhost:5000/api/pdf/viewer/download/${file.id}`,
        {
          method: "GET",
        }
      );

      if (!res.ok) {
        throw new Error(`Download failed with status ${res.status}`);
      }

      const blob = await res.blob();
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

      const res = await fetch(
        `http://localhost:5000/api/pdf/customer-headers/${id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            status: status,
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`Status update failed with status ${res.status}`);
      }

      const data = await res.json();
      console.log("Status updated successfully:", data);
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
    const subject = encodeURIComponent(
      `${file.fileName || "Customer Header Document"}`
    );
    const downloadUrl = `http://localhost:5000/api/pdf/viewer/download/${file.id}`;
    const body = encodeURIComponent(
      `Hello,\n\nPlease find the attached customer header document.\n\nDocument: ${file.fileName}\nStatus: ${STATUS_LABEL[file.status]}\n\nYou can download the PDF here:\n${downloadUrl}\n\nBest regards`
    );

    // Open email client with pre-filled content
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
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
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          >
            Sort by Status
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
                  <td>{f.fileName}</td>
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
                        title="View"
                        type="button"
                        onClick={() => handleView(f)}
                      >
                        <HiEye size={18} />
                      </button>
                      <button
                        className="iconbtn"
                        title="Download"
                        type="button"
                        onClick={() => handleDownload(f)}
                        disabled={downloadingId === f.id}
                      >
                        {downloadingId === f.id ? "⏳" : <HiDownload size={18} />}
                      </button>
                      <button
                        className="iconbtn"
                        title="Share via Email"
                        type="button"
                        onClick={() => handleEmail(f)}
                      >
                        <HiMail size={18} />
                      </button>
                      <button
                        className="iconbtn"
                        title="Status Auto-Saves"
                        type="button"
                        disabled
                      >
                        {savingStatusId === f.id ? "💾…" : <HiSave size={18} />}
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
    </section>
  );
}
