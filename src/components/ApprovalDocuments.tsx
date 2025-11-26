import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../backendservice/hooks";
import "./ApprovalDocuments.css";

type FileStatus =
  | "draft"
  | "pending_approval"
  | "approved_salesman"
  | "approved_admin";

type Document = {
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
  zoho: Document["zoho"];
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

export default function ApprovalDocuments() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { isAuthenticated } = useAdminAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/admin-login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // ---- Fetch documents from backend on mount ----
  useEffect(() => {
    const fetchDocuments = async () => {
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

        // Map and filter for pending_approval status only
        const mapped: Document[] = items
          .map((item: any) => ({
            id: item._id || item.id,
            fileName: item.payload?.headerTitle ?? "Untitled",
            updatedAt: item.updatedAt,
            status: item.status ?? "draft",
            createdAt: item.createdAt,
            headerTitle: item.payload?.headerTitle,
            zoho: item.zoho,
          }))
          .filter((doc: Document) => doc.status === "pending_approval");

        setDocs(mapped);
      } catch (err) {
        console.error("Error fetching approval documents:", err);
        setError("Unable to load documents. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = docs.filter((d) => d.fileName.toLowerCase().includes(q));
    out = out.sort((a, b) => {
      const order = STATUS_LABEL[a.status].localeCompare(
        STATUS_LABEL[b.status]
      );
      return sortDir === "asc" ? order : -order;
    });
    return out;
  }, [docs, query, sortDir]);

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
    setDocs((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: next } : it))
    );

    // Save to backend automatically
    saveStatusToBackend(id, next);
  }

  function approveSelected() {
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (ids.length === 0) return;

    // Bulk approve: change all selected to approved_admin
    ids.forEach((id) => changeStatus(id, "approved_admin"));
    setSelected({});
  }

  // ---- View/Edit handler (eye icon) ----
  const handleView = (doc: Document) => {
    navigate("/form-filling", {
      state: {
        editing: true,
        id: doc.id,
      },
    });
  };

  // ---- Download handler ----
  const handleDownload = async (doc: Document) => {
    try {
      setDownloadingId(doc.id);

      const res = await fetch(
        `http://localhost:5000/api/pdf/viewer/download/${doc.id}`,
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
        (doc.fileName || "EnviroMaster_Document").replace(/[^\w\-]+/g, "_") +
        ".pdf";
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading file:", err);
      alert("Unable to download this PDF. Please try again.");
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

      // If status changed from pending_approval, remove from this view
      if (status !== "pending_approval") {
        setDocs((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Unable to update status. Please try again.");
    } finally {
      setSavingStatusId(null);
    }
  };

  // ---- Email handler ----
  const handleEmail = (doc: Document) => {
    const subject = encodeURIComponent(
      `${doc.fileName || "Customer Header Document"} - Approval Request`
    );
    const downloadUrl = `http://localhost:5000/api/pdf/viewer/download/${doc.id}`;
    const body = encodeURIComponent(
      `Hello,\n\nPlease review the following customer header document for approval.\n\nDocument: ${doc.fileName}\nStatus: ${STATUS_LABEL[doc.status]}\nUpdated: ${timeAgo(doc.updatedAt)}\n\nYou can download the PDF here:\n${downloadUrl}\n\nBest regards`
    );

    // Open email client with pre-filled content
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Show nothing while checking auth
  if (!isAuthenticated) {
    return null;
  }

  return (
    <section className="ad">
      <div className="ad__hero">Approval Documents</div>

      <div className="ad__breadcrumb">Admin Panel &gt; Approval Documents</div>

      <div className="ad__toolbar">
        <input
          type="text"
          className="ad__search"
          placeholder="🔍 Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="ad__actions">
          <button
            className="ad__btn ad__btn--light"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          >
            Sort by Status
          </button>
          <button
            className="ad__btn ad__btn--primary"
            disabled={!anySelected}
            onClick={approveSelected}
          >
            Approve Selected
          </button>
        </div>
      </div>

      <div className="ad__tablewrap">
        <table className="ad__table">
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
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="empty">
                  Loading documents…
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!selected[doc.id]}
                      onChange={() => toggleRow(doc.id)}
                    />
                  </td>
                  <td>{doc.fileName}</td>
                  <td>{timeAgo(doc.updatedAt)}</td>
                  <td>
                    <select
                      className={`dropdown dropdown--${doc.status}`}
                      value={doc.status}
                      onChange={(e) =>
                        changeStatus(doc.id, e.target.value as FileStatus)
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
                        onClick={() => handleView(doc)}
                      >
                        👁️
                      </button>
                      <button
                        className="iconbtn"
                        title="Download"
                        type="button"
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingId === doc.id}
                      >
                        {downloadingId === doc.id ? "⏳" : "⬇️"}
                      </button>
                      <button
                        className="iconbtn"
                        title="Email"
                        type="button"
                        onClick={() => handleEmail(doc)}
                      >
                        ✉️
                      </button>
                      <button
                        className="iconbtn"
                        title="Status Auto-Saves"
                        type="button"
                        disabled
                      >
                        {savingStatusId === doc.id ? "💾…" : "✓"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  No pending approval documents found.
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

      <div className="ad__pager">
        <button className="ad__link" disabled>
          Previous
        </button>
        <span className="ad__page">1</span>
        <button className="ad__link" disabled>
          Next
        </button>
      </div>
    </section>
  );
}
