import { useState, useEffect } from 'react';
import { useAuthContext } from './auth';
import { quotaApi } from '../backendservice/api/quotaApi';
import type { QuotaStatusResponse, QuotaPeriod } from '../backendservice/types/quota.types';
import './MyQuota.css';

type PeriodType = 'monthly' | 'quarterly' | 'annual';

const PERIOD_LABELS: Record<PeriodType, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

const QUOTA_LEVEL_CONFIG = {
  below: { label: 'Below Quota', color: '#dc2626', bgColor: '#fee2e2', rate: '3%', rateValue: 3 },
  above: { label: 'Above Quota', color: '#2563eb', bgColor: '#dbeafe', rate: '6%', rateValue: 6 },
  double: { label: 'Double Quota', color: '#16a34a', bgColor: '#dcfce7', rate: '9%', rateValue: 9 },
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

export default function MyQuota() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatusResponse | null>(null);
  const [quotaHistory, setQuotaHistory] = useState<QuotaPeriod[]>([]);
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');

  useEffect(() => {
    async function fetchQuotaData() {
      if (!user?.username) return;

      try {
        setLoading(true);
        setError(null);

        const [statusResult, historyResult] = await Promise.all([
          quotaApi.getStatus(user.username, { periodType }),
          quotaApi.getHistory(user.username, 6),
        ]);

        if (statusResult) {
          setQuotaStatus(statusResult);
        }
        if (historyResult) {
          setQuotaHistory(historyResult);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch quota data');
      } finally {
        setLoading(false);
      }
    }

    fetchQuotaData();
  }, [user?.username, periodType]);

  if (loading) {
    return (
      <div className="my-quota">
        <div className="my-quota__loading">
          <div className="my-quota__spinner" />
          <p>Loading your quota...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-quota">
        <div className="my-quota__error">
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!quotaStatus) {
    return (
      <div className="my-quota">
        <div className="my-quota__empty">
          <h2>No Quota Data</h2>
          <p>No quota data available for your account.</p>
        </div>
      </div>
    );
  }

  const levelConfig = QUOTA_LEVEL_CONFIG[quotaStatus.quota.level];
  const progressPercentage = Math.min(quotaStatus.quota.percentage, 200);

  return (
    <div className="my-quota">
      <header className="my-quota__header">
        <div className="my-quota__title-row">
          <h1>My Quota</h1>
          <span className="my-quota__user-badge">
            {user?.fullName || user?.username}
          </span>
        </div>
        <p className="my-quota__subtitle">
          Track your sales quota progress
        </p>
      </header>

      {}
      <div className="my-quota__period-toggle">
        {(Object.keys(PERIOD_LABELS) as PeriodType[]).map((type) => (
          <button
            key={type}
            className={`my-quota__period-btn ${periodType === type ? 'active' : ''}`}
            onClick={() => setPeriodType(type)}
          >
            {PERIOD_LABELS[type]}
          </button>
        ))}
      </div>

      {}
      <div className="my-quota__current-period">
        <div className="my-quota__period-header">
          <h2>{quotaStatus.period.label}</h2>
          <span
            className="my-quota__level-badge"
            style={{ backgroundColor: levelConfig.bgColor, color: levelConfig.color }}
          >
            {levelConfig.label} ({levelConfig.rate})
          </span>
        </div>

        {}
        <div className="my-quota__progress-container">
          <div className="my-quota__progress-bar">
            <div
              className="my-quota__progress-fill"
              style={{
                width: `${progressPercentage / 2}%`,
                backgroundColor: levelConfig.color,
              }}
            />
            <div className="my-quota__progress-markers">
              <div className="my-quota__marker" style={{ left: '50%' }}>
                <span>100%</span>
              </div>
              <div className="my-quota__marker" style={{ left: '100%' }}>
                <span>200%</span>
              </div>
            </div>
          </div>
          <div className="my-quota__progress-label">
            {quotaStatus.quota.percentage.toFixed(1)}% of quota
          </div>
        </div>

        {}
        <div className="my-quota__stats-grid">
          <div className="my-quota__stat-card">
            <span className="my-quota__stat-label">Target</span>
            <span className="my-quota__stat-value">{formatMoney(quotaStatus.quota.target)}</span>
          </div>
          <div className="my-quota__stat-card">
            <span className="my-quota__stat-label">Actual Sales</span>
            <span className="my-quota__stat-value">{formatMoney(quotaStatus.quota.actual)}</span>
          </div>
          <div className="my-quota__stat-card">
            <span className="my-quota__stat-label">Commission Rate</span>
            <span className="my-quota__stat-value">{quotaStatus.quota.commissionRate}%</span>
          </div>
          <div className="my-quota__stat-card">
            <span className="my-quota__stat-label">Earned</span>
            <span className="my-quota__stat-value">{formatMoney(quotaStatus.commission.earned)}</span>
          </div>
        </div>
      </div>

      {}
      <div className="my-quota__next-tier">
        <h3>Progress to Next Tier</h3>
        <div className="my-quota__tier-grid">
          {quotaStatus.quota.level === 'below' && (
            <div className="my-quota__tier-card">
              <span className="my-quota__tier-label">To reach quota (6% rate):</span>
              <span className="my-quota__tier-value">{formatMoney(quotaStatus.progress.toReachQuota)}</span>
            </div>
          )}
          {quotaStatus.quota.level !== 'double' && (
            <div className="my-quota__tier-card">
              <span className="my-quota__tier-label">To reach double (9% rate):</span>
              <span className="my-quota__tier-value">{formatMoney(quotaStatus.progress.toReachDouble)}</span>
            </div>
          )}
          {quotaStatus.quota.level === 'double' && (
            <div className="my-quota__tier-card my-quota__tier-card--achieved">
              <span className="my-quota__tier-label">You've reached the highest tier!</span>
              <span className="my-quota__tier-value">9% Commission</span>
            </div>
          )}
        </div>
      </div>

      {/* Agreement Stats */}
      <div className="my-quota__agreement-stats">
        <h3>Agreement Stats</h3>
        <div className="my-quota__agreement-grid">
          <div className="my-quota__agreement-stat">
            <span className="my-quota__agreement-value">{quotaStatus.progress.agreementCount}</span>
            <span className="my-quota__agreement-label">Total Agreements</span>
          </div>
          <div className="my-quota__agreement-stat">
            <span className="my-quota__agreement-value">{quotaStatus.progress.newBusinessCount}</span>
            <span className="my-quota__agreement-label">New Business</span>
          </div>
          <div className="my-quota__agreement-stat">
            <span className="my-quota__agreement-value">{quotaStatus.progress.renewalCount}</span>
            <span className="my-quota__agreement-label">Renewals</span>
          </div>
        </div>
      </div>

      {/* Recent Agreements */}
      {quotaStatus.recentAgreements && quotaStatus.recentAgreements.length > 0 && (
        <div className="my-quota__recent">
          <h3>Recent Agreements</h3>
          <div className="my-quota__recent-list">
            {quotaStatus.recentAgreements.map((agreement) => (
              <div key={agreement._id} className="my-quota__recent-item">
                <div className="my-quota__recent-info">
                  <span className="my-quota__recent-customer">{agreement.customer.name}</span>
                  <span className="my-quota__recent-date">{formatDate(agreement.signedDate)}</span>
                </div>
                <div className="my-quota__recent-value">
                  {formatMoney(agreement.monthlyValue)}/mo
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quota History */}
      {quotaHistory.length > 0 && (
        <div className="my-quota__history">
          <h3>Quota History</h3>
          <div className="my-quota__history-list">
            {quotaHistory.map((period) => {
              const periodConfig = QUOTA_LEVEL_CONFIG[period.quotaLevel];
              return (
                <div key={period._id} className="my-quota__history-item">
                  <div className="my-quota__history-period">
                    <span className="my-quota__history-label">{period.periodLabel}</span>
                    <span
                      className="my-quota__history-badge"
                      style={{ backgroundColor: periodConfig.bgColor, color: periodConfig.color }}
                    >
                      {period.quotaPercentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="my-quota__history-details">
                    <span>{formatMoney(period.actualSales)} / {formatMoney(period.quotaTarget)}</span>
                    <span>{period.agreementCount} agreements</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
