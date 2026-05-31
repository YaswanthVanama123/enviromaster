import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
  faUser,
  faUsers,
  faFolder,
  faFolderOpen,
  faFileAlt,
  faSearch,
  faSync,
  faEye,
  faDownload,
  faCloudUploadAlt,
  faTasks,
  faEnvelope,
  faUserPlus,
  faEdit,
} from "@fortawesome/free-solid-svg-icons";
import { pdfApi, emailApi, manualUploadApi } from "../../backendservice/api";
import { userManagementApi } from "../../backendservice/api/userManagementApi";
import type { SavedFileGroup, SavedFileListItem } from "../../backendservice/api/pdfApi";
import type { UserListItem } from "../../backendservice/types/api.types";
import { Toast } from "./Toast";
import type { ToastType } from "./Toast";
import { ZohoUpload } from "../ZohoUpload";
import { BiginTaskModal } from "../BiginTaskModal";
import EmailComposer, { type EmailData } from "../EmailComposer";
import { emailTemplateApi } from "../../backendservice/api/emailTemplateApi";
import { getDocumentTypeForSavedFile } from "../../utils/savedFileDocumentType";

interface EmployeeWithAgreements {
  user: UserListItem;
  agreements: SavedFileGroup[];
  loading: boolean;
  loaded: boolean;
}

function timeAgo(iso: string) {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.max(1, Math.floor(diffMs / 1000));
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return `${day}d ago`;
  if (hr > 0) return `${hr}h ago`;
  if (min > 0) return `${min}m ago`;
  return `${sec}s ago`;
}

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: "Draft", color: "#6b7280", bg: "#f3f4f6" },
    saved: { label: "Saved", color: "#059669", bg: "#d1fae5" },
    pending_approval: { label: "Pending", color: "#d97706", bg: "#fef3c7" },
    approved_salesman: { label: "Approved", color: "#2563eb", bg: "#dbeafe" },
    approved_admin: { label: "Completed", color: "#059669", bg: "#d1fae5" },
    finalized: { label: "Finalized", color: "#7c3aed", bg: "#ede9fe" },
  };
  return configs[status] || { label: status, color: "#6b7280", bg: "#f3f4f6" };
};

const getFileTypeConfig = (fileType: string) => {
  const configs: Record<string, { label: string; color: string }> = {
    main_pdf: { label: "Main PDF", color: "#2563eb" },
    version_pdf: { label: "Version", color: "#7c3aed" },
    attached_pdf: { label: "Attached", color: "#059669" },
    version_log: { label: "Log", color: "#d97706" },
  };
  return configs[fileType] || { label: fileType, color: "#6b7280" };
};

export function EmployeeAgreements() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<EmployeeWithAgreements[]>([]);
  const [allAgreements, setAllAgreements] = useState<SavedFileGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [expandedAgreements, setExpandedAgreements] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [currentEmailFile, setCurrentEmailFile] = useState<SavedFileListItem | null>(null);
  const [defaultEmailTemplate, setDefaultEmailTemplate] = useState<{ subject: string; body: string } | null>(null);

  const [zohoUploadOpen, setZohoUploadOpen] = useState(false);
  const [currentZohoFile, setCurrentZohoFile] = useState<SavedFileListItem | null>(null);
  const [bulkZohoFiles, setBulkZohoFiles] = useState<SavedFileListItem[]>([]);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [currentTaskAgreement, setCurrentTaskAgreement] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const template = await emailTemplateApi.getActiveTemplate();
        setDefaultEmailTemplate({ subject: template.subject, body: template.body });
      } catch (err) {
        setDefaultEmailTemplate({
          subject: "Document from EnviroMaster",
          body: "Hello,\n\nPlease find the attached document.\n\nBest regards,\nEnviroMaster Team",
        });
      }
    };
    loadTemplate();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      
      const usersResponse = await userManagementApi.listUsers({ limit: 100 });
      const users = usersResponse.users || [];

      const agreementsResponse = await pdfApi.getSavedFilesGrouped(1, 500, {
        includeLogs: true,
        includeDrafts: true,
        isDeleted: false,
      });
      const agreements = agreementsResponse.groups || [];
      setAllAgreements(agreements);

      const employeeMap = new Map<string, EmployeeWithAgreements>();

      users.forEach((user) => {
        employeeMap.set(user.username, {
          user,
          agreements: [],
          loading: false,
          loaded: true,
        });
      });

      agreements.forEach((agreement) => {
        const creatorUsername = agreement.files[0]?.createdBy;
        if (creatorUsername) {
          const employee = employeeMap.get(creatorUsername);
          if (employee) {
            employee.agreements.push(agreement);
          }
          
        }
      });

      const employeeList = Array.from(employeeMap.values())
        .sort((a, b) => {
          
          if (b.agreements.length !== a.agreements.length) {
            return b.agreements.length - a.agreements.length;
          }
          
          const nameA = a.user.fullName || a.user.username;
          const nameB = b.user.fullName || b.user.username;
          return nameA.localeCompare(nameB);
        });

      setEmployees(employeeList);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setToastMessage({ message: "Failed to load data", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const query = searchQuery.toLowerCase();
    return employees.filter(
      (e) =>
        e.user.username.toLowerCase().includes(query) ||
        e.user.fullName?.toLowerCase().includes(query) ||
        e.agreements.some((a) => a.agreementTitle.toLowerCase().includes(query))
    );
  }, [employees, searchQuery]);

  const toggleEmployee = (username: string) => {
    setExpandedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(username)) {
        next.delete(username);
      } else {
        next.add(username);
      }
      return next;
    });
  };

  const toggleAgreement = (agreementId: string) => {
    setExpandedAgreements((prev) => {
      const next = new Set(prev);
      if (next.has(agreementId)) {
        next.delete(agreementId);
      } else {
        next.add(agreementId);
      }
      return next;
    });
  };

  const handleView = async (file: SavedFileListItem) => {
    let documentType: string;
    if (file.fileType === "main_pdf") documentType = "agreement";
    else if (file.fileType === "version_pdf") documentType = "version";
    else if (file.fileType === "version_log") documentType = "version-log";
    else if (file.fileType === "attached_pdf") documentType = "manual-upload";
    else documentType = "attached-file";

    navigate("/pdf-viewer", {
      state: {
        documentId: file.id,
        fileName: file.title,
        documentType,
        originalReturnPath: "/admin-panel/employee-agreements",
      },
    });
  };

  const handleDownload = async (file: SavedFileListItem) => {
    try {
      let blob: Blob;
      if (file.fileType === "main_pdf") {
        blob = await pdfApi.downloadPdf(file.id);
      } else if (file.fileType === "version_pdf") {
        blob = await pdfApi.downloadVersionPdf(file.id);
      } else if (file.fileType === "version_log") {
        blob = await pdfApi.downloadVersionLog(file.id);
      } else if (file.fileType === "attached_pdf") {
        blob = await manualUploadApi.downloadFile(file.id);
      } else {
        blob = await pdfApi.downloadAttachedFile(file.id);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.fileName || "document.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setToastMessage({ message: "Failed to download file", type: "error" });
    }
  };

  const handleEmail = (file: SavedFileListItem) => {
    setCurrentEmailFile(file);
    setEmailComposerOpen(true);
  };

  const handleZohoUpload = (file: SavedFileListItem) => {
    setCurrentZohoFile(file);
    setBulkZohoFiles([file]);
    setZohoUploadOpen(true);
  };

  const handleAgreementZohoUpload = (agreement: SavedFileGroup) => {
    const uploadableFiles = agreement.files.filter(
      (f) => f.hasPdf || f.fileType === "version_log" || f.fileType === "attached_pdf"
    );
    if (uploadableFiles.length === 0) {
      setToastMessage({ message: "No uploadable files in this agreement", type: "error" });
      return;
    }
    if (uploadableFiles.length === 1) {
      setCurrentZohoFile(uploadableFiles[0]);
      setBulkZohoFiles([uploadableFiles[0]]);
    } else {
      setCurrentZohoFile(null);
      setBulkZohoFiles(uploadableFiles);
    }
    setZohoUploadOpen(true);
  };

  const handleTaskCreate = (agreement: SavedFileGroup) => {
    setCurrentTaskAgreement({ id: agreement.id, title: agreement.agreementTitle });
    setTaskModalOpen(true);
  };

  return (
    <div style={{ padding: "24px" }}>
      {}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#374151", margin: "0 0 4px 0" }}>
            Employee Agreements
          </h2>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
            View agreements organized by employee
          </p>
        </div>
        <button
          onClick={fetchData}
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
          placeholder="Search employees or agreements..."
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
            style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "16px" }}
          >
            ×
          </button>
        )}
      </div>

      {}
      <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <FontAwesomeIcon icon={faUsers} style={{ color: "#c00000", fontSize: "18px" }} />
          <div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#374151" }}>{filteredEmployees.length}</div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Employees</div>
          </div>
        </div>
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <FontAwesomeIcon icon={faFolder} style={{ color: "#f59e0b", fontSize: "18px" }} />
          <div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#374151" }}>
              {filteredEmployees.reduce((sum, e) => sum + e.agreements.length, 0)}
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Agreements</div>
          </div>
        </div>
      </div>

      {}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px" }}>
          <FontAwesomeIcon icon={faSync} spin style={{ fontSize: "24px", color: "#c00000", marginBottom: "12px" }} />
          <span style={{ fontSize: "14px", color: "#6b7280" }}>Loading...</span>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px" }}>
          <FontAwesomeIcon icon={faUsers} style={{ fontSize: "40px", color: "#d1d5db", marginBottom: "12px" }} />
          <span style={{ fontSize: "16px", fontWeight: "600", color: "#374151" }}>
            {searchQuery ? "No Results" : "No Employees with Agreements"}
          </span>
          <span style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
            {searchQuery ? "Try a different search term" : "Agreements will appear here once created"}
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredEmployees.map((employee) => {
            const isExpanded = expandedEmployees.has(employee.user.username);
            return (
              <div
                key={employee.user.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                {}
                <div
                  onClick={() => toggleEmployee(employee.user.username)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "14px 16px",
                    cursor: "pointer",
                    gap: "12px",
                    background: isExpanded ? "#fafafa" : "#fff",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "22px",
                      background: employee.user.role === "admin" ? "#c00000" : "#2563eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: "700",
                      fontSize: "16px",
                    }}
                  >
                    {(employee.user.fullName || employee.user.username)[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "15px", color: "#374151" }}>
                      {employee.user.fullName || employee.user.username}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          background: "#f3f4f6",
                          padding: "2px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        @{employee.user.username}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          color: employee.user.role === "admin" ? "#c00000" : "#2563eb",
                          background: employee.user.role === "admin" ? "#fef2f2" : "#eff6ff",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          textTransform: "uppercase",
                        }}
                      >
                        {employee.user.role}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "#059669",
                          background: "#d1fae5",
                          padding: "2px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        {employee.agreements.length} agreement{employee.agreements.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <FontAwesomeIcon
                    icon={isExpanded ? faChevronDown : faChevronRight}
                    style={{ color: isExpanded ? "#c00000" : "#9ca3af", fontSize: "14px" }}
                  />
                </div>

                {}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid #e5e7eb", background: "#f8fafc" }}>
                    {employee.agreements.length === 0 ? (
                      <div style={{ padding: "20px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                        No agreements found
                      </div>
                    ) : (
                      employee.agreements.map((agreement) => {
                        const isAgreementExpanded = expandedAgreements.has(agreement.id);
                        const statusCfg = getStatusConfig(agreement.agreementStatus);
                        
                        const employeeFiles = agreement.files.filter(
                          (file) =>
                            file.createdBy === employee.user.username ||
                            file.createdBy === employee.user.fullName
                        );
                        const employeeFileCount = employeeFiles.length;
                        return (
                          <div key={agreement.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                            {}
                            <div
                              onClick={() => toggleAgreement(agreement.id)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                padding: "12px 16px 12px 32px",
                                cursor: "pointer",
                                gap: "10px",
                                background: isAgreementExpanded ? "#f1f5f9" : "transparent",
                              }}
                            >
                              <FontAwesomeIcon
                                icon={isAgreementExpanded ? faFolderOpen : faFolder}
                                style={{ color: "#f59e0b", fontSize: "16px" }}
                              />
                              <FontAwesomeIcon
                                icon={isAgreementExpanded ? faChevronDown : faChevronRight}
                                style={{ fontSize: "10px", color: "#6b7280" }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: "600",
                                    fontSize: "14px",
                                    color: "#374151",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {agreement.agreementTitle}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
                                  <span style={{ fontSize: "11px", color: "#6b7280" }}>
                                    {employeeFileCount} file{employeeFileCount !== 1 ? "s" : ""} · {timeAgo(agreement.latestUpdate)}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: "600",
                                      color: statusCfg.color,
                                      background: statusCfg.bg,
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    {statusCfg.label}
                                  </span>
                                </div>
                              </div>
                              {}
                              <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => {
                                    
                                    const uploadableFiles = employeeFiles.filter(
                                      (f) => f.hasPdf || f.fileType === "version_log" || f.fileType === "attached_pdf"
                                    );
                                    if (uploadableFiles.length === 0) {
                                      setToastMessage({ message: "No uploadable files from this employee", type: "error" });
                                      return;
                                    }
                                    if (uploadableFiles.length === 1) {
                                      setCurrentZohoFile(uploadableFiles[0]);
                                      setBulkZohoFiles([uploadableFiles[0]]);
                                    } else {
                                      setCurrentZohoFile(null);
                                      setBulkZohoFiles(uploadableFiles);
                                    }
                                    setZohoUploadOpen(true);
                                  }}
                                  title="Upload to Bigin"
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "6px",
                                    border: "1px solid #d1d5db",
                                    background: "#fff",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <FontAwesomeIcon icon={faCloudUploadAlt} style={{ fontSize: "12px", color: "#6b7280" }} />
                                </button>
                                <button
                                  onClick={() => handleTaskCreate(agreement)}
                                  title="Create Task"
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "6px",
                                    border: "1px solid #d1d5db",
                                    background: "#fff",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <FontAwesomeIcon icon={faTasks} style={{ fontSize: "12px", color: "#6b7280" }} />
                                </button>
                              </div>
                            </div>

                            {}
                            {isAgreementExpanded && (
                              <div style={{ background: "#fff" }}>
                                {employeeFiles.map((file) => {
                                  const fileTypeCfg = getFileTypeConfig(file.fileType);
                                  const fileStatusCfg = getStatusConfig(file.status);
                                  return (
                                    <div
                                      key={file.id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "10px 16px 10px 56px",
                                        gap: "10px",
                                        borderTop: "1px solid #f3f4f6",
                                      }}
                                    >
                                      <FontAwesomeIcon
                                        icon={faFileAlt}
                                        style={{ color: fileTypeCfg.color, fontSize: "14px" }}
                                      />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                          style={{
                                            fontSize: "13px",
                                            color: "#374151",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                          }}
                                        >
                                          {file.fileName || file.title}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                                          <span
                                            style={{
                                              fontSize: "10px",
                                              fontWeight: "600",
                                              color: fileTypeCfg.color,
                                            }}
                                          >
                                            {fileTypeCfg.label}
                                          </span>
                                          <span style={{ fontSize: "10px", color: "#9ca3af" }}>·</span>
                                          <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                                            {timeAgo(file.updatedAt)}
                                          </span>
                                          <span
                                            style={{
                                              fontSize: "9px",
                                              fontWeight: "600",
                                              color: fileStatusCfg.color,
                                              background: fileStatusCfg.bg,
                                              padding: "1px 5px",
                                              borderRadius: "3px",
                                            }}
                                          >
                                            {fileStatusCfg.label}
                                          </span>
                                        </div>
                                      </div>
                                      {}
                                      <div style={{ display: "flex", gap: "4px" }}>
                                        <button
                                          onClick={() => handleView(file)}
                                          title="View"
                                          disabled={!file.hasPdf && file.fileType !== "version_log"}
                                          style={{
                                            width: "26px",
                                            height: "26px",
                                            borderRadius: "5px",
                                            border: "1px solid #d1d5db",
                                            background: "#fff",
                                            cursor: file.hasPdf || file.fileType === "version_log" ? "pointer" : "not-allowed",
                                            opacity: file.hasPdf || file.fileType === "version_log" ? 1 : 0.4,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                          }}
                                        >
                                          <FontAwesomeIcon icon={faEye} style={{ fontSize: "11px", color: "#6b7280" }} />
                                        </button>
                                        <button
                                          onClick={() => handleDownload(file)}
                                          title="Download"
                                          disabled={!file.hasPdf && file.fileType !== "version_log"}
                                          style={{
                                            width: "26px",
                                            height: "26px",
                                            borderRadius: "5px",
                                            border: "1px solid #d1d5db",
                                            background: "#fff",
                                            cursor: file.hasPdf || file.fileType === "version_log" ? "pointer" : "not-allowed",
                                            opacity: file.hasPdf || file.fileType === "version_log" ? 1 : 0.4,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                          }}
                                        >
                                          <FontAwesomeIcon icon={faDownload} style={{ fontSize: "11px", color: "#6b7280" }} />
                                        </button>
                                        <button
                                          onClick={() => handleEmail(file)}
                                          title="Email"
                                          disabled={!file.hasPdf}
                                          style={{
                                            width: "26px",
                                            height: "26px",
                                            borderRadius: "5px",
                                            border: "1px solid #d1d5db",
                                            background: "#fff",
                                            cursor: file.hasPdf ? "pointer" : "not-allowed",
                                            opacity: file.hasPdf ? 1 : 0.4,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                          }}
                                        >
                                          <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: "11px", color: "#6b7280" }} />
                                        </button>
                                        <button
                                          onClick={() => handleZohoUpload(file)}
                                          title="Upload to Bigin"
                                          disabled={!file.hasPdf && file.fileType !== "version_log"}
                                          style={{
                                            width: "26px",
                                            height: "26px",
                                            borderRadius: "5px",
                                            border: "1px solid #d1d5db",
                                            background: "#fff",
                                            cursor: file.hasPdf || file.fileType === "version_log" ? "pointer" : "not-allowed",
                                            opacity: file.hasPdf || file.fileType === "version_log" ? 1 : 0.4,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                          }}
                                        >
                                          <FontAwesomeIcon icon={faCloudUploadAlt} style={{ fontSize: "11px", color: "#6b7280" }} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {}
      {toastMessage && (
        <Toast message={toastMessage.message} type={toastMessage.type} onClose={() => setToastMessage(null)} />
      )}

      {}
      {emailComposerOpen && currentEmailFile && (
        <EmailComposer
          isOpen={emailComposerOpen}
          onClose={() => {
            setEmailComposerOpen(false);
            setCurrentEmailFile(null);
          }}
          onSend={async (emailData: EmailData) => {
            const documentType = getDocumentTypeForSavedFile(currentEmailFile);
            await emailApi.sendEmailWithPdfById({
              to: emailData.to,
              subject: emailData.subject,
              body: emailData.body,
              documentId: currentEmailFile.id,
              fileName: currentEmailFile.title,
              documentType,
              watermark: emailData.attachment?.watermark || false,
            });
            setToastMessage({ message: "Email sent successfully!", type: "success" });
            setEmailComposerOpen(false);
            setCurrentEmailFile(null);
          }}
          attachment={{
            id: currentEmailFile.id,
            fileName: currentEmailFile.title,
            documentType: getDocumentTypeForSavedFile(currentEmailFile),
            watermark: false,
          }}
          defaultSubject={defaultEmailTemplate?.subject || `${currentEmailFile.title}`}
          defaultBody={defaultEmailTemplate?.body || `Please find the attached document.\n\nDocument: ${currentEmailFile.title}`}
        />
      )}

      {}
      {zohoUploadOpen && (
        <ZohoUpload
          agreementId={currentZohoFile?.agreementId || currentZohoFile?.id || bulkZohoFiles[0]?.agreementId || ""}
          agreementTitle={bulkZohoFiles.length > 1 ? `Bulk Upload - ${bulkZohoFiles.length} files` : currentZohoFile?.title || ""}
          bulkFiles={bulkZohoFiles.map((f) => ({
            id: f.id,
            fileName: f.fileName,
            title: f.title,
            fileType: f.fileType,
          }))}
          onClose={() => {
            setZohoUploadOpen(false);
            setCurrentZohoFile(null);
            setBulkZohoFiles([]);
          }}
          onSuccess={() => {
            setZohoUploadOpen(false);
            setCurrentZohoFile(null);
            setBulkZohoFiles([]);
            setToastMessage({ message: "Uploaded to Bigin successfully!", type: "success" });
          }}
        />
      )}

      {}
      {taskModalOpen && currentTaskAgreement && (
        <BiginTaskModal
          agreementId={currentTaskAgreement.id}
          agreementTitle={currentTaskAgreement.title}
          onClose={() => {
            setTaskModalOpen(false);
            setCurrentTaskAgreement(null);
          }}
          onSuccess={() => {
            setToastMessage({ message: "Task created in Bigin!", type: "success" });
          }}
        />
      )}
    </div>
  );
}
