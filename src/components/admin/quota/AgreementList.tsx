import React, { useState, useEffect, useCallback } from "react";
import { agreementApi, salesPersonApi } from "../../../backendservice/api/quotaApi";
import type {
  Agreement,
  SalesPerson,
  AgreementStatus,
} from "../../../backendservice/types/quota.types";
import {
  formatCurrency,
  getAgreementTermLabel,
  getAgreementStatusColor,
} from "../../../backendservice/types/quota.types";
import {
  getAccountTypeColor,
  getAccountTypeBgColor,
} from "../../../backendservice/types/accountType.types";

interface AgreementListProps {
  initialSalesPersonId?: string | null;
  onClearFilter: () => void;
}

export const AgreementList: React.FC<AgreementListProps> = ({
  initialSalesPersonId,
  onClearFilter,
}) => {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);

  const [filterSalesPersonId, setFilterSalesPersonId] = useState(initialSalesPersonId || "");
  const [filterStatus, setFilterStatus] = useState<AgreementStatus | "">("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    const load = async () => {
      const result = await salesPersonApi.getAll({ active: true });
      if (result) {
        setSalesPersons(result.data);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (initialSalesPersonId) {
      setFilterSalesPersonId(initialSalesPersonId);
    }
  }, [initialSalesPersonId]);

  const loadAgreements = useCallback(async (resetPagination = false) => {
    setLoading(true);
    const currentSkip = resetPagination ? 0 : skip;

    const result = await agreementApi.getAll({
      salesPersonId: filterSalesPersonId || undefined,
      status: filterStatus || undefined,
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
      limit,
      skip: currentSkip,
    });

    if (result) {
      if (resetPagination) {
        setAgreements(result.data);
        setSkip(0);
      } else {
        setAgreements(result.data);
      }
      setTotal(result.pagination.total);
      setHasMore(result.pagination.hasMore);
    }
    setLoading(false);
  }, [filterSalesPersonId, filterStatus, filterStartDate, filterEndDate, skip]);

  useEffect(() => {
    loadAgreements(true);
  }, [filterSalesPersonId, filterStatus, filterStartDate, filterEndDate]);

  const handleClearFilters = () => {
    setFilterSalesPersonId("");
    setFilterStatus("");
    setFilterStartDate("");
    setFilterEndDate("");
    onClearFilter();
  };

  const handleStatusChange = async (agreementId: string, newStatus: AgreementStatus) => {
    const result = await agreementApi.updateStatus(agreementId, newStatus);
    if (result) {
      setAgreements((prev) =>
        prev.map((a) => (a._id === agreementId ? { ...a, status: newStatus } : a))
      );
      if (selectedAgreement?._id === agreementId) {
        setSelectedAgreement({ ...selectedAgreement, status: newStatus });
      }
    }
  };

  const handleLoadMore = () => {
    setSkip((prev) => prev + limit);
  };

  useEffect(() => {
    if (skip > 0) {
      loadAgreements(false);
    }
  }, [skip]);

  return (
    <div className="agreement-list-container">
      {}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Sales Person</label>
          <select
            value={filterSalesPersonId}
            onChange={(e) => setFilterSalesPersonId(e.target.value)}
          >
            <option value="">All Sales Persons</option>
            {salesPersons.map((sp) => (
              <option key={sp.employeeId} value={sp.employeeId}>
                {sp.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="filter-group">
          <label>From Date</label>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>To Date</label>
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
          />
        </div>
        <button className="clear-filters-btn" onClick={handleClearFilters}>
          Clear Filters
        </button>
      </div>

      {}
      <div className="results-info">
        Showing {agreements.length} of {total} agreements
      </div>

      {loading && agreements.length === 0 ? (
        <div className="loading-state">Loading agreements...</div>
      ) : agreements.length === 0 ? (
        <div className="empty-state">No agreements found matching your filters.</div>
      ) : (
        <>
          <div className="agreements-grid">
            {agreements.map((agreement) => (
              <div
                key={agreement._id}
                className={`agreement-card ${selectedAgreement?._id === agreement._id ? "selected" : ""}`}
                onClick={() => setSelectedAgreement(agreement)}
              >
                <div className="agreement-header">
                  <span className="agreement-number">{agreement.agreementNumber}</span>
                  <span
                    className="status-badge"
                    style={{
                      backgroundColor: `${getAgreementStatusColor(agreement.status)}20`,
                      color: getAgreementStatusColor(agreement.status),
                    }}
                  >
                    {agreement.status.replace("_", " ")}
                  </span>
                </div>
                <div className="agreement-customer">{agreement.customer.name}</div>
                <div className="agreement-details">
                  <div className="detail-row">
                    <span className="label">Monthly Value:</span>
                    <span className="value">{formatCurrency(agreement.monthlyValue)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Term:</span>
                    <span className="value">{getAgreementTermLabel(agreement.agreementTerm)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Account Type:</span>
                    <span
                      className="account-type-badge"
                      style={{
                        backgroundColor: getAccountTypeBgColor(agreement.accountType),
                        color: getAccountTypeColor(agreement.accountType),
                      }}
                    >
                      {agreement.accountType}
                    </span>
                  </div>
                </div>
                <div className="agreement-footer">
                  <span className="sales-person">{agreement.salesPerson.name}</span>
                  <span className="signed-date">
                    {new Date(agreement.signedDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="load-more-container">
              <button className="load-more-btn" onClick={handleLoadMore} disabled={loading}>
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}

      {}
      {selectedAgreement && (
        <div className="detail-panel">
          <div className="detail-panel-header">
            <h3>Agreement Details</h3>
            <button className="close-btn" onClick={() => setSelectedAgreement(null)}>
              &times;
            </button>
          </div>
          <div className="detail-panel-content">
            <div className="detail-section">
              <h4>Basic Information</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Agreement #</span>
                  <span className="value">{selectedAgreement.agreementNumber}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Customer</span>
                  <span className="value">{selectedAgreement.customer.name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Sales Person</span>
                  <span className="value">{selectedAgreement.salesPerson.name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Status</span>
                  <select
                    value={selectedAgreement.status}
                    onChange={(e) =>
                      handleStatusChange(selectedAgreement._id, e.target.value as AgreementStatus)
                    }
                    style={{ color: getAgreementStatusColor(selectedAgreement.status) }}
                  >
                    <option value="draft">Draft</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>Financial Details</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Monthly Value</span>
                  <span className="value">{formatCurrency(selectedAgreement.monthlyValue)}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Total Contract</span>
                  <span className="value">
                    {formatCurrency(selectedAgreement.totalContractValue)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Agreement Term</span>
                  <span className="value">
                    {getAgreementTermLabel(selectedAgreement.agreementTerm)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Pricing Line</span>
                  <span className="value">{selectedAgreement.pricingLine}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>Commission Details</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Quota Level (at time)</span>
                  <span className="value">{selectedAgreement.commission.quotaLevelAtTime}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Final Commission Rate</span>
                  <span className="value">
                    {selectedAgreement.commission.finalCommissionRate.toFixed(2)}%
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Weekly Commission</span>
                  <span className="value">
                    {formatCurrency(selectedAgreement.commission.weeklyCommission)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Total Commission</span>
                  <span className="value">
                    {formatCurrency(selectedAgreement.commission.totalCommission)}
                  </span>
                </div>
              </div>
              <div className="commission-breakdown">
                <h5>Breakdown:</h5>
                <ul>
                  <li>
                    Base Rate: {selectedAgreement.commission.breakdown.baseRate}%
                  </li>
                  <li>
                    Agreement Multiplier: {selectedAgreement.commission.breakdown.agreementMultiplier}%
                  </li>
                  <li>
                    Account Type Adj: {selectedAgreement.commission.breakdown.accountTypeAdjustment}%
                  </li>
                  {selectedAgreement.commission.breakdown.greenlineBonus !== 0 && (
                    <li>
                      Greenline Bonus: +{selectedAgreement.commission.breakdown.greenlineBonus}%
                    </li>
                  )}
                  {selectedAgreement.commission.breakdown.renewalBonus !== 0 && (
                    <li>
                      Renewal Bonus: +{selectedAgreement.commission.breakdown.renewalBonus}%
                    </li>
                  )}
                  {selectedAgreement.commission.breakdown.insideSalesDeduction !== 0 && (
                    <li>
                      Inside Sales: {selectedAgreement.commission.breakdown.insideSalesDeduction}%
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {selectedAgreement.notes && (
              <div className="detail-section">
                <h4>Notes</h4>
                <p className="notes-text">{selectedAgreement.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
