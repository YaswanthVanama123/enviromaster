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

type StatusCounts = {
  done: number;
  pending: number;
  drafts: number;
  saved: number;
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

  // ✅ OPTIMIZED: Store counts directly instead of full documents
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    done: 0,
    pending: 0,
    drafts: 0,
    saved: 0
  });
  const [chartTimeSeries, setChartTimeSeries] = useState<any[] | null>(null); // ✅ NEW: Store time-series data from backend
  const [loading, setLoading] = useState(true);
  const [uploadCount, setUploadCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);
  const [hoveredBar, setHoveredBar] = useState<{ index: number; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  // ✅ OPTIMIZED: Fetch counts using optimized API with date range and grouping
  useEffect(() => {
    const fetchStatusCounts = async () => {
      setLoading(true);
      try {
        // Calculate date range based on selected filter
        const today = new Date();
        let startDate, endDate, groupBy;

        switch (timeFilter) {
          case "This Week":
            // ✅ FIXED: Use ISO week (Monday-Saturday) to match backend
            // Get current day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
            const dayOfWeek = today.getDay();

            // Get start of ISO week (Monday)
            const startOfWeek = new Date(today);
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days; else go back to Monday
            startOfWeek.setDate(today.getDate() - daysToMonday);
            startOfWeek.setHours(0, 0, 0, 0);

            // Get end of ISO week (Sunday)
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            // ✅ FIX: Format dates in YYYY-MM-DD format (no timezone conversion)
            startDate = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
            endDate = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`;
            groupBy = 'day';
            break;

          case "This Month":
            // Get start of current month (1st day)
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            // Get end of current month (last day)
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            // ✅ FIX: Format dates in YYYY-MM-DD format (no timezone conversion)
            startDate = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfMonth.getDate()).padStart(2, '0')}`;
            endDate = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;
            groupBy = 'week';
            break;

          case "This Year":
            // Get start of current year (January 1st)
            const startOfYear = new Date(today.getFullYear(), 0, 1);

            // Get end of current year (December 31st)
            const endOfYear = new Date(today.getFullYear(), 11, 31);

            // ✅ FIX: Format dates in YYYY-MM-DD format (no timezone conversion)
            startDate = `${startOfYear.getFullYear()}-${String(startOfYear.getMonth() + 1).padStart(2, '0')}-${String(startOfYear.getDate()).padStart(2, '0')}`;
            endDate = `${endOfYear.getFullYear()}-${String(endOfYear.getMonth() + 1).padStart(2, '0')}-${String(endOfYear.getDate()).padStart(2, '0')}`;
            groupBy = 'month';
            break;

          case "Date Range":
            if (selectedDateFrom && selectedDateTo) {
              // ✅ FIX: Format dates in YYYY-MM-DD format (no timezone conversion)
              startDate = `${selectedDateFrom.getFullYear()}-${String(selectedDateFrom.getMonth() + 1).padStart(2, '0')}-${String(selectedDateFrom.getDate()).padStart(2, '0')}`;
              endDate = `${selectedDateTo.getFullYear()}-${String(selectedDateTo.getMonth() + 1).padStart(2, '0')}-${String(selectedDateTo.getDate()).padStart(2, '0')}`;
              groupBy = 'day';
            }
            break;

          default:
            // No filter, get all data
            startDate = null;
            endDate = null;
            groupBy = 'day';
        }

        console.log(`📊 [FRONTEND] Requesting data with filter: ${timeFilter}, startDate: ${startDate}, endDate: ${endDate}, groupBy: ${groupBy}`);

        // Use the optimized count API with date range and grouping
        const result = await pdfApi.getDocumentStatusCounts({
          startDate,
          endDate,
          groupBy
        });

        console.log("📊 Fetched Document Status Counts:", result);

        // Store the time-series data from backend
        if (result.timeSeries) {
          setChartTimeSeries(result.timeSeries);
        } else {
          // Fallback to legacy total counts format
          setStatusCounts({
            done: result.counts.done,
            pending: result.counts.pending,
            drafts: result.counts.drafts,
            saved: result.counts.saved
          });
          setChartTimeSeries(null);
        }
      } catch (err) {
        console.error("Error fetching status counts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatusCounts();
  }, [timeFilter, selectedDateFrom, selectedDateTo]); // ✅ Refetch when filter changes

  // ✅ REMOVED: Manual upload API call for optimization (not used on Home page)
  // useEffect(() => {
  //   const fetchUploadStats = async () => {
  //     try {
  //       const data = await manualUploadApi.getManualUploads();
  //       const uploads = data.items || [];
  //       console.log("📤 Manual Uploads:", uploads);
  //       console.log("📤 Total Upload Count:", uploads.length);
  //       setUploadCount(uploads.length);
  //     } catch (err) {
  //       console.error("Error fetching upload stats:", err);
  //     }
  //   };

  //   fetchUploadStats();
  // }, []);

  // ✅ ENHANCED: Calculate chart data using actual backend time-series data
  const getChartData = (): ChartDataPoint[] => {
    const today = new Date();
    const chartData: ChartDataPoint[] = [];

    // ✅ NEW: Use actual time-series data from backend if available
    if (chartTimeSeries && chartTimeSeries.length > 0) {
      if (timeFilter === "This Week") {
        // ✅ FIXED: Map backend data to ISO week day names (Mon-Sun)
        const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const startOfWeek = new Date(today);
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(today.getDate() - daysToMonday);

        // Create a map of date to data
        const dataMap = new Map();
        chartTimeSeries.forEach(item => {
          dataMap.set(item.period, item);
        });

        // Generate chart data for all 7 days (Mon-Sun)
        for (let i = 0; i < 7; i++) {
          const date = new Date(startOfWeek);
          date.setDate(startOfWeek.getDate() + i);
          const dayName = dayNames[i]; // Monday=0, Tuesday=1, ..., Sunday=6
          const dateKey = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD

          const dayData = dataMap.get(dateKey);
          chartData.push({
            label: dayName,
            done: dayData?.done || 0,
            pending: dayData?.pending || 0,
            saved: dayData?.saved || 0,
            drafts: dayData?.drafts || 0,
          });
        }
      }
      else if (timeFilter === "This Month") {
        // Map backend weekly data to Week 1, Week 2, etc.
        chartTimeSeries.forEach((item, index) => {
          chartData.push({
            label: `Week ${index + 1}`,
            done: item.done || 0,
            pending: item.pending || 0,
            saved: item.saved || 0,
            drafts: item.drafts || 0,
          });
        });
      }
      else if (timeFilter === "This Year") {
        // Map backend monthly data to Jan, Feb, Mar, etc.
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const dataMap = new Map();
        const currentYear = today.getFullYear();

        chartTimeSeries.forEach(item => {
          // item.period format: "2026-01", "2026-02", etc.
          const [year, monthStr] = item.period.split('-');

          // ✅ FIXED: Only include data from the current year (filter out previous/next years)
          if (parseInt(year) === currentYear) {
            const month = parseInt(monthStr) - 1; // 0-based (0=Jan, 11=Dec)
            dataMap.set(month, item);
          }
        });

        // Generate chart data for all 12 months
        for (let month = 0; month < 12; month++) {
          const monthData = dataMap.get(month);
          chartData.push({
            label: monthNames[month],
            done: monthData?.done || 0,
            pending: monthData?.pending || 0,
            saved: monthData?.saved || 0,
            drafts: monthData?.drafts || 0,
          });
        }
      }
      else if (timeFilter === "Date Range" && selectedDateFrom && selectedDateTo) {
        // Show data for the selected date range
        chartTimeSeries.forEach(item => {
          const date = new Date(item.period);
          const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          chartData.push({
            label,
            done: item.done || 0,
            pending: item.pending || 0,
            saved: item.saved || 0,
            drafts: item.drafts || 0,
          });
        });
      }

      return chartData;
    }

    // ✅ FALLBACK: If no time-series data, use legacy distributed counts
    if (timeFilter === "This Week") {
      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const startOfWeek = new Date(today);
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startOfWeek.setDate(today.getDate() - daysToMonday);

      const totalDays = 7;
      for (let i = 0; i < totalDays; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dayName = dayNames[i];

        chartData.push({
          label: dayName,
          done: Math.floor(statusCounts.done / totalDays) + (i === 0 ? statusCounts.done % totalDays : 0),
          pending: Math.floor(statusCounts.pending / totalDays) + (i === 0 ? statusCounts.pending % totalDays : 0),
          saved: Math.floor(statusCounts.saved / totalDays) + (i === 0 ? statusCounts.saved % totalDays : 0),
          drafts: Math.floor(statusCounts.drafts / totalDays) + (i === 0 ? statusCounts.drafts % totalDays : 0),
        });
      }
    }
    else if (timeFilter === "This Month") {
      // Show 4 weeks of current month
      for (let week = 1; week <= 4; week++) {
        const isCurrentWeek = week === Math.ceil(today.getDate() / 7);
        chartData.push({
          label: `Week ${week}`,
          done: isCurrentWeek ? statusCounts.done : 0,
          pending: isCurrentWeek ? statusCounts.pending : 0,
          saved: isCurrentWeek ? statusCounts.saved : 0,
          drafts: isCurrentWeek ? statusCounts.drafts : 0,
        });
      }
    }
    else if (timeFilter === "This Year") {
      // Show all 12 months
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentMonth = today.getMonth();

      for (let month = 0; month < 12; month++) {
        const isCurrentMonth = month === currentMonth;
        chartData.push({
          label: monthNames[month],
          done: isCurrentMonth ? statusCounts.done : 0,
          pending: isCurrentMonth ? statusCounts.pending : 0,
          saved: isCurrentMonth ? statusCounts.saved : 0,
          drafts: isCurrentMonth ? statusCounts.drafts : 0,
        });
      }
    }
    else if (timeFilter === "Date Range" && selectedDateFrom && selectedDateTo) {
      // Show data for the selected date range
      const formattedRange = `${selectedDateFrom.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${selectedDateTo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      chartData.push({
        label: formattedRange,
        done: statusCounts.done,
        pending: statusCounts.pending,
        saved: statusCounts.saved,
        drafts: statusCounts.drafts,
      });
    }

    return chartData;
  };

  const chartData = getChartData();

  // ✅ FIX: Calculate proper scaling to fit bars within container
  // Find the maximum total value across all bars to normalize heights
  const maxTotal = Math.max(
    ...chartData.map(data => data.done + data.pending + data.saved + data.drafts),
    1 // Minimum 1 to avoid division by zero
  );

  // Container height minus some padding for labels
  const maxBarHeight = 280; // Leave space for labels and padding

  // Calculate height as percentage of max value, fitting within container
  const getBarHeight = (value: number) => {
    if (value === 0) return 0;
    // Scale to fit within maxBarHeight, with minimum 20px for visibility
    return Math.max((value / maxTotal) * maxBarHeight, 20);
  };

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

  // ✅ NEW: Handle closing date picker - revert to "This Month" if dates not selected
  const handleDatePickerClose = () => {
    if (!selectedDateFrom || !selectedDateTo) {
      // If dates aren't fully selected, revert back to "This Month"
      setTimeFilter("This Month");
      setSelectedDateFrom(null);
      setSelectedDateTo(null);
    }
    setShowDatePicker(false);
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

        // ✅ REMOVED: Manual upload count refresh (not used on Home page)
        // const data = await manualUploadApi.getManualUploads();
        // const newCount = data.items?.length || 0;
        // console.log("📤 Upload Complete! New count:", newCount);
        // setUploadCount(newCount);
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
          <h1 className="home__title">Welcome to Enviro-Master</h1>
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
              <div className="home__date-picker-overlay" onClick={handleDatePickerClose}>
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
                      onClick={handleDatePickerClose}
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
                    const doneHeight = getBarHeight(data.done);
                    const pendingHeight = getBarHeight(data.pending);
                    const savedHeight = getBarHeight(data.saved);
                    const draftsHeight = getBarHeight(data.drafts);

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
                  {/* <div className="home__legend-item">
                    <span className="home__legend-dot home__legend-dot--done"></span>
                    Done
                  </div> */}
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
