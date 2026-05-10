
import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useJanitorialCalc, DEFAULT_SUPPLIES } from "./useJanitorialCalc";
import type { JanitorialFormState } from "./useJanitorialCalc";
import { janitorialFrequencyLabels, janitorialFrequencyList } from "./janitorialConfig";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";

const fmt = (n: number): string =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DEFAULT_PLACE_TYPE_LABELS: Record<string, string> = {
  office:        "Office",
  home:          "Home",
  restaurant:    "Restaurant",
  businessPlace: "Business Place",
};

function placeTypeLabel(key: string): string {
  if (DEFAULT_PLACE_TYPE_LABELS[key]) {return DEFAULT_PLACE_TYPE_LABELS[key];}
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
}

export const JanitorialForm: React.FC<ServiceInitialData<JanitorialFormState>> = ({
  initialData,
  onRemove,
}) => {
  const { form, setForm, onChange, calc, adminRates, refreshConfig, isLoadingConfig } =
    useJanitorialCalc(initialData);
  const servicesContext = useServicesContextOptional();
  const prevDataRef = useRef<string>("");

  // Update a supply item amount
  const updateSupply = (index: number, rawValue: string) => {
    const amount = rawValue === "" ? 0 : parseFloat(rawValue);
    setForm(prev => ({
      ...prev,
      supplies: prev.supplies.map((s, i) =>
        i === index ? { ...s, amount: isNaN(amount) ? 0 : amount } : s,
      ),
    }));
  };

  // Sync to services context
  useEffect(() => {
    if (!servicesContext) return;
    const isActive = form.sqFt > 0;

    const data = isActive
      ? {
          serviceId: "pureJanitorial",
          displayName: "Janitorial",
          isActive: true,
          contractTotal: calc.contractTotal,
          originalContractTotal: calc.originalContractTotal,
          frequency: {
            isDisplay: true,
            orderNo: 1,
            label: "Frequency",
            type: "text" as const,
            value: janitorialFrequencyLabels[form.frequency] ?? form.frequency,
            frequencyKey: form.frequency,
          },
          totals: {
            annualBaseLabor: {
              isDisplay: true, orderNo: 30, label: "Annual Base Labor",
              type: "dollar" as const, amount: calc.annualBaseLabor,
            },
            annualLaborTax: {
              isDisplay: true, orderNo: 31, label: `Annual Labor Tax (${form.laborTaxPct}%)`,
              type: "dollar" as const, amount: calc.annualLaborTax,
            },
            annualSupplies: {
              isDisplay: true, orderNo: 32, label: "Annual Supplies",
              type: "dollar" as const, amount: calc.totalAnnualSupplies,
            },
            totalAnnualCost: {
              isDisplay: true, orderNo: 33, label: "Total Annual Cost",
              type: "dollar" as const, amount: calc.totalAnnualCost,
            },
            grossProfit: {
              isDisplay: true, orderNo: 34,
              label: `Gross Profit (${form.grossProfitPct}%)`,
              type: "dollar" as const, amount: calc.grossProfit,
            },
            annualContractValue: {
              isDisplay: true, orderNo: 35, label: "Annual Contract Value",
              type: "dollar" as const, amount: calc.annualContractValue,
            },
            monthlyRecurring: {
              isDisplay: true, orderNo: 36, label: "Monthly Recurring",
              type: "dollar" as const, amount: calc.monthlyRecurring,
            },
            contract: {
              isDisplay: true, orderNo: 37, label: "Contract Total",
              type: "dollar" as const, months: form.contractMonths,
              amount: calc.contractTotal,
            },
          },
          notes: form.notes ?? "",
        }
      : null;

    const dataStr = JSON.stringify(data);
    if (dataStr !== prevDataRef.current) {
      prevDataRef.current = dataStr;
      servicesContext.updateService("pureJanitorial", data);
    }
  }, [form, calc, servicesContext]);

  return (
    <div className="svc-card">
      {/* Header */}
      <div className="svc-h-row">
        <div className="svc-h">JANITORIAL</div>
        <div className="svc-h-actions">
          <button
            type="button"
            className="svc-mini"
            onClick={refreshConfig}
            disabled={isLoadingConfig}
            title="Refresh config from database"
          >
            <FontAwesomeIcon icon={isLoadingConfig ? faSpinner : faSync} spin={isLoadingConfig} />
          </button>
          {onRemove && (
            <button
              type="button"
              className="svc-mini svc-mini--neg"
              onClick={onRemove}
              title="Remove this service"
            >
              −
            </button>
          )}
        </div>
      </div>

      {/* Frequency */}
      <div className="svc-row">
        <label>Frequency</label>
        <div className="svc-row-right">
          <select className="svc-in" name="frequency" value={form.frequency} onChange={onChange}>
            {janitorialFrequencyList.map(key => (
              <option key={key} value={key}>
                {janitorialFrequencyLabels[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Visits per Week */}
      <div className="svc-row">
        <label>Visits per Week</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            value={form.visitsPerWeek}
            onChange={e => setForm(prev => ({ ...prev, visitsPerWeek: Number(e.target.value) }))}
          >
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Place Type */}
      <div className="svc-row">
        <label>Place Type</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            value={form.placeType}
            onChange={e => setForm(prev => ({ ...prev, placeType: e.target.value }))}
          >
            {Object.keys(adminRates.productionRates).map(key => (
              <option key={key} value={key}>{placeTypeLabel(key)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Square Feet */}
      <div className="svc-row">
        <label>Square Feet</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="number"
            min={0}
            step={1}
            name="sqFt"
            value={form.sqFt || ""}
            onChange={onChange}
            placeholder="0"
          />
          <span className="svc-small">sq ft</span>
        </div>
      </div>

      {/* Hours Per Visit (read-only) */}
      <div className="svc-row">
        <label>Hours Per Visit</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="text"
            readOnly
            value={`${calc.hoursPerVisit.toFixed(2)} hrs`}
            style={{ backgroundColor: "#f0f8ff" }}
            title={`Production rate: ${adminRates.productionRates[form.placeType]} sq ft/hr`}
          />
        </div>
      </div>

      <hr style={{ margin: "8px 0", borderColor: "#e5e7eb" }} />

      {/* Cost Per Hour */}
      <div className="svc-row">
        <label>Cost Per Hour</label>
        <div className="svc-row-right">
          <div className="svc-dollar">
            <span>$</span>
            <input
              className="svc-in svc-in-small"
              type="number"
              min={0}
              step={0.01}
              name="costPerHour"
              value={form.costPerHour || ""}
              onChange={onChange}
            />
          </div>
          <span className="svc-small">/hr (admin default: ${adminRates.costPerHour})</span>
        </div>
      </div>

      {/* Labor Tax % */}
      <div className="svc-row">
        <label>Labor Tax %</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="number"
            min={0}
            step={0.1}
            name="laborTaxPct"
            value={form.laborTaxPct || ""}
            onChange={onChange}
          />
          <span className="svc-small">% (admin default: {adminRates.laborTaxPct}%)</span>
        </div>
      </div>

      {/* Gross Profit % */}
      <div className="svc-row">
        <label>Gross Profit %</label>
        <div className="svc-row-right">
          <input
            className="svc-in svc-in-small"
            type="number"
            min={0}
            max={99}
            step={0.1}
            name="grossProfitPct"
            value={form.grossProfitPct || ""}
            onChange={onChange}
          />
          <span className="svc-small">% (admin default: {adminRates.grossProfitPct}%)</span>
        </div>
      </div>

      <hr style={{ margin: "8px 0", borderColor: "#e5e7eb" }} />

      {/* Supply Line Items */}
      <div className="svc-h-row svc-h-row-sub">
        <div className="svc-h-sub">Supply Line Items (Annual)</div>
      </div>
      {form.supplies.map((s, i) => (
        <div key={i} className="svc-row">
          <label>{s.name}</label>
          <div className="svc-row-right">
            <div className="svc-dollar">
              <span>$</span>
              <input
                className="svc-in svc-in-small"
                type="number"
                min={0}
                step={1}
                value={s.amount || ""}
                onChange={e => updateSupply(i, e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Pricing Summary */}
      <div className="svc-h-row svc-h-row-sub">
        <div className="svc-h-sub">Pricing Summary</div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Annual Base Labor</label>
        <div className="svc-row-right">
          <span className="svc-small">$</span>
          <input className="svc-in" type="text" readOnly value={fmt(calc.annualBaseLabor)} style={{ backgroundColor: "white", border: "none", width: "100px" }} />
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Annual Labor Tax ({form.laborTaxPct}%)</label>
        <div className="svc-row-right">
          <span className="svc-small">$</span>
          <input className="svc-in" type="text" readOnly value={fmt(calc.annualLaborTax)} style={{ backgroundColor: "white", border: "none", width: "100px" }} />
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Total Annual Labor</label>
        <div className="svc-row-right">
          <span className="svc-small">$</span>
          <input className="svc-in" type="text" readOnly value={fmt(calc.annualBaseLabor + calc.annualLaborTax)} style={{ backgroundColor: "white", border: "none", width: "100px" }} />
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Annual Supplies</label>
        <div className="svc-row-right">
          <span className="svc-small">$</span>
          <input className="svc-in" type="text" readOnly value={fmt(calc.totalAnnualSupplies)} style={{ backgroundColor: "white", border: "none", width: "100px" }} />
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Total Annual Cost</label>
        <div className="svc-row-right">
          <span className="svc-small">$</span>
          <input className="svc-in" type="text" readOnly value={fmt(calc.totalAnnualCost)} style={{ backgroundColor: "white", border: "none", width: "100px" }} />
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Gross Profit ({form.grossProfitPct}%)</label>
        <div className="svc-row-right">
          <span className="svc-small">$</span>
          <input className="svc-in" type="text" readOnly value={fmt(calc.grossProfit)} style={{ backgroundColor: "white", border: "none", width: "100px" }} />
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Annual Contract Value</label>
        <div className="svc-row-right">
          <span className="svc-small">$</span>
          <input className="svc-in" type="text" readOnly value={fmt(calc.annualContractValue)} style={{ backgroundColor: "white", border: "none", width: "100px" }} />
        </div>
      </div>

      <div className="svc-row svc-row-charge">
        <label>Monthly Recurring</label>
        <div className="svc-row-right">
          <span className="svc-small">$</span>
          <input className="svc-in" type="text" readOnly value={fmt(calc.monthlyRecurring)} style={{ backgroundColor: "white", border: "none", width: "100px" }} />
        </div>
      </div>

      {/* Greenline / Redline indicator */}
      {form.sqFt > 0 && (
        <div className="svc-row" style={{ marginTop: "-10px", paddingTop: "5px" }}>
          <label></label>
          <div className="svc-row-right">
            {calc.contractTotal > calc.originalContractTotal * 1.30 ? (
              <span style={{ color: "#388e3c", fontSize: "13px", fontWeight: 600, padding: "4px 8px", backgroundColor: "#e8f5e9", borderRadius: "4px", display: "inline-block" }}>
                🟢 Greenline Pricing
              </span>
            ) : (
              <span style={{ color: "#d32f2f", fontSize: "13px", fontWeight: 600, padding: "4px 8px", backgroundColor: "#ffebee", borderRadius: "4px", display: "inline-block" }}>
                🔴 Redline Pricing
              </span>
            )}
          </div>
        </div>
      )}

      {/* Contract Total */}
      <div className="svc-row svc-row-charge">
        <label>Contract Total ({form.contractMonths} mo)</label>
        <div className="svc-row-right">
          <span style={{ fontSize: "18px", fontWeight: "bold", marginLeft: "10px" }}>$</span>
          <input
            type="text"
            readOnly
            className="svc-in"
            value={fmt(calc.contractTotal)}
            style={{
              borderBottom: "2px solid #ff0000",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              backgroundColor: "transparent",
              fontSize: "16px",
              fontWeight: "bold",
              padding: "4px",
              width: "140px",
              marginLeft: "5px",
            }}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="svc-row">
        <label>Notes</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="text"
            name="notes"
            value={form.notes ?? ""}
            onChange={onChange}
            placeholder="Service notes..."
          />
        </div>
      </div>
    </div>
  );
};
