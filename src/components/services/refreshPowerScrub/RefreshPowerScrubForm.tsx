// src/features/services/refreshPowerScrub/RefreshPowerScrubForm.tsx
import React from "react";
import { useRefreshPowerScrubCalc } from "./useRefreshPowerScrubCalc";
import type { RefreshPowerScrubFormState } from "./refreshPowerScrubTypes";
import type { ServiceInitialData } from "../common/serviceTypes";
import {
  REFRESH_DEFAULT_MIN,
  REFRESH_FOH_RATE,
  REFRESH_KITCHEN_LARGE,
  REFRESH_KITCHEN_SMALL_MED,
} from "./refreshPowerScrubConfig";
import './refreshPowerScrub.css'

const formatAmount = (n: number): string =>
  n > 0 ? n.toFixed(2) : "";

export const RefreshPowerScrubForm: React.FC<
  ServiceInitialData<RefreshPowerScrubFormState>
> = ({ initialData }) => {
  const { form, onChange, setAreaField, areaTotals } =
    useRefreshPowerScrubCalc(initialData);

  return (
    <div className="svc-card svc-card-wide refresh-rps">
      <div className="svc-h-row">
        <div className="svc-h">REFRESH POWER SCRUB</div>
        <button type="button" className="svc-mini" aria-label="add">
          +
        </button>
      </div>

      <div className="rps-wrap rps-wrap-full">
        <table className="rps rps-full">
          <tbody>
            {/* Rate tier row inside SAME table (spans all columns) */}
            <tr>
              <td colSpan={6}>
                <div className="rps-inline">
                  <span className="rps-label">Rate Tier</span>
                  <select
                    className="rps-line"
                    name="rateType"
                    value={form.rateType}
                    onChange={onChange}
                  >
                    <option value="red_rate">Red (standard)</option>
                    <option value="green_rate">
                      Green (+30% premium)
                    </option>
                  </select>
                </div>
              </td>
            </tr>

            {/* CALC ROW 1: Pricing method for each column */}
            <tr>
              {/* Dumpster */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Dumpster Mode</span>
                  <select
                    className="rps-line"
                    value={form.dumpster.pricingMethod}
                    onChange={(e) =>
                      setAreaField(
                        "dumpster",
                        "pricingMethod",
                        e.target.value
                      )
                    }
                  >
                    <option value="area_specific">Area</option>
                    <option value="hourly">Hourly</option>
                    <option value="square_footage">Sq Ft</option>
                  </select>
                </div>
              </td>

              {/* Patio */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Patio Mode</span>
                  <select
                    className="rps-line"
                    value={form.patio.pricingMethod}
                    onChange={(e) =>
                      setAreaField(
                        "patio",
                        "pricingMethod",
                        e.target.value
                      )
                    }
                  >
                    <option value="area_specific">Area</option>
                    <option value="hourly">Hourly</option>
                    <option value="square_footage">Sq Ft</option>
                  </select>
                </div>
              </td>

              {/* Walkway */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Walkway Mode</span>
                  <select
                    className="rps-line"
                    value={form.walkway.pricingMethod}
                    onChange={(e) =>
                      setAreaField(
                        "walkway",
                        "pricingMethod",
                        e.target.value
                      )
                    }
                  >
                    <option value="area_specific">Area</option>
                    <option value="hourly">Hourly</option>
                    <option value="square_footage">Sq Ft</option>
                  </select>
                </div>
              </td>

              {/* FOH */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">FOH Mode</span>
                  <select
                    className="rps-line"
                    value={form.foh.pricingMethod}
                    onChange={(e) =>
                      setAreaField("foh", "pricingMethod", e.target.value)
                    }
                  >
                    <option value="area_specific">Area</option>
                    <option value="hourly">Hourly</option>
                    <option value="square_footage">Sq Ft</option>
                  </select>
                </div>
              </td>

              {/* BOH */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">BOH Mode</span>
                  <select
                    className="rps-line"
                    value={form.boh.pricingMethod}
                    onChange={(e) =>
                      setAreaField("boh", "pricingMethod", e.target.value)
                    }
                  >
                    <option value="area_specific">Area</option>
                    <option value="hourly">Hourly</option>
                    <option value="square_footage">Sq Ft</option>
                  </select>
                </div>
              </td>

              {/* Other */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Other Mode</span>
                  <select
                    className="rps-line"
                    value={form.other.pricingMethod}
                    onChange={(e) =>
                      setAreaField(
                        "other",
                        "pricingMethod",
                        e.target.value
                      )
                    }
                  >
                    <option value="area_specific">Area</option>
                    <option value="hourly">Hourly</option>
                    <option value="square_footage">Sq Ft</option>
                  </select>
                </div>
              </td>
            </tr>

            {/* CALC ROW 2: Area-specific core options per column */}
            <tr>
              {/* Dumpster – minimum visit */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Min</span>
                  <span>${REFRESH_DEFAULT_MIN}</span>
                </div>
              </td>

              {/* Patio – upsell vs standalone */}
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
                    <option value="standalone">Standalone</option>
                    <option value="upsell">Upsell</option>
                  </select>
                </div>
              </td>

              {/* Walkway – outside sq ft (for area / sq-ft) */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Outside Sq Ft</span>
                  <input
                    className="rps-line"
                    type="number"
                    value={form.walkway.outsideSqFt}
                    onChange={(e) =>
                      setAreaField(
                        "walkway",
                        "outsideSqFt",
                        e.target.value
                      )
                    }
                  />
                </div>
              </td>

              {/* FOH – fixed rate */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">FOH Fixed</span>
                  <span>${REFRESH_FOH_RATE}</span>
                </div>
              </td>

              {/* BOH – kitchen size */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Kitchen Size</span>
                  <select
                    className="rps-line"
                    value={form.boh.kitchenSize}
                    onChange={(e) =>
                      setAreaField(
                        "boh",
                        "kitchenSize",
                        e.target.value
                      )
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
              </td>

              {/* Other – freeform sq-ft inside (if needed) */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Inside Sq Ft</span>
                  <input
                    className="rps-line"
                    type="number"
                    value={form.other.insideSqFt}
                    onChange={(e) =>
                      setAreaField(
                        "other",
                        "insideSqFt",
                        e.target.value
                      )
                    }
                  />
                </div>
              </td>
            </tr>

            {/* CALC ROW 3: Hourly workers × hours per column */}
            <tr>
              {/* Dumpster */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">W×H</span>
                  <input
                    className="rps-line"
                    type="number"
                    value={form.dumpster.workers}
                    onChange={(e) =>
                      setAreaField(
                        "dumpster",
                        "workers",
                        e.target.value
                      )
                    }
                  />
                  <span>×</span>
                  <input
                    className="rps-line"
                    type="number"
                    value={form.dumpster.hours}
                    onChange={(e) =>
                      setAreaField(
                        "dumpster",
                        "hours",
                        e.target.value
                      )
                    }
                  />
                </div>
              </td>

              {/* Patio */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">W×H</span>
                  <input
                    className="rps-line"
                    type="number"
                    value={form.patio.workers}
                    onChange={(e) =>
                      setAreaField("patio", "workers", e.target.value)
                    }
                  />
                  <span>×</span>
                  <input
                    className="rps-line"
                    type="number"
                    value={form.patio.hours}
                    onChange={(e) =>
                      setAreaField("patio", "hours", e.target.value)
                    }
                  />
                </div>
              </td>

              {/* Walkway */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">W×H</span>
                  <input
                    className="rps-line"
                    type="number"
                    value={form.walkway.workers}
                    onChange={(e) =>
                      setAreaField(
                        "walkway",
                        "workers",
                        e.target.value
                      )
                    }
                  />
                  <span>×</span>
                  <input
                    className="rps-line"
                    type="number"
                    value={form.walkway.hours}
                    onChange={(e) =>
                      setAreaField("walkway", "hours", e.target.value)
                    }
                  />
                </div>
              </td>

              {/* FOH */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">W×H</span>
                  <input
                    className="rps-line"
                    type="number"
                    value={form.foh.workers}
                    onChange={(e) =>
                      setAreaField("foh", "workers", e.target.value)
                    }
                  />
                  <span>×</span>
                  <input
                    className="rps-line"
                    type="number"
                    value={form.foh.hours}
                    onChange={(e) =>
                      setAreaField("foh", "hours", e.target.value)
                    }
                  />
                </div>
              </td>

              {/* BOH */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">W×H</span>
                  <input
                    className="rps-line"
                    type="number"
                    value={form.boh.workers}
                    onChange={(e) =>
                      setAreaField("boh", "workers", e.target.value)
                    }
                  />
                  <span>×</span>
                  <input
                    className="rps-line"
                    type="number"
                    value={form.boh.hours}
                    onChange={(e) =>
                      setAreaField("boh", "hours", e.target.value)
                    }
                  />
                </div>
              </td>

              {/* Other */}
              <td>
                <div className="rps-inline">
                  <span className="rps-label">W×H</span>
                  <input
                    className="rps-line"
                    type="number"
                    value={form.other.workers}
                    onChange={(e) =>
                      setAreaField("other", "workers", e.target.value)
                    }
                  />
                  <span>×</span>
                  <input
                    className="rps-line"
                    type="number"
                    value={form.other.hours}
                    onChange={(e) =>
                      setAreaField("other", "hours", e.target.value)
                    }
                  />
                </div>
              </td>
            </tr>

            {/* AMOUNT ROW: Dumpster $ | Patio $ | Walkway $ | FOH $ | BOH $ | Other $ */}
            <tr>
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Dumpster $</span>
                  <input
                    className="rps-line"
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
                    className="rps-line"
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
                    className="rps-line"
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
                    className="rps-line"
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
                    className="rps-line"
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
                    className="rps-line"
                    type="text"
                    readOnly
                    value={formatAmount(areaTotals.other)}
                  />
                </div>
              </td>
            </tr>

            {/* FREQ ROW: Freq under each column */}
            <tr>
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Freq</span>
                  <input
                    className="rps-line"
                    type="text"
                    value={form.dumpster.freqText}
                    onChange={(e) =>
                      setAreaField(
                        "dumpster",
                        "freqText",
                        e.target.value
                      )
                    }
                  />
                </div>
              </td>
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Freq</span>
                  <input
                    className="rps-line"
                    type="text"
                    value={form.patio.freqText}
                    onChange={(e) =>
                      setAreaField(
                        "patio",
                        "freqText",
                        e.target.value
                      )
                    }
                  />
                </div>
              </td>
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Freq</span>
                  <input
                    className="rps-line"
                    type="text"
                    value={form.walkway.freqText}
                    onChange={(e) =>
                      setAreaField(
                        "walkway",
                        "freqText",
                        e.target.value
                      )
                    }
                  />
                </div>
              </td>
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Freq</span>
                  <input
                    className="rps-line"
                    type="text"
                    value={form.foh.freqText}
                    onChange={(e) =>
                      setAreaField("foh", "freqText", e.target.value)
                    }
                  />
                </div>
              </td>
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Freq</span>
                  <input
                    className="rps-line"
                    type="text"
                    value={form.boh.freqText}
                    onChange={(e) =>
                      setAreaField("boh", "freqText", e.target.value)
                    }
                  />
                </div>
              </td>
              <td>
                <div className="rps-inline">
                  <span className="rps-label">Freq</span>
                  <input
                    className="rps-line"
                    type="text"
                    value={form.other.freqText}
                    onChange={(e) =>
                      setAreaField(
                        "other",
                        "freqText",
                        e.target.value
                      )
                    }
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
