import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState("Today");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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

  const chartData = [
    { day: "J", done: 70, pending: 60, drafts: 50 },
    { day: "M", done: 120, pending: 80, drafts: 60 },
    { day: "T", done: 180, pending: 100, drafts: 80 },
    { day: "W", done: 140, pending: 90, drafts: 70 },
    { day: "T", done: 200, pending: 120, drafts: 90 },
    { day: "A", done: 220, pending: 140, drafts: 100 },
  ];

  const maxValue = 400;

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

  const handleUpload = () => {
    if (uploadedFile) {
      alert(`Uploading: ${uploadedFile.name}`);
      // Add actual upload logic here
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
            <div className="home__chart">
              {chartData.map((data, index) => {
                const total = data.done + data.pending + data.drafts;
                const doneHeight = (data.done / maxValue) * 100;
                const pendingHeight = (data.pending / maxValue) * 100;
                const draftsHeight = (data.drafts / maxValue) * 100;

                return (
                  <div key={index} className="home__chart-bar-group">
                    <div className="home__chart-bars">
                      <div
                        className="home__chart-bar home__chart-bar--done"
                        style={{ height: `${doneHeight}%` }}
                      ></div>
                      <div
                        className="home__chart-bar home__chart-bar--pending"
                        style={{ height: `${pendingHeight}%` }}
                      ></div>
                      <div
                        className="home__chart-bar home__chart-bar--drafts"
                        style={{ height: `${draftsHeight}%` }}
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
              <p className="home__upload-text">Drag and drop a file here</p>
              <div className="home__upload-icon">⬆️</div>
              <p className="home__upload-label">Upload File</p>
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
                Selected: {uploadedFile.name}
              </p>
            )}
            <button className="home__upload-button" onClick={handleUpload}>
              Upload File
            </button>
            <p className="home__upload-formats">PDF, DOCK</p>
          </div>
        </div>
      </div>
    </section>
  );
}
