// src/components/AdminPanel.tsx

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../backendservice/hooks";
import "./AdminPanel.css";

type TabType = "dashboard" | "saved-pdfs" | "pricing-details";

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

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === "saved-pdfs") {
      navigate("/saved-files");
    } else if (tab === "pricing-details") {
      navigate("/admin-dashboard");
    }
  };

  const handleLogout = () => {
    if (logout) {
      logout();
    }
  };

  return (
    <div className="admin-panel-modern">
      {/* Header */}
      <header className="panel-header">
        <div className="header-left">
          <div className="logo">
            <div className="logo-icon">📄</div>
            <span className="logo-text">DigiDocs</span>
          </div>
          <nav className="main-nav">
            <button
              className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => handleTabChange("dashboard")}
            >
              Dashboard
            </button>
            <button
              className={`nav-item ${activeTab === "saved-pdfs" ? "active" : ""}`}
              onClick={() => handleTabChange("saved-pdfs")}
            >
              Saved PDFs
            </button>
            <button
              className={`nav-item ${activeTab === "pricing-details" ? "active" : ""}`}
              onClick={() => handleTabChange("pricing-details")}
            >
              Pricing Details
            </button>
          </nav>
        </div>

        <div className="header-center">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Searching something..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="header-right">
          <button className="upgrade-btn">Upgrade</button>
          <div className="user-profile">
            <div className="user-avatar">
              {user?.username?.charAt(0).toUpperCase() || "A"}
            </div>
            <span className="user-name">{user?.username || "Admin"}</span>
          </div>
          <button className="logout-btn-icon" onClick={handleLogout} title="Logout">
            🚪
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="panel-content">
        <div className="content-left">
          {/* Welcome Section */}
          <div className="welcome-card">
            <div className="welcome-content">
              <h1 className="welcome-title">Welcome back,</h1>
              <h2 className="welcome-name">{user?.username || "Admin"}</h2>
              <p className="welcome-subtitle">We are happy to see you again</p>
            </div>
            <div className="welcome-illustration">
              <div className="illustration-placeholder">
                👥💼
              </div>
            </div>
          </div>

          {/* Upload File Section */}
          <div className="upload-section">
            <div className="upload-card">
              <div className="upload-header">
                <h3>Upload File</h3>
                <button className="upload-btn">
                  <span className="upload-icon">📤</span>
                  Upload
                </button>
              </div>
              <div className="upload-stats">
                <div className="upload-date">
                  <span className="date-label">You can upload file here</span>
                  <div className="date-value">15 May, 2023</div>
                </div>
                <div className="upload-count">
                  <div className="count-value">15</div>
                  <div className="count-label">Files uploaded</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Documents Table */}
          <div className="recent-documents">
            <h3 className="section-title">Recent Documents</h3>
            <div className="table-container">
              <table className="documents-table">
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" />
                    </th>
                    <th>Document Name</th>
                    <th>Received On</th>
                    <th>Actions</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "24px" }}>
                        Loading documents...
                      </td>
                    </tr>
                  ) : documents.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "24px" }}>
                        No documents found
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <input type="checkbox" />
                        </td>
                        <td>
                          <div className="doc-name">
                            <span className="doc-icon">📄</span>
                            {doc.name}
                          </div>
                        </td>
                        <td className="text-muted">{doc.uploadedOn}</td>
                        <td>
                          <button
                            className="download-btn-table"
                            onClick={() => handleDownload(doc.id, doc.name)}
                            title="Download PDF"
                          >
                            ⬇
                          </button>
                        </td>
                        <td>
                          <span className={`status-badge status-${doc.status}`}>
                            {doc.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
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
        <aside className="content-right">
          {/* Contract Data Card */}
          <div className="stat-card">
            <div className="stat-header">
              <h4>Contract data</h4>
            </div>
            <div className="stat-body">
              <div className="stat-label">Last uploaded</div>
              <div className="stat-value">15</div>
            </div>
          </div>

          {/* Sent by Manager Card */}
          <div className="stat-card">
            <div className="stat-header">
              <h4>Sent by manager</h4>
            </div>
            <div className="stat-body">
              <div className="stat-value">05</div>
            </div>
          </div>

          {/* Fully Signed Card */}
          <div className="stat-card">
            <div className="stat-header">
              <h4>Fully Signed</h4>
            </div>
            <div className="stat-body">
              <div className="stat-value">08</div>
            </div>
          </div>

          {/* Download App Section */}
          <div className="download-app-card">
            <h4 className="download-title">Download DigiDocs App</h4>
            <p className="download-subtitle">
              Get the full experience on mobile
            </p>
            <div className="app-illustration">
              🏃‍♂️📱
            </div>
            <div className="app-buttons">
              <button className="app-store-btn">
                <span className="btn-icon">🍎</span>
                <div className="btn-text">
                  <div className="btn-small">Download on the</div>
                  <div className="btn-large">App Store</div>
                </div>
              </button>
              <button className="app-store-btn">
                <span className="btn-icon">🤖</span>
                <div className="btn-text">
                  <div className="btn-small">GET IT ON</div>
                  <div className="btn-large">Google Play</div>
                </div>
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
