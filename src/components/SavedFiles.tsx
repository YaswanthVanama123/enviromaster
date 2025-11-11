import { useMemo, useState } from "react";
import "./SavedFiles.css";

type FileStatus = "draft" | "in_progress" | "active" | "completed";

type SavedFile = {
  id: string;
  fileName: string;
  updatedAt: string;
  status: FileStatus;
};

type ApiResponse = {
  data: {
    items: SavedFile[];
    page: number;
    pageSize: number;
    total: number;
  };
  meta: {
    requestId: string;
    generatedAt: string;
  };
};

const initialPayload: ApiResponse = {
  data: {
    items: [
      { id: "fl_003", fileName: "Example File 3", updatedAt: "2025-11-09T07:30:00.000Z", status: "active" },
      { id: "fl_005", fileName: "Example File 5", updatedAt: "2025-11-05T07:30:00.000Z", status: "completed" },
      { id: "fl_001", fileName: "Example File 1", updatedAt: new Date().toISOString(), status: "draft" },
      { id: "fl_004", fileName: "Example File 4", updatedAt: "2025-11-09T04:30:00.000Z", status: "draft" },
      { id: "fl_002", fileName: "Example File 2", updatedAt: "2025-11-10T04:30:00.000Z", status: "in_progress" }
    ],
    page: 1,
    pageSize: 10,
    total: 5
  },
  meta: { requestId: "req_demo", generatedAt: new Date().toISOString() }
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
  in_progress: "In Progress",
  active: "Active",
  completed: "Completed",
};

export default function SavedFiles() {
  const [payload, setPayload] = useState<ApiResponse>(initialPayload);
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const files = payload.data.items;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = files.filter(f => f.fileName.toLowerCase().includes(q));
    out = out.sort((a, b) => {
      const order = STATUS_LABEL[a.status].localeCompare(STATUS_LABEL[b.status]);
      return sortDir === "asc" ? order : -order;
    });
    return out;
  }, [files, query, sortDir]);

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

  function changeStatus(id: string, next: FileStatus) {
    setPayload(prev => ({
      ...prev,
      data: {
        ...prev.data,
        items: prev.data.items.map(it => (it.id === id ? { ...it, status: next } : it)),
      },
    }));
  }

  function sendForApproval() {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (ids.length === 0) return;
    alert(`Send for approval:\n${ids.join(", ")}`);
  }

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
            onClick={() => setSortDir(d => (d === "asc" ? "desc" : "asc"))}
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
              <th className="w-180">Status</th>
              <th className="w-160">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
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
                    onChange={(e) => changeStatus(f.id, e.target.value as FileStatus)}
                  >
                    <option value="draft">Draft</option>
                    <option value="in_progress">In Progress</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </td>
                <td>
                  <div className="rowactions">
                    <button className="iconbtn" title="View">👁️</button>
                    <button className="iconbtn" title="Download">⬇️</button>
                    <button className="iconbtn" title="Share via Email">✉️</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">No files found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="sf__pager">
        <button type="button" className="sf__link" disabled>Previous</button>
        <span className="sf__page">1</span>
        <button type="button" className="sf__link" disabled>Next</button>
      </div>
    </section>
  );
}
