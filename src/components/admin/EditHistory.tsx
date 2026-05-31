import { useState, useEffect, useCallback, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
  faFolder,
  faFolderOpen,
  faSearch,
  faSync,
  faUserPlus,
  faEdit,
  faCodeBranch,
  faPaperclip,
  faClock,
  faHistory
} from "@fortawesome/free-solid-svg-icons";
import { pdfApi, SavedFileGroup, SavedFileListItem } from "../../backendservice/api/pdfApi";

interface EditHistoryItem {
  id: string;
  timestamp: string;
  changedBy: string;
  action: 'created' | 'edited' | 'version_added' | 'attachment_added';
  fileName?: string;
  fileType?: string;
}

function formatTimestamp(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (diffDays === 0) return `Today at ${timeStr}`;
  if (diffDays === 1) return `Yesterday at ${timeStr}`;
  if (diffDays < 7) return `${diffDays} days ago at ${timeStr}`;

  return (
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }) + ` at ${timeStr}`
  );
}

function getActionConfig(action: EditHistoryItem["action"]): {
  icon: typeof faUserPlus;
  color: string;
  bg: string;
  label: string;
} {
  switch (action) {
    case "created":
      return { icon: faUserPlus, color: "#16a34a", bg: "#dcfce7", label: "Created agreement" };
    case "edited":
      return { icon: faEdit, color: "#2563eb", bg: "#dbeafe", label: "Edited agreement" };
    case "version_added":
      return { icon: faCodeBranch, color: "#7c3aed", bg: "#f3e8ff", label: "Added new version" };
    case "attachment_added":
      return { icon: faPaperclip, color: "#ea580c", bg: "#fff7ed", label: "Added attachment" };
    default:
      return { icon: faClock, color: "#6b7280", bg: "#f3f4f6", label: "Modified" };
  }
}

function buildEditHistory(agreement: SavedFileGroup): EditHistoryItem[] {
  const history: EditHistoryItem[] = [];

  const sortedByCreation = [...agreement.files].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  if (sortedByCreation.length > 0) {
    const firstFile = sortedByCreation[0];
    history.push({
      id: `${firstFile.id}-created`,
      timestamp: firstFile.createdAt,
      changedBy: firstFile.createdBy || "Unknown",
      action: "created",
      fileName: firstFile.title || firstFile.fileName,
    });
  }

  agreement.files.forEach((file) => {
    
    if (file.updatedAt && file.updatedAt !== file.createdAt && file.updatedBy) {
      history.push({
        id: `${file.id}-edited-${file.updatedAt}`,
        timestamp: file.updatedAt,
        changedBy: file.updatedBy,
        action: "edited",
        fileName: file.title || file.fileName,
        fileType: file.fileType,
      });
    }

    if (file.fileType === "version_pdf" && file.createdBy) {
      const firstFileTime = sortedByCreation[0]?.createdAt;
      if (firstFileTime && file.createdAt !== firstFileTime) {
        history.push({
          id: `${file.id}-version`,
          timestamp: file.createdAt,
          changedBy: file.createdBy,
          action: "version_added",
          fileName: `Version ${file.versionNumber || ""}`,
        });
      }
    }

    if (file.fileType === "attached_pdf" && file.createdBy) {
      history.push({
        id: `${file.id}-attached`,
        timestamp: file.createdAt,
        changedBy: file.createdBy,
        action: "attachment_added",
        fileName: file.title || file.fileName,
      });
    }
  });

  return history.sort((a, b) => {
    if (a.action === "created") return 1;
    if (b.action === "created") return -1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

interface AgreementHistoryCardProps {
  agreement: SavedFileGroup;
}

function AgreementHistoryCard({ agreement }: AgreementHistoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const history = useMemo(() => buildEditHistory(agreement), [agreement]);

  const creationEntry = history.find((h) => h.action === "created");
  const createdBy = creationEntry?.changedBy || "Unknown";
  const editCount = history.filter((h) => h.action !== "created").length;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        marginBottom: "10px",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      {}
      <div
        onClick={() => setExpanded((p) => !p)}
        style={{
          display: "flex",
          alignItems: "flex-start",
          padding: "14px 16px",
          cursor: "pointer",
          gap: "12px",
          background: expanded ? "#fafafa" : "#fff",
          transition: "background 0.15s",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            background: expanded ? "#fecaca" : "#fee2e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <FontAwesomeIcon
            icon={expanded ? faFolderOpen : faFolder}
            style={{ color: "#c00000", fontSize: "18px" }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: "600",
              fontSize: "15px",
              color: "#374151",
              marginBottom: "6px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {agreement.agreementTitle}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span
              style={{
                background: "#dcfce7",
                color: "#16a34a",
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <FontAwesomeIcon icon={faUserPlus} style={{ fontSize: "9px" }} />
              Created by {createdBy}
            </span>
            {editCount > 0 && (
              <span
                style={{
                  background: "#dbeafe",
                  color: "#2563eb",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: "600",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <FontAwesomeIcon icon={faEdit} style={{ fontSize: "9px" }} />
                {editCount} edit{editCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <FontAwesomeIcon
          icon={expanded ? faChevronDown : faChevronRight}
          style={{
            color: expanded ? "#c00000" : "#9ca3af",
            fontSize: "14px",
            marginTop: "4px",
          }}
        />
      </div>

      {}
      {expanded && (
        <div
          style={{
            background: "#f8fafc",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          {}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 16px",
              borderBottom: "1px solid #e5e7eb",
              background: "#f1f5f9",
            }}
          >
            <FontAwesomeIcon icon={faHistory} style={{ color: "#6b7280", fontSize: "12px" }} />
            <span
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Edit History
            </span>
          </div>

          {}
          {history.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: "13px",
              }}
            >
              No edit history available
            </div>
          ) : (
            <div style={{ padding: "12px 16px" }}>
              {history.map((item, idx) => {
                const config = getActionConfig(item.action);
                const isLast = idx === history.length - 1;

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      gap: "12px",
                      position: "relative",
                    }}
                  >
                    {}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        width: "28px",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "14px",
                          background: config.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <FontAwesomeIcon
                          icon={config.icon}
                          style={{ color: config.color, fontSize: "11px" }}
                        />
                      </div>
                      {!isLast && (
                        <div
                          style={{
                            width: "2px",
                            flex: 1,
                            background: "#e5e7eb",
                            minHeight: "20px",
                          }}
                        />
                      )}
                    </div>

                    {}
                    <div style={{ flex: 1, paddingBottom: isLast ? "0" : "16px" }}>
                      <div
                        style={{
                          fontWeight: "600",
                          fontSize: "13px",
                          color: "#374151",
                          marginBottom: "2px",
                        }}
                      >
                        {config.label}
                      </div>
                      {item.fileName && item.action !== "created" && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#6b7280",
                            marginBottom: "4px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.fileName}
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#c00000",
                          }}
                        >
                          {item.changedBy}
                        </span>
                        <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EditHistory() {
  const [agreements, setAgreements] = useState<SavedFileGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAgreements = useCallback(async () => {
    setLoading(true);
    try {
      const result = await pdfApi.getSavedFilesGrouped(1, 100, {
        includeDrafts: true,
        includeLogs: true,
      });
      if (result?.groups) {
        setAgreements(result.groups);
      }
    } catch (err) {
      console.error("Failed to fetch agreements:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgreements();
  }, [fetchAgreements]);

  const filteredAgreements = useMemo(
    () =>
      agreements.filter((a) =>
        a.agreementTitle.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [agreements, searchQuery]
  );

  return (
    <div style={{ padding: "24px" }}>
      {}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#374151",
              margin: "0 0 4px 0",
            }}
          >
            Edit History
          </h2>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
            Track all agreement changes and modifications
          </p>
        </div>
        <button
          onClick={fetchAgreements}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            background: "#fff",
            color: "#374151",
            fontSize: "13px",
            fontWeight: "500",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <FontAwesomeIcon icon={faSync} spin={loading} style={{ fontSize: "12px" }} />
          Refresh
        </button>
      </div>

      {}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 14px",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          marginBottom: "16px",
        }}
      >
        <FontAwesomeIcon icon={faSearch} style={{ color: "#9ca3af", fontSize: "14px" }} />
        <input
          type="text"
          placeholder="Search agreements..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            fontSize: "14px",
            color: "#374151",
            background: "transparent",
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            ×
          </button>
        )}
      </div>

      {}
      <div
        style={{
          fontSize: "13px",
          color: "#6b7280",
          marginBottom: "12px",
          fontWeight: "500",
        }}
      >
        {filteredAgreements.length} agreement{filteredAgreements.length !== 1 ? "s" : ""}
      </div>

      {}
      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 20px",
            color: "#6b7280",
          }}
        >
          <FontAwesomeIcon
            icon={faSync}
            spin
            style={{ fontSize: "24px", color: "#c00000", marginBottom: "12px" }}
          />
          <span style={{ fontSize: "14px" }}>Loading history...</span>
        </div>
      ) : filteredAgreements.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 20px",
            color: "#6b7280",
          }}
        >
          <FontAwesomeIcon
            icon={faHistory}
            style={{ fontSize: "40px", color: "#d1d5db", marginBottom: "12px" }}
          />
          <span style={{ fontSize: "16px", fontWeight: "600", color: "#374151" }}>
            {searchQuery ? "No Results" : "No Agreements"}
          </span>
          <span style={{ fontSize: "13px", marginTop: "4px" }}>
            {searchQuery ? "Try a different search term" : "Agreement history will appear here"}
          </span>
        </div>
      ) : (
        <div>
          {filteredAgreements.map((agreement) => (
            <AgreementHistoryCard key={agreement.id} agreement={agreement} />
          ))}
        </div>
      )}
    </div>
  );
}
