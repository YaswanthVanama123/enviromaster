import React, { useState, useEffect } from "react";
import { commissionApi, CommissionRecordsResponse } from "../../../backendservice/api/commissionApi";
import type { CommissionRecord } from "../../../backendservice/types/commission.types";

export const CommissionHistory: React.FC = () => {
  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchRecords();
  }, [statusFilter, page]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await commissionApi.getRecords({
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
        limit: 20,
      });

      if (response.data) {
        setRecords(response.data.records);
        setTotalPages(response.data.totalPages);
      }
    } catch (err) {
      setError("Failed to load commission history");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadgeClass = (status: string) => {
    return `status-badge ${status}`;
  };

  if (loading && records.length === 0) {
    return (
      <div className="loading-state">
        <span>Loading commission history...</span>
      </div>
    );
  }

  return (
    <div className="commission-history">
      <div className="history-header">
        <h3 className="calculator-section-title">
          <span>H</span> Commission History
        </h3>

        <div className="history-filters">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {records.length === 0 ? (
        <div className="empty-state">
          <p>No commission records found.</p>
        </div>
      ) : (
        <>
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Sales Person</th>
                <th>Monthly Value</th>
                <th>Commission Rate</th>
                <th>Weekly Commission</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record._id}>
                  <td>{formatDate(record.createdAt)}</td>
                  <td>{record.customerName || "-"}</td>
                  <td>{record.salesPersonName}</td>
                  <td>
                    {formatCurrency(record.calculation.input.monthlyValue)}
                  </td>
                  <td>{record.calculation.finalCommissionRate.toFixed(2)}%</td>
                  <td>
                    {formatCurrency(record.calculation.weeklyCommission)}
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(record.status)}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "8px",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  background: page === 1 ? "#f3f4f6" : "white",
                  cursor: page === 1 ? "not-allowed" : "pointer",
                }}
              >
                Previous
              </button>
              <span style={{ padding: "8px 16px", color: "#6b7280" }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  background: page === totalPages ? "#f3f4f6" : "white",
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
