import React, { useState, useEffect, useCallback } from "react";
import { quotaApi, salesPersonApi } from "../../../backendservice/api/quotaApi";
import type {
  SalesPerson,
  QuotaStatusResponse,
  LeaderboardEntry,
} from "../../../backendservice/types/quota.types";
import {
  formatCurrency,
  formatPercentage,
  getQuotaLevelColor,
  getQuotaLevelBgColor,
  getQuotaCommissionRate,
} from "../../../backendservice/types/quota.types";

interface QuotaDashboardProps {
  onViewAgreements?: (salesPersonId: string) => void;
}

export const QuotaDashboard: React.FC<QuotaDashboardProps> = ({ onViewAgreements }) => {
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatusResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesPersonsLoaded, setSalesPersonsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSalesPersons = async () => {
      const result = await salesPersonApi.getAll({ active: true });
      if (result) {
        setSalesPersons(result.data);
        if (result.data.length > 0 && !selectedPerson) {
          setSelectedPerson(result.data[0].employeeId);
        }
      }
      setSalesPersonsLoaded(true);
    };
    loadSalesPersons();
  }, []);

  useEffect(() => {
    const loadLeaderboard = async () => {
      const result = await quotaApi.getLeaderboard({ periodType: "monthly" });
      if (result) {
        setLeaderboard(result.leaderboard);
      }
    };
    loadLeaderboard();
  }, []);

  useEffect(() => {
    const loadQuotaStatus = async () => {
      if (!selectedPerson) {
        
        if (salesPersonsLoaded) {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      const result = await quotaApi.getStatus(selectedPerson, { periodType: "monthly" });
      if (result) {
        setQuotaStatus(result);
      } else {
        setError("Failed to load quota status");
      }
      setLoading(false);
    };

    loadQuotaStatus();
  }, [selectedPerson, salesPersonsLoaded]);

  const handlePersonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPerson(e.target.value);
  };

  return (
    <div className="quota-dashboard">
      {}
      <div className="dashboard-header">
        <div className="person-selector">
          <label>Sales Person:</label>
          <select value={selectedPerson || ""} onChange={handlePersonChange}>
            {salesPersons.map((sp) => (
              <option key={sp.employeeId} value={sp.employeeId}>
                {sp.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading quota data...</div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : salesPersons.length === 0 ? (
        <div className="empty-state-container">
          <div className="empty-state-icon">👥</div>
          <h3>No Employees Found</h3>
          <p>Employees are managed in <strong>User Management</strong>. Add employees there to start tracking quotas.</p>
        </div>
      ) : quotaStatus ? (
        <div className="dashboard-grid">
          {}
          <div className="dashboard-card quota-progress-card">
            <h3>Quota Progress - {quotaStatus.period.label}</h3>
            <div className="quota-meter">
              <div className="quota-info">
                <span className="quota-actual">{formatCurrency(quotaStatus.quota.actual)}</span>
                <span className="quota-divider">/</span>
                <span className="quota-target">{formatCurrency(quotaStatus.quota.target)}</span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{
                    width: `${Math.min(quotaStatus.quota.percentage, 200)}%`,
                    backgroundColor: getQuotaLevelColor(quotaStatus.quota.level),
                  }}
                />
                <div className="progress-marker marker-100" style={{ left: "50%" }}>
                  <span>100%</span>
                </div>
                <div className="progress-marker marker-200" style={{ left: "100%" }}>
                  <span>200%</span>
                </div>
              </div>
              <div className="quota-percentage">{formatPercentage(quotaStatus.quota.percentage)}</div>
            </div>

            <div
              className="quota-level-badge"
              style={{
                backgroundColor: getQuotaLevelBgColor(quotaStatus.quota.level),
                color: getQuotaLevelColor(quotaStatus.quota.level),
              }}
            >
              {quotaStatus.quota.level.toUpperCase()} QUOTA
              <span className="commission-rate">
                ({getQuotaCommissionRate(quotaStatus.quota.level)}% commission rate)
              </span>
            </div>
          </div>

          {}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Agreements Closed</div>
              <div className="stat-value">{quotaStatus.progress.agreementCount}</div>
              <div className="stat-breakdown">
                <span>{quotaStatus.progress.newBusinessCount} new</span>
                <span>{quotaStatus.progress.renewalCount} renewals</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Commission Earned</div>
              <div className="stat-value">{formatCurrency(quotaStatus.commission.earned)}</div>
              <div className="stat-note">This month</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">To Reach Quota</div>
              <div className="stat-value">{formatCurrency(quotaStatus.progress.toReachQuota)}</div>
              <div className="stat-note">Remaining sales needed</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">To Reach Double</div>
              <div className="stat-value">{formatCurrency(quotaStatus.progress.toReachDouble)}</div>
              <div className="stat-note">For 9% commission rate</div>
            </div>
          </div>

          {}
          <div className="dashboard-card recent-agreements">
            <div className="card-header">
              <h3>Recent Agreements</h3>
              {onViewAgreements && (
                <button
                  className="view-all-btn"
                  onClick={() => onViewAgreements(selectedPerson || "")}
                >
                  View All
                </button>
              )}
            </div>
            {quotaStatus.recentAgreements.length === 0 ? (
              <div className="empty-state">No agreements this period</div>
            ) : (
              <table className="agreements-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Monthly Value</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {quotaStatus.recentAgreements.map((agreement) => (
                    <tr key={agreement._id}>
                      <td>{agreement.customer?.name || 'Unknown'}</td>
                      <td>{formatCurrency(agreement.monthlyValue)}</td>
                      <td>
                        <span className={`account-type-badge ${(agreement.accountType || 'anchor').toLowerCase()}`}>
                          {agreement.accountType || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${agreement.status}`}>
                          {agreement.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {}
          <div className="dashboard-card leaderboard">
            <h3>Monthly Leaderboard</h3>
            {leaderboard.length === 0 ? (
              <div className="empty-state">No data for this period</div>
            ) : (
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Sales</th>
                    <th>Quota %</th>
                    <th>Deals</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.slice(0, 10).map((entry) => (
                    <tr
                      key={entry.salesPersonId}
                      className={entry.salesPersonId === selectedPerson ? "highlighted" : ""}
                    >
                      <td className="rank-cell">
                        {entry.rank <= 3 ? (
                          <span className={`rank-badge rank-${entry.rank}`}>{entry.rank}</span>
                        ) : (
                          entry.rank
                        )}
                      </td>
                      <td>{entry.salesPersonName}</td>
                      <td>{formatCurrency(entry.actualSales)}</td>
                      <td>
                        <span
                          className="quota-badge"
                          style={{
                            backgroundColor: getQuotaLevelBgColor(entry.quotaLevel),
                            color: getQuotaLevelColor(entry.quotaLevel),
                          }}
                        >
                          {formatPercentage(entry.quotaPercentage)}
                        </span>
                      </td>
                      <td>{entry.agreementCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state">Select a sales person to view quota status</div>
      )}
    </div>
  );
};
