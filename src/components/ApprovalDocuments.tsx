import { useMemo, useState } from "react";
import "./ApprovalDocuments.css";

type DocStatus = "pending" | "changes_requested" | "approved";

type Document = {
  id: string;
  fileName: string;
  status: DocStatus;
};

const initialDocs: Document[] = [
  { id: "1", fileName: "Example File 1", status: "pending" },
  { id: "2", fileName: "Example File 2", status: "pending" },
  { id: "3", fileName: "Example File 3", status: "pending" },
  { id: "4", fileName: "Example File 4", status: "pending" },
  { id: "5", fileName: "Example File 5", status: "pending" },
];

const STATUS_LABEL: Record<DocStatus, string> = {
  pending: "Pending",
  changes_requested: "Changes Requested",
  approved: "Approved",
};

export default function ApprovalDocuments() {
  const [docs, setDocs] = useState<Document[]>(initialDocs);
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = docs.filter(d => d.fileName.toLowerCase().includes(q));
    out = out.sort((a, b) => {
      const order = STATUS_LABEL[a.status].localeCompare(STATUS_LABEL[b.status]);
      return sortDir === "asc" ? order : -order;
    });
    return out;
  }, [docs, query, sortDir]);

  const allSelected = filtered.length > 0 && filtered.every(f => selected[f.id]);
  const anySelected = Object.values(selected).some(Boolean);

  function toggleSelectAll() {
    const next = { ...selected };
    const to = !allSelected;
    filtered.forEach(f => (next[f.id] = to));
    setSelected(next);
  }

  function toggleRow(id: string) {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function changeStatus(id: string, status: DocStatus) {
    setDocs(prev => prev.map(doc => (doc.id === id ? { ...doc, status } : doc)));
  }

  function approveSelected() {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (!ids.length) return;
    alert(`Approved documents:\n${ids.join(", ")}`);
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
            onClick={() => setSortDir(d => (d === "asc" ? "desc" : "asc"))}
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
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              </th>
              <th>File Name</th>
              <th>Status</th>
              <th className="w-180">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc) => (
              <tr key={doc.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={!!selected[doc.id]}
                    onChange={() => toggleRow(doc.id)}
                  />
                </td>
                <td>{doc.fileName}</td>
                <td>
                  <select
                    className={`dropdown dropdown--${doc.status}`}
                    value={doc.status}
                    onChange={(e) => changeStatus(doc.id, e.target.value as DocStatus)}
                  >
                    <option value="pending">Pending</option>
                    <option value="changes_requested">Changes Requested</option>
                    <option value="approved">Approved</option>
                  </select>
                </td>
                <td>
                  <div className="rowactions">
                    <button className="iconbtn" title="View">👁️</button>
                    <button className="iconbtn" title="Download">⬇️</button>
                    <button className="iconbtn" title="Comment">💬</button>
                    <button className="iconbtn" title="Email">✉️</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">No documents found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ad__pager">
        <button className="ad__link" disabled>Previous</button>
        <span className="ad__page">1</span>
        <button className="ad__link" disabled>Next</button>
      </div>
    </section>
  );
}
