import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAdminAuth, useAdminAuthGuard } from "../backendservice/hooks";
import { pdfApi, manualUploadApi } from "../backendservice/api";
import type { SavedFileGroup, SavedFileListItem } from "../backendservice/api/pdfApi";
import SavedFilesAgreements from "./SavedFilesAgreements";
import { AdminDashboard } from "./admin/AdminDashboard";
import ManualUploads from "./ManualUploads";
import ApprovalDocuments from "./ApprovalDocuments";
import EmailTemplateManager from "./admin/EmailTemplateManager";
import ServiceAgreementTemplateManager from "./admin/ServiceAgreementTemplateManager";
import AgreementTimelineBadge from "./AgreementTimelineBadge";
import TrashView from "./TrashView";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileAlt,
  faSearch,
  faUpload,
  faDownload,
  faSignOutAlt,
  faChevronDown,
  faBriefcase,
  faEye,
  faDollarSign,
  faFolder,
  faFolderOpen,
  faChevronRight,
  faEnvelope,
  faTrash,
  faFileContract
} from "@fortawesome/free-solid-svg-icons";
import "./AdminPanel.css";

type TabType = "dashboard" | "saved-pdfs" | "approval-documents" | "pricing-details" | "email-template" | "service-agreement-template" | "trash";

type FileStatus = "draft" | "pending_approval" | "approved_salesman" | "approved_admin";

interface Document {
  id: string;
  name: string;
  uploadedOn: string;
  status: FileStatus;
  createdAt?: string;
  updatedAt: string;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { tab, subtab, modalType, itemId } = useParams<{
    tab: string;
    subtab: string;
    modalType: string;
    itemId: string;
  }>();
  const { isAuthenticated, user, logout } = useAdminAuth();
  const isNavigatingRef = useRef(false);

  useAdminAuthGuard();

  const getSubtabFromUrl = (): string | undefined => {
    const path = window.location.pathname;
    if (path.includes('/admin-panel/') && path.includes('/services/')) {
      return 'services';
    }
    if (path.includes('/admin-panel/') && path.includes('/products/')) {
      return 'products';
    }
    return subtab;
  };

  const currentSubtab = getSubtabFromUrl();

  const getActiveTabFromUrl = (): TabType => {
    if (!tab) return "dashboard";

    const validTabs: TabType[] = ["dashboard", "saved-pdfs", "approval-documents", "pricing-details", "email-template", "service-agreement-template", "trash"];
    return validTabs.includes(tab as TabType) ? (tab as TabType) : "dashboard";
  };

  const [activeTab, setActiveTab] = useState<TabType>(getActiveTabFromUrl());
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [recentAgreements, setRecentAgreements] = useState<SavedFileGroup[]>([]);
  const [expandedAgreements, setExpandedAgreements] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [lastUploadDate, setLastUploadDate] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [dashboardStats, setDashboardStats] = useState({
    manualUploads: 0,
    savedDocuments: 0,
    totalDocuments: 0
  });

  const [pieTimeFilter, setPieTimeFilter] = useState("This Month");
  const [selectedDateFrom, setSelectedDateFrom] = useState<Date | null>(null);
  const [selectedDateTo, setSelectedDateTo] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pieCounts, setPieCounts] = useState({
    done: 0,
    pending: 0,
    saved: 0,
    drafts: 0,
    total: 0
  });

  const pieData = useMemo(() => {
    const totalFromCounts = pieCounts.total || pieCounts.done + pieCounts.pending + pieCounts.saved + pieCounts.drafts;
    const total = totalFromCounts;
    return {
      done: pieCounts.done,
      pending: pieCounts.pending,
      saved: pieCounts.saved,
      drafts: pieCounts.drafts,
      total,
      donePercent: total > 0 ? (pieCounts.done / total) * 100 : 0,
      pendingPercent: total > 0 ? (pieCounts.pending / total) * 100 : 0,
      savedPercent: total > 0 ? (pieCounts.saved / total) * 100 : 0,
      draftsPercent: total > 0 ? (pieCounts.drafts / total) * 100 : 0,
    };
  }, [pieCounts]);

  useEffect(() => {
    const urlTab = getActiveTabFromUrl();
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [tab]);

  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab);
    navigate(`/admin-panel/${newTab}`, { replace: true });
  };

  const fetchPieStatusCounts = useCallback(async () => {
    if (activeTab !== "dashboard") {
      console.log(`⏭️ [ADMIN-PANEL] Skipping pie chart API call - active tab is: ${activeTab}`);
      return;
    }

    if (pieTimeFilter === "Date Range" && (!selectedDateFrom || !selectedDateTo)) {
      return;
    }

    const periodMap: Record<string, string> = {
      "This Week": "this_week",
      "This Month": "this_month",
      "This Year": "this_year",
      "Date Range": "date_range"
    };

    const period = periodMap[pieTimeFilter] || "this_month";
    const params: { period?: string; from?: string; to?: string } = { period };

    if (period === "date_range") {
      if (selectedDateFrom) params.from = selectedDateFrom.toISOString();
      if (selectedDateTo) params.to = selectedDateTo.toISOString();
      if (!params.from || !params.to) {
        return;
      }
    }

    try {
      const response = await pdfApi.getDashboardStatusCounts(params);
      setPieCounts(response.counts || {
        done: 0,
        pending: 0,
        saved: 0,
        drafts: 0,
        total: 0
      });
    } catch (err) {
      console.error("Error fetching pie status counts:", err);
    }
  }, [activeTab, pieTimeFilter, selectedDateFrom, selectedDateTo]);

  useEffect(() => {
    fetchPieStatusCounts();
  }, [fetchPieStatusCounts]);

  useEffect(() => {
    const globalNav = document.querySelector('nav');
    const header = document.querySelector('header');
    const topBar = document.querySelector('.top-bar');
    const mainHeader = document.querySelector('.main-header');

    if (globalNav) {
      (globalNav as HTMLElement).style.display = 'none';
    }
    if (header) {
      (header as HTMLElement).style.display = 'none';
    }
    if (topBar) {
      (topBar as HTMLElement).style.display = 'none';
    }
    if (mainHeader) {
      (mainHeader as HTMLElement).style.display = 'none';
    }

    return () => {
      if (globalNav) {
        (globalNav as HTMLElement).style.display = '';
      }
      if (header) {
        (header as HTMLElement).style.display = '';
      }
      if (topBar) {
        (topBar as HTMLElement).style.display = '';
      }
      if (mainHeader) {
        (mainHeader as HTMLElement).style.display = '';
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "dashboard") {
      console.log(`⏭️ [ADMIN-PANEL] Skipping dashboard API call - active tab is: ${activeTab}`);
      return;
    }

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        console.log("📊 [ADMIN-PANEL] Fetching dashboard data...");

        const dashboardData = await pdfApi.getAdminDashboardData();

        const groupedData = await pdfApi.getSavedFilesGrouped(1, 10, {
          includeLogs: true,
          isDeleted: false,
          includeDrafts: true
        });
        setRecentAgreements(groupedData.groups || []);

        const recentDocs: Document[] = groupedData.groups
          .flatMap(group =>
            group.files.map(file => ({
              id: file.id,
              name: file.title || group.agreementTitle,
              uploadedOn: new Date(file.createdAt).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              }),
              status: file.status,
              createdAt: file.createdAt,
              updatedAt: file.updatedAt || file.createdAt,
            }))
          )
          .slice(0, 10);

        setDocuments(recentDocs);

        setUploadCount(dashboardData.stats.manualUploads);
        setDashboardStats(dashboardData.stats);

        if (recentDocs.length > 0) {
          setLastUploadDate(recentDocs[0].createdAt);
        } else {
          setLastUploadDate(new Date().toISOString());
        }

        console.log("✅ Dashboard data loaded:", {
          documents: recentDocs.length,
          recentAgreements: groupedData.groups?.length || 0,
          stats: dashboardData.stats,
          documentStatus: dashboardData.documentStatus
        });

      } catch (err) {
        console.error("❌ [ADMIN-PANEL] Error fetching dashboard data:", err);

        setDocuments([]);
        setRecentAgreements([]);
        setDashboardStats({
          manualUploads: 0,
          savedDocuments: 0,
          totalDocuments: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [activeTab]);

  useEffect(() => {
    if (!isAuthenticated && !isNavigatingRef.current) {
      isNavigatingRef.current = true;
      navigate("/admin-login", { replace: true });
    } else if (isAuthenticated) {
      isNavigatingRef.current = false;
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  const canAccessFile = useCallback((file: SavedFileListItem) => {
    return file.hasPdf || file.fileType === 'version_log' || file.fileType === 'attached_pdf';
  }, []);

  const handleDownload = async (docId: string, fileName: string, fileType?: string) => {
    try {
      let blob: Blob;
      if (fileType === 'version_log') {
        blob = await pdfApi.downloadVersionLog(docId);
      } else if (fileType === 'attached_pdf') {
        blob = await pdfApi.downloadAttachedFile(docId);
      } else if (fileType === 'version_pdf') {
        blob = await pdfApi.downloadVersionPdf(docId);
      } else {
        blob = await pdfApi.downloadPdf(docId);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (fileName || "Document").replace(/[^\w\-]+/g, "_") + ".pdf";
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading file:", err);
      alert("Unable to download this PDF. Please try again.");
    }
  };

  const handleViewPDF = (docId: string, fileName: string, docType?: string) => {
    const adminReturnPath = `/admin-panel/${activeTab}`;

    let documentType: 'agreement' | 'manual-upload' | 'attached-file' | 'version' | undefined = undefined;

    if (docType === 'agreement' || docType === 'main_pdf') {
      documentType = 'agreement';
    } else if (docType === 'manual-upload') {
      documentType = 'manual-upload';
    } else if (docType === 'attached-file' || docType === 'attached_pdf') {
      documentType = 'attached-file';
    } else if (docType === 'version_log') {
      documentType = 'version-log';
    } else if (docType === 'version_pdf') {
      documentType = 'version';
    }

    console.log(`📄 [ADMIN-VIEW] Viewing document ${docId} (detected type: ${documentType || 'auto-detect'})`);

    navigate("/pdf-viewer", {
      state: {
        documentId: docId,
        fileName: fileName,
        documentType: documentType,
        originalReturnPath: adminReturnPath,
        originalReturnState: null,
      },
    });

    console.log("📍 Admin Panel: Navigating to PDF viewer with return path:", adminReturnPath);
  };

  const handleLogout = () => {
    if (logout) {
      logout();
      navigate("/admin-login", { replace: true });
    }
  };

  const toggleAgreement = (agreementId: string) => {
    setExpandedAgreements(prev => {
      const next = new Set(prev);
      if (next.has(agreementId)) {
        next.delete(agreementId);
      } else {
        next.add(agreementId);
      }
      return next;
    });
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

  const formatUploadDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Dashboard";
      case "saved-pdfs":
        return "Saved PDFs";
      case "approval-documents":
        return "Approval Documents";
      case "pricing-details":
        return "Pricing Details";
      case "email-template":
        return "Email Template";
      case "service-agreement-template":
        return "Service Agreement Template";
      case "trash":
        return "Trash";
      default:
        return "Dashboard";
    }
  };

  const handlePieTimeFilterChange = (value: string) => {
    setPieTimeFilter(value);
    if (value === "Date Range") {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(false);
      setSelectedDateFrom(null);
      setSelectedDateTo(null);
    }
  };

  const handleDateRangeApply = () => {
    if (selectedDateFrom && selectedDateTo) {
      setShowDatePicker(false);
    }
  };

  const handleDatePickerClose = () => {
    if (!selectedDateFrom || !selectedDateTo) {
      setPieTimeFilter("This Month");
      setSelectedDateFrom(null);
      setSelectedDateTo(null);
    }
    setShowDatePicker(false);
  };

  return (
    <div className="admin-panel-redesign">
      <header className="modern-top-nav">
        <div className="nav-left">
          <div className="brand-section">
            <div className="brand-icon">EM</div>
            <span className="brand-name">Envimaster</span>
          </div>
          <h1 className="page-title">{getTabTitle()}</h1>
        </div>

        <div className="nav-center">
          <div className="modern-search">
            <FontAwesomeIcon icon={faSearch} className="search-icon-modern" size="lg" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="nav-right">
          <div className="user-section" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="user-avatar-modern">
              {user?.username?.charAt(0).toUpperCase() || "A"}
            </div>
            <span className="user-name-modern">{user?.username || "Admin"}</span>
            <FontAwesomeIcon icon={faChevronDown} className="dropdown-icon" />
          </div>

          {showUserMenu && (
            <div className="user-dropdown-menu">
              <button className="dropdown-logout" onClick={handleLogout}>
                <FontAwesomeIcon icon={faSignOutAlt} size="lg" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <nav className="secondary-nav">
        <button
          className={`secondary-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => handleTabChange("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={`secondary-nav-item ${activeTab === "saved-pdfs" ? "active" : ""}`}
          onClick={() => handleTabChange("saved-pdfs")}
        >
          Saved PDFs
        </button>
        <button
          className={`secondary-nav-item ${activeTab === "approval-documents" ? "active" : ""}`}
          onClick={() => handleTabChange("approval-documents")}
        >
          Approval Documents
        </button>
        <button
          className={`secondary-nav-item ${activeTab === "trash" ? "active" : ""}`}
          onClick={() => handleTabChange("trash")}
        >
          <FontAwesomeIcon icon={faTrash} size="lg" />
          Trash
        </button>
        <button
          className={`secondary-nav-item ${activeTab === "pricing-details" ? "active" : ""}`}
          onClick={() => handleTabChange("pricing-details")}
        >
          <FontAwesomeIcon icon={faDollarSign} size="lg" />
          Pricing Details
        </button>
        <button
          className={`secondary-nav-item ${activeTab === "email-template" ? "active" : ""}`}
          onClick={() => handleTabChange("email-template")}
        >
          <FontAwesomeIcon icon={faEnvelope} size="lg" />
          Email Template
        </button>
        <button
          className={`secondary-nav-item ${activeTab === "service-agreement-template" ? "active" : ""}`}
          onClick={() => handleTabChange("service-agreement-template")}
        >
          <FontAwesomeIcon icon={faFileContract} size="lg" />
          Service Agreement
        </button>
      </nav>

      <main className="modern-content">
        {activeTab === "dashboard" && (
          <div className="dashboard-grid">
            <div className="dashboard-main">
              <div className="stats-grid">
                <div className="stat-card-modern stat-card-1">
                  <div className="stat-icon-wrapper">
                    <div className="stat-icon stat-icon-blue">
                      <FontAwesomeIcon icon={faUpload} size="2x" />
                    </div>
                  </div>
                  <div className="stat-content">
                    <div className="stat-number">{dashboardStats.manualUploads}+</div>
                    <div className="stat-label">Manual Uploads</div>
                  </div>
                </div>

                <div className="stat-card-modern stat-card-2">
                  <div className="stat-icon-wrapper">
                    <div className="stat-icon stat-icon-green">
                      <FontAwesomeIcon icon={faFileAlt} size="2x" />
                    </div>
                  </div>
                  <div className="stat-content">
                    <div className="stat-number">{dashboardStats.savedDocuments}+</div>
                    <div className="stat-label">Saved Documents</div>
                  </div>
                </div>

                <div className="stat-card-modern stat-card-3">
                  <div className="stat-icon-wrapper">
                    <div className="stat-icon stat-icon-dark">
                      <FontAwesomeIcon icon={faBriefcase} size="2x" />
                    </div>
                  </div>
                  <div className="stat-content">
                    <div className="stat-number">{dashboardStats.totalDocuments}+</div>
                    <div className="stat-label">Total Documents</div>
                  </div>
                </div>
              </div>

              <div className="recent-section">
                <div className="section-header">
                  <h2 className="section-heading">Recent Documents</h2>
                  <button className="view-all-btn" onClick={() => handleTabChange("saved-pdfs")}>→</button>
                </div>

                <div className="modern-table-wrapper">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Agreement / File Name</th>
                        <th>Type</th>
                        <th>Updated</th>
                        <th>Status ↕</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <>
                          {Array.from({ length: 4 }).map((_, idx) => (
                            <tr key={`skeleton-${idx}`}>
                              <td>
                                <div style={{
                                  height: '16px',
                                  background: '#e5e7eb',
                                  borderRadius: '4px',
                                  width: '70%',
                                  animation: 'pulse 1.5s ease-in-out infinite'
                                }} />
                              </td>
                              <td>
                                <div style={{
                                  height: '16px',
                                  background: '#e5e7eb',
                                  borderRadius: '4px',
                                  width: '80px',
                                  animation: 'pulse 1.5s ease-in-out infinite'
                                }} />
                              </td>
                              <td>
                                <div style={{
                                  height: '16px',
                                  background: '#e5e7eb',
                                  borderRadius: '4px',
                                  width: '100px',
                                  animation: 'pulse 1.5s ease-in-out infinite'
                                }} />
                              </td>
                              <td>
                                <div style={{
                                  height: '20px',
                                  background: '#e5e7eb',
                                  borderRadius: '12px',
                                  width: '80px',
                                  animation: 'pulse 1.5s ease-in-out infinite'
                                }} />
                              </td>
                              <td>
                                <div style={{
                                  display: 'flex',
                                  gap: '8px',
                                  justifyContent: 'center'
                                }}>
                                  <div style={{
                                    width: '30px',
                                    height: '30px',
                                    background: '#e5e7eb',
                                    borderRadius: '4px',
                                    animation: 'pulse 1.5s ease-in-out infinite'
                                  }} />
                                  <div style={{
                                    width: '30px',
                                    height: '30px',
                                    background: '#e5e7eb',
                                    borderRadius: '4px',
                                    animation: 'pulse 1.5s ease-in-out infinite'
                                  }} />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </>
                      ) : recentAgreements.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="table-empty">
                            No documents found
                          </td>
                        </tr>
                        ) : (
                          recentAgreements.slice(0, 10).map((agreement) => (
                          <React.Fragment key={agreement.id}>
                            <tr className="agreement-header-admin">
                              <td>
                                <div
                                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                                  onClick={() => toggleAgreement(agreement.id)}
                                >
                                  <FontAwesomeIcon
                                    icon={expandedAgreements.has(agreement.id) ? faFolderOpen : faFolder}
                                    style={{ color: '#f59e0b', fontSize: '16px' }}
                                  />
                                  <FontAwesomeIcon
                                    icon={expandedAgreements.has(agreement.id) ? faChevronDown : faChevronRight}
                                    style={{ fontSize: '10px', color: '#6b7280' }}
                                  />
                                  <strong>{agreement.agreementTitle}</strong>
                                  <span style={{ color: '#6b7280', fontSize: '12px' }}>
                                    ({agreement.fileCount} file{agreement.fileCount !== 1 ? 's' : ''})
                                  </span>
                                </div>
                              </td>
                              <td>Agreement</td>
                              <td>{timeAgo(agreement.latestUpdate)}</td>
                              <td>
                                <span className={`status-pill status-${agreement.agreementStatus}`}>
                                  {agreement.agreementStatus === "approved_admin" ? "Completed" :
                                   agreement.agreementStatus === "pending_approval" ? "Pending" :
                                   agreement.agreementStatus === "draft" ? "Draft" : "Saved"}
                                </span>
                              </td>
                              <td>
                                {agreement.startDate && agreement.contractMonths && (
                                  <AgreementTimelineBadge
                                    startDate={agreement.startDate}
                                    contractMonths={agreement.contractMonths}
                                    compact={true}
                                    showCalendarIcon={false}
                                    agreementId={agreement.id}
                                  />
                                )}
                              </td>
                            </tr>

                            {expandedAgreements.has(agreement.id) && agreement.files.slice(0, 3).map((file) => (
                              <tr key={file.id} className="file-row-admin">
                                <td style={{ paddingLeft: '40px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FontAwesomeIcon
                                      icon={faFileAlt}
                                      style={{
                                        color: file.fileType === 'version_pdf' ? '#8b5cf6' :
                                               file.fileType === 'attached_pdf' ? '#10b981' : '#2563eb',
                                        fontSize: '14px'
                                      }}
                                    />
                                    <span>{file.fileName}</span>
                                  </div>
                                </td>
                                <td>
                                  <span style={{
                                    fontSize: '11px',
                                    color: file.fileType === 'version_pdf' ? '#8b5cf6' :
                                           file.fileType === 'attached_pdf' ? '#10b981' : '#2563eb'
                                  }}>
                                    {file.fileType === 'main_pdf' ? 'Main PDF' :
                                     file.fileType === 'version_pdf' ? `v${file.versionNumber || ''}` :
                                     file.fileType === 'attached_pdf' ? 'Attached' :
                                     file.fileType}
                                  </span>
                                </td>
                                <td>{timeAgo(file.updatedAt)}</td>
                                <td>
                                  <span className={`status-pill status-${file.status}`}>
                                    {file.status === "approved_admin" ? "Completed" :
                                     file.status === "pending_approval" ? "Pending" :
                                     file.status === "draft" ? "Draft" : "Saved"}
                                  </span>
                                </td>
                                <td>
                                  <div className="action-buttons-group">
                                    <button
                                      className="action-btn action-view"
                                      onClick={() => handleViewPDF(file.id, file.fileName, file.fileType)}
                                      title="View PDF"
                                      disabled={!canAccessFile(file)}
                                    >
                                      <FontAwesomeIcon icon={faEye} size="sm" />
                                    </button>
                                    <button
                                      className="action-btn action-download"
                                      onClick={() => handleDownload(file.id, file.fileName, file.fileType)}
                                      title="Download PDF"
                                      disabled={!canAccessFile(file)}
                                    >
                                      <FontAwesomeIcon icon={faDownload} size="sm" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {}
            <aside className="dashboard-sidebar">
              <div className="sidebar-card pie-chart-card">
                <div className="pie-chart-header">
                  <h3 className="pie-chart-title">Document Status</h3>
                  <select
                    className="pie-filter-dropdown"
                    value={pieTimeFilter}
                    onChange={(e) => handlePieTimeFilterChange(e.target.value)}
                  >
                    <option>This Week</option>
                    <option>This Month</option>
                    <option>This Year</option>
                    <option>Date Range</option>
                  </select>
                </div>

                {showDatePicker && (
                  <div className="date-picker-overlay" onClick={handleDatePickerClose}>
                    <div className="date-picker-modal" onClick={(e) => e.stopPropagation()}>
                      <h3 className="date-picker-title">Select Date Range</h3>

                      <div className="date-range-inputs">
                        <div className="date-input-group">
                          <label className="date-label">From Date</label>
                          <input
                            type="date"
                            className="date-picker-input"
                            value={selectedDateFrom ? selectedDateFrom.toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                setSelectedDateFrom(new Date(e.target.value));
                              }
                            }}
                            max={new Date().toISOString().split('T')[0]}
                          />
                        </div>

                        <div className="date-input-group">
                          <label className="date-label">To Date</label>
                          <input
                            type="date"
                            className="date-picker-input"
                            value={selectedDateTo ? selectedDateTo.toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                setSelectedDateTo(new Date(e.target.value));
                              }
                            }}
                            max={new Date().toISOString().split('T')[0]}
                            min={selectedDateFrom ? selectedDateFrom.toISOString().split('T')[0] : ''}
                          />
                        </div>
                      </div>

                      <div className="date-picker-actions">
                        <button
                          className="date-picker-apply"
                          onClick={handleDateRangeApply}
                          disabled={!selectedDateFrom || !selectedDateTo}
                        >
                          Apply
                        </button>
                        <button
                          className="date-picker-close"
                          onClick={handleDatePickerClose}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {pieData.total > 0 ? (
                  <>
                    <div className="pie-chart-container">
                      <svg viewBox="0 0 200 200" className="pie-chart-svg">
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="40"
                          strokeDasharray={`${pieData.donePercent * 5.024} 502.4`}
                          strokeDashoffset="0"
                          transform="rotate(-90 100 100)"
                        />
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="40"
                          strokeDasharray={`${pieData.pendingPercent * 5.024} 502.4`}
                          strokeDashoffset={`-${pieData.donePercent * 5.024}`}
                          transform="rotate(-90 100 100)"
                        />
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke="#0ea5e9"
                          strokeWidth="40"
                          strokeDasharray={`${pieData.savedPercent * 5.024} 502.4`}
                          strokeDashoffset={`-${(pieData.donePercent + pieData.pendingPercent) * 5.024}`}
                          transform="rotate(-90 100 100)"
                        />
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke="#9ca3af"
                          strokeWidth="40"
                          strokeDasharray={`${pieData.draftsPercent * 5.024} 502.4`}
                          strokeDashoffset={`-${(pieData.donePercent + pieData.pendingPercent + pieData.savedPercent) * 5.024}`}
                          transform="rotate(-90 100 100)"
                        />
                        <text x="100" y="95" textAnchor="middle" fontSize="32" fontWeight="700" fill="#1f2937">
                          {pieData.total}
                        </text>
                        <text x="100" y="115" textAnchor="middle" fontSize="14" fill="#6b7280">
                          Total
                        </text>
                      </svg>
                    </div>

                    <div className="pie-chart-legend">
                      <div className="legend-item">
                        <span className="legend-dot" style={{ backgroundColor: "#22c55e" }}></span>
                        <span className="legend-label">Done</span>
                        <span className="legend-value">{pieData.done}</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-dot" style={{ backgroundColor: "#f59e0b" }}></span>
                        <span className="legend-label">Pending</span>
                        <span className="legend-value">{pieData.pending}</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-dot" style={{ backgroundColor: "#0ea5e9" }}></span>
                        <span className="legend-label">Saved</span>
                        <span className="legend-value">{pieData.saved}</span>
                      </div>
                      <div className="legend-item">
                        <span className="legend-dot" style={{ backgroundColor: "#9ca3af" }}></span>
                        <span className="legend-label">Drafts</span>
                        <span className="legend-value">{pieData.drafts}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="pie-chart-empty">
                    <p>No data available for this period</p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {activeTab === "saved-pdfs" && (
          <div className="tab-content-full">
            <SavedFilesAgreements />
          </div>
        )}

        {activeTab === "approval-documents" && (
          <div className="tab-content-full">
            <ApprovalDocuments />
          </div>
        )}

        {activeTab === "manual-uploads" && (
          <div className="tab-content-full tab-content-transparent">
            <ManualUploads />
          </div>
        )}

        {activeTab === "pricing-details" && (
          <div className="tab-content-full tab-content-transparent">
            <AdminDashboard
              isEmbedded={true}
              parentPath="/admin-panel/pricing-details"
              initialSubtab={currentSubtab}
              modalType={modalType}
              itemId={itemId}
            />
          </div>
        )}

        {activeTab === "email-template" && (
          <div className="tab-content-full">
            <EmailTemplateManager />
          </div>
        )}

        {activeTab === "service-agreement-template" && (
          <div className="tab-content-full">
            <ServiceAgreementTemplateManager />
          </div>
        )}

        {activeTab === "trash" && (
          <div className="tab-content-full">
            <TrashView />
          </div>
        )}
      </main>
    </div>
  );
}
