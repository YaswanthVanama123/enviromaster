import React, { useState, useEffect, useCallback } from "react";
import { FaCalendarAlt, FaCog, FaUsers, FaHistory, FaDollarSign, FaChevronDown, FaChevronUp, FaSave, FaSync, FaDownload, FaFileInvoiceDollar } from "react-icons/fa";
import { apiClient } from "../../../backendservice/utils/apiClient";
import { PayrollSlipModal } from "./PayrollSlipModal";
import "./PayrollTab.css";

interface PayrollSettings {
  startDate: string | null;
  cycleType: "weekly" | "biweekly" | "monthly";
  cycleDayOfWeek: number;
}

interface PayrollPeriod {
  start: string;
  end: string;
  label: string;
}

interface EmployeeAgreement {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  monthlyValue: number;
  annualCommission: number;
  weeklyCommission: number;
}

interface EmployeePayroll {
  username: string;
  totalAgreements: number;
  totalMonthlyRevenue: number;
  totalAnnualCommission: number;
  totalWeeklyCommission: number;
  statusCounts: {
    draft: number;
    saved: number;
    pending_approval: number;
    approved: number;
    active: number;
  };
  agreements: EmployeeAgreement[];
}

interface PayrollTotals {
  totalEmployees: number;
  totalAgreements: number;
  totalMonthlyRevenue: number;
  totalAnnualCommission: number;
  totalWeeklyCommission: number;
}

type SubTab = "overview" | "settings" | "history";

const CYCLE_TYPES = [
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "Bi-Weekly" },
  { key: "monthly", label: "Monthly" },
] as const;

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export const PayrollTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<PayrollSettings>({
    startDate: null,
    cycleType: "biweekly",
    cycleDayOfWeek: 1,
  });
  const [originalSettings, setOriginalSettings] = useState<PayrollSettings | null>(null);

  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
  const [previousPeriod, setPreviousPeriod] = useState<PayrollPeriod | null>(null);

  const [employees, setEmployees] = useState<EmployeePayroll[]>([]);
  const [totals, setTotals] = useState<PayrollTotals | null>(null);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  const [history, setHistory] = useState<any[]>([]);

  const [viewingPayrollSlip, setViewingPayrollSlip] = useState<EmployeePayroll | null>(null);

  const loadPayrollData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [periodsRes, employeesRes] = await Promise.all([
        apiClient.get<any>("/api/payroll/periods"),
        apiClient.get<any>("/api/payroll/employees"),
      ]);

      if (periodsRes.data?.success) {
        setSettings(periodsRes.data.settings);
        setOriginalSettings(periodsRes.data.settings);
        setCurrentPeriod(periodsRes.data.periods.current);
        setPreviousPeriod(periodsRes.data.periods.previous);
      }

      if (employeesRes.data?.success) {
        setEmployees(employeesRes.data.employees);
        setTotals(employeesRes.data.totals);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await apiClient.get<any>("/api/payroll/history?limit=12");
      if (res.data?.success) {
        setHistory(res.data.history);
      }
    } catch (err) {
      console.error("Failed to load payroll history:", err);
    }
  }, []);

  useEffect(() => {
    loadPayrollData();
  }, [loadPayrollData]);

  useEffect(() => {
    if (activeSubTab === "history") {
      loadHistory();
    }
  }, [activeSubTab, loadHistory]);

  const hasChanges = originalSettings
    ? settings.startDate !== originalSettings.startDate ||
      settings.cycleType !== originalSettings.cycleType ||
      settings.cycleDayOfWeek !== originalSettings.cycleDayOfWeek
    : false;

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const res = await apiClient.patch<any>("/api/admin-settings", {
        payrollSettings: settings,
      });

      if (res.data?.success) {
        setOriginalSettings(settings);
        setSuccessMessage("Payroll settings saved successfully!");
        setTimeout(() => setSuccessMessage(null), 3000);
        loadPayrollData();
      } else {
        setError("Failed to save settings");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const exportToCSV = () => {
    if (!employees.length || !currentPeriod) return;

    const headers = [
      "Salesperson",
      "Agreements",
      "Monthly Revenue",
      "Total Commission",
      "Draft",
      "Saved",
      "Pending",
      "Approved",
      "Active"
    ];

    const rows = employees.map(emp => [
      emp.username,
      emp.totalAgreements,
      emp.totalMonthlyRevenue.toFixed(2),
      emp.totalAnnualCommission.toFixed(2),
      emp.statusCounts.draft,
      emp.statusCounts.saved,
      emp.statusCounts.pending_approval,
      emp.statusCounts.approved,
      emp.statusCounts.active
    ]);

    if (totals) {
      rows.push([
        "TOTAL",
        totals.totalAgreements,
        totals.totalMonthlyRevenue.toFixed(2),
        totals.totalAnnualCommission.toFixed(2),
        "",
        "",
        "",
        "",
        ""
      ]);
    }

    const agreementHeaders = [
      "",
      "",
      "Agreement Title",
      "Created Date",
      "Status",
      "Monthly Value",
      "Commission"
    ];

    let csvContent = `Payroll Report: ${currentPeriod.label}\n`;
    csvContent += `Period: ${formatDate(currentPeriod.start)} - ${formatDate(currentPeriod.end)}\n\n`;
    csvContent += headers.join(",") + "\n";
    csvContent += rows.map(row => row.join(",")).join("\n");

    csvContent += "\n\n--- Agreement Details ---\n";
    csvContent += agreementHeaders.join(",") + "\n";

    employees.forEach(emp => {
      emp.agreements.forEach(agreement => {
        csvContent += [
          emp.username,
          "",
          `"${agreement.title.replace(/"/g, '""')}"`,
          formatDate(agreement.createdAt),
          agreement.status,
          agreement.monthlyValue.toFixed(2),
          agreement.annualCommission.toFixed(2)
        ].join(",") + "\n";
      });
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-${currentPeriod.label.replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="payroll-tab-container">
        <div className="payroll-loading">
          <div className="payroll-spinner" />
          <p>Loading payroll data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payroll-tab-container">
      <div className="payroll-header">
        <div className="payroll-header-icon">
          <FaCalendarAlt />
        </div>
        <div>
          <h2>Payroll Management</h2>
          <p className="payroll-subtitle">
            Manage payroll periods, settings, and view employee commission data
          </p>
        </div>
      </div>

      {error && (
        <div className="payroll-error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {successMessage && (
        <div className="payroll-success-banner">
          <span>{successMessage}</span>
        </div>
      )}

      <div className="payroll-subtab-bar">
        <button
          className={`payroll-subtab-btn ${activeSubTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveSubTab("overview")}
        >
          <FaUsers />
          Current Period
        </button>
        <button
          className={`payroll-subtab-btn ${activeSubTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveSubTab("settings")}
        >
          <FaCog />
          Settings
        </button>
        <button
          className={`payroll-subtab-btn ${activeSubTab === "history" ? "active" : ""}`}
          onClick={() => setActiveSubTab("history")}
        >
          <FaHistory />
          History
        </button>
      </div>

      <div className="payroll-content">
        {activeSubTab === "overview" && (
          <div className="payroll-overview">
            {/* Period Info */}
            <div className="payroll-period-card">
              <div className="period-header">
                <h3>Current Payroll Period</h3>
                <div className="period-actions">
                  <button className="refresh-btn" onClick={loadPayrollData}>
                    <FaSync /> Refresh
                  </button>
                  <button className="export-btn" onClick={exportToCSV} disabled={!employees.length}>
                    <FaDownload /> Export CSV
                  </button>
                </div>
              </div>
              {currentPeriod && (
                <div className="period-info">
                  <span className="period-label">{currentPeriod.label}</span>
                  <span className="period-dates">
                    {formatDate(currentPeriod.start)} - {formatDate(currentPeriod.end)}
                  </span>
                </div>
              )}
            </div>

            {/* Summary Cards */}
            {totals && (
              <div className="payroll-summary-grid">
                <div className="payroll-summary-card primary">
                  <div className="summary-icon">
                    <FaDollarSign />
                  </div>
                  <div className="summary-content">
                    <span className="summary-label">Total Commission Payout</span>
                    <span className="summary-value">{formatMoney(totals.totalAnnualCommission)}</span>
                    <span className="summary-note">Full commission for this period</span>
                  </div>
                </div>
                <div className="payroll-summary-card">
                  <span className="summary-label">Salespeople</span>
                  <span className="summary-value">{totals.totalEmployees}</span>
                </div>
                <div className="payroll-summary-card">
                  <span className="summary-label">Agreements</span>
                  <span className="summary-value">{totals.totalAgreements}</span>
                </div>
                <div className="payroll-summary-card">
                  <span className="summary-label">Total Revenue</span>
                  <span className="summary-value">{formatMoney(totals.totalMonthlyRevenue)}</span>
                </div>
              </div>
            )}

            {/* Employee List */}
            <div className="payroll-employees-section">
              <h3>Salesperson Commissions</h3>
              {employees.length === 0 ? (
                <div className="payroll-empty">
                  <p>No agreements found for this period.</p>
                </div>
              ) : (
                <div className="payroll-employees-list">
                  {employees.map((emp) => (
                    <div
                      key={emp.username}
                      className={`payroll-employee-card ${expandedEmployee === emp.username ? "expanded" : ""}`}
                    >
                      <div
                        className="employee-header"
                        onClick={() =>
                          setExpandedEmployee(
                            expandedEmployee === emp.username ? null : emp.username
                          )
                        }
                      >
                        <div className="employee-avatar">
                          {emp.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="employee-info">
                          <span className="employee-name">{emp.username}</span>
                          <span className="employee-meta">
                            {emp.totalAgreements} agreements · {formatMoney(emp.totalMonthlyRevenue)}/mo
                          </span>
                        </div>
                        <div className="employee-commission">
                          <span className="commission-amount">
                            {formatMoney(emp.totalAnnualCommission)}
                          </span>
                          <span className="commission-label">Period Commission</span>
                        </div>
                        <button
                          className="view-payroll-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingPayrollSlip(emp);
                          }}
                        >
                          <FaFileInvoiceDollar /> View Payroll
                        </button>
                        <div className="expand-icon">
                          {expandedEmployee === emp.username ? <FaChevronUp /> : <FaChevronDown />}
                        </div>
                      </div>

                      {expandedEmployee === emp.username && (
                        <div className="employee-details">
                          <div className="status-breakdown">
                            <span className="status-chip draft">Draft: {emp.statusCounts.draft}</span>
                            <span className="status-chip saved">Saved: {emp.statusCounts.saved}</span>
                            <span className="status-chip pending">Pending: {emp.statusCounts.pending_approval}</span>
                            <span className="status-chip approved">Approved: {emp.statusCounts.approved}</span>
                            <span className="status-chip active">Active: {emp.statusCounts.active}</span>
                          </div>
                          <div className="agreements-list">
                            <h4>Agreements</h4>
                            {emp.agreements.map((agreement) => (
                              <div key={agreement.id} className="agreement-item">
                                <div className="agreement-info">
                                  <span className="agreement-title">{agreement.title}</span>
                                  <span className="agreement-date">{formatDate(agreement.createdAt)}</span>
                                </div>
                                <div className="agreement-values">
                                  <span className="agreement-revenue">{formatMoney(agreement.monthlyValue)}/mo</span>
                                  <span className="agreement-commission">{formatMoney(agreement.annualCommission)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeSubTab === "settings" && (
          <div className="payroll-settings">
            <div className="settings-section">
              <h3>
                <FaCalendarAlt /> Payroll Start Date
              </h3>
              <p className="settings-hint">
                The date from which payroll calculations begin. Commissions will be tracked from this date.
              </p>
              <input
                type="date"
                className="settings-input"
                value={settings.startDate ? settings.startDate.split("T")[0] : ""}
                onChange={(e) =>
                  setSettings({ ...settings, startDate: e.target.value || null })
                }
              />
              {settings.startDate && (
                <div className="settings-preview">
                  Selected: {new Date(settings.startDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              )}
            </div>

            <div className="settings-section">
              <h3>
                <FaCog /> Payroll Cycle Type
              </h3>
              <p className="settings-hint">How often payroll is calculated.</p>
              <div className="cycle-type-options">
                {CYCLE_TYPES.map((type) => (
                  <button
                    key={type.key}
                    className={`cycle-type-btn ${settings.cycleType === type.key ? "active" : ""}`}
                    onClick={() => setSettings({ ...settings, cycleType: type.key })}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {(settings.cycleType === "weekly" || settings.cycleType === "biweekly") && (
              <div className="settings-section">
                <h3>
                  <FaCalendarAlt /> Cycle Day of Week
                </h3>
                <p className="settings-hint">The day when the payroll cycle starts/ends.</p>
                <select
                  className="settings-select"
                  value={settings.cycleDayOfWeek}
                  onChange={(e) =>
                    setSettings({ ...settings, cycleDayOfWeek: Number(e.target.value) })
                  }
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="settings-footer">
              <button
                className="save-settings-btn"
                onClick={handleSaveSettings}
                disabled={!hasChanges || saving}
              >
                <FaSave />
                {saving ? "Saving..." : "Save Settings"}
              </button>
              {!hasChanges && !saving && (
                <span className="no-changes-text">No unsaved changes</span>
              )}
            </div>
          </div>
        )}

        {activeSubTab === "history" && (
          <div className="payroll-history">
            <h3>Payroll History</h3>
            <p className="history-subtitle">Past payroll periods and their totals</p>

            {history.length === 0 ? (
              <div className="payroll-empty">
                <p>No payroll history available.</p>
              </div>
            ) : (
              <div className="history-list">
                {history.map((period, idx) => (
                  <div key={idx} className={`history-card ${idx === 0 ? "current" : ""}`}>
                    <div className="history-period">
                      <span className="history-label">{period.period.label}</span>
                      {idx === 0 && <span className="current-badge">Current</span>}
                    </div>
                    <div className="history-stats">
                      <div className="history-stat">
                        <span className="stat-value">{period.employeeCount}</span>
                        <span className="stat-label">Salespeople</span>
                      </div>
                      <div className="history-stat">
                        <span className="stat-value">{period.totalAgreements}</span>
                        <span className="stat-label">Agreements</span>
                      </div>
                      <div className="history-stat">
                        <span className="stat-value">{formatMoney(period.totalRevenue)}</span>
                        <span className="stat-label">Revenue</span>
                      </div>
                      <div className="history-stat highlight">
                        <span className="stat-value">{formatMoney(period.totalCommission)}</span>
                        <span className="stat-label">Commission</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payroll Slip Modal */}
      {viewingPayrollSlip && currentPeriod && (
        <PayrollSlipModal
          employee={viewingPayrollSlip}
          period={currentPeriod}
          onClose={() => setViewingPayrollSlip(null)}
        />
      )}
    </div>
  );
};
