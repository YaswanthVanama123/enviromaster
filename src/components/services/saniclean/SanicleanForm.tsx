import React, { useEffect, useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSync, faSpinner } from "@fortawesome/free-solid-svg-icons";
import "../ServicesSection.css";
import { useSanicleanCalc } from "./useSanicleanCalc";
import { sanicleanPricingConfig as cfg } from "./sanicleanConfig";
import type { SanicleanFormState } from "./sanicleanTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const formatMoney = (n: number): string => `$${(isNaN(n) ? 0 : n).toFixed(2)}`;

// Helper function to ensure numeric values default to 0 instead of NaN
const safeNumber = (value: any): number => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

export const SanicleanForm: React.FC<
  ServiceInitialData<SanicleanFormState>
> = ({ initialData, onRemove }) => {
  const { form, onChange, calc, refreshConfig, isLoadingConfig } = useSanicleanCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Custom fields state - initialize with initialData if available
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.customFields || []
  );
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const fixtures = Math.max(0, form.fixtureCount);
  const isAllInclusive = calc.method === "all_inclusive";

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  // Calculate dispensers (for display only - no longer used in warranty calculation)
  const soapDispensers = form.sinks * cfg.facilityComponents.sinks.ratioSinkToSoap;
  const airFreshDispensers = form.sinks > 0
    ? Math.ceil(form.sinks / cfg.facilityComponents.sinks.ratioSinkToAirFreshener)
    : 0;

  // Determine which rate to display based on pricing mode
  const shouldShowAllInclusiveRate =
    form.pricingMode === "all_inclusive" ||
    (form.pricingMode === "auto" && fixtures >= form.allInclusiveMinFixtures);

  const baseRateDisplay = shouldShowAllInclusiveRate
    ? form.allInclusiveWeeklyRate
    : (form.location === "insideBeltway" ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture);

  const luxuryUpgradeWeekly = form.soapType === "luxury" && soapDispensers > 0
    ? soapDispensers * form.standardToLuxuryRate
    : 0;

  const extraSoapRatePerGallon = form.soapType === "luxury"
    ? form.excessLuxurySoapRate
    : form.excessStandardSoapRate;

  const extraSoapWeekly = Math.max(0, form.excessSoapGallonsPerWeek) * extraSoapRatePerGallon;

  useEffect(() => {
    if (servicesContext) {
      const isActive = fixtures > 0;

      const data = isActive ? {
        serviceId: "saniclean",
        displayName: "SaniClean",
        isActive: true,

        pricingMode: {
          label: "Pricing Mode",
          type: "text" as const,
          value: form.pricingMode === "all_inclusive" ? "All Inclusive" :
                 form.pricingMode === "geographic_standard" ? "Per Fixture / Geographic Standard" :
                 `Auto (${calc.method === "all_inclusive" ? "All Inclusive" : "Geographic Standard"})`,
        },

        location: {
          label: "Location",
          type: "text" as const,
          value: form.location === "insideBeltway" ? "Inside Beltway" : "Outside Beltway",
        },

        fixtureBreakdown: [
          ...(form.sinks > 0 ? [{
            label: "Sinks",
            type: "calc" as const,
            qty: form.sinks,
            rate: form.sinkRate,
            total: form.sinks * form.sinkRate,
          }] : []),
          ...(form.urinals > 0 ? [{
            label: "Urinals",
            type: "calc" as const,
            qty: form.urinals,
            rate: form.urinalRate,
            total: form.urinals * form.urinalRate,
          }] : []),
          ...(form.maleToilets > 0 ? [{
            label: "Male Toilets",
            type: "calc" as const,
            qty: form.maleToilets,
            rate: form.maleToiletRate,
            total: form.maleToilets * form.maleToiletRate,
          }] : []),
          ...(form.femaleToilets > 0 ? [{
            label: "Female Toilets",
            type: "calc" as const,
            qty: form.femaleToilets,
            rate: form.femaleToiletRate,
            total: form.femaleToilets * form.femaleToiletRate,
          }] : []),
        ],

        soapType: {
          label: "Soap Type",
          type: "text" as const,
          value: form.soapType === "luxury" ? "Luxury" : "Standard",
        },

        ...(luxuryUpgradeWeekly > 0 ? {
          luxuryUpgrade: {
            label: "Luxury Soap Upgrade",
            type: "calc" as const,
            qty: soapDispensers,
            rate: form.standardToLuxuryRate,
            total: luxuryUpgradeWeekly,
          },
        } : {}),

        ...(extraSoapWeekly > 0 ? {
          extraSoap: {
            label: "Extra Soap",
            type: "calc" as const,
            qty: form.excessSoapGallonsPerWeek,
            rate: extraSoapRatePerGallon,
            total: extraSoapWeekly,
          },
        } : {}),

        ...(!isAllInclusive && safeNumber(form.warrantyQty) > 0 ? {
          warranty: {
            label: "Warranty",
            type: "calc" as const,
            qty: form.warrantyQty,
            rate: form.warrantyRate,
            total: safeNumber(form.warrantyQty) * safeNumber(form.warrantyRate),
          },
        } : {}),

        ...(form.addMicrofiberMopping && form.microfiberBathrooms > 0 && !isAllInclusive ? {
          microfiberMopping: {
            label: "Microfiber Mopping",
            type: "calc" as const,
            qty: form.microfiberBathrooms,
            rate: form.microfiberMoppingPerBathroom,
            total: form.microfiberBathrooms * form.microfiberMoppingPerBathroom,
          },
        } : {}),

        ...(isAllInclusive ? {
          paperCreditInfo: {
            label: "Paper Credit/Overage",
            type: "text" as const,
            value: `Spend: $${form.estimatedPaperSpendPerWeek.toFixed(2)} - Credit: $${calc.weeklyPaperCredit.toFixed(2)} = Overage: $${calc.weeklyPaperOverage.toFixed(2)}`,
          },
        } : {}),

        totals: {
          weekly: {
            label: "Weekly Total",
            type: "dollar" as const,
            amount: calc.weeklyTotal,
          },
          monthly: {
            label: "Monthly Recurring",
            type: "dollar" as const,
            amount: calc.monthlyTotal,
          },
          contract: {
            label: "Contract Total",
            type: "dollar" as const,
            months: form.contractMonths,
            amount: calc.monthlyTotal * (form.contractMonths || 12),
          },
        },

        notes: form.notes || "",
        customFields: customFields,
      } : null;

      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("saniclean", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, calc, fixtures, customFields, soapDispensers, isAllInclusive, shouldShowAllInclusiveRate, baseRateDisplay, luxuryUpgradeWeekly, extraSoapRatePerGallon, extraSoapWeekly, form.sinkRate, form.urinalRate, form.maleToiletRate, form.femaleToiletRate, form.urinalComponentsQty, form.urinalComponentsRate, form.maleToiletComponentsQty, form.maleToiletComponentsRate, form.femaleToiletComponentsQty, form.femaleToiletComponentsRate, form.warrantyQty, form.warrantyRate]);

  console.log('📊 [SaniClean Form] Display Rate:', {
    pricingMode: form.pricingMode,
    calcMethod: calc.method,
    isAllInclusive,
    shouldShowAllInclusiveRate,
    allInclusiveWeeklyRate: form.allInclusiveWeeklyRate,
    insideBeltwayRatePerFixture: form.insideBeltwayRatePerFixture,
    outsideBeltwayRatePerFixture: form.outsideBeltwayRatePerFixture,
    baseRateDisplay,
    location: form.location,
    fixtures: fixtures,
    allInclusiveMinFixtures: form.allInclusiveMinFixtures,
  });

  const paperCreditPerWeek = calc.weeklyPaperCredit;
  const paperOveragePerWeek = calc.weeklyPaperOverage;

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
        <div className="svc-h-actions">
          <button
            type="button"
            className="svc-mini"
            onClick={refreshConfig}
            disabled={isLoadingConfig}
            title="Refresh config from database"
          >
            <FontAwesomeIcon
              icon={isLoadingConfig ? faSpinner : faSync}
              spin={isLoadingConfig}
            />
          </button>
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
              Per Fixture / Geographic
            </option>
          </select>
        </div>
      </div>

      {/* Total Restroom Fixtures */}
      <div className="svc-row">
        <label>Restroom Fixtures</label>
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
              <span>Parking needed (+fee)</span>
            </label>
          ) : (
            <span className="svc-muted">Not applicable outside beltway</span>
          )}
        </div>
      </div>

      {/* ================== FIXTURE BREAKDOWN ================== */}
      <div className="svc-h-sub" style={{ marginTop: 10 }}>
        FIXTURE BREAKDOWN
      </div>

      {/* Sinks */}
      <div className="svc-row">
        <label>Sinks</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            name="sinks"
            value={form.sinks}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
            step="0.01"
            name="sinkRate"
            value={safeNumber(form.sinkRate)}
            onChange={onChange}
            title="Rate per sink (editable - salesman can set independently)"
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(safeNumber(form.sinks) * safeNumber(form.sinkRate))}
          />
        </div>
      </div>

      {/* Urinals */}
      <div className="svc-row">
        <label>Urinals</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            name="urinals"
            value={form.urinals}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
            step="0.01"
            name="urinalRate"
            value={safeNumber(form.urinalRate)}
            onChange={onChange}
            title="Rate per urinal (editable - salesman can set independently)"
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(safeNumber(form.urinals) * safeNumber(form.urinalRate))}
          />
        </div>
      </div>

      {/* Male Toilets */}
      <div className="svc-row">
        <label>Male Toilets</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            name="maleToilets"
            value={form.maleToilets}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
            step="0.01"
            name="maleToiletRate"
            value={safeNumber(form.maleToiletRate)}
            onChange={onChange}
            title="Rate per male toilet (editable - salesman can set independently)"
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(safeNumber(form.maleToilets) * safeNumber(form.maleToiletRate))}
          />
        </div>
      </div>

      {/* Female Toilets */}
      <div className="svc-row">
        <label>Female Toilets</label>
        <div className="svc-row-right">
          <input
            className="svc-in field-qty"
            type="number"
            name="femaleToilets"
            value={form.femaleToilets}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
            step="0.01"
            name="femaleToiletRate"
            value={safeNumber(form.femaleToiletRate)}
            onChange={onChange}
            title="Rate per female toilet (editable - salesman can set independently)"
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(safeNumber(form.femaleToilets) * safeNumber(form.femaleToiletRate))}
          />
        </div>
      </div>

      {/* ================== SOAP & UPGRADES ================== */}
      <div className="svc-h-sub" style={{ marginTop: 10 }}>
        SOAP &amp; UPGRADES
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
            <option value="luxury">Luxury (+$5/disp/wk)</option>
          </select>
        </div>
      </div>

      {/* Luxury upgrade calc */}
      <div className="svc-row">
        <label>Luxury Upgrade</label>
        <div className="svc-row-right">
          <input className="svc-in field-qty" type="text" readOnly value={soapDispensers} />
          <span>@</span>
          <input
            className="svc-in field-qty"
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
            className="svc-in field-qty"
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
            className="svc-in field-qty"
            type="number"
            name="excessSoapGallonsPerWeek"
            value={form.excessSoapGallonsPerWeek}
            onChange={onChange}
          />
          <span>@</span>
          <input
            className="svc-in field-qty"
            type="number"
            step="0.01"
            name={form.soapType === "luxury" ? "excessLuxurySoapRate" : "excessStandardSoapRate"}
            value={extraSoapRatePerGallon}
            onChange={onChange}
            title={`Excess ${form.soapType} soap rate per gallon (from backend)`}
          />
          <span>=</span>
          <input
            className="svc-in field-qty"
            type="text"
            readOnly
            value={formatMoney(extraSoapWeekly)}
          />
        </div>
      </div>

      {/* Warranty – free in all-inclusive, charged otherwise */}
      <div className="svc-row">
        <label>Warranty</label>
        <div className="svc-row-right">
          {isAllInclusive ? (
            <input
              className="svc-in field-qty"
              type="text"
              readOnly
              value="Included (fees waived in All-Inclusive)"
            />
          ) : (
            <>
              <input
                className="svc-in field-qty"
                type="number"
                name="warrantyQty"
                value={safeNumber(form.warrantyQty)}
                onChange={onChange}
                title="Warranty quantity (editable - salesman sets independently)"
              />
              <span>@</span>
              <input
                className="svc-in field-qty"
                type="number"
                step="0.01"
                name="warrantyRate"
                value={safeNumber(form.warrantyRate)}
                onChange={onChange}
                title="Warranty rate per unit per week (editable - salesman sets independently)"
              />
              <span>=</span>
              <input
                className="svc-in field-qty"
                type="text"
                readOnly
                value={formatMoney(safeNumber(form.warrantyQty) * safeNumber(form.warrantyRate))}
              />
            </>
          )}
        </div>
      </div>

      {/* ================== FACILITY COMPONENTS BREAKDOWN ================== */}
      {!isAllInclusive && (
        <>
          <div className="svc-h" style={{ marginTop: 10 }}>
            FACILITY COMPONENTS (Monthly Charges)
          </div>

          <div className="svc-row">
            <label>Urinal Components (screens + mats)</label>
            <div className="svc-row-right">
              <input
                className="svc-in field-qty"
                type="number"
                name="urinalComponentsQty"
                value={safeNumber(form.urinalComponentsQty)}
                onChange={onChange}
                title="Quantity of urinal components (editable - salesman sets independently)"
              />
              <span>@</span>
              <input
                className="svc-in field-qty"
                type="number"
                step="0.01"
                name="urinalComponentsRate"
                value={safeNumber(form.urinalComponentsRate)}
                onChange={onChange}
                title="Rate per urinal component per month (editable - salesman sets independently)"
              />
              <span>=</span>
              <input
                className="svc-in field-qty"
                type="text"
                readOnly
                value={formatMoney(safeNumber(form.urinalComponentsQty) * safeNumber(form.urinalComponentsRate))}
              />
            </div>
          </div>

          <div className="svc-row">
            <label>Male Toilet Components (clips + covers)</label>
            <div className="svc-row-right">
              <input
                className="svc-in field-qty"
                type="number"
                name="maleToiletComponentsQty"
                value={safeNumber(form.maleToiletComponentsQty)}
                onChange={onChange}
                title="Quantity of male toilet components (editable - salesman sets independently)"
              />
              <span>@</span>
              <input
                className="svc-in field-qty"
                type="number"
                step="0.01"
                name="maleToiletComponentsRate"
                value={safeNumber(form.maleToiletComponentsRate)}
                onChange={onChange}
                title="Rate per male toilet component per month (editable - salesman sets independently)"
              />
              <span>=</span>
              <input
                className="svc-in field-qty"
                type="text"
                readOnly
                value={formatMoney(safeNumber(form.maleToiletComponentsQty) * safeNumber(form.maleToiletComponentsRate))}
              />
            </div>
          </div>

          <div className="svc-row">
            <label>Female Toilet Components (SaniPods)</label>
            <div className="svc-row-right">
              <input
                className="svc-in field-qty"
                type="number"
                name="femaleToiletComponentsQty"
                value={safeNumber(form.femaleToiletComponentsQty)}
                onChange={onChange}
                title="Quantity of female toilet components (editable - salesman sets independently)"
              />
              <span>@</span>
              <input
                className="svc-in field-qty"
                type="number"
                step="0.01"
                name="femaleToiletComponentsRate"
                value={safeNumber(form.femaleToiletComponentsRate)}
                onChange={onChange}
                title="Rate per female toilet component per month (editable - salesman sets independently)"
              />
              <span>=</span>
              <input
                className="svc-in field-qty"
                type="text"
                readOnly
                value={formatMoney(safeNumber(form.femaleToiletComponentsQty) * safeNumber(form.femaleToiletComponentsRate))}
              />
            </div>
          </div>

          <div className="svc-row">
            <label>Total Facility Components (weekly equivalent)</label>
            <div className="svc-row-right">
              <input
                className="svc-in-box"
                type="text"
                readOnly
                value={formatMoney(
                  (safeNumber(form.urinalComponentsQty) * safeNumber(form.urinalComponentsRate) +
                   safeNumber(form.maleToiletComponentsQty) * safeNumber(form.maleToiletComponentsRate) +
                   safeNumber(form.femaleToiletComponentsQty) * safeNumber(form.femaleToiletComponentsRate)) / safeNumber(form.weeklyToMonthlyMultiplier || 4.33)
                )}
                title="Monthly facility components ÷ 4.33 weeks/month"
              />
            </div>
          </div>
        </>
      )}

      {/* ================== MICROFIBER ================== */}
      <div className="svc-h-sub" style={{ marginTop: 10 }}>
        MICROFIBER MOPPING
      </div>

      {isAllInclusive ? (
        <div className="svc-row">
          <label>Microfiber Mopping</label>
          <div className="svc-row-right">
            <input
              className="svc-in field-qty"
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
              className="svc-in field-qty"
              type="number"
              name="microfiberBathrooms"
              disabled={!form.addMicrofiberMopping}
              value={form.microfiberBathrooms}
              onChange={onChange}
            />
            <span>@</span>
            <input
              className="svc-in field-qty"
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
              className="svc-i field-qty"
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
      <div className="svc-h-sub" style={{ marginTop: 10 }}>
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
      <div className="svc-h-sub" style={{ marginTop: 10 }}>
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
      <div className="svc-h-sub" style={{ marginTop: 16 }}>
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
                ? `Small Facility Minimum ($${form.smallFacilityMinimumWeekly}/wk)`
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
        <label>Contract Total</label>
        <div className="svc-row-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            className="svc-in"
            name="contractMonths"
            value={contractMonths}
            onChange={onChange}
            style={{
              borderBottom: '2px solid #000',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              backgroundColor: 'transparent',
              padding: '4px 20px 4px 4px'
            }}
          >
            {Array.from({ length: 35 }, (_, i) => i + 2).map((m) => (
              <option key={m} value={m}>
                {m} mo
              </option>
            ))}
          </select>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>$</span>
          <input
            className="svc-in"
            type="text"
            readOnly
            value={contractTotal.toFixed(2)}
            style={{
              borderBottom: '2px solid #ff0000',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              backgroundColor: 'transparent',
              fontSize: '16px',
              fontWeight: 'bold',
              padding: '4px',
              width: '100px'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SanicleanForm;
