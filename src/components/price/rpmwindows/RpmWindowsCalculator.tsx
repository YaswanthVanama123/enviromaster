import React, { useMemo, useState } from "react";
import { money, unmoney } from "../shared/money";
import InlineMoneyEditor from "../shared/InlineMoneyEditor";
import TripChargeSelector from "../shared/TripChargeSelector";
import TotalsBar from "../shared/TotalsBar";
import { RW_DEFAULTS, RW_UI as UI } from "./constants";

const labelForFreq = (f) => ({ weekly: "Weekly", biweekly: "Biweekly", monthly: "Monthly", quarterly: "Quarterly" }[f] || "Weekly");
const visitsPerMonth = (f) => ({ weekly: 4.33, biweekly: 2.165, monthly: 1.0, quarterly: 0.25 }[f] ?? 4.33);

export default function RpmWindowsCalculator() {
  const [master, setMaster] = useState(RW_DEFAULTS);

  const [freq, setFreq] = useState("weekly");
  const [firstTime, setFirstTime] = useState("no"); // no | yes
  const [tripType, setTripType] = useState("beltway8");
  const [parkingAmt, setParkingAmt] = useState(0);
  const [agreementMonths, setAgreementMonths] = useState(12);

  const [small, setSmall] = useState(10);
  const [medium, setMedium] = useState(5);
  const [large, setLarge] = useState(2);

  const [includeMirrors, setIncludeMirrors] = useState("no");
  const [sm, setSm] = useState(0);
  const [mm, setMm] = useState(0);
  const [lm, setLm] = useState(0);

  const freqMult = (f, first) => {
    if (first === "yes") return master.multInstall;
    if (f === "biweekly" || f === "monthly") return master.mult125;
    if (f === "quarterly") return master.multQuarterly;
    return 1.0;
  };

  const tripCharge = (type, parking) => {
    if (type === "beltway8") return master.tripBeltway;
    if (type === "standard6") return master.tripStandard;
    if (type === "paid7") return master.tripPaidBase + Math.max(0, Number(parking) || 0);
    return 0;
  };

  const { perVisit, perMonth, agreement, ruleText } = useMemo(() => {
    const totalSmall = Number(small) + (includeMirrors === "yes" ? Number(sm) : 0);
    const totalMedium = Number(medium) + (includeMirrors === "yes" ? Number(mm) : 0);
    const totalLarge = Number(large) + (includeMirrors === "yes" ? Number(lm) : 0);

    const mult = freqMult(freq, firstTime);
    const labor =
      totalSmall * master.rateSmall +
      totalMedium * master.rateMedium +
      totalLarge * master.rateLarge;

    const perVisitCalc = labor * mult + tripCharge(tripType, parkingAmt);
    const perMonthCalc = perVisitCalc * visitsPerMonth(freq);
    const months = Math.max(1, Number(agreementMonths) || 1);
    const agreementCalc = perMonthCalc * months;

    const freqTxt = `${labelForFreq(freq)} ×${(firstTime === "yes" ? master.multInstall : mult).toFixed(2)}`;
    const rule = `${freqTxt}. Trip = ${money(tripCharge(tripType, parkingAmt))}.`;

    return { perVisit: perVisitCalc, perMonth: perMonthCalc, agreement: agreementCalc, ruleText: rule };
  }, [
    master, freq, firstTime, tripType, parkingAmt, agreementMonths,
    small, medium, large, includeMirrors, sm, mm, lm
  ]);

  const updateMaster = (k, raw) => {
    const val = unmoney(raw);
    setMaster((m) => ({ ...m, [k]: val === null || Number.isNaN(val) ? m[k] : val }));
  };

  return (
    <div>
      <div style={UI.card}>
        <div style={UI.grid}>
          <div style={UI.field}>
            <label>Frequency</label>
            <select style={UI.input} value={freq} onChange={(e) => setFreq(e.target.value)}>
              <option value="weekly">Weekly (×1.00)</option>
              <option value="biweekly">Biweekly (×1.25)</option>
              <option value="monthly">Monthly (×1.25)</option>
              <option value="quarterly">Quarterly (×2.00 after first)</option>
            </select>
          </div>

          <div style={UI.field}>
            <label>First Time (Install 300%)</label>
            <select style={UI.input} value={firstTime} onChange={(e) => setFirstTime(e.target.value)}>
              <option value="no">No</option>
              <option value="yes">Yes (installers handle)</option>
            </select>
          </div>

          <TripChargeSelector
            tripType={tripType}
            setTripType={setTripType}
            parkingAmt={parkingAmt}
            setParkingAmt={setParkingAmt}
          />

          <div style={UI.field}>
            <label>Agreement Months</label>
            <input style={UI.input} type="number" min={1} value={agreementMonths} onChange={(e) => setAgreementMonths(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={UI.card}>
        <h3 style={{ margin: "0 0 10px" }}>Counts (both sides)</h3>
        <div style={UI.grid}>
          <div style={UI.field}>
            <label>Small Windows</label>
            <input style={UI.input} type="number" min={0} value={small} onChange={(e) => setSmall(e.target.value)} />
          </div>
          <div style={UI.field}>
            <label>Medium Windows</label>
            <input style={UI.input} type="number" min={0} value={medium} onChange={(e) => setMedium(e.target.value)} />
          </div>
          <div style={UI.field}>
            <label>Large / Door Windows</label>
            <input style={UI.input} type="number" min={0} value={large} onChange={(e) => setLarge(e.target.value)} />
          </div>
          <div style={UI.field}>
            <label>Include Mirrors?</label>
            <select style={UI.input} value={includeMirrors} onChange={(e) => setIncludeMirrors(e.target.value)}>
              <option value="no">No</option>
              <option value="yes">Yes (same pricing)</option>
            </select>
          </div>
          <div style={UI.field}>
            <label>Small Mirrors</label>
            <input style={UI.input} type="number" min={0} value={sm} onChange={(e) => setSm(e.target.value)} />
          </div>
          <div style={UI.field}>
            <label>Medium Mirrors</label>
            <input style={UI.input} type="number" min={0} value={mm} onChange={(e) => setMm(e.target.value)} />
          </div>
          <div style={UI.field}>
            <label>Large Mirrors</label>
            <input style={UI.input} type="number" min={0} value={lm} onChange={(e) => setLm(e.target.value)} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#4a4a4a", marginTop: 6 }}>
          Mirror chem/technique same as windows → priced the same per size.
        </div>
      </div>

      <div style={UI.card}>
        <h3 style={{ margin: "0 0 10px" }}>Master Rates & Multipliers</h3>
        <table style={UI.table}>
          <thead>
            <tr><th style={UI.thtd}>Item</th><th style={UI.thtd}>Key</th><th style={UI.thtd}>Value</th><th style={UI.thtd}>Notes</th></tr>
          </thead>
          <tbody>
            {[
              ["Small (weekly, both sides)", "rateSmall", "Per pane"],
              ["Medium (weekly, both sides)", "rateMedium", "Per pane"],
              ["Large/Door (weekly, both sides)", "rateLarge", "Per pane"],
              ["First Time Multiplier", "multInstall", "300% (installers)"],
              ["Biweekly/Monthly Multiplier", "mult125", "125% of weekly"],
              ["Quarterly Multiplier (after first)", "multQuarterly", "200%"],
              ["Trip — Beltway", "tripBeltway", "Usually $8"],
              ["Trip — Standard", "tripStandard", "Usually $6"],
              ["Trip — Paid base", "tripPaidBase", "+ parking"],
            ].map(([label, key, note]) => (
              <tr key={key}>
                <td style={UI.thtd}>{label}</td>
                <td style={UI.thtd}>{key}</td>
                <td style={UI.thtd}>
                  <InlineMoneyEditor
                    value={master[key]}
                    display={money(master[key])}
                    onCommit={(v) => updateMaster(key, v)}
                  />
                </td>
                <td style={UI.thtd}>{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TotalsBar
        perVisit={perVisit}
        perMonth={perMonth}
        agreement={agreement}
        months={agreementMonths}
        ruleText={ruleText}
      />
    </div>
  );
}
