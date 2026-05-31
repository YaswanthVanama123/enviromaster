import React, { useState } from 'react';
import { useGlobalCommission } from '../hooks/useServiceCommission';
import { useAccountTypeDetection } from '../hooks/useAccountTypeDetection';
import { useServicesContext, QuotaLevel, QUOTA_COMMISSION_RATES } from '../ServicesContext';
import type { AccountType } from '../../../backendservice/api/accountTypeApi';
import './GlobalCommissionSummary.css';

const ACCOUNT_TYPE_COLORS: Record<AccountType, { bg: string; text: string }> = {
  Anchor: { bg: '#fef3c7', text: '#92400e' },
  Bread5: { bg: '#d1fae5', text: '#065f46' },
  Bread15: { bg: '#dbeafe', text: '#1e40af' },
  Pit: { bg: '#fee2e2', text: '#991b1b' },
};

const QUOTA_LEVEL_DISPLAY: Record<QuotaLevel, { label: string; color: string; bgColor: string }> = {
  below: { label: 'Below Quota', color: '#dc2626', bgColor: '#fee2e2' },
  above: { label: 'Above Quota', color: '#059669', bgColor: '#d1fae5' },
  double: { label: 'Double Quota', color: '#7c3aed', bgColor: '#ede9fe' },
};

interface GlobalCommissionSummaryProps {
  showDetectButton?: boolean;
}

export function GlobalCommissionSummary({
  showDetectButton = true,
}: GlobalCommissionSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Record<number, boolean>>({});

  const { quotaLevel, quotaLevelData, baseCommissionRate } = useServicesContext();
  const commissionRate = baseCommissionRate;

  const global = useGlobalCommission(commissionRate);
  const { detectAccountTypes, isDetecting, error, isCompanyMapped } = useAccountTypeDetection();

  const quotaDisplay = QUOTA_LEVEL_DISPLAY[quotaLevel];

  const toggleServiceExpand = (index: number) => {
    setExpandedServices(prev => ({ ...prev, [index]: !prev[index] }));
  };

  if (global.serviceCount === 0) {
    return null;
  }

  return (
    <div className="commission-summary">
      {}
      <div className="commission-summary__header">
        <div className="commission-summary__title">
          <span>Commission Summary</span>
          <span className="commission-summary__service-count">
            ({global.serviceCount} service{global.serviceCount !== 1 ? 's' : ''})
          </span>
          {}
          <span
            className="commission-summary__quota-badge"
            style={{ backgroundColor: quotaDisplay.bgColor, color: quotaDisplay.color }}
          >
            {quotaDisplay.label} ({commissionRate}%)
          </span>
          {isDetecting && (
            <span className="commission-summary__detecting">
              <span className="animate-spin">⏳</span>
              Detecting...
            </span>
          )}
        </div>

        {showDetectButton && isCompanyMapped && !isDetecting && (
          <button
            className="commission-summary__redetect-btn"
            onClick={() => detectAccountTypes()}
          >
            <span>🔄</span>
            Re-detect
          </button>
        )}
      </div>

      {}
      {error && (
        <div className="commission-summary__error">
          {error}
        </div>
      )}

      {}
      {!isCompanyMapped && (
        <div className="commission-summary__warning">
          Connect to Bigin to detect account types automatically
        </div>
      )}

      {}
      <div className="commission-summary__totals">
        <div className="commission-summary__total-item">
          <div className="commission-summary__total-label">Weekly</div>
          <div className="commission-summary__total-value">
            {global.formatted.totalWeeklyCommission}
          </div>
        </div>
        <div className="commission-summary__total-item">
          <div className="commission-summary__total-label">Annual</div>
          <div className="commission-summary__total-value">
            {global.formatted.totalAnnualCommission}
          </div>
        </div>

        {}
        <button
          className="commission-summary__toggle-btn"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Hide Details' : 'Show Details'}
          <span style={{ fontSize: '10px' }}>{expanded ? '▲' : '▼'}</span>
        </button>
      </div>

      {}
      {expanded && (
        <div className="commission-summary__expanded">
          {}
          <div className="commission-summary__breakdown-title">
            Service Breakdown
          </div>

          {global.services.map((service, index) => {
            const colors = service.accountType ? ACCOUNT_TYPE_COLORS[service.accountType] : { bg: '#f3f4f6', text: '#6b7280' };
            const isServiceExpanded = expandedServices[index] || false;

            return (
              <div key={index} className="service-row">
                {}
                <div
                  className="service-row__header"
                  onClick={() => toggleServiceExpand(index)}
                >
                  <div className="service-row__info">
                    <span className="service-row__expand-icon">
                      {isServiceExpanded ? '▼' : '▶'}
                    </span>
                    <span className="service-row__name">
                      {service.serviceName}
                    </span>
                    {service.accountType && (
                      <span
                        className="service-row__badge"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {service.accountType}
                      </span>
                    )}
                    <span className="service-row__frequency">
                      {service.frequencyLabel}
                    </span>
                  </div>
                  <div className="service-row__commissions">
                    <div className="service-row__commission-item">
                      <div className="service-row__commission-label">Weekly</div>
                      <div className="service-row__commission-value">
                        {service.formatted.weeklyCommission}
                      </div>
                    </div>
                    <div className="service-row__commission-item">
                      <div className="service-row__commission-label">Annual</div>
                      <div className="service-row__commission-value">
                        {service.formatted.annualCommission}
                      </div>
                    </div>
                  </div>
                </div>

                {}
                {isServiceExpanded && (
                  <div className="service-details">
                    {}
                    <div className="service-details__section">
                      <div className="service-details__section-title">
                        Revenue Calculation
                      </div>
                      <div className="service-details__list">
                        <div className="service-details__row">
                          <span className="service-details__label">Original Annual (Redline):</span>
                          <span className="service-details__value">{service.formatted.annualOriginalRevenue}</span>
                        </div>
                        <div className="service-details__row">
                          <span className="service-details__label">Current Annual Revenue:</span>
                          <span className="service-details__value">{service.formatted.perVisitRevenue}</span>
                        </div>

                        {}
                        <div className="service-details__row">
                          <span className="service-details__label">
                            Price Ratio (Current ÷ Redline):
                          </span>
                          <span className="service-details__value">{service.formatted.priceRatio}</span>
                        </div>
                        <div className="service-details__row">
                          <span className="service-details__label">Pricing Tier:</span>
                          <span
                            className="service-details__value"
                            style={{ fontWeight: 600 }}
                          >
                            {service.pricingTierLabel}
                          </span>
                        </div>
                        <div className="service-details__row">
                          <span className="service-details__label">
                            Pricing Multiplier:
                          </span>
                          <span
                            className={`service-details__value${
                              service.pricingMultiplier > 1
                                ? ' service-details__value--green'
                                : service.pricingMultiplier < 1
                                ? ' service-details__value--red'
                                : ''
                            }`}
                          >
                            {service.formatted.pricingMultiplier}
                          </span>
                        </div>
                        {service.pricingMultiplier !== 1 && (
                          <div className="service-details__row">
                            <span className="service-details__label">
                              Adjusted Annual ({service.formatted.perVisitRevenue} × {service.formatted.pricingMultiplier}):
                            </span>
                            <span className="service-details__value">
                              {service.formatted.adjustedAnnualRevenue}
                            </span>
                          </div>
                        )}

                        {service.revenueDeduction > 0 && (
                          <div className="service-details__row">
                            <span className="service-details__label">
                              Account Type Deduction ({service.accountType}):
                            </span>
                            <span className="service-details__value service-details__value--red">
                              -{service.formatted.revenueDeduction}
                            </span>
                          </div>
                        )}

                        {service.anchorBonus > 0 && (
                          <div className="service-details__row">
                            <span className="service-details__label">Anchor Bonus (150% on excess over $200):</span>
                            <span className="service-details__value service-details__value--green">
                              +${service.anchorBonus.toFixed(2)}
                            </span>
                          </div>
                        )}

                        <div className="service-details__row service-details__total-row">
                          <span className="service-details__total-label">Commissionable Revenue:</span>
                          <span className="service-details__total-value">{service.formatted.commissionableRevenue}</span>
                        </div>
                      </div>
                    </div>

                    {}
                    <div className="service-details__section">
                      <div className="service-details__section-title">
                        Commission Rate Calculation
                      </div>
                      <div className="service-details__list">
                        <div className="service-details__row">
                          <span className="service-details__label">
                            Base Commission Rate ({quotaDisplay.label}):
                          </span>
                          <span
                            className="service-details__value"
                            style={{ color: quotaDisplay.color, fontWeight: 600 }}
                          >
                            {commissionRate}%
                          </span>
                        </div>

                        <div className="service-details__row">
                          <span className="service-details__label">Agreement Multiplier (36 months):</span>
                          <span className="service-details__value">{global.agreementMultiplier}%</span>
                        </div>

                        <div className="service-details__row service-details__total-row">
                          <span className="service-details__total-label">
                            Effective Rate ({commissionRate}% × {global.agreementMultiplier}%):
                          </span>
                          <span className="service-details__total-value service-details__value--blue">
                            {global.effectiveCommissionRate.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {}
                    <div className="service-details__section">
                      <div className="service-details__section-title">
                        Commission Calculation
                      </div>
                      <div className="service-details__list service-details__list--green">
                        <div className="service-details__row">
                          <span className="service-details__label">
                            Per-Visit Commission ({service.formatted.commissionableRevenue} × {global.effectiveCommissionRate.toFixed(2)}%):
                          </span>
                          <span className="service-details__value service-details__value--green">
                            {service.formatted.perVisitCommission}
                          </span>
                        </div>

                        <div className="service-details__row">
                          <span className="service-details__label">Frequency:</span>
                          <span className="service-details__value">
                            {service.frequencyLabel} ({service.visitsPerYear} visits/year)
                          </span>
                        </div>

                        <div className="service-details__row">
                          <span className="service-details__label">
                            Annual Commission ({service.formatted.perVisitCommission} × {service.visitsPerYear} visits):
                          </span>
                          <span className="service-details__total-value service-details__value--green">
                            {service.formatted.annualCommission}
                          </span>
                        </div>

                        <div className="service-details__row">
                          <span className="service-details__label">
                            Weekly Commission ({service.formatted.annualCommission} ÷ 52 weeks):
                          </span>
                          <span className="service-details__total-value service-details__value--green">
                            {service.formatted.weeklyCommission}
                          </span>
                        </div>
                      </div>
                    </div>

                    {}
                    {service.accountType && (
                      <div
                        className="service-details__account-info"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        <div className="service-details__account-title">
                          Account Type: {service.accountType}
                        </div>
                        {service.reason && (
                          <div className="service-details__account-reason">
                            {service.reason}
                          </div>
                        )}
                        {service.accountType === 'Anchor' && (
                          <div className="service-details__account-explanation">
                            High-value account ($200+/visit). No deduction + 150% bonus on excess revenue.
                          </div>
                        )}
                        {service.accountType === 'Bread5' && (
                          <div className="service-details__account-explanation">
                            Within 5 min drive to anchor. $50 revenue deduction applied.
                          </div>
                        )}
                        {service.accountType === 'Bread15' && (
                          <div className="service-details__account-explanation">
                            5-15 min drive to anchor. $75 revenue deduction applied.
                          </div>
                        )}
                        {service.accountType === 'Pit' && (
                          <div className="service-details__account-explanation">
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

          {}
          <div className="commission-summary__rate-footer">
            Rate: {commissionRate}% × {global.agreementMultiplier}% = {global.effectiveCommissionRate.toFixed(2)}%
          </div>
        </div>
      )}

      {}
      {!expanded && (
        <div className="commission-summary__rate-footer">
          Rate: {commissionRate}% × {global.agreementMultiplier}% = {global.effectiveCommissionRate.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

export default GlobalCommissionSummary;
