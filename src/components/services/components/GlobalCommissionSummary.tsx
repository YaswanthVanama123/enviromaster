import React, { useState } from 'react';
import { useGlobalCommission, ServiceCommissionDetail } from '../hooks/useServiceCommission';
import { useAccountTypeDetection } from '../hooks/useAccountTypeDetection';
import type { AccountType } from '../../../backendservice/api/accountTypeApi';

// Color scheme for account types
const ACCOUNT_TYPE_COLORS: Record<AccountType, { bg: string; text: string; border: string }> = {
  Anchor: { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' },
  Bread5: { bg: '#d1fae5', text: '#065f46', border: '#34d399' },
  Bread15: { bg: '#dbeafe', text: '#1e40af', border: '#60a5fa' },
  Pit: { bg: '#fee2e2', text: '#991b1b', border: '#f87171' },
};

// Revenue deduction descriptions
const DEDUCTION_DESCRIPTIONS: Record<AccountType, string> = {
  Anchor: 'Full revenue (high-value account)',
  Bread5: '-$50 deduction (≤5 min to anchor)',
  Bread15: '-$75 deduction (5-15 min to anchor)',
  Pit: '-$100 deduction (>15 min to anchor)',
};

interface GlobalCommissionSummaryProps {
  commissionRate?: number;
  showDetectButton?: boolean;
}

// Individual service row component with expandable details
function ServiceDetailRow({
  service,
  commissionRate,
}: {
  service: ServiceCommissionDetail;
  commissionRate: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const accountTypeStyle = service.accountType
    ? ACCOUNT_TYPE_COLORS[service.accountType]
    : { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db' };

  const formatServiceName = (name: string) => {
    return name.replace(/([A-Z])/g, ' $1').trim();
  };

  return (
    <div style={{ borderBottom: '1px solid #f3f4f6' }}>
      {/* Service header row - clickable */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 0',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          {/* Chevron */}
          <span
            style={{
              fontSize: '12px',
              color: '#9ca3af',
              transition: 'transform 0.2s',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            ▶
          </span>

          {/* Account type badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 600,
              borderRadius: '4px',
              backgroundColor: accountTypeStyle.bg,
              color: accountTypeStyle.text,
              border: `1px solid ${accountTypeStyle.border}`,
              minWidth: '55px',
              justifyContent: 'center',
            }}
          >
            {service.accountType || 'N/A'}
          </span>

          {/* Service name */}
          <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>
            {formatServiceName(service.serviceName)}
          </span>

          {/* Frequency badge */}
          <span
            style={{
              fontSize: '10px',
              color: '#6b7280',
              backgroundColor: '#f3f4f6',
              padding: '2px 6px',
              borderRadius: '3px',
            }}
          >
            {service.frequencyLabel}
          </span>
        </div>

        {/* Commission values */}
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
            {service.formatted.weeklyCommission}/wk
          </span>
          <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>
            ({service.formatted.annualCommission}/yr)
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div
          style={{
            marginLeft: '22px',
            marginBottom: '12px',
            padding: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              fontSize: '12px',
            }}
          >
            {/* Left column - Revenue breakdown */}
            <div>
              <div
                style={{
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px',
                  borderBottom: '1px solid #e5e7eb',
                  paddingBottom: '4px',
                }}
              >
                Revenue Breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Per Visit Revenue:</span>
                  <span style={{ fontWeight: 500, color: '#374151' }}>
                    {service.formatted.perVisitRevenue}
                  </span>
                </div>
                {service.accountType && service.revenueDeduction !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Revenue Deduction:</span>
                    <span style={{ fontWeight: 500, color: '#dc2626' }}>
                      -{service.formatted.revenueDeduction}
                    </span>
                  </div>
                )}
                {service.anchorBonus > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Anchor Bonus:</span>
                    <span style={{ fontWeight: 500, color: '#059669' }}>
                      +${service.anchorBonus.toFixed(2)}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '4px',
                    paddingTop: '4px',
                    borderTop: '1px dashed #d1d5db',
                  }}
                >
                  <span style={{ color: '#374151', fontWeight: 500 }}>Commissionable:</span>
                  <span style={{ fontWeight: 600, color: '#059669' }}>
                    {service.formatted.commissionableRevenue}
                  </span>
                </div>
              </div>
            </div>

            {/* Right column - Commission calculation */}
            <div>
              <div
                style={{
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px',
                  borderBottom: '1px solid #e5e7eb',
                  paddingBottom: '4px',
                }}
              >
                Commission Calculation
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Commission Rate:</span>
                  <span style={{ fontWeight: 500, color: '#374151' }}>{commissionRate}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Per Visit Commission:</span>
                  <span style={{ fontWeight: 500, color: '#374151' }}>
                    {service.formatted.perVisitCommission}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Visits per Year:</span>
                  <span style={{ fontWeight: 500, color: '#374151' }}>{service.visitsPerYear}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Annual Commission:</span>
                  <span style={{ fontWeight: 500, color: '#374151' }}>
                    {service.formatted.annualCommission}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '4px',
                    paddingTop: '4px',
                    borderTop: '1px dashed #d1d5db',
                  }}
                >
                  <span style={{ color: '#374151', fontWeight: 500 }}>Weekly Commission:</span>
                  <span style={{ fontWeight: 600, color: '#059669' }}>
                    {service.formatted.weeklyCommission}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Account type explanation */}
          {service.accountType && (
            <div
              style={{
                marginTop: '12px',
                padding: '8px',
                backgroundColor: accountTypeStyle.bg,
                borderRadius: '4px',
                border: `1px solid ${accountTypeStyle.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, color: accountTypeStyle.text, fontSize: '11px' }}>
                  {service.accountType} Account
                </span>
                <span style={{ color: accountTypeStyle.text, fontSize: '11px' }}>
                  {DEDUCTION_DESCRIPTIONS[service.accountType]}
                </span>
              </div>
              {service.reason && (
                <div style={{ marginTop: '4px', fontSize: '10px', color: accountTypeStyle.text, opacity: 0.8 }}>
                  {service.reason}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function GlobalCommissionSummary({
  commissionRate = 6,
  showDetectButton = true,
}: GlobalCommissionSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  const global = useGlobalCommission(commissionRate);
  const { detectAccountTypes, isDetecting, error, isCompanyMapped } = useAccountTypeDetection();

  // Don't show if no services
  if (global.serviceCount === 0) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        marginTop: '16px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>💰</span>
          <span>Commission Summary</span>
          {isDetecting && (
            <span style={{ fontSize: '11px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="animate-spin">⏳</span>
              Detecting...
            </span>
          )}
        </div>

        {showDetectButton && isCompanyMapped && !isDetecting && (
          <button
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => detectAccountTypes()}
          >
            <span>🔄</span>
            Re-detect
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            padding: '8px',
            backgroundColor: '#fee2e2',
            borderRadius: '4px',
            marginBottom: '12px',
            fontSize: '12px',
            color: '#991b1b',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Not connected message */}
      {!isCompanyMapped && (
        <div
          style={{
            padding: '8px',
            backgroundColor: '#fef3c7',
            borderRadius: '4px',
            marginBottom: '12px',
            fontSize: '12px',
            color: '#92400e',
          }}
        >
          ℹ️ Connect to Bigin to detect account types automatically
        </div>
      )}

      {/* Totals */}
      <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ textAlign: 'right' as const }}>
          <div
            style={{
              fontSize: '11px',
              color: '#6b7280',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em',
            }}
          >
            Weekly
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#059669' }}>
            {global.formatted.totalWeeklyCommission}
          </div>
        </div>
        <div style={{ textAlign: 'right' as const }}>
          <div
            style={{
              fontSize: '11px',
              color: '#6b7280',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em',
            }}
          >
            Annual
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#059669' }}>
            {global.formatted.totalAnnualCommission}
          </div>
        </div>
      </div>

      {/* Services breakdown */}
      {global.services.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '8px 0',
            }}
            onClick={() => setExpanded(!expanded)}
          >
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {global.serviceCount} service{global.serviceCount !== 1 ? 's' : ''} included
            </span>
            <span style={{ fontSize: '10px', color: '#9ca3af' }}>
              {expanded ? '▲ Hide details' : '▼ Show details'}
            </span>
          </div>

          {expanded && (
            <div style={{ marginTop: '8px' }}>
              {global.services.map((service, idx) => (
                <ServiceDetailRow key={idx} service={service} commissionRate={commissionRate} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Commission rate footer */}
      <div style={{ marginTop: '12px', fontSize: '11px', color: '#9ca3af', textAlign: 'right' }}>
        Commission rate: {commissionRate}%
      </div>
    </div>
  );
}

export default GlobalCommissionSummary;
