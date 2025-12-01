import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HiUpload, HiCloudUpload, HiDocumentAdd } from "react-icons/hi";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import "./Home.css";

type Document = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function Home() {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState("Today");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadCount, setUploadCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  // Fetch documents from backend
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
        console.log("📊 Fetched Documents:", items);
        console.log("📊 Total Documents Count:", items.length);
        setDocuments(items);
      } catch (err) {
        console.error("Error fetching documents:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // Fetch manual uploads count
  useEffect(() => {
    const fetchUploadStats = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/manual-upload");
        if (!res.ok) throw new Error(`Failed with status ${res.status}`);

        const data = await res.json();
        const uploads = data.items || [];
        console.log("📤 Manual Uploads:", uploads);
        console.log("📤 Total Upload Count:", uploads.length);
        setUploadCount(uploads.length);
      } catch (err) {
        console.error("Error fetching upload stats:", err);
      }
    };

    fetchUploadStats();
  }, []);

  // Calculate chart data dynamically from documents
  const getChartData = () => {
    console.log("📈 Calculating chart data...");
    console.log("📈 Documents available for chart:", documents.length);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const chartData = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = dayNames[date.getDay()].charAt(0);

      // Filter documents for this day
      const dayDocs = documents.filter((doc) => {
        const docDate = new Date(doc.createdAt);
        return docDate.toDateString() === date.toDateString();
      });

      console.log(`📅 ${date.toDateString()} (${dayName}): ${dayDocs.length} documents`);

      // Count by status
      const done = dayDocs.filter((d) => d.status === "approved_admin").length;
      const pending = dayDocs.filter((d) => d.status === "pending_approval" || d.status === "approved_salesman").length;
      const drafts = dayDocs.filter((d) => d.status === "draft").length;

      console.log(`   ✅ Done: ${done}, ⏳ Pending: ${pending}, 📝 Drafts: ${drafts}`);

      chartData.push({ day: dayName, done, pending, drafts });
    }

    console.log("📈 Final Chart Data:", chartData);
    return chartData;
  };

  const chartData = getChartData();
  // Don't use maxValue for scaling - use absolute pixel heights
  const pixelsPerUnit = 20; // Each document = 20px height
  console.log("📈 Chart will use absolute heights:", pixelsPerUnit, "px per unit");

  const agreementOptions = [
    {
      id: "create",
      title: "Create Agreement",
      description: "Create a new customer agreement with comprehensive service details and product selections",
      icon: "📋",
      action: () => navigate("/form-filling"),
      buttonText: "Get Started →",
      buttonClass: "home__button-green",
      available: true,
    },
    {
      id: "extend",
      title: "Extend Agreement",
      description: "Extend an existing customer agreement with new terms and updated service packages",
      icon: "📅",
      action: () => alert("Extend Agreement - Coming Soon"),
      buttonText: "Coming Soon",
      buttonClass: "home__button-gray",
      available: false,
    },
    {
      id: "edit",
      title: "Edit Agreement",
      description: "Modify existing agreement details, update services, or adjust product configurations",
      icon: "✏️",
      action: () => navigate("/saved-pdfs"),
      buttonText: "Get Started →",
      buttonClass: "home__button-blue",
      available: true,
    },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      setToastMessage({ message: "Please select a file first", type: "error" });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      const res = await fetch("http://localhost:5000/api/manual-upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`);
      }

      setToastMessage({ message: `Successfully uploaded: ${uploadedFile.name}`, type: "success" });
      setUploadedFile(null);

      // Refresh upload count
      const statsRes = await fetch("http://localhost:5000/api/manual-upload");
      const data = await statsRes.json();
      const newCount = data.items?.length || 0;
      console.log("📤 Upload Complete! New count:", newCount);
      setUploadCount(newCount);
    } catch (err) {
      console.error("Error uploading file:", err);
      setToastMessage({ message: "Failed to upload file. Please try again.", type: "error" });
    }
  };

  return (
    <section className="home">
      {/* Hero Section */}
      <div className="home__hero">
        <div className="home__hero-content">
          <h1 className="home__title">Welcome to EnviroMaster</h1>
          <p className="home__subtitle">
            Professional Agreement Management System
          </p>
          <p className="home__description">
            Create, manage, and maintain customer service agreements with ease. | Our comprehensive platform streamlines your workflow and ensures accuracy.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="home__container">
        {/* Agreement Management Section */}
        <div className="home__section-header">
          <h2 className="home__section-title">Agreement Management</h2>
        </div>

        <div className="home__cards">
          {agreementOptions.map((option) => (
            <div
              key={option.id}
              className={`home__card ${
                !option.available ? "home__card--disabled" : ""
              }`}
            >
              <div className="home__card-icon">{option.icon}</div>
              <h3 className="home__card-title">{option.title}</h3>
              <p className="home__card-description">{option.description}</p>
              <button
                className={`home__card-button ${option.buttonClass}`}
                onClick={option.available ? option.action : undefined}
                disabled={!option.available}
              >
                {option.buttonText}
              </button>
            </div>
          ))}
        </div>

        {/* Bottom Section: Chart and Upload */}
        <div className="home__bottom-section">
          {/* Chart Section */}
          <div className="home__chart-section">
            <div className="home__chart-header">
              <select
                className="home__filter-dropdown"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <option>Today</option>
                <option>This Week</option>
                <option>This Month</option>
              </select>
            </div>
            {loading ? (
              <div className="home__chart-loading">
                <p>Loading chart data...</p>
              </div>
            ) : (
              <>
                <div className="home__chart">
                  {chartData.map((data, index) => {
                    // Use absolute pixel heights based on actual numbers
                    const doneHeight = data.done * pixelsPerUnit;
                    const pendingHeight = data.pending * pixelsPerUnit;
                    const draftsHeight = data.drafts * pixelsPerUnit;

                    console.log(`📊 Bar ${index} (${data.day}):`, {
                      done: data.done,
                      pending: data.pending,
                      drafts: data.drafts,
                      doneHeight: `${doneHeight}px`,
                      pendingHeight: `${pendingHeight}px`,
                      draftsHeight: `${draftsHeight}px`
                    });

                    return (
                      <div key={index} className="home__chart-bar-group">
                        <div className="home__chart-bars">
                          <div
                            className="home__chart-bar home__chart-bar--done"
                            style={{ height: `${doneHeight}px` }}
                          ></div>
                          <div
                            className="home__chart-bar home__chart-bar--pending"
                            style={{ height: `${pendingHeight}px` }}
                          ></div>
                          <div
                            className="home__chart-bar home__chart-bar--drafts"
                            style={{ height: `${draftsHeight}px` }}
                          ></div>
                        </div>
                        <div className="home__chart-label">{data.day}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="home__chart-legend">
                  <div className="home__legend-item">
                    <span className="home__legend-dot home__legend-dot--done"></span>
                    Done
                  </div>
                  <div className="home__legend-item">
                    <span className="home__legend-dot home__legend-dot--pending"></span>
                    Pending Approval
                  </div>
                  <div className="home__legend-item">
                    <span className="home__legend-dot home__legend-dot--drafts"></span>
                    Drafts
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Upload Section */}
          <div className="home__upload-section">
            <h3 className="home__upload-title">Manual File Upload</h3>
            <div
              className="home__upload-area"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <div className="home__upload-icon">
                <HiCloudUpload size={64} />
              </div>
              <p className="home__upload-label">Drag and drop a file here</p>
              <p className="home__upload-text">or click to browse</p>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </div>
            {uploadedFile && (
              <p className="home__upload-filename">
                <HiDocumentAdd size={18} />
                {uploadedFile.name}
              </p>
            )}
            <button className="home__upload-button" onClick={handleUpload}>
              <HiUpload size={20} />
              Upload File
            </button>
            <p className="home__upload-formats">PDF, DOCK</p>
          </div>
        </div>
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
