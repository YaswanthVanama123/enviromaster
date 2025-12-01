import React, { useEffect, useState } from "react";
import "../ServicesSection.css";
import { useSanicleanCalc } from "./useSanicleanCalc";
import { sanicleanPricingConfig as cfg } from "./sanicleanConfig";
import type { SanicleanFormState } from "./sanicleanTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const formatMoney = (n: number): string => `$${n.toFixed(2)}`;

export const SanicleanForm: React.FC<
  ServiceInitialData<SanicleanFormState>
> = ({ initialData, onRemove }) => {
  const { form, onChange, calc } = useSanicleanCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const fixtures = Math.max(0, form.fixtureCount);
  const isAllInclusive = calc.method === "all_inclusive";

  // Broadcast SaniClean state to context for cross-service integration
  useEffect(() => {
    if (servicesContext) {
      const isActive = fixtures > 0 && calc.weeklyTotal > 0;
      servicesContext.updateSaniclean({
        pricingMode: form.pricingMode,
        fixtureCount: fixtures,
        isActive,
        // Save complete form data for form submission INCLUDING custom fields
        formData: {
          ...form,
          ...calc,
          isActive,
          customFields, // ADD THIS - save custom fields!
        },
      });
    }
  }, [form, calc, fixtures, customFields, servicesContext?.updateSaniclean]);

  // Per-fixture UI price:
  //  - All Inclusive → $20/fixture/week (from form, editable)
  //  - Else          → geographic rate ($7 or $6, from form, editable)
  const baseRateDisplay = isAllInclusive
    ? form.allInclusiveWeeklyRate
    : (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture);

  // Dispensers from sinks
  const soapDispensers =
    form.sinks * cfg.facilityComponents.sinks.ratioSinkToSoap;

  const airFreshDispensers =
    form.sinks > 0
      ? Math.ceil(
          form.sinks / cfg.facilityComponents.sinks.ratioSinkToAirFreshener
        )
      : 0;

  const dispenserCount = soapDispensers + airFreshDispensers;

  const luxuryUpgradeWeekly =
    form.soapType === "luxury" && soapDispensers > 0
      ? soapDispensers * form.standardToLuxuryRate  // ✅ USE FORM VALUE (editable)
      : 0;

  const extraSoapRatePerGallon =
    form.soapType === "luxury"
      ? form.excessLuxurySoapRate  // ✅ USE FORM VALUE (editable)
      : form.excessStandardSoapRate;  // ✅ USE FORM VALUE (editable)

  const extraSoapWeekly =
    Math.max(0, form.excessSoapGallonsPerWeek) * extraSoapRatePerGallon;

  const paperCreditPerWeek = calc.weeklyPaperCredit;
  const paperOveragePerWeek = calc.weeklyPaperOverage;

  const contractMonths =
    form.contractMonths && form.contractMonths >= 2 && form.contractMonths <= 36
      ? form.contractMonths
      : 12;
  const contractTotal = calc.monthlyTotal * contractMonths;

  const weeklyWarrantyDisplay = isAllInclusive
    ? 0
    : dispenserCount * cfg.warrantyFeePerDispenser;

  return (
    <div className="svc-card">
      {/* HEADER */}
      <div className="svc-h-row">
        <div className="svc-h">SANI CLEAN</div>
        <button
          type="button"
          className="svc-mini"
          onClick={() => setShowAddDropdown(!showAddDropdown)}
          title="Add custom field"
        >
          +
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

      {/* Custom fields manager - appears at the top */}
      <CustomFieldManager
        fields={customFields}
        onFieldsChange={setCustomFields}
        showAddDropdown={showAddDropdown}
        onToggleAddDropdown={setShowAddDropdown}
      />

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

      {/* Total Restroom Fixtures */}
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
            type="number"
            step="0.01"
            name={isAllInclusive ? "allInclusiveWeeklyRate" : (form.location === "insideBeltway" ? "insideBeltwayRatePerFixture" : "outsideBeltwayRatePerFixture")}
            value={baseRateDisplay}
            onChange={onChange}
            title={isAllInclusive ? "All-inclusive rate per fixture (from backend)" : "Geographic rate per fixture (from backend)"}
          />
          <span>=</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(form.sinks * baseRateDisplay)}
          />
        </div>
      </div>

      {/* Urinals */}
      <div className="svc-row">
        <label>Urinals</label>
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
            type="number"
            step="0.01"
            name={isAllInclusive ? "allInclusiveWeeklyRate" : (form.location === "insideBeltway" ? "insideBeltwayRatePerFixture" : "outsideBeltwayRatePerFixture")}
            value={baseRateDisplay}
            onChange={onChange}
            title={isAllInclusive ? "All-inclusive rate per fixture (from backend)" : "Geographic rate per fixture (from backend)"}
          />
          <span>=</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(form.urinals * baseRateDisplay)}
          />
        </div>
      </div>

      {/* Male Toilets */}
      <div className="svc-row">
        <label>Male Toilets</label>
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
            type="number"
            step="0.01"
            name={isAllInclusive ? "allInclusiveWeeklyRate" : (form.location === "insideBeltway" ? "insideBeltwayRatePerFixture" : "outsideBeltwayRatePerFixture")}
            value={baseRateDisplay}
            onChange={onChange}
            title={isAllInclusive ? "All-inclusive rate per fixture (from backend)" : "Geographic rate per fixture (from backend)"}
          />
          <span>=</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(form.maleToilets * baseRateDisplay)}
          />
        </div>
      </div>

      {/* Female Toilets */}
      <div className="svc-row">
        <label>Female Toilets</label>
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
            type="number"
            step="0.01"
            name={isAllInclusive ? "allInclusiveWeeklyRate" : (form.location === "insideBeltway" ? "insideBeltwayRatePerFixture" : "outsideBeltwayRatePerFixture")}
            value={baseRateDisplay}
            onChange={onChange}
            title={isAllInclusive ? "All-inclusive rate per fixture (from backend)" : "Geographic rate per fixture (from backend)"}
          />
          <span>=</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={formatMoney(form.femaleToilets * baseRateDisplay)}
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
            <option value="standard">Standard (included)</option>
            <option value="luxury">Luxury (+$5/dispenser/wk)</option>
          </select>
        </div>
      </div>

      {/* Luxury upgrade calc */}
      <div className="svc-row">
        <label>Luxury Upgrade</label>
        <div className="svc-row-right">
          <input className="svc-in" type="text" readOnly value={soapDispensers} />
          <span>@</span>
          <input
            className="svc-in"
            type="number"
            step="0.01"
            name="standardToLuxuryRate"
            value={form.soapType === "luxury" ? form.standardToLuxuryRate : 0}
            onChange={onChange}
            disabled={form.soapType !== "luxury"}
            title="Luxury soap upgrade rate per dispenser per week (from backend)"
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
        <label>Extra Soap</label>
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
            type="number"
            step="0.01"
            name={form.soapType === "luxury" ? "excessLuxurySoapRate" : "excessStandardSoapRate"}
            value={extraSoapRatePerGallon}
            onChange={onChange}
            title={`Excess ${form.soapType} soap rate per gallon (from backend)`}
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

      {/* Warranty – free in all-inclusive, charged otherwise */}
      <div className="svc-row">
        <label>Dispenser Warranty</label>
        <div className="svc-row-right">
          {isAllInclusive ? (
            <input
              className="svc-in"
              type="text"
              readOnly
              value="Included (fees waived in All-Inclusive)"
            />
          ) : (
            <>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={dispenserCount}
              />
              <span>@</span>
              <input
                className="svc-in"
                type="number"
                step="0.01"
                name="warrantyFeePerDispenser"
                value={form.warrantyFeePerDispenser}
                onChange={onChange}
                title="Warranty fee per dispenser per week (from backend)"
              />
              <span>=</span>
              <input
                className="svc-in"
                type="text"
                readOnly
                value={formatMoney(weeklyWarrantyDisplay)}
              />
            </>
          )}
        </div>
      </div>

      {/* ================== MICROFIBER ================== */}
      <div className="svc-h" style={{ marginTop: 10 }}>
        MICROFIBER MOPPING
      </div>

      {isAllInclusive ? (
        <div className="svc-row">
          <label>Microfiber Mopping</label>
          <div className="svc-row-right">
            <input
              className="svc-in"
              type="text"
              readOnly
              value="Included in All-Inclusive bundle"
            />
          </div>
        </div>
      ) : (
        <div className="svc-row">
          <label>Microfiber Mopping</label>
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
              type="number"
              step="0.01"
              name="microfiberMoppingPerBathroom"
              disabled={!form.addMicrofiberMopping}
              value={form.addMicrofiberMopping ? form.microfiberMoppingPerBathroom : 0}
              onChange={onChange}
              title="Microfiber mopping rate per bathroom per week (from backend)"
            />
            <span>=</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={formatMoney(
                form.addMicrofiberMopping
                  ? form.microfiberBathrooms * form.microfiberMoppingPerBathroom
                  : 0
              )}
            />
          </div>
        </div>
      )}

      {/* ================== PAPER ================== */}
      <div className="svc-h" style={{ marginTop: 10 }}>
        PAPER
      </div>

      {isAllInclusive ? (
        <div className="svc-row">
          <label>Paper Spend - Credit = Overage</label>
          <div className="svc-row-right">
            <input
              className="svc-in"
              type="number"
              name="estimatedPaperSpendPerWeek"
              value={form.estimatedPaperSpendPerWeek}
              onChange={onChange}
            />
            <span>-</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={formatMoney(paperCreditPerWeek)}
            />
            <span>=</span>
            <input
              className="svc-in"
              type="text"
              readOnly
              value={formatMoney(paperOveragePerWeek)}
            />
          </div>
        </div>
      ) : (
        <div className="svc-row">
          <label>Paper (non–All-Inclusive)</label>
          <div className="svc-row-right">
            <input
              className="svc-in"
              type="text"
              readOnly
              value="Paper handled via products table (no automatic credit here)"
            />
          </div>
        </div>
      )}

      {/* ================== WHAT'S INCLUDED ================== */}
      <div className="svc-h" style={{ marginTop: 10 }}>
        WHAT&apos;S INCLUDED
      </div>

      {isAllInclusive ? (
        <div className="svc-row">
          <label>All-Inclusive Bundle</label>
          <div className="svc-row-right">
            <div>
              • Weekly SaniClean service<br />
              • Monthly SaniScrub<br />
              • SaniPods for female toilets<br />
              • Urinal mats &amp; screens<br />
              • Paper dispensers &amp; paper (up to credit)<br />
              • Microfiber mopping system<br />
              • Dispenser warranty fees waived<br />
              • Trip charge waived
            </div>
          </div>
        </div>
      ) : (
        <div className="svc-row">
          <label>Standard Package</label>
          <div className="svc-row-right">
            <div>
              • Weekly SaniClean service<br />
              • Standard soap (one fill/week)<br />
              • Electrostatic spray<br />
              • Other services (SaniPods, mats, paper, microfiber) sold as
              add-ons
            </div>
          </div>
        </div>
      )}

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
