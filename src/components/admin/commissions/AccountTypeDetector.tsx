

import React, { useState, useCallback, useEffect } from 'react';
import { accountTypeApi } from '../../../backendservice/api/accountTypeApi';
import {
  detectAccountTypeClient,
  ACCOUNT_TYPE_INFO,
  DEFAULT_THRESHOLDS,
  type AccountType,
  type AccountTypeDetectionResult,
  type AccountTypeThresholds,
} from '../../../backendservice/types/accountType.types';
import './AccountTypeDetector.css';

interface AccountTypeDetectorProps {
  onAccountTypeDetected?: (accountType: AccountType, result: AccountTypeDetectionResult) => void;
  initialRevenue?: number;
  initialDistance?: number;
  initialGreenline?: boolean;
  compact?: boolean;
}

export const AccountTypeDetector: React.FC<AccountTypeDetectorProps> = ({
  onAccountTypeDetected,
  initialRevenue,
  initialDistance,
  initialGreenline = false,
  compact = false,
}) => {
  
  const [perVisitRevenue, setPerVisitRevenue] = useState<string>(
    initialRevenue?.toString() || ''
  );
  const [distanceToAnchor, setDistanceToAnchor] = useState<string>(
    initialDistance?.toString() || ''
  );
  const [isGreenline, setIsGreenline] = useState<boolean>(initialGreenline);

  const [detectionResult, setDetectionResult] = useState<AccountTypeDetectionResult | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState<AccountTypeThresholds>(DEFAULT_THRESHOLDS);

  useEffect(() => {
    const fetchThresholds = async () => {
      const response = await accountTypeApi.getThresholds();
      if (response.data?.thresholds) {
        setThresholds(response.data.thresholds);
      }
    };
    fetchThresholds();
  }, []);

  useEffect(() => {
    if (perVisitRevenue) {
      const revenue = parseFloat(perVisitRevenue);
      const distance = distanceToAnchor ? parseFloat(distanceToAnchor) : null;

      if (!isNaN(revenue) && revenue > 0) {
        const result = detectAccountTypeClient(revenue, distance, isGreenline, thresholds);
        setDetectionResult(result);

        if (onAccountTypeDetected) {
          onAccountTypeDetected(result.accountType, result);
        }
      }
    } else {
      setDetectionResult(null);
    }
  }, [perVisitRevenue, distanceToAnchor, isGreenline, thresholds, onAccountTypeDetected]);

  const handleDetect = useCallback(async () => {
    if (!perVisitRevenue) {
      setError('Please enter per-visit revenue');
      return;
    }

    const revenue = parseFloat(perVisitRevenue);
    if (isNaN(revenue) || revenue <= 0) {
      setError('Please enter a valid revenue amount');
      return;
    }

    setDetecting(true);
    setError(null);

    try {
      const response = await accountTypeApi.detect({
        perVisitRevenue: revenue,
        distanceToAnchorMiles: distanceToAnchor ? parseFloat(distanceToAnchor) : null,
        isGreenline,
      });

      if (response.error) {
        setError(response.error);
      } else if (response.data?.result) {
        setDetectionResult(response.data.result);
        if (onAccountTypeDetected) {
          onAccountTypeDetected(response.data.result.accountType, response.data.result);
        }
      }
    } catch (err) {
      setError('Failed to detect account type');
    } finally {
      setDetecting(false);
    }
  }, [perVisitRevenue, distanceToAnchor, isGreenline, onAccountTypeDetected]);

  const handleClear = useCallback(() => {
    setPerVisitRevenue('');
    setDistanceToAnchor('');
    setIsGreenline(false);
    setDetectionResult(null);
    setError(null);
  }, []);

  const getAccountTypeColor = (type: AccountType): string => {
    switch (type) {
      case 'Anchor':
        return '#16a34a'; 
      case 'Bread5':
        return '#2563eb'; 
      case 'Bread15':
        return '#7c3aed'; 
      case 'Pit':
        return '#dc2626'; 
      default:
        return '#6b7280'; 
    }
  };

  const getConfidenceColor = (confidence: string): string => {
    switch (confidence) {
      case 'high':
        return '#16a34a';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  if (compact) {
    return (
      <div className="account-type-detector compact">
        <div className="detector-row">
          <div className="detector-input-group">
            <label>Revenue/Visit ($)</label>
            <input
              type="number"
              value={perVisitRevenue}
              onChange={(e) => setPerVisitRevenue(e.target.value)}
              placeholder="Enter revenue"
              min="0"
              step="0.01"
            />
          </div>

          <div className="detector-input-group">
            <label>Distance to Anchor (mi)</label>
            <input
              type="number"
              value={distanceToAnchor}
              onChange={(e) => setDistanceToAnchor(e.target.value)}
              placeholder="Optional"
              min="0"
              step="0.01"
            />
          </div>

          <div className="detector-input-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={isGreenline}
                onChange={(e) => setIsGreenline(e.target.checked)}
              />
              Greenline
            </label>
          </div>

          {detectionResult && (
            <div
              className="detected-type-badge"
              style={{ backgroundColor: getAccountTypeColor(detectionResult.accountType) }}
            >
              {detectionResult.accountType}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="account-type-detector">
      <div className="detector-header">
        <h4>Account Type Detector</h4>
        <p>Auto-detect account type based on revenue and distance to nearest anchor</p>
      </div>

      <div className="detector-form">
        <div className="detector-grid">
          <div className="detector-input-group">
            <label>Per-Visit Revenue ($) *</label>
            <input
              type="number"
              value={perVisitRevenue}
              onChange={(e) => setPerVisitRevenue(e.target.value)}
              placeholder="Enter per-visit revenue"
              min="0"
              step="0.01"
            />
            <small>
              Anchor threshold: ${isGreenline ? thresholds.anchorMinRevenueGreenline : thresholds.anchorMinRevenue}
            </small>
          </div>

          <div className="detector-input-group">
            <label>Distance to Nearest Anchor (miles)</label>
            <input
              type="number"
              value={distanceToAnchor}
              onChange={(e) => setDistanceToAnchor(e.target.value)}
              placeholder="Enter distance (optional)"
              min="0"
              step="0.01"
            />
            <small>Get from RouteSTAR Map Distance</small>
          </div>
        </div>

        <div className="detector-input-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={isGreenline}
              onChange={(e) => setIsGreenline(e.target.checked)}
            />
            Greenline Pricing (130%+ premium)
          </label>
          <small>Lowers Anchor threshold to ${thresholds.anchorMinRevenueGreenline}</small>
        </div>

        <div className="detector-actions">
          <button
            className="detect-btn"
            onClick={handleDetect}
            disabled={detecting || !perVisitRevenue}
          >
            {detecting ? 'Detecting...' : 'Detect Account Type'}
          </button>

          {(detectionResult || perVisitRevenue) && (
            <button className="clear-btn" onClick={handleClear}>
              Clear
            </button>
          )}
        </div>

        {error && <div className="detector-error">{error}</div>}
      </div>

      {detectionResult && (
        <div className="detection-result">
          <div
            className="result-type"
            style={{ borderColor: getAccountTypeColor(detectionResult.accountType) }}
          >
            <div
              className="type-badge"
              style={{ backgroundColor: getAccountTypeColor(detectionResult.accountType) }}
            >
              {detectionResult.accountType}
            </div>
            <div
              className="confidence-badge"
              style={{ color: getConfidenceColor(detectionResult.confidence) }}
            >
              {detectionResult.confidence} confidence
            </div>
          </div>

          <div className="result-reason">
            <strong>Reason:</strong> {detectionResult.reason}
          </div>

          {detectionResult.drivingTimeMinutes !== null && (
            <div className="result-details">
              <div className="detail-item">
                <span className="detail-label">Distance:</span>
                <span className="detail-value">
                  {detectionResult.distanceMiles?.toFixed(2)} miles
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Est. Driving Time:</span>
                <span className="detail-value">
                  {detectionResult.drivingTimeMinutes?.toFixed(1)} minutes
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="account-type-reference">
        <h5>Account Type Reference</h5>
        <div className="reference-grid">
          {ACCOUNT_TYPE_INFO.map((info) => (
            <div
              key={info.type}
              className="reference-item"
              style={{ borderLeftColor: getAccountTypeColor(info.type) }}
            >
              <div className="reference-type">{info.type}</div>
              <div className="reference-description">{info.description}</div>
              <div className="reference-criteria">{info.criteria}</div>
              <div className="reference-deduction">
                Deduction: ${info.deduction}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountTypeDetector;
