import { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from './auth';
import { pdfApi } from '../backendservice/api/pdfApi';
import './MyCommissions.css';

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

interface CommissionsResponse {
  success: boolean;
  user: string;
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

export default function MyCommissions() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CommissionsResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCommissions() {
      try {
        setLoading(true);
        setError(null);
        const response = await pdfApi.getUserCommissions();
        setData(response);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch commissions');
      } finally {
        setLoading(false);
      }
    }
    fetchCommissions();
  }, []);

  const filteredCommissions = useMemo(() => {
    if (!data?.commissions) return [];
    if (statusFilter === 'all') return data.commissions;
    return data.commissions.filter(c => {
      if (statusFilter === 'approved') {
        return c.status === 'approved_salesman' || c.status === 'approved_admin';
      }
      return c.status === statusFilter;
    });
  }, [data?.commissions, statusFilter]);

  if (loading) {
    return (
      <div className="my-commissions">
        <div className="my-commissions__loading">
          <div className="my-commissions__spinner" />
          <p>Loading your commissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-commissions">
        <div className="my-commissions__error">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="my-commissions">
        <div className="my-commissions__empty">
          <h2>No Data</h2>
          <p>No commission data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-commissions">
      <header className="my-commissions__header">
        <div className="my-commissions__title-row">
          <h1>My Commissions</h1>
          <span className="my-commissions__user-badge">
            {user?.fullName || user?.username}
          </span>
        </div>
        <p className="my-commissions__subtitle">
          Track your commission earnings across all agreements
        </p>
      </header>

      {/* Summary Cards */}
      <div className="my-commissions__summary-grid">
        <div className="my-commissions__summary-card my-commissions__summary-card--primary">
          <div className="my-commissions__summary-icon">$</div>
          <div className="my-commissions__summary-content">
            <span className="my-commissions__summary-label">Total Contract Commission</span>
            <span className="my-commissions__summary-value">
              {formatMoney(data.totals.totalContractCommission)}
            </span>
          </div>
        </div>

        <div className="my-commissions__summary-card">
          <div className="my-commissions__summary-icon">M</div>
          <div className="my-commissions__summary-content">
            <span className="my-commissions__summary-label">Monthly Commission</span>
            <span className="my-commissions__summary-value">
              {formatMoney(data.totals.totalMonthlyCommission)}
            </span>
          </div>
        </div>

        <div className="my-commissions__summary-card">
          <div className="my-commissions__summary-icon">#</div>
          <div className="my-commissions__summary-content">
            <span className="my-commissions__summary-label">Total Agreements</span>
            <span className="my-commissions__summary-value">
              {data.totals.totalAgreements}
            </span>
          </div>
        </div>

        <div className="my-commissions__summary-card">
          <div className="my-commissions__summary-icon">%</div>
          <div className="my-commissions__summary-content">
            <span className="my-commissions__summary-label">Avg Commission Rate</span>
            <span className="my-commissions__summary-value">
              {data.totals.averageCommissionRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="my-commissions__status-breakdown">
        <h3>By Status</h3>
        <div className="my-commissions__status-chips">
          <button
            className={`my-commissions__status-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({data.totals.totalAgreements})
          </button>
          {Object.entries(data.byStatus).map(([key, value]) => (
            value.count > 0 && (
              <button
                key={key}
                className={`my-commissions__status-chip ${statusFilter === key ? 'active' : ''}`}
                onClick={() => setStatusFilter(key)}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)} ({value.count})
                <span className="my-commissions__chip-amount">
                  {formatMoney(value.commission)}
                </span>
              </button>
            )
          ))}
        </div>
      </div>

      {/* Agreements List */}
      <div className="my-commissions__list">
        <h3>Agreements ({filteredCommissions.length})</h3>

        {filteredCommissions.length === 0 ? (
          <div className="my-commissions__no-results">
            <p>No agreements found for this filter.</p>
          </div>
        ) : (
          <div className="my-commissions__agreements">
            {filteredCommissions.map((agreement) => {
              const statusStyle = STATUS_COLORS[agreement.status] || STATUS_COLORS.draft;
              const isExpanded = expandedId === agreement.id;

              return (
                <div
                  key={agreement.id}
                  className={`my-commissions__agreement ${isExpanded ? 'expanded' : ''}`}
                >
                  <div
                    className="my-commissions__agreement-header"
                    onClick={() => setExpandedId(isExpanded ? null : agreement.id)}
                  >
                    <div className="my-commissions__agreement-info">
                      <h4 className="my-commissions__agreement-title">{agreement.title}</h4>
                      <div className="my-commissions__agreement-meta">
                        <span
                          className="my-commissions__status-badge"
                          style={{
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.text
                          }}
                        >
                          {STATUS_LABELS[agreement.status] || agreement.status}
                        </span>
                        <span className="my-commissions__meta-sep">·</span>
                        <span>{agreement.contractMonths} months</span>
                        <span className="my-commissions__meta-sep">·</span>
                        <span>{formatDate(agreement.createdAt)}</span>
                      </div>
                    </div>

                    <div className="my-commissions__agreement-amounts">
                      <div className="my-commissions__amount-item">
                        <span className="my-commissions__amount-label">Contract Value</span>
                        <span className="my-commissions__amount-value">
                          {formatMoney(agreement.contractValue)}
                        </span>
                      </div>
                      <div className="my-commissions__amount-item my-commissions__amount-item--commission">
                        <span className="my-commissions__amount-label">Commission</span>
                        <span className="my-commissions__amount-value">
                          {formatMoney(agreement.commission.total)}
                        </span>
                        <span className="my-commissions__rate-badge">
                          {agreement.commission.rate}%
                        </span>
                      </div>
                    </div>

                    <div className="my-commissions__expand-icon">
                      {isExpanded ? '−' : '+'}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="my-commissions__agreement-details">
                      <div className="my-commissions__breakdown">
                        <h5>Commission Breakdown</h5>
                        <div className="my-commissions__breakdown-grid">
                          <div className="my-commissions__breakdown-item">
                            <span>Monthly Value</span>
                            <span>{formatMoney(agreement.monthlyValue)}</span>
                          </div>
                          <div className="my-commissions__breakdown-item">
                            <span>Base Rate ({agreement.commission.breakdown.agreementTerm})</span>
                            <span>{agreement.commission.breakdown.baseRate}%</span>
                          </div>
                          <div className="my-commissions__breakdown-item">
                            <span>Agreement Multiplier</span>
                            <span>{agreement.commission.breakdown.multiplier}%</span>
                          </div>
                          {agreement.commission.breakdown.accountTypeAdjustment !== 0 && (
                            <div className="my-commissions__breakdown-item">
                              <span>Account Type Adjustment</span>
                              <span>{agreement.commission.breakdown.accountTypeAdjustment > 0 ? '+' : ''}{agreement.commission.breakdown.accountTypeAdjustment}%</span>
                            </div>
                          )}
                          {agreement.commission.breakdown.greenlineBonus > 0 && (
                            <div className="my-commissions__breakdown-item my-commissions__breakdown-item--bonus">
                              <span>Greenline Bonus</span>
                              <span>+{agreement.commission.breakdown.greenlineBonus}%</span>
                            </div>
                          )}
                          {agreement.commission.breakdown.insideSalesDeduction !== 0 && (
                            <div className="my-commissions__breakdown-item my-commissions__breakdown-item--deduction">
                              <span>Inside Sales Deduction</span>
                              <span>{agreement.commission.breakdown.insideSalesDeduction}%</span>
                            </div>
                          )}
                          <div className="my-commissions__breakdown-item my-commissions__breakdown-item--total">
                            <span>Final Rate</span>
                            <span>{agreement.commission.rate}%</span>
                          </div>
                          <div className="my-commissions__breakdown-item my-commissions__breakdown-item--total">
                            <span>Monthly Commission</span>
                            <span>{formatMoney(agreement.commission.monthly)}</span>
                          </div>
                          <div className="my-commissions__breakdown-item my-commissions__breakdown-item--total">
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
