import { useState, useEffect, useMemo } from 'react';
import { pdfApi } from '../backendservice/api/pdfApi';
import './AdminCommissions.css';

interface StatusCounts {
  draft: number;
  saved: number;
  pending_approval: number;
  approved: number;
  active: number;
}

interface EmployeeSummary {
  userId: string | null;
  totalAgreements: number;
  totalRevenue: number;
  totalCommission: number;
  
  statusCounts?: StatusCounts;
  totalMonthlyCommission?: number;
  totalContractCommission?: number;
  totalContractValue?: number;
  averageCommissionRate?: number;
}

interface EmployeesResponse {
  success: boolean;
  totalEmployees: number;
  employees: EmployeeSummary[];
}

interface CommissionBreakdown {
  baseRate: number;
  agreementTerm: string;
  multiplier: number;
  accountTypeAdjustment: number;
  greenlineBonus: number;
  insideSalesDeduction: number;
}

interface CommissionData {
  rate: number;
  monthly: number;
  total: number;
  breakdown: CommissionBreakdown;
}

interface AgreementCommission {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  startDate: string | null;
  contractMonths: number;
  monthlyValue: number;
  contractValue: number;
  commission: CommissionData;
}

interface CommissionTotals {
  totalAgreements: number;
  totalMonthlyCommission: number;
  totalContractCommission: number;
  totalContractValue: number;
  averageCommissionRate: number;
}

interface StatusSummary {
  count: number;
  commission: number;
}

interface EmployeeCommissionsResponse {
  success: boolean;
  employee: string;
  totals: CommissionTotals;
  byStatus: {
    draft: StatusSummary;
    saved: StatusSummary;
    pending: StatusSummary;
    approved: StatusSummary;
    active: StatusSummary;
  };
  commissions: AgreementCommission[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f3f4f6', text: '#6b7280' },
  saved: { bg: '#dbeafe', text: '#1d4ed8' },
  pending_approval: { bg: '#fef3c7', text: '#92400e' },
  approved_salesman: { bg: '#d1fae5', text: '#065f46' },
  approved_admin: { bg: '#064e3b', text: '#ffffff' },
  active: { bg: '#dcfce7', text: '#16a34a' },
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  saved: 'Saved',
  pending_approval: 'Pending',
  approved_salesman: 'Approved',
  approved_admin: 'Admin Approved',
  active: 'Active',
};

type TimeFilterType = 'all' | 'thisWeek' | 'last14Days' | 'thisMonth' | 'thisQuarter' | 'thisYear' | 'dateRange';

const TIME_FILTER_LABELS: Record<TimeFilterType, string> = {
  all: 'All Time',
  thisWeek: 'This Week',
  last14Days: 'Last 14 Days',
  thisMonth: 'This Month',
  thisQuarter: 'This Quarter',
  thisYear: 'This Year',
  dateRange: 'Date Range',
};

function getDateRange(filter: TimeFilterType, customStart?: string, customEnd?: string): { startDate?: string; endDate?: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case 'all':
      return {};

    case 'thisWeek': {
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek);
      return {
        startDate: startOfWeek.toISOString(),
        endDate: now.toISOString(),
      };
    }

    case 'last14Days': {
      const start = new Date(today);
      start.setDate(today.getDate() - 14);
      return {
        startDate: start.toISOString(),
        endDate: now.toISOString(),
      };
    }

    case 'thisMonth': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        startDate: startOfMonth.toISOString(),
        endDate: now.toISOString(),
      };
    }

    case 'thisQuarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      const startOfQuarter = new Date(today.getFullYear(), quarter * 3, 1);
      return {
        startDate: startOfQuarter.toISOString(),
        endDate: now.toISOString(),
      };
    }

    case 'thisYear': {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      return {
        startDate: startOfYear.toISOString(),
        endDate: now.toISOString(),
      };
    }

    case 'dateRange':
      if (customStart && customEnd) {
        return {
          startDate: new Date(customStart).toISOString(),
          endDate: new Date(customEnd + 'T23:59:59').toISOString(),
        };
      }
      return {};

    default:
      return {};
  }
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminCommissions() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeesData, setEmployeesData] = useState<EmployeesResponse | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employeeCommissions, setEmployeeCommissions] = useState<EmployeeCommissionsResponse | null>(null);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');
  const [customDateStart, setCustomDateStart] = useState<string>('');
  const [customDateEnd, setCustomDateEnd] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [timeFilter, customDateStart, customDateEnd]);

  async function fetchEmployees() {
    try {
      setLoading(true);
      setError(null);
      const dateRange = getDateRange(timeFilter, customDateStart, customDateEnd);
      const response = await pdfApi.getAllEmployeesCommissions(dateRange);
      setEmployeesData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch employees commissions');
    } finally {
      setLoading(false);
    }
  }

  async function fetchEmployeeCommissions(username: string) {
    try {
      setEmployeeLoading(true);
      setError(null);
      setSelectedEmployee(username);
      const dateRange = getDateRange(timeFilter, customDateStart, customDateEnd);
      const response = await pdfApi.getEmployeeCommissions(username, dateRange);
      setEmployeeCommissions(response);
      setStatusFilter('all');
      setExpandedId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch employee commissions');
    } finally {
      setEmployeeLoading(false);
    }
  }

  function goBackToEmployees() {
    setSelectedEmployee(null);
    setEmployeeCommissions(null);
    setStatusFilter('all');
    setExpandedId(null);
  }

  const filteredEmployees = useMemo(() => {
    if (!employeesData?.employees) return [];
    
    const validEmployees = employeesData.employees.filter(e => e.userId && e.userId.trim() !== '');
    if (!searchQuery.trim()) return validEmployees;
    const q = searchQuery.toLowerCase();
    return validEmployees.filter(e =>
      (e.userId || '').toLowerCase().includes(q)
    );
  }, [employeesData?.employees, searchQuery]);

  const filteredCommissions = useMemo(() => {
    if (!employeeCommissions?.commissions) return [];
    if (statusFilter === 'all') return employeeCommissions.commissions;
    return employeeCommissions.commissions.filter(c => {
      if (statusFilter === 'approved') {
        return c.status === 'approved_salesman' || c.status === 'approved_admin';
      }
      return c.status === statusFilter;
    });
  }, [employeeCommissions?.commissions, statusFilter]);

  if (loading) {
    return (
      <div className="admin-commissions">
        <div className="admin-commissions__loading">
          <div className="admin-commissions__spinner" />
          <p>Loading employee commissions...</p>
        </div>
      </div>
    );
  }

  if (error && !selectedEmployee) {
    return (
      <div className="admin-commissions">
        <div className="admin-commissions__error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchEmployees} className="admin-commissions__retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (selectedEmployee) {
    if (employeeLoading) {
      return (
        <div className="admin-commissions">
          <div className="admin-commissions__loading">
            <div className="admin-commissions__spinner" />
            <p>Loading commissions for {selectedEmployee}...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="admin-commissions">
          <div className="admin-commissions__error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={goBackToEmployees} className="admin-commissions__back-btn">
              ← Back to Employees
            </button>
          </div>
        </div>
      );
    }

    if (!employeeCommissions) {
      return (
        <div className="admin-commissions">
          <div className="admin-commissions__empty">
            <p>No commission data found for this employee.</p>
            <button onClick={goBackToEmployees} className="admin-commissions__back-btn">
              ← Back to Employees
            </button>
          </div>
        </div>
      );
    }

    const totals: CommissionTotals = employeeCommissions.totals || {
      totalAgreements: 0,
      totalMonthlyCommission: 0,
      totalContractCommission: 0,
      totalContractValue: 0,
      averageCommissionRate: 0,
    };

    const byStatus = employeeCommissions.byStatus || {
      draft: { count: 0, commission: 0 },
      saved: { count: 0, commission: 0 },
      pending: { count: 0, commission: 0 },
      approved: { count: 0, commission: 0 },
      active: { count: 0, commission: 0 },
    };

    return (
      <div className="admin-commissions">
        <header className="admin-commissions__header">
          <button onClick={goBackToEmployees} className="admin-commissions__back-btn">
            ← Back to Employees
          </button>
          <div className="admin-commissions__title-row">
            <h1>
              <span className="admin-commissions__employee-icon">{selectedEmployee.charAt(0).toUpperCase()}</span>
              {selectedEmployee}'s Commissions
            </h1>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="admin-commissions__summary-grid">
          <div className="admin-commissions__summary-card admin-commissions__summary-card--primary">
            <div className="admin-commissions__summary-icon">$</div>
            <div className="admin-commissions__summary-content">
              <span className="admin-commissions__summary-label">Total Contract Commission</span>
              <span className="admin-commissions__summary-value">
                {formatMoney(totals.totalContractCommission)}
              </span>
            </div>
          </div>

          <div className="admin-commissions__summary-card">
            <div className="admin-commissions__summary-icon">M</div>
            <div className="admin-commissions__summary-content">
              <span className="admin-commissions__summary-label">Monthly Commission</span>
              <span className="admin-commissions__summary-value">
                {formatMoney(totals.totalMonthlyCommission)}
              </span>
            </div>
          </div>

          <div className="admin-commissions__summary-card">
            <div className="admin-commissions__summary-icon">#</div>
            <div className="admin-commissions__summary-content">
              <span className="admin-commissions__summary-label">Total Agreements</span>
              <span className="admin-commissions__summary-value">
                {totals.totalAgreements}
              </span>
            </div>
          </div>

          <div className="admin-commissions__summary-card">
            <div className="admin-commissions__summary-icon">%</div>
            <div className="admin-commissions__summary-content">
              <span className="admin-commissions__summary-label">Avg Commission Rate</span>
              <span className="admin-commissions__summary-value">
                {totals.averageCommissionRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Status Filter */}
        <div className="admin-commissions__status-breakdown">
          <h3>Filter by Status</h3>
          <div className="admin-commissions__status-chips">
            <button
              className={`admin-commissions__status-chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({totals.totalAgreements})
            </button>
            {Object.entries(byStatus).map(([key, value]) => (
              value.count > 0 && (
                <button
                  key={key}
                  className={`admin-commissions__status-chip ${statusFilter === key ? 'active' : ''}`}
                  onClick={() => setStatusFilter(key)}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)} ({value.count})
                  <span className="admin-commissions__chip-amount">
                    {formatMoney(value.commission)}
                  </span>
                </button>
              )
            ))}
          </div>
        </div>

        {/* Agreements List */}
        <div className="admin-commissions__list">
          <h3>Agreements ({filteredCommissions.length})</h3>

          {filteredCommissions.length === 0 ? (
            <div className="admin-commissions__no-results">
              <p>No agreements found for this filter.</p>
            </div>
          ) : (
            <div className="admin-commissions__agreements">
              {filteredCommissions.map((agreement) => {
                const statusStyle = STATUS_COLORS[agreement.status] || STATUS_COLORS.draft;
                const isExpanded = expandedId === agreement.id;

                return (
                  <div
                    key={agreement.id}
                    className={`admin-commissions__agreement ${isExpanded ? 'expanded' : ''}`}
                  >
                    <div
                      className="admin-commissions__agreement-header"
                      onClick={() => setExpandedId(isExpanded ? null : agreement.id)}
                    >
                      <div className="admin-commissions__agreement-info">
                        <h4 className="admin-commissions__agreement-title">{agreement.title}</h4>
                        <div className="admin-commissions__agreement-meta">
                          <span
                            className="admin-commissions__status-badge"
                            style={{
                              backgroundColor: statusStyle.bg,
                              color: statusStyle.text
                            }}
                          >
                            {STATUS_LABELS[agreement.status] || agreement.status}
                          </span>
                          <span className="admin-commissions__meta-sep">·</span>
                          <span>{agreement.contractMonths} months</span>
                          <span className="admin-commissions__meta-sep">·</span>
                          <span>{formatDate(agreement.createdAt)}</span>
                        </div>
                      </div>

                      <div className="admin-commissions__agreement-amounts">
                        <div className="admin-commissions__amount-item">
                          <span className="admin-commissions__amount-label">Contract Value</span>
                          <span className="admin-commissions__amount-value">
                            {formatMoney(agreement.contractValue)}
                          </span>
                        </div>
                        <div className="admin-commissions__amount-item admin-commissions__amount-item--commission">
                          <span className="admin-commissions__amount-label">Commission</span>
                          <span className="admin-commissions__amount-value">
                            {formatMoney(agreement.commission.total)}
                          </span>
                          <span className="admin-commissions__rate-badge">
                            {agreement.commission.rate}%
                          </span>
                        </div>
                      </div>

                      <div className="admin-commissions__expand-icon">
                        {isExpanded ? '−' : '+'}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="admin-commissions__agreement-details">
                        <div className="admin-commissions__breakdown">
                          <h5>Commission Breakdown</h5>
                          <div className="admin-commissions__breakdown-grid">
                            <div className="admin-commissions__breakdown-item">
                              <span>Monthly Value</span>
                              <span>{formatMoney(agreement.monthlyValue)}</span>
                            </div>
                            <div className="admin-commissions__breakdown-item">
                              <span>Base Rate ({agreement.commission.breakdown.agreementTerm})</span>
                              <span>{agreement.commission.breakdown.baseRate}%</span>
                            </div>
                            <div className="admin-commissions__breakdown-item">
                              <span>Agreement Multiplier</span>
                              <span>{agreement.commission.breakdown.multiplier}%</span>
                            </div>
                            {agreement.commission.breakdown.accountTypeAdjustment !== 0 && (
                              <div className="admin-commissions__breakdown-item">
                                <span>Account Type Adjustment</span>
                                <span>{agreement.commission.breakdown.accountTypeAdjustment > 0 ? '+' : ''}{agreement.commission.breakdown.accountTypeAdjustment}%</span>
                              </div>
                            )}
                            {agreement.commission.breakdown.greenlineBonus > 0 && (
                              <div className="admin-commissions__breakdown-item admin-commissions__breakdown-item--bonus">
                                <span>Greenline Bonus</span>
                                <span>+{agreement.commission.breakdown.greenlineBonus}%</span>
                              </div>
                            )}
                            {agreement.commission.breakdown.insideSalesDeduction !== 0 && (
                              <div className="admin-commissions__breakdown-item admin-commissions__breakdown-item--deduction">
                                <span>Inside Sales Deduction</span>
                                <span>{agreement.commission.breakdown.insideSalesDeduction}%</span>
                              </div>
                            )}
                            <div className="admin-commissions__breakdown-item admin-commissions__breakdown-item--total">
                              <span>Final Rate</span>
                              <span>{agreement.commission.rate}%</span>
                            </div>
                            <div className="admin-commissions__breakdown-item admin-commissions__breakdown-item--total">
                              <span>Monthly Commission</span>
                              <span>{formatMoney(agreement.commission.monthly)}</span>
                            </div>
                            <div className="admin-commissions__breakdown-item admin-commissions__breakdown-item--total">
                              <span>Total Contract Commission</span>
                              <span>{formatMoney(agreement.commission.total)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Employee List View
  return (
    <div className="admin-commissions">
      <header className="admin-commissions__header">
        <div className="admin-commissions__title-row">
          <h1>Employee Commissions</h1>
          <span className="admin-commissions__admin-badge">Admin View</span>
        </div>
        <p className="admin-commissions__subtitle">
          View commission earnings for all employees
        </p>
      </header>

      {/* Time Filter Tabs */}
      <div className="admin-commissions__time-filters">
        <div className="admin-commissions__time-filter-tabs">
          {(Object.keys(TIME_FILTER_LABELS) as TimeFilterType[]).map((filter) => (
            <button
              key={filter}
              className={`admin-commissions__time-filter-tab ${timeFilter === filter ? 'active' : ''}`}
              onClick={() => {
                if (filter === 'dateRange') {
                  setShowDatePicker(true);
                  setTimeFilter(filter);
                } else {
                  setShowDatePicker(false);
                  setTimeFilter(filter);
                }
              }}
            >
              {TIME_FILTER_LABELS[filter]}
            </button>
          ))}
        </div>

        {showDatePicker && timeFilter === 'dateRange' && (
          <div className="admin-commissions__date-picker">
            <div className="admin-commissions__date-inputs">
              <div className="admin-commissions__date-field">
                <label>Start Date</label>
                <input
                  type="date"
                  value={customDateStart}
                  onChange={(e) => setCustomDateStart(e.target.value)}
                  className="admin-commissions__date-input"
                />
              </div>
              <div className="admin-commissions__date-field">
                <label>End Date</label>
                <input
                  type="date"
                  value={customDateEnd}
                  onChange={(e) => setCustomDateEnd(e.target.value)}
                  className="admin-commissions__date-input"
                />
              </div>
            </div>
            {customDateStart && customDateEnd && (
              <div className="admin-commissions__date-range-label">
                Showing data from {formatDate(customDateStart)} to {formatDate(customDateEnd)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Totals */}
      {employeesData && (
        <div className="admin-commissions__summary-grid">
          <div className="admin-commissions__summary-card admin-commissions__summary-card--primary">
            <div className="admin-commissions__summary-icon">$</div>
            <div className="admin-commissions__summary-content">
              <span className="admin-commissions__summary-label">Total Commission</span>
              <span className="admin-commissions__summary-value">
                {formatMoney(employeesData.employees?.reduce((sum, e) => sum + (e.totalCommission || 0), 0) || 0)}
              </span>
            </div>
          </div>

          <div className="admin-commissions__summary-card">
            <div className="admin-commissions__summary-icon">E</div>
            <div className="admin-commissions__summary-content">
              <span className="admin-commissions__summary-label">Total Employees</span>
              <span className="admin-commissions__summary-value">
                {employeesData.totalEmployees || employeesData.employees?.length || 0}
              </span>
            </div>
          </div>

          <div className="admin-commissions__summary-card">
            <div className="admin-commissions__summary-icon">#</div>
            <div className="admin-commissions__summary-content">
              <span className="admin-commissions__summary-label">Total Agreements</span>
              <span className="admin-commissions__summary-value">
                {employeesData.employees?.reduce((sum, e) => sum + (e.totalAgreements || 0), 0) || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="admin-commissions__search-section">
        <input
          type="text"
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="admin-commissions__search-input"
        />
      </div>

      {/* Employee List */}
      <div className="admin-commissions__employees-section">
        <h3>Employees ({filteredEmployees.length})</h3>

        {filteredEmployees.length === 0 ? (
          <div className="admin-commissions__no-results">
            <p>No employees found.</p>
          </div>
        ) : (
          <div className="admin-commissions__employees-grid">
            {filteredEmployees.map((employee, index) => (
              <div
                key={employee.userId || `employee-${index}`}
                className="admin-commissions__employee-card"
                onClick={() => {
                  if (employee.userId && employee.userId.trim() !== '') {
                    fetchEmployeeCommissions(employee.userId);
                  }
                }}
              >
                <div className="admin-commissions__employee-header">
                  <div className="admin-commissions__employee-avatar">
                    {(employee.userId || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="admin-commissions__employee-info">
                    <h4 className="admin-commissions__employee-name">{employee.userId || 'Unknown'}</h4>
                    <span className="admin-commissions__employee-agreements">
                      {employee.totalAgreements || 0} agreement{(employee.totalAgreements || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="admin-commissions__employee-arrow">→</div>
                </div>

                <div className="admin-commissions__employee-stats">
                  <div className="admin-commissions__employee-stat">
                    <span className="admin-commissions__stat-label">Commission</span>
                    <span className="admin-commissions__stat-value admin-commissions__stat-value--commission">
                      {formatMoney(employee.totalCommission || 0)}
                    </span>
                  </div>
                </div>

                <div className="admin-commissions__employee-status-row">
                  {employee.statusCounts?.draft > 0 && (
                    <span className="admin-commissions__mini-badge admin-commissions__mini-badge--draft">
                      {employee.statusCounts.draft} Draft
                    </span>
                  )}
                  {employee.statusCounts?.saved > 0 && (
                    <span className="admin-commissions__mini-badge admin-commissions__mini-badge--saved">
                      {employee.statusCounts.saved} Saved
                    </span>
                  )}
                  {employee.statusCounts?.pending_approval > 0 && (
                    <span className="admin-commissions__mini-badge admin-commissions__mini-badge--pending">
                      {employee.statusCounts.pending_approval} Pending
                    </span>
                  )}
                  {employee.statusCounts?.approved > 0 && (
                    <span className="admin-commissions__mini-badge admin-commissions__mini-badge--approved">
                      {employee.statusCounts.approved} Approved
                    </span>
                  )}
                  {employee.statusCounts?.active > 0 && (
                    <span className="admin-commissions__mini-badge admin-commissions__mini-badge--active">
                      {employee.statusCounts.active} Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
