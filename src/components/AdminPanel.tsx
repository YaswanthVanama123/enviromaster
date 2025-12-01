// src/components/AdminPanel.tsx

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../backendservice/hooks";
import SavedFiles from "./SavedFiles";
import { AdminDashboard } from "./admin/AdminDashboard";
import ManualUploads from "./ManualUploads";
import ApprovalDocuments from "./ApprovalDocuments";
import {
  HiDocumentText,
  HiSearch,
  HiUpload,
  HiDownload,
  HiLogout,
  HiChevronDown,
  HiBriefcase
} from "react-icons/hi";
import { HiOutlineEye, HiOutlineDownload } from "react-icons/hi";
import { MdAttachMoney } from "react-icons/md";
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
  const { isAuthenticated, user, logout } = useAdminAuth();
  const isNavigatingRef = useRef(false);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [lastUploadDate, setLastUploadDate] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  // Fetch recent documents from backend
  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:5000/api/pdf/customer-headers", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(`Failed with status ${res.status}`);
        }

        const data = await res.json();
        const items = data.items || [];

        const mapped: Document[] = items.map((item: any) => ({
          id: item._id || item.id,
          name: item.payload?.headerTitle || "Untitled",
          uploadedOn: new Date(item.updatedAt).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }),
          status: item.status || "draft",
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));

        // Sort by most recent (updatedAt) and take top 10
        const sortedRecent = mapped
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 10);

        setDocuments(sortedRecent);
      } catch (err) {
        console.error("Error fetching documents:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // Fetch manual uploads stats
  useEffect(() => {
    const fetchUploadStats = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/manual-upload");
        if (!res.ok) throw new Error(`Failed with status ${res.status}`);

        const data = await res.json();
        const uploads = data.items || [];

        setUploadCount(uploads.length);

        // Get the most recent upload date
        if (uploads.length > 0) {
          const latestUpload = uploads[0]; // Already sorted by createdAt desc
          setLastUploadDate(latestUpload.createdAt);
        } else {
          setLastUploadDate(new Date().toISOString());
        }
      } catch (err) {
        console.error("Error fetching upload stats:", err);
      }
    };

    fetchUploadStats();
  }, [activeTab]); // Refresh when tab changes

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
      const res = await fetch(
        `http://localhost:5000/api/pdf/viewer/download/${docId}`,
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

  const handleViewPDF = (docId: string, fileName: string) => {
    // Navigate to PDF viewer like in SavedFiles
    navigate("/pdf-viewer", {
      state: {
        documentId: docId,
        fileName: fileName,
      },
    });
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
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
            <HiSearch className="search-icon-modern" size={20} />
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
            <HiChevronDown size={16} className="dropdown-icon" />
          </div>

          {showUserMenu && (
            <div className="user-dropdown-menu">
              <button className="dropdown-logout" onClick={handleLogout}>
                <HiLogout size={18} />
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
          <MdAttachMoney size={18} />
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
                      <HiUpload size={28} />
                    </div>
                  </div>
                  <div className="stat-content">
                    <div className="stat-number">{uploadCount}+</div>
                    <div className="stat-label">Manual Uploads</div>
                  </div>
                </div>

                <div className="stat-card-modern stat-card-2">
                  <div className="stat-icon-wrapper">
                    <div className="stat-icon stat-icon-green">
                      <HiDocumentText size={28} />
                    </div>
                  </div>
                  <div className="stat-content">
                    <div className="stat-number">{documents.length}+</div>
                    <div className="stat-label">Saved Documents</div>
                  </div>
                </div>

                <div className="stat-card-modern stat-card-3">
                  <div className="stat-icon-wrapper">
                    <div className="stat-icon stat-icon-dark">
                      <HiBriefcase size={28} />
                    </div>
                  </div>
                  <div className="stat-content">
                    <div className="stat-number">{uploadCount + documents.length}+</div>
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
                                <HiDocumentText size={18} className="doc-icon-table" />
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
                                  <HiOutlineEye size={20} />
                                </button>
                                <button
                                  className="action-btn action-download"
                                  onClick={() => handleDownload(doc.id, doc.name)}
                                  title="Download PDF"
                                >
                                  <HiOutlineDownload size={20} />
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
                  <HiUpload size={20} />
                  Upload
                </button>
                <div className="upload-info">
                  <span className="upload-info-label">Last uploaded on</span>
                  <div className="upload-info-date">{formatUploadDate(lastUploadDate)}</div>
                </div>
              </div>

              {/* Welcome Card */}
              <div className="sidebar-card welcome-card-modern">
                <div className="welcome-icon">👥</div>
                <h3 className="welcome-heading">Welcome back,</h3>
                <h2 className="welcome-name">{user?.username || "envimaster"}</h2>
                <p className="welcome-text">We are happy to see you again</p>
              </div>
            </aside>
          </div>
        )}

        {activeTab === "saved-pdfs" && (
          <div className="tab-content-full">
            <SavedFiles />
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
            <AdminDashboard />
          </div>
        )}
      </main>
    </div>
  );
}
