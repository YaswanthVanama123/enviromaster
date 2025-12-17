// src/components/AdminPanel.tsx

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAdminAuth } from "../backendservice/hooks";
import { pdfApi, manualUploadApi } from "../backendservice/api";
import SavedFilesAgreements from "./SavedFilesAgreements"; // ✅ UPDATED: Use new folder-like component
import { AdminDashboard } from "./admin/AdminDashboard";
import ManualUploads from "./ManualUploads";
import ApprovalDocuments from "./ApprovalDocuments";
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
  faDollarSign
} from "@fortawesome/free-solid-svg-icons";
import "./AdminPanel.css";

type TabType = "dashboard" | "saved-pdfs" | "approval-documents" | "manual-uploads" | "pricing-details";

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

  // Extract subtab from URL path for nested routes
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

  // Determine active tab from URL parameter with fallback to dashboard
  const getActiveTabFromUrl = (): TabType => {
    if (!tab) return "dashboard";

    const validTabs: TabType[] = ["dashboard", "saved-pdfs", "approval-documents", "manual-uploads", "pricing-details"];
    return validTabs.includes(tab as TabType) ? (tab as TabType) : "dashboard";
  };

  const [activeTab, setActiveTab] = useState<TabType>(getActiveTabFromUrl());
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [lastUploadDate, setLastUploadDate] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  // ✅ NEW: Dashboard statistics from admin API
  const [dashboardStats, setDashboardStats] = useState({
    manualUploads: 0,
    savedDocuments: 0,
    totalDocuments: 0
  });

  // Pie chart states
  const [pieTimeFilter, setPieTimeFilter] = useState("This Week");
  const [selectedDateFrom, setSelectedDateFrom] = useState<Date | null>(null);
  const [selectedDateTo, setSelectedDateTo] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Update active tab when URL parameter changes
  useEffect(() => {
    const urlTab = getActiveTabFromUrl();
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [tab]);

  // Update URL when tab changes
  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab);
    navigate(`/admin-panel/${newTab}`, { replace: true });
  };

  // Hide global navigation when admin panel is open
  useEffect(() => {
    // Hide all navigation elements
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

    // Show them again when component unmounts
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

  // Fetch dashboard data from new admin API
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // ✅ NEW: Use the new admin dashboard API that provides everything in one call
        const dashboardData = await pdfApi.getAdminDashboardData();

        // Map recent documents to the existing Document interface
        const mapped: Document[] = dashboardData.recentDocuments.map((doc: any) => ({
          id: doc.id,
          name: doc.title, // ✅ Now using real document titles from backend
          uploadedOn: doc.uploadedOnFormatted,
          status: doc.status,
          createdAt: doc.createdDate,
          updatedAt: doc.uploadedOn,
        }));

        setDocuments(mapped);

        // ✅ Set all statistics from the dashboard API response
        setUploadCount(dashboardData.stats.manualUploads);
        setDashboardStats(dashboardData.stats);

        // Set last upload date from the most recent document
        if (dashboardData.recentDocuments.length > 0) {
          setLastUploadDate(dashboardData.recentDocuments[0].createdDate);
        } else {
          setLastUploadDate(new Date().toISOString());
        }

        console.log("✅ Dashboard data loaded:", {
          documents: mapped.length,
          stats: dashboardData.stats,
          documentStatus: dashboardData.documentStatus
        });

      } catch (err) {
        console.error("Error fetching dashboard data:", err);

        // ✅ Fallback: If new API fails, use old API calls
        console.log("⚠️ Falling back to old API calls...");
        try {
          const data = await pdfApi.getCustomerHeadersSummary();
          const items = data.items || [];

          const mapped: Document[] = items.map((item: any) => ({
            id: item._id || item.id,
            name: item.headerTitle || "Untitled Document",
            uploadedOn: new Date(item.updatedAt).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            }),
            status: item.status || "draft",
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }));

          const sortedRecent = mapped
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

          setDocuments(sortedRecent);
        } catch (fallbackErr) {
          console.error("Fallback API also failed:", fallbackErr);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isNavigatingRef.current) {
      isNavigatingRef.current = true;
      navigate("/admin-login", { replace: true });
    } else if (isAuthenticated) {
      isNavigatingRef.current = false;
    }
  }, [isAuthenticated, navigate]);

  // Show loading while checking auth
  if (!isAuthenticated) {
    return null;
  }

  const handleDownload = async (docId: string, fileName: string) => {
    try {
      const blob = await pdfApi.downloadPdf(docId);
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
    // Navigate to PDF viewer with context-aware return path
    const adminReturnPath = `/admin-panel/${activeTab}`;

    // ✅ SMART DOCUMENT TYPE DETECTION: For admin panel, try to determine document type
    // If docType is provided, use it; otherwise rely on PDFViewer auto-detection
    let documentType: 'agreement' | 'manual-upload' | 'attached-file' | undefined = undefined;

    if (docType === 'agreement' || docType === 'main_pdf') {
      documentType = 'agreement';
    } else if (docType === 'manual-upload') {
      documentType = 'manual-upload';
    } else if (docType === 'attached-file' || docType === 'attached_pdf') {
      documentType = 'attached-file';
    }
    // If no type specified, PDFViewer will auto-detect by trying different APIs

    console.log(`📄 [ADMIN-VIEW] Viewing document ${docId} (detected type: ${documentType || 'auto-detect'})`);

    navigate("/pdf-viewer", {
      state: {
        documentId: docId,
        fileName: fileName,
        documentType: documentType, // ✅ NEW: Include document type when available
        // Add navigation context to prevent loops - use current admin tab context
        originalReturnPath: adminReturnPath,
        originalReturnState: null,
      },
    });

    console.log("📍 Admin Panel: Navigating to PDF viewer with return path:", adminReturnPath);
  };

  const handleLogout = () => {
    if (logout) {
      logout();
    }
  };

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
      case "manual-uploads":
        return "Manual Uploads";
      case "pricing-details":
        return "Pricing Details";
      default:
        return "Dashboard";
    }
  };

  // Calculate pie chart data based on time filter
  const getPieChartData = () => {
    const today = new Date();
    let filteredDocs = [...documents];

    if (pieTimeFilter === "This Week") {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      filteredDocs = documents.filter((doc) => {
        const docDate = new Date(doc.createdAt || doc.updatedAt);
        return docDate >= startOfWeek;
      });
    } else if (pieTimeFilter === "This Month") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      filteredDocs = documents.filter((doc) => {
        const docDate = new Date(doc.createdAt || doc.updatedAt);
        return docDate >= startOfMonth;
      });
    } else if (pieTimeFilter === "This Year") {
      const startOfYear = new Date(today.getFullYear(), 0, 1);

      filteredDocs = documents.filter((doc) => {
        const docDate = new Date(doc.createdAt || doc.updatedAt);
        return docDate >= startOfYear;
      });
    } else if (pieTimeFilter === "Date Range" && selectedDateFrom && selectedDateTo) {
      filteredDocs = documents.filter((doc) => {
        const docDate = new Date(doc.createdAt || doc.updatedAt);
        return docDate >= selectedDateFrom && docDate <= selectedDateTo;
      });
    }

    // Count statuses
    const done = filteredDocs.filter((d) => d.status === "approved_admin").length;
    const pending = filteredDocs.filter((d) => d.status === "pending_approval" || d.status === "approved_salesman").length;
    const saved = filteredDocs.filter((d) => d.status === "saved").length;
    const drafts = filteredDocs.filter((d) => d.status === "draft").length;
    const total = done + pending + saved + drafts;

    return {
      done,
      pending,
      saved,
      drafts,
      total,
      donePercent: total > 0 ? (done / total) * 100 : 0,
      pendingPercent: total > 0 ? (pending / total) * 100 : 0,
      savedPercent: total > 0 ? (saved / total) * 100 : 0,
      draftsPercent: total > 0 ? (drafts / total) * 100 : 0,
    };
  };

  const pieData = getPieChartData();

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

  return (
    <div className="admin-panel-redesign">
      {/* Modern Top Navigation */}
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

      {/* Secondary Navigation Tabs */}
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
          className={`secondary-nav-item ${activeTab === "manual-uploads" ? "active" : ""}`}
          onClick={() => handleTabChange("manual-uploads")}
        >
          Manual Uploads
        </button>
        <button
          className={`secondary-nav-item ${activeTab === "pricing-details" ? "active" : ""}`}
          onClick={() => handleTabChange("pricing-details")}
        >
          <FontAwesomeIcon icon={faDollarSign} size="lg" />
          Pricing Details
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="modern-content">
        {activeTab === "dashboard" && (
          <div className="dashboard-grid">
            <div className="dashboard-main">
              {/* Stats Cards */}
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

              {/* Recent Documents Table */}
              <div className="recent-section">
                <div className="section-header">
                  <h2 className="section-heading">Recent Documents</h2>
                  <button className="view-all-btn">→</button>
                </div>

                <div className="modern-table-wrapper">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Created Date</th>
                        <th>Document</th>
                        <th>Status ↕</th>
                        <th>Uploaded On</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="table-empty">
                            Loading documents...
                          </td>
                        </tr>
                      ) : documents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="table-empty">
                            No documents found
                          </td>
                        </tr>
                      ) : (
                        documents.slice(0, 4).map((doc) => (
                          <tr key={doc.id}>
                            <td className="created-date">
                              {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }) : "—"}
                            </td>
                            <td>
                              <div className="doc-cell">
                                <FontAwesomeIcon icon={faFileAlt} className="doc-icon-table" />
                                <span>{doc.name}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`status-pill status-${doc.status}`}>
                                {doc.status === "approved_admin" ? "Completed" : "Pending"}
                              </span>
                            </td>
                            <td className="statistics">{doc.uploadedOn}</td>
                            <td>
                              <div className="action-buttons-group">
                                <button
                                  className="action-btn action-view"
                                  onClick={() => handleViewPDF(doc.id, doc.name)}
                                  title="View PDF"
                                >
                                  <FontAwesomeIcon icon={faEye} size="lg" />
                                </button>
                                <button
                                  className="action-btn action-download"
                                  onClick={() => handleDownload(doc.id, doc.name)}
                                  title="Download PDF"
                                >
                                  <FontAwesomeIcon icon={faDownload} size="lg" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <aside className="dashboard-sidebar">
              {/* Upload Card */}
              <div className="sidebar-card upload-card-modern">
                <button
                  className="upload-btn-large"
                  onClick={() => handleTabChange("manual-uploads")}
                >
                  <FontAwesomeIcon icon={faUpload} size="lg" />
                  Upload
                </button>
                <div className="upload-info">
                  <span className="upload-info-label">Last uploaded on</span>
                  <div className="upload-info-date">{formatUploadDate(lastUploadDate)}</div>
                </div>
              </div>

              {/* Pie Chart Card */}
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
                  <div className="date-picker-overlay" onClick={() => setShowDatePicker(false)}>
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
                          onClick={() => setShowDatePicker(false)}
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
      </main>
    </div>
  );
}
