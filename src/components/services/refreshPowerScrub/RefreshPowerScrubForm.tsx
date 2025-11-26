import React, { useEffect, useRef, useState } from "react";
import { useRefreshPowerScrubCalc } from "./useRefreshPowerScrubCalc";
import type {
  RefreshAreaKey,
  RefreshPowerScrubFormState,
} from "./refreshPowerScrubTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import {
  REFRESH_FOH_RATE,
  REFRESH_KITCHEN_LARGE,
  REFRESH_KITCHEN_SMALL_MED,
  REFRESH_PATIO_STANDALONE,
  REFRESH_PATIO_UPSELL,
} from "./refreshPowerScrubConfig";
import "./refreshPowerScrub.css";
import { useServicesContextOptional } from "../ServicesContext";
import { CustomFieldManager, type CustomField } from "../CustomFieldManager";

const formatAmount = (n: number): string => n.toFixed(2);

const FREQ_OPTIONS = [
  "",
  "Weekly",
  "Bi-weekly",
  "Monthly",
  "Quarterly",
  "One-time",
];

const AREA_ORDER: RefreshAreaKey[] = [
  "dumpster",
  "patio",
  "walkway",
  "foh",
  "boh",
  "other",
];

export const RefreshPowerScrubForm: React.FC<
  ServiceInitialData<RefreshPowerScrubFormState>
> = ({ initialData, onRemove }) => {
  const {
    form,
    setTripCharge,
    setHourlyRate,
    setMinimumVisit,
    toggleAreaEnabled,
    setAreaField,
    areaTotals,
  } = useRefreshPowerScrubCalc(initialData);
  const servicesContext = useServicesContextOptional();

  // Save form data to context for form submission
  const prevDataRef = useRef<string>("");

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  useEffect(() => {
    if (servicesContext) {
      const isActive = AREA_ORDER.some(key => form[key]?.enabled);
      const data = isActive ? { ...form, areaTotals, isActive } : null;
      const dataStr = JSON.stringify(data);

      if (dataStr !== prevDataRef.current) {
        prevDataRef.current = dataStr;
        servicesContext.updateService("refreshPowerScrub", data);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, areaTotals]);

  // For each column, show the default rule price so the user
  // knows the starting point even before typing anything.
  const getPresetAmount = (areaKey: RefreshAreaKey): number => {
    switch (areaKey) {
      case "dumpster":
        // Default is the minimum visit (e.g. $475)
        return form.minimumVisit;

      case "patio":
        return form.patio.patioMode === "upsell"
          ? REFRESH_PATIO_UPSELL
          : REFRESH_PATIO_STANDALONE;

      case "foh":
        return REFRESH_FOH_RATE;

      case "boh":
        return form.boh.kitchenSize === "large"
          ? REFRESH_KITCHEN_LARGE
          : REFRESH_KITCHEN_SMALL_MED;

      case "walkway":
      case "other":
      default:
        // These are usually custom – no fixed preset
        return 0;
    }
  };

  return (
    <div className="svc-card svc-card-wide refresh-rps">
      <div className="svc-h-row">
        <div className="svc-h">REFRESH POWER SCRUB</div>
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

      {/* Custom fields manager */}
      <CustomFieldManager
        fields={customFields}
        onFieldsChange={setCustomFields}
        showAddDropdown={showAddDropdown}
        onToggleAddDropdown={setShowAddDropdown}
      />

      {/* Global rule controls */}
      <div className="rps-config-row">
        <div className="rps-inline">
          <span className="rps-label">Trip Charge</span>
          <span>$</span>
          <input
            type="number"
            className="rps-line rps-num"
            value={form.tripCharge}
            onChange={(e) => setTripCharge(e.target.value)}
          />
        </div>
        <div className="rps-inline">
          <span className="rps-label">Hourly Rate</span>
          <span>$</span>
          <input
            type="number"
            className="rps-line rps-num"
            value={form.hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
          />
          <span>/hr/worker</span>
        </div>
        <div className="rps-inline">
          <span className="rps-label">Minimum Visit</span>
          <span>$</span>
          <input
            type="number"
            className="rps-line rps-num"
            value={form.minimumVisit}
            onChange={(e) => setMinimumVisit(e.target.value)}
          />
        </div>
      </div>

      <div className="rps-wrap rps-wrap-full">
        <table className="rps rps-full">
          <tbody>
            {/* Row 1 – Area names + enable checkbox */}
            <tr>
              {AREA_ORDER.map((areaKey) => (
                <td key={`head-${areaKey}`}>
                  <label className="rps-area-header">
                    <input
                      type="checkbox"
                      checked={form[areaKey].enabled}
                      onChange={(e) =>
                        toggleAreaEnabled(areaKey, e.target.checked)
                      }
                    />
                    <span className="rps-label-strong">
                      {areaKey === "dumpster"
                        ? "DUMPSTER"
                        : areaKey === "patio"
                        ? "PATIO"
                        : areaKey === "walkway"
                        ? "WALKWAY"
                        : areaKey === "foh"
                        ? "FRONT OF HOUSE"
                        : areaKey === "boh"
                        ? "BACK OF HOUSE"
                        : "OTHER"}
                    </span>
                  </label>
                </td>
              ))}
            </tr>

            {/* Row 2 – Preset rule summary + selector fields */}
            <tr>
              {/* DUMPSTER */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">
                    Default: Min ${formatAmount(getPresetAmount("dumpster"))}
                  </span>
                </div>
              </td>

              {/* PATIO */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Patio Type</span>
                  <select
                    className="rps-line"
                    value={form.patio.patioMode}
                    onChange={(e) =>
                      setAreaField("patio", "patioMode", e.target.value)
                    }
                  >
                    <option value="standalone">
                      Standalone (${REFRESH_PATIO_STANDALONE})
                    </option>
                    <option value="upsell">
                      Upsell (+${REFRESH_PATIO_UPSELL})
                    </option>
                  </select>
                </div>
                <div className="rps-inline">
                  <span className="rps-label">
                    Default: ${formatAmount(getPresetAmount("patio"))}
                  </span>
                </div>
              </td>

              {/* WALKWAY */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">
                    Use sq-ft (outside) below
                  </span>
                </div>
              </td>

              {/* FRONT OF HOUSE */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">
                    Default: ${formatAmount(getPresetAmount("foh"))}
                  </span>
                </div>
              </td>

              {/* BACK OF HOUSE */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Kitchen Size</span>
                  <select
                    className="rps-line"
                    value={form.boh.kitchenSize}
                    onChange={(e) =>
                      setAreaField("boh", "kitchenSize", e.target.value)
                    }
                  >
                    <option value="smallMedium">
                      Small / Medium (${REFRESH_KITCHEN_SMALL_MED})
                    </option>
                    <option value="large">
                      Large (${REFRESH_KITCHEN_LARGE})
                    </option>
                  </select>
                </div>
                <div className="rps-inline">
                  <span className="rps-label">
                    Default: ${formatAmount(getPresetAmount("boh"))}
                  </span>
                </div>
              </td>

              {/* OTHER */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">
                    Custom – use hours or sq-ft
                  </span>
                </div>
              </td>
            </tr>

            {/* Row 3 – Hourly fields (W×H) */}
            <tr>
              {AREA_ORDER.map((areaKey) => (
                <td key={`wh-${areaKey}`}>
                  <div className="rps-inline">
                    <span className="rps-label">W×H</span>
                    <input
                      className="rps-line rps-num"
                      type="number"
                      value={form[areaKey].workers}
                      onChange={(e) =>
                        setAreaField(
                          areaKey,
                          "workers",
                          e.target.value
                        )
                      }
                    />
                    <span>×</span>
                    <input
                      className="rps-line rps-num"
                      type="number"
                      value={form[areaKey].hours}
                      onChange={(e) =>
                        setAreaField(areaKey, "hours", e.target.value)
                      }
                    />
                  </div>
                </td>
              ))}
            </tr>

            {/* Row 4 – Sq-ft fields (Inside @ Outside) */}
            <tr>
              {AREA_ORDER.map((areaKey) => (
                <td key={`sq-${areaKey}`}>
                  <div className="rps-inline">
                    <span className="rps-label">Sq Ft</span>
                    <input
                      className="rps-line rps-num"
                      type="number"
                      placeholder="Inside"
                      value={form[areaKey].insideSqFt}
                      onChange={(e) =>
                        setAreaField(
                          areaKey,
                          "insideSqFt",
                          e.target.value
                        )
                      }
                    />
                    <span>@</span>
                    <input
                      className="rps-line rps-num"
                      type="number"
                      placeholder="Outside"
                      value={form[areaKey].outsideSqFt}
                      onChange={(e) =>
                        setAreaField(
                          areaKey,
                          "outsideSqFt",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </td>
              ))}
            </tr>

            {/* Row 5 – Amounts (auto-calculated) */}
            <tr>
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Dumpster $</span>
                  <input
                    className="rps-line rps-num"
                    type="text"
                    readOnly
                    value={formatAmount(areaTotals.dumpster)}
                  />
                </div>
              </td>
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Patio $</span>
                  <input
                    className="rps-line rps-num"
                    type="text"
                    readOnly
                    value={formatAmount(areaTotals.patio)}
                  />
                </div>
              </td>
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Walkway $</span>
                  <input
                    className="rps-line rps-num"
                    type="text"
                    readOnly
                    value={formatAmount(areaTotals.walkway)}
                  />
                </div>
              </td>
              <td>
                <div className="rps-inline">
                  <span className="rps-label">FOH $</span>
                  <input
                    className="rps-line rps-num"
                    type="text"
                    readOnly
                    value={formatAmount(areaTotals.foh)}
                  />
                </div>
              </td>
              <td>
                <div className="rps-inline">
                  <span className="rps-label">BOH $</span>
                  <input
                    className="rps-line rps-num"
                    type="text"
                    readOnly
                    value={formatAmount(areaTotals.boh)}
                  />
                </div>
              </td>
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Other $</span>
                  <input
                    className="rps-line rps-num"
                    type="text"
                    readOnly
                    value={formatAmount(areaTotals.other)}
                  />
                </div>
              </td>
            </tr>

            {/* Row 6 – Frequency dropdowns (for display only) */}
            <tr>
              {AREA_ORDER.map((areaKey) => (
                <td key={`freq-${areaKey}`}>
                  <div className="rps-inline">
                    <span className="rps-label">Freq</span>
                    <select
                      className="rps-line"
                      value={form[areaKey].frequencyLabel}
                      onChange={(e) =>
                        setAreaField(
                          areaKey,
                          "frequencyLabel",
                          e.target.value
                        )
                      }
                    >
                      {FREQ_OPTIONS.map((opt) => (
                        <option value={opt} key={opt || "blank"}>
                          {opt || "-"}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
