// src/features/services/saniclean/SanicleanForm.tsx
import React from "react";
import "../ServicesSection.css";
import { useSanicleanCalc } from "./useSanicleanCalc";
import { sanicleanPricingConfig as cfg } from "./sanicleanConfig";
import type { SanicleanFormState } from "./sanicleanTypes";
import type { ServiceInitialData } from "../common/serviceTypes";

const formatMoney = (n: number): string => `$${n.toFixed(2)}`;

export const SanicleanForm: React.FC<
  ServiceInitialData<SanicleanFormState>
> = ({ initialData }) => {
  const { form, onChange, calc } = useSanicleanCalc(initialData);

  const fixtures = Math.max(0, form.fixtureCount);

  // Soap dispensers & air freshener dispensers from sinks
  const soapDispensers =
    form.sinks * cfg.facilityComponents.sinks.ratioSinkToSoap;

  const airFreshDispensers =
    form.sinks > 0
      ? Math.ceil(
          form.sinks / cfg.facilityComponents.sinks.ratioSinkToAirFreshener
        )
      : 0;

  const luxuryUpgradeWeekly =
    form.soapType === "luxury" && soapDispensers > 0
      ? soapDispensers * cfg.soapUpgrades.standardToLuxury
      : 0;

  // Extra soap rate per gallon from rules
  const extraSoapRatePerGallon =
    form.soapType === "luxury"
      ? cfg.soapUpgrades.excessUsageCharges.luxurySoap
      : cfg.soapUpgrades.excessUsageCharges.standardSoap;

  const extraSoapWeekly =
    Math.max(0, form.excessSoapGallonsPerWeek) * extraSoapRatePerGallon;

  // Paper credit & overage from calc (so they respect all-inclusive logic)
  const paperCreditPerWeek = calc.weeklyPaperCredit;
  const paperOveragePerWeek = calc.weeklyPaperOverage;

  const isAllInclusive = calc.method === "all_inclusive";

  // New: contract months + total contract price (monthly * months)
  const contractMonths =
    form.contractMonths && form.contractMonths >= 2 && form.contractMonths <= 36
      ? form.contractMonths
      : 12;
  const contractTotal = calc.monthlyTotal * contractMonths;

  return (
    <div className="svc-card">
      {/* HEADER */}
      <div className="svc-h-row">
        <div className="svc-h">SANI CLEAN</div>
        <button type="button" className="svc-mini" aria-label="add">
          +
        </button>
      </div>

      {/* Pricing Mode */}
      <div className="svc-row">
        <label>Pricing Mode</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="pricingMode"
            value={form.pricingMode}
            onChange={onChange}
          >
            <option value="auto">Auto (recommended)</option>
            <option value="all_inclusive">All Inclusive</option>
            <option value="geographic_standard">
              Per Fixture / Geographic Standard
            </option>
          </select>
        </div>
      </div>

      {/* Total Restroom Fixtures (derived) */}
      <div className="svc-row">
        <label>Total Restroom Fixtures</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="fixtureCount"
            value={form.fixtureCount}
            readOnly
          />
        </div>
      </div>

      {/* Location */}
      <div className="svc-row">
        <label>Location</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="location"
            value={form.location}
            onChange={onChange}
          >
            <option value="insideBeltway">Inside Beltway</option>
            <option value="outsideBeltway">Outside Beltway</option>
          </select>
        </div>
      </div>

      {/* Parking */}
      <div className="svc-row">
        <label>Parking</label>
        <div className="svc-row-right">
          {form.location === "insideBeltway" ? (
            <label className="svc-inline">
              <input
                type="checkbox"
                name="needsParking"
                checked={form.needsParking}
                onChange={onChange}
              />
              <span>Parking needed (+parking fee in trip)</span>
            </label>
          ) : (
            <span className="svc-muted">Not applicable outside beltway</span>
          )}
        </div>
      </div>

      {/* ================== FIXTURE BREAKDOWN ================== */}
      <div className="svc-h" style={{ marginTop: 10 }}>
        FIXTURE BREAKDOWN
      </div>

      {/* Sinks */}
      <div className="svc-row">
        <label>Sinks</label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="sinks"
            value={form.sinks}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(
              cfg.geographicPricing[form.location].ratePerFixture
            )}
          />
          <span>=</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(
              form.sinks *
                cfg.geographicPricing[form.location].ratePerFixture
            )}
          />
        </div>
      </div>

      {/* Urinals */}
      <div className="svc-row">
        <label>Urinals </label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="urinals"
            value={form.urinals}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(
              cfg.geographicPricing[form.location].ratePerFixture
            )}
          />
          <span>=</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(
              form.urinals *
                cfg.geographicPricing[form.location].ratePerFixture
            )}
          />
        </div>
      </div>

      {/* Male Toilets */}
      <div className="svc-row">
        <label>Male Toilets </label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="maleToilets"
            value={form.maleToilets}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(
              cfg.geographicPricing[form.location].ratePerFixture
            )}
          />
          <span>=</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(
              form.maleToilets *
                cfg.geographicPricing[form.location].ratePerFixture
            )}
          />
        </div>
      </div>

      {/* Female Toilets */}
      <div className="svc-row">
        <label>Female Toilets </label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="femaleToilets"
            value={form.femaleToilets}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(
              cfg.geographicPricing[form.location].ratePerFixture
            )}
          />
          <span>=</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(
              form.femaleToilets *
                cfg.geographicPricing[form.location].ratePerFixture
            )}
          />
        </div>
      </div>

      {/* ================== SOAP & UPGRADES ================== */}
      <div className="svc-h" style={{ marginTop: 10 }}>
        SOAP, AIR FRESHENER &amp; UPGRADES
      </div>

      {/* Soap type selector */}
      <div className="svc-row">
        <label>Soap Type</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="soapType"
            value={form.soapType}
            onChange={onChange}
          >
            <option value="standard">Standard</option>
            <option value="luxury">Luxury (+$5/dispenser/wk)</option>
          </select>
        </div>
      </div>

      {/* Luxury upgrade calc row */}
      <div className="svc-row">
        <label>Luxury Upgrade </label>
        <div className="svc-row-right">
          <input className="svc-in" type="text" readOnly value={soapDispensers} />
          <span>@</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={form.soapType === "luxury" ? "$5.00" : "$0.00"}
          />
          <span>=</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(luxuryUpgradeWeekly)}
          />
        </div>
      </div>

      {/* Extra soap usage */}
      <div className="svc-row">
        <label>Extra Soap </label>
        <div className="svc-row-right">
          <input
            className="svc-in"
            type="number"
            name="excessSoapGallonsPerWeek"
            value={form.excessSoapGallonsPerWeek}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(extraSoapRatePerGallon)}
          />
          <span>=</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(extraSoapWeekly)}
          />
        </div>
      </div>

      {/* ================== MICROFIBER ================== */}
      <div className="svc-h" style={{ marginTop: 10 }}>
        MICROFIBER MOPPING
      </div>

      <div className="svc-row">
        <label>Microfiber Mopping </label>
        <div className="svc-row-right">
          <label className="svc-inline">
            <input
              type="checkbox"
              name="addMicrofiberMopping"
              checked={form.addMicrofiberMopping}
              onChange={onChange}
            />
            <span>Include</span>
          </label>
          <input
            className="svc-in"
            type="number"
            name="microfiberBathrooms"
            disabled={!form.addMicrofiberMopping}
            value={form.microfiberBathrooms}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={
              form.addMicrofiberMopping && !isAllInclusive
                ? formatMoney(cfg.addOnServices.microfiberMopping.pricePerBathroom)
                : "$0.00"
            }
          />
          <span>=</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(
              form.addMicrofiberMopping && !isAllInclusive
                ? form.microfiberBathrooms *
                    cfg.addOnServices.microfiberMopping.pricePerBathroom
                : 0
            )}
          />
        </div>
      </div>

      {/* ================== PAPER ================== */}
      <div className="svc-h" style={{ marginTop: 10 }}>
        PAPER
      </div>
      <div className="svc-row">
        <label>
          Paper Spend - Credit = Overage{" "}
          {!isAllInclusive && (
            <span className="svc-muted"></span>
          )}
        </label>
        <div className="svc-row-right">
          {/* editable weekly spend */}
          <input
            className="svc-in"
            type="number"
            name="estimatedPaperSpendPerWeek"
            value={form.estimatedPaperSpendPerWeek}
            onChange={onChange}
          />
          <span>-</span>
          {/* credit from calc (0 if not all-inclusive) */}
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(paperCreditPerWeek)}
          />
          <span>=</span>
          {/* overage = max(0, spend - credit) */}
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(paperOveragePerWeek)}
          />
        </div>
      </div>

      {/* ================== RATE TIER & NOTES ================== */}
      <div className="svc-row">
        <label>Rate Tier</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="rateTier"
            value={form.rateTier}
            onChange={onChange}
          >
            <option value="redRate">Red</option>
            <option value="greenRate">Green</option>
          </select>
        </div>
      </div>

      <div className="svc-row">
        <label>Notes</label>
        <div className="svc-row-right">
          <textarea
            className="svc-in"
            name="notes"
            value={form.notes}
            onChange={onChange}
            rows={3}
          />
        </div>
      </div>

      {/* ================== PRICING SUMMARY ================== */}
      <div className="svc-h" style={{ marginTop: 16 }}>
        PRICING SUMMARY
      </div>

      <div className="svc-row">
        <label>Chosen Method</label>
        <div className="svc-row-right">
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={
              calc.method === "all_inclusive"
                ? "All Inclusive"
                : calc.method === "small_facility_minimum"
                ? "Small Facility Minimum ($50/wk)"
                : "Per Fixture / Geographic Standard"
            }
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Weekly Total (Service + All Add-Ons)</label>
        <div className="svc-row-right">
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={formatMoney(calc.weeklyTotal)}
          />
        </div>
      </div>

      <div className="svc-row">
        <label>Monthly Recurring</label>
        <div className="svc-row-right">
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={formatMoney(calc.monthlyTotal)}
          />
        </div>
      </div>

      {/* New: contract duration & total contract price */}
      <div className="svc-row">
        <label>Contract Length (months)</label>
        <div className="svc-row-right">
          <select
            className="svc-in"
            name="contractMonths"
            value={contractMonths}
            onChange={onChange}
          >
            {Array.from({ length: 35 }, (_, i) => i + 2).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="svc-row">
        <label>Total Contract Price</label>
        <div className="svc-row-right">
          <input
            className="svc-in-box"
            type="text"
            readOnly
            value={formatMoney(contractTotal)}
          />
        </div>
      </div>
    </div>
  );
};

export default SanicleanForm;
