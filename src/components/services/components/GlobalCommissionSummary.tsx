import React, { useState } from 'react';
import { useGlobalCommission } from '../hooks/useServiceCommission';
import { useAccountTypeDetection } from '../hooks/useAccountTypeDetection';
import type { AccountType } from '../../../backendservice/api/accountTypeApi';

// Color scheme for account types
const ACCOUNT_TYPE_COLORS: Record<AccountType, { bg: string; text: string }> = {
  Anchor: { bg: '#fef3c7', text: '#92400e' },
  Bread5: { bg: '#d1fae5', text: '#065f46' },
  Bread15: { bg: '#dbeafe', text: '#1e40af' },
  Pit: { bg: '#fee2e2', text: '#991b1b' },
};

interface GlobalCommissionSummaryProps {
  commissionRate?: number;
  showDetectButton?: boolean;
}

export function GlobalCommissionSummary({
  commissionRate = 6,
  showDetectButton = true,
}: GlobalCommissionSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Record<number, boolean>>({});
  const global = useGlobalCommission(commissionRate);
  const { detectAccountTypes, isDetecting, error, isCompanyMapped } = useAccountTypeDetection();

  const toggleServiceExpand = (index: number) => {
    setExpandedServices(prev => ({ ...prev, [index]: !prev[index] }));
  };

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
          <span>Commission Summary</span>
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>
            ({global.serviceCount} service{global.serviceCount !== 1 ? 's' : ''})
          </span>
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
          {error}
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
          Connect to Bigin to detect account types automatically
        </div>
      )}

      {/* Totals */}
      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-end' }}>
        <div>
          <div
            style={{
              fontSize: '11px',
              color: '#6b7280',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em',
              marginBottom: '4px',
            }}
          >
            Weekly
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669' }}>
            {global.formatted.totalWeeklyCommission}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: '11px',
              color: '#6b7280',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em',
              marginBottom: '4px',
            }}
          >
            Annual
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669' }}>
            {global.formatted.totalAnnualCommission}
          </div>
        </div>

        {/* Expand/Collapse button */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            marginLeft: 'auto',
            padding: '6px 12px',
            fontSize: '12px',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {expanded ? 'Hide Details' : 'Show Details'}
          <span style={{ fontSize: '10px' }}>{expanded ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{ marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
          {/* Per-service breakdown */}
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
            Service Breakdown
          </div>

          {global.services.map((service, index) => {
            const colors = service.accountType ? ACCOUNT_TYPE_COLORS[service.accountType] : { bg: '#f3f4f6', text: '#6b7280' };
            const isServiceExpanded = expandedServices[index] || false;

            return (
              <div
                key={index}
                style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  overflow: 'hidden',
                }}
              >
                {/* Service header row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleServiceExpand(index)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '10px', color: '#6b7280' }}>
                      {isServiceExpanded ? '▼' : '▶'}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                      {service.serviceName}
                    </span>
                    {service.accountType && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: colors.bg,
                          color: colors.text,
                        }}
                      >
                        {service.accountType}
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                      {service.frequencyLabel}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>Weekly</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
                        {service.formatted.weeklyCommission}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>Annual</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
                        {service.formatted.annualCommission}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isServiceExpanded && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderTop: '1px solid #e5e7eb',
                      backgroundColor: '#ffffff',
                      fontSize: '12px',
                    }}
                  >
                    {/* Revenue Calculation Section */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Revenue Calculation
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px', borderLeft: '2px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>Per-Visit Revenue:</span>
                          <span style={{ fontWeight: 500 }}>{service.formatted.perVisitRevenue}</span>
                        </div>

                        {service.revenueDeduction > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#6b7280' }}>
                              Account Type Deduction ({service.accountType}):
                            </span>
                            <span style={{ fontWeight: 500, color: '#dc2626' }}>-{service.formatted.revenueDeduction}</span>
                          </div>
                        )}

                        {service.anchorBonus > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#6b7280' }}>Anchor Bonus (150% on excess over $200):</span>
                            <span style={{ fontWeight: 500, color: '#059669' }}>+${service.anchorBonus.toFixed(2)}</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e5e7eb', paddingTop: '4px' }}>
                          <span style={{ color: '#374151', fontWeight: 500 }}>Commissionable Revenue:</span>
                          <span style={{ fontWeight: 600 }}>{service.formatted.commissionableRevenue}</span>
                        </div>
                      </div>
                    </div>

                    {/* Commission Rate Section */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Commission Rate Calculation
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px', borderLeft: '2px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>Base Commission Rate:</span>
                          <span style={{ fontWeight: 500 }}>{commissionRate}%</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>Agreement Multiplier (36 months):</span>
                          <span style={{ fontWeight: 500 }}>{global.agreementMultiplier}%</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e5e7eb', paddingTop: '4px' }}>
                          <span style={{ color: '#374151', fontWeight: 500 }}>
                            Effective Rate ({commissionRate}% × {global.agreementMultiplier}%):
                          </span>
                          <span style={{ fontWeight: 600, color: '#2563eb' }}>{global.effectiveCommissionRate.toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Commission Calculation Section */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Commission Calculation
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px', borderLeft: '2px solid #059669' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>
                            Per-Visit Commission ({service.formatted.commissionableRevenue} × {global.effectiveCommissionRate.toFixed(2)}%):
                          </span>
                          <span style={{ fontWeight: 500, color: '#059669' }}>{service.formatted.perVisitCommission}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>Frequency:</span>
                          <span style={{ fontWeight: 500 }}>{service.frequencyLabel} ({service.visitsPerYear} visits/year)</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>
                            Annual Commission ({service.formatted.perVisitCommission} × {service.visitsPerYear} visits):
                          </span>
                          <span style={{ fontWeight: 600, color: '#059669' }}>{service.formatted.annualCommission}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>
                            Weekly Commission ({service.formatted.annualCommission} ÷ 52 weeks):
                          </span>
                          <span style={{ fontWeight: 600, color: '#059669' }}>{service.formatted.weeklyCommission}</span>
                        </div>
                      </div>
                    </div>

                    {/* Account Type Info */}
                    {service.accountType && (
                      <div style={{
                        marginTop: '12px',
                        padding: '8px 12px',
                        backgroundColor: colors.bg,
                        borderRadius: '6px',
                        fontSize: '11px',
                      }}>
                        <div style={{ fontWeight: 600, color: colors.text, marginBottom: '4px' }}>
                          Account Type: {service.accountType}
                        </div>
                        {service.reason && (
                          <div style={{ color: colors.text, opacity: 0.8 }}>
                            {service.reason}
                          </div>
                        )}
                        {service.accountType === 'Anchor' && (
                          <div style={{ color: colors.text, opacity: 0.8, marginTop: '4px' }}>
                            High-value account ($200+/visit). No deduction + 150% bonus on excess revenue.
                          </div>
                        )}
                        {service.accountType === 'Bread5' && (
                          <div style={{ color: colors.text, opacity: 0.8, marginTop: '4px' }}>
                            Within 5 min drive to anchor. $50 revenue deduction applied.
                          </div>
                        )}
                        {service.accountType === 'Bread15' && (
                          <div style={{ color: colors.text, opacity: 0.8, marginTop: '4px' }}>
                            5-15 min drive to anchor. $75 revenue deduction applied.
                          </div>
                        )}
                        {service.accountType === 'Pit' && (
                          <div style={{ color: colors.text, opacity: 0.8, marginTop: '4px' }}>
                            Over 15 min drive to anchor. $100 revenue deduction applied.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Commission rate info */}
          <div style={{ marginTop: '12px', fontSize: '11px', color: '#9ca3af' }}>
            Rate: {commissionRate}% × {global.agreementMultiplier}% = {global.effectiveCommissionRate.toFixed(2)}%
          </div>
        </div>
      )}

      {/* Commission rate footer (when collapsed) */}
      {!expanded && (
        <div style={{ marginTop: '12px', fontSize: '11px', color: '#9ca3af' }}>
          Rate: {commissionRate}% × {global.agreementMultiplier}% = {global.effectiveCommissionRate.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

export default GlobalCommissionSummary;
