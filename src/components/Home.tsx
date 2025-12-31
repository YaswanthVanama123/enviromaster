import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpload,
  faCloudUpload,
  faFileAlt,
  faTrash,
  faClipboardList,
  faCalendarPlus,
  faPencilAlt
} from "@fortawesome/free-solid-svg-icons";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { pdfApi, manualUploadApi } from "../backendservice/api";
import "./Home.css";

type Document = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type ChartDataPoint = {
  label: string;
  done: number;
  pending: number;
  drafts: number;
  saved: number;
};

export default function Home() {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState("This Week");
  const [selectedDateFrom, setSelectedDateFrom] = useState<Date | null>(null);
  const [selectedDateTo, setSelectedDateTo] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadCount, setUploadCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);
  const [hoveredBar, setHoveredBar] = useState<{ index: number; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch documents from backend
  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      try {
        // ✅ OPTIMIZED: Use lightweight summary API for dashboard counts and stats
        const data = await pdfApi.getCustomerHeadersSummary();
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
        const data = await manualUploadApi.getManualUploads();
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

  // Calculate chart data dynamically based on time filter
  const getChartData = (): ChartDataPoint[] => {
    const today = new Date();
    const chartData: ChartDataPoint[] = [];

    if (timeFilter === "This Week") {
      // Show all 7 days of current week (Mon-Sun)
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday

      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dayName = dayNames[date.getDay()];

        const dayDocs = documents.filter((doc) => {
          const docDate = new Date(doc.createdAt);
          return docDate.toDateString() === date.toDateString();
        });

        const done = dayDocs.filter((d) => d.status === "approved_admin").length;
        const pending = dayDocs.filter((d) => d.status === "pending_approval" || d.status === "approved_salesman").length;
        const saved = dayDocs.filter((d) => d.status === "saved").length;
        const drafts = dayDocs.filter((d) => d.status === "draft").length;

        chartData.push({ label: dayName, done, pending, drafts, saved });
      }
    }
    else if (timeFilter === "This Month") {
      // Show 4 weeks of current month
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      for (let week = 1; week <= 4; week++) {
        const weekStart = new Date(startOfMonth);
        weekStart.setDate(1 + (week - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const weekDocs = documents.filter((doc) => {
          const docDate = new Date(doc.createdAt);
          return docDate >= weekStart && docDate <= weekEnd;
        });

        const done = weekDocs.filter((d) => d.status === "approved_admin").length;
        const pending = weekDocs.filter((d) => d.status === "pending_approval" || d.status === "approved_salesman").length;
        const saved = weekDocs.filter((d) => d.status === "saved").length;
        const drafts = weekDocs.filter((d) => d.status === "draft").length;

        chartData.push({ label: `Week ${week}`, done, pending, drafts, saved });
      }
    }
    else if (timeFilter === "This Year") {
      // Show all 12 months
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      for (let month = 0; month < 12; month++) {
        const monthDocs = documents.filter((doc) => {
          const docDate = new Date(doc.createdAt);
          return docDate.getFullYear() === today.getFullYear() && docDate.getMonth() === month;
        });

        const done = monthDocs.filter((d) => d.status === "approved_admin").length;
        const pending = monthDocs.filter((d) => d.status === "pending_approval" || d.status === "approved_salesman").length;
        const saved = monthDocs.filter((d) => d.status === "saved").length;
        const drafts = monthDocs.filter((d) => d.status === "draft").length;

        chartData.push({ label: monthNames[month], done, pending, drafts, saved });
      }
    }
    else if (timeFilter === "Date Range" && selectedDateFrom && selectedDateTo) {
      // Show data for the selected date range
      const dateDocs = documents.filter((doc) => {
        const docDate = new Date(doc.createdAt);
        return docDate >= selectedDateFrom && docDate <= selectedDateTo;
      });

      const done = dateDocs.filter((d) => d.status === "approved_admin").length;
      const pending = dateDocs.filter((d) => d.status === "pending_approval" || d.status === "approved_salesman").length;
      const saved = dateDocs.filter((d) => d.status === "saved").length;
      const drafts = dateDocs.filter((d) => d.status === "draft").length;

      const formattedRange = `${selectedDateFrom.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${selectedDateTo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      chartData.push({ label: formattedRange, done, pending, drafts, saved });
    }

    return chartData;
  };

  const chartData = getChartData();
  const pixelsPerUnit = 20; // Each document = 20px height

  const handleTimeFilterChange = (value: string) => {
    setTimeFilter(value);
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

  const agreementOptions = [
    {
      id: "create",
      title: "Create Agreement",
      description: "Create a new customer agreement with comprehensive service details and product selections",
      icon: faClipboardList,
      action: () => navigate("/form-filling"),
      buttonText: "Get Started →",
      buttonClass: "home__button-green",
      available: true,
    },
    {
      id: "extend",
      title: "Extend Agreement",
      description: "Extend an existing customer agreement with new terms and updated service packages",
      icon: faCalendarPlus,
      action: () => navigate("/form-filling"),
      buttonText: "Click to extend",
      buttonClass: "home__button-green",
      available: true,
    },
    {
      id: "edit",
      title: "Edit Agreement",
      description: "Modify existing agreement details, update services, or adjust product configurations",
      icon: faPencilAlt,
      action: () => navigate("/saved-pdfs"),
      buttonText: "Get Started →",
      buttonClass: "home__button-blue",
      available: true,
    },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles(filesArray);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      setUploadedFiles(filesArray);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) {
      setToastMessage({ message: "Please select at least one file", type: "error" });
      return;
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // Upload files one by one
      for (let i = 0; i < uploadedFiles.length; i++) {
        try {
          await manualUploadApi.uploadFile(uploadedFiles[i]);
          successCount++;
        } catch (err) {
          console.error(`Error uploading file ${uploadedFiles[i].name}:`, err);
          failCount++;
        }
      }

      // Show success message
      if (successCount > 0) {
        setToastMessage({
          message: `Successfully uploaded ${successCount} file(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
          type: successCount === uploadedFiles.length ? "success" : "error"
        });
        setUploadedFiles([]);

        // Refresh upload count
        const data = await manualUploadApi.getManualUploads();
        const newCount = data.items?.length || 0;
        console.log("📤 Upload Complete! New count:", newCount);
        setUploadCount(newCount);
      } else {
        setToastMessage({ message: "Failed to upload files. Please try again.", type: "error" });
      }
    } catch (err) {
      console.error("Error uploading files:", err);
      setToastMessage({ message: "Failed to upload files. Please try again.", type: "error" });
    } finally {
      setUploading(false);
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
              <div className="home__card-icon">
                <FontAwesomeIcon icon={option.icon} />
              </div>
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
                onChange={(e) => handleTimeFilterChange(e.target.value)}
              >
                <option>This Week</option>
                <option>This Month</option>
                <option>This Year</option>
                <option>Date Range</option>
              </select>
            </div>

            {showDatePicker && (
              <div className="home__date-picker-overlay" onClick={() => setShowDatePicker(false)}>
                <div className="home__date-picker-modal" onClick={(e) => e.stopPropagation()}>
                  <h3 className="home__date-picker-title">Select Date Range</h3>

                  <div className="home__date-range-inputs">
                    <div className="home__date-input-group">
                      <label className="home__date-label">From Date</label>
                      <input
                        type="date"
                        className="home__date-picker-input"
                        value={selectedDateFrom ? selectedDateFrom.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setSelectedDateFrom(new Date(e.target.value));
                          }
                        }}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div className="home__date-input-group">
                      <label className="home__date-label">To Date</label>
                      <input
                        type="date"
                        className="home__date-picker-input"
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

                  <div className="home__date-picker-actions">
                    <button
                      className="home__date-picker-apply"
                      onClick={handleDateRangeApply}
                      disabled={!selectedDateFrom || !selectedDateTo}
                    >
                      Apply
                    </button>
                    <button
                      className="home__date-picker-close"
                      onClick={() => setShowDatePicker(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="home__chart-loading">
                <p>Loading chart data...</p>
              </div>
            ) : (
              <>
                <div className="home__chart">
                  {chartData.map((data, index) => {
                    const doneHeight = Math.max(data.done * pixelsPerUnit, data.done > 0 ? 20 : 0);
                    const pendingHeight = Math.max(data.pending * pixelsPerUnit, data.pending > 0 ? 20 : 0);
                    const savedHeight = Math.max(data.saved * pixelsPerUnit, data.saved > 0 ? 20 : 0);
                    const draftsHeight = Math.max(data.drafts * pixelsPerUnit, data.drafts > 0 ? 20 : 0);

                    return (
                      <div key={index} className="home__chart-bar-group">
                        <div className="home__chart-bars">
                          {/* Done Bar */}
                          {data.done > 0 && (
                            <div
                              className="home__chart-bar home__chart-bar--done"
                              style={{ height: `${doneHeight}px` }}
                              onMouseEnter={() => setHoveredBar({ index, type: 'done' })}
                              onMouseLeave={() => setHoveredBar(null)}
                            >
                              {hoveredBar?.index === index && hoveredBar?.type === 'done' && (
                                <div className="home__chart-tooltip">
                                  <span className="home__chart-tooltip-label">Done: </span>
                                  <span className="home__chart-tooltip-value">{data.done}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Pending Bar */}
                          {data.pending > 0 && (
                            <div
                              className="home__chart-bar home__chart-bar--pending"
                              style={{ height: `${pendingHeight}px` }}
                              onMouseEnter={() => setHoveredBar({ index, type: 'pending' })}
                              onMouseLeave={() => setHoveredBar(null)}
                            >
                              {hoveredBar?.index === index && hoveredBar?.type === 'pending' && (
                                <div className="home__chart-tooltip">
                                  <span className="home__chart-tooltip-label">Pending: </span>
                                  <span className="home__chart-tooltip-value">{data.pending}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Saved Bar */}
                          {data.saved > 0 && (
                            <div
                              className="home__chart-bar home__chart-bar--saved"
                              style={{ height: `${savedHeight}px` }}
                              onMouseEnter={() => setHoveredBar({ index, type: 'saved' })}
                              onMouseLeave={() => setHoveredBar(null)}
                            >
                              {hoveredBar?.index === index && hoveredBar?.type === 'saved' && (
                                <div className="home__chart-tooltip">
                                  <span className="home__chart-tooltip-label">Saved: </span>
                                  <span className="home__chart-tooltip-value">{data.saved}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Drafts Bar */}
                          {data.drafts > 0 && (
                            <div
                              className="home__chart-bar home__chart-bar--drafts"
                              style={{ height: `${draftsHeight}px` }}
                              onMouseEnter={() => setHoveredBar({ index, type: 'drafts' })}
                              onMouseLeave={() => setHoveredBar(null)}
                            >
                              {hoveredBar?.index === index && hoveredBar?.type === 'drafts' && (
                                <div className="home__chart-tooltip">
                                  <span className="home__chart-tooltip-label">Drafts: </span>
                                  <span className="home__chart-tooltip-value">{data.drafts}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="home__chart-label">{data.label}</div>
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
                    Pending
                  </div>
                  <div className="home__legend-item">
                    <span className="home__legend-dot home__legend-dot--saved"></span>
                    Saved
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
          {/* <div className="home__upload-section">
            <h3 className="home__upload-title">Manual File Upload</h3>
            <div
              className="home__upload-area"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <div className="home__upload-icon">
                <FontAwesomeIcon icon={faCloudUpload} size="2x" />
              </div>
              <p className="home__upload-label">Drag and drop files here</p>
              <p className="home__upload-text">or click to browse</p>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                style={{ display: "none" }}
                multiple
              />
            </div>
            {uploadedFiles.length > 0 && (
              <div className="home__upload-files-list">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="home__upload-file-item">
                    <FontAwesomeIcon icon={faFileAlt} style={{ color: "#3b82f6", fontSize: "16px" }} />
                    <span className="home__upload-file-name">
                      {file.name}
                      <span className="home__upload-file-size"> ({formatFileSize(file.size)})</span>
                    </span>
                    <button
                      className="home__upload-file-remove"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                      title="Remove file"
                    >
                      <FontAwesomeIcon icon={faTrash} size="sm" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button className="home__upload-button" onClick={handleUpload} disabled={uploadedFiles.length === 0 || uploading}>
              <FontAwesomeIcon icon={faUpload} size="lg" />
              {uploading ? `Uploading ${uploadedFiles.length} file(s)...` : `Upload ${uploadedFiles.length > 0 ? uploadedFiles.length : ''} File${uploadedFiles.length !== 1 ? 's' : ''}`}
            </button>
            <p className="home__upload-formats">PDF, DOC, DOCX</p>
          </div> */}
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
