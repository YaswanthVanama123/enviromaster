

import React, { useState, useEffect } from 'react';
import { biginAuditApi } from '../../../backendservice/api/biginAuditApi';
import { userManagementApi } from '../../../backendservice/api/userManagementApi';
import './InsideSalesCheckTab.css';

interface Employee {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  isActive: boolean;
}

interface InsideSalesResult {
  salespersonName: string;
  isInsideSales: boolean;
  matchCount: number;
  totalAgreementsByUser?: number;
  agreementCount?: number;
  biginIdCount?: number;
  allBiginIds?: string[];
  agreementDetails?: Array<{
    agreementId?: string;
    biginId: string | null;
    title: string;
    createdAt: string;
    createdBy?: string;
    dealName?: string;
  }>;
  matchedBiginIds?: string[];
  message?: string;
  matchDetails: Array<{
    recordId?: string;
    recordName: string;
    action: string;
    timestamp: string;
    module: string;
  }>;
}

export const InsideSalesCheckTab: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<InsideSalesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const response = await userManagementApi.listUsers({ role: 'employee', limit: 200 });
        if (response?.users) {
          setEmployees(response.users.filter(u => u.role === 'employee'));
        }
      } catch (err) {
        console.error('Error loading employees:', err);
        setError('Failed to load employees');
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, []);

  const handleCheck = async () => {
    if (!selectedEmployee) {
      setError('Please select an employee');
      return;
    }

    const employee = employees.find(e => e.id === selectedEmployee);
    if (!employee) return;

    setChecking(true);
    setError(null);
    setResult(null);

    try {
      
      const nameToCheck = employee.fullName || employee.username;
      console.log('Checking inside sales for:', nameToCheck);

      const response = await biginAuditApi.checkInsideSalesEligibility(nameToCheck);

      if (response?.success && response.data) {
        setResult(response.data);
      } else {
        setError('Failed to check inside sales eligibility');
      }
    } catch (err) {
      console.error('Error checking inside sales:', err);
      setError('Error checking inside sales eligibility');
    } finally {
      setChecking(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="inside-sales-check-tab">
      {}
      <div className="isc-header">
        <div className="isc-header-content">
          <h2>Inside Sales Check</h2>
          <p className="isc-subtitle">Check if an employee has Inside Sales eligibility based on Lisa Rothwell's audit history</p>
        </div>
      </div>

      {/* Selection Card */}
      <div className="isc-selection-card">
        <div className="isc-selection-row">
          <div className="isc-select-group">
            <label htmlFor="employee-select">Select Employee</label>
            <select
              id="employee-select"
              value={selectedEmployee}
              onChange={(e) => {
                setSelectedEmployee(e.target.value);
                setResult(null);
                setError(null);
              }}
              disabled={loading || checking}
            >
              <option value="">-- Select an Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName || emp.username} {emp.email ? `(${emp.email})` : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            className="isc-check-btn"
            onClick={handleCheck}
            disabled={!selectedEmployee || checking}
          >
            {checking ? (
              <>
                <span className="isc-spinner"></span>
                Checking...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                Check Eligibility
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="isc-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* Result Card */}
      {result && (
        <div className={`isc-result-card ${result.isInsideSales ? 'has-deduction' : 'no-deduction'}`}>
          <div className="isc-result-header">
            <div className="isc-result-icon">
              {result.isInsideSales ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
            </div>
            <div className="isc-result-status">
              <h3>{result.salespersonName}</h3>
              <p className="isc-status-text">
                {result.isInsideSales ? (
                  <span className="status-has-deduction">Inside Sales (3% Deduction)</span>
                ) : (
                  <span className="status-no-deduction">No Inside Sales Deduction</span>
                )}
              </p>
              <p className="isc-match-count">
                {result.totalAgreementsByUser !== undefined && (
                  <>{result.totalAgreementsByUser} total agreement{result.totalAgreementsByUser !== 1 ? 's' : ''} • </>
                )}
                {result.agreementCount !== undefined && (
                  <>{result.agreementCount} with Bigin ID{result.agreementCount !== 1 ? 's' : ''} • </>
                )}
                {result.matchCount} audit record{result.matchCount !== 1 ? 's' : ''} matched (last 1 year)
              </p>
              {result.message && (
                <p className="isc-match-count" style={{ fontStyle: 'italic' }}>{result.message}</p>
              )}
            </div>
          </div>

          {result.matchCount > 0 && result.matchDetails.length > 0 && (
            <div className="isc-match-details">
              <h4>Matching Audit Records</h4>
              <div className="isc-matches-table">
                <table>
                  <thead>
                    <tr>
                      <th>Bigin ID</th>
                      <th>Record Name</th>
                      <th>Action</th>
                      <th>Module</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.matchDetails.map((match, idx) => (
                      <tr key={idx}>
                        <td>{match.recordId || '-'}</td>
                        <td>{match.recordName || '-'}</td>
                        <td>
                          <span className="isc-action-badge">{match.action}</span>
                        </td>
                        <td>{match.module || '-'}</td>
                        <td>{formatDate(match.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Agreements with Bigin IDs */}
          <div className="isc-match-details" style={{ marginTop: '20px' }}>
            <h4>Employee's Agreements ({result.totalAgreementsByUser || 0} total, {result.agreementCount || 0} uploaded to Bigin)</h4>
            {result.agreementDetails && result.agreementDetails.length > 0 ? (
              <div className="isc-matches-table">
                <table>
                  <thead>
                    <tr>
                      <th>Agreement Title</th>
                      <th>Bigin Deal ID</th>
                      <th>Deal Name</th>
                      <th>Created At</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.agreementDetails.map((agreement, idx) => {
                      const hasBiginId = agreement.biginId && agreement.biginId.trim() !== '';
                      const isMatched = hasBiginId && result.matchedBiginIds?.includes(agreement.biginId!);
                      return (
                        <tr key={idx} style={{ backgroundColor: isMatched ? '#dcfce7' : !hasBiginId ? '#fef3c7' : 'transparent' }}>
                          <td>{agreement.title}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                            {hasBiginId ? agreement.biginId : <span style={{ color: '#9ca3af' }}>Not uploaded</span>}
                          </td>
                          <td>{agreement.dealName || '-'}</td>
                          <td>{formatDate(agreement.createdAt)}</td>
                          <td>
                            {!hasBiginId ? (
                              <span className="isc-action-badge" style={{ background: '#fef3c7', color: '#d97706' }}>
                                Not Uploaded
                              </span>
                            ) : isMatched ? (
                              <span className="isc-action-badge" style={{ background: '#dcfce7', color: '#059669' }}>
                                Found in Audit
                              </span>
                            ) : (
                              <span className="isc-action-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>
                                Not in Audit
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#64748b', fontStyle: 'italic', marginTop: '12px' }}>
                No agreements found for this employee.
              </p>
            )}
          </div>
        </div>
      )}

      {}
      <div className="isc-info-card">
        <h4>How It Works</h4>
        <ul>
          <li>Select an employee from the dropdown to check their Inside Sales status</li>
          <li>The system finds all agreements created by this employee that have been pushed to Bigin</li>
          <li>It then checks if any of those agreements' Bigin IDs appear in Lisa Rothwell's audit history within the last 1 year</li>
          <li>If a match is found, the employee has <strong>Inside Sales (3% Deduction)</strong></li>
          <li>If no matches, <strong>No deduction</strong> - employee keeps full commission</li>
        </ul>
      </div>
    </div>
  );
};

export default InsideSalesCheckTab;
