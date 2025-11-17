import React, { useMemo, useState } from "react";
import { money, unmoney } from "../shared/money";
import InlineMoneyEditor from "../shared/InlineMoneyEditor";
import TripChargeSelector from "../shared/TripChargeSelector";
import TotalsBar from "../shared/TotalsBar";
import { SC_DEFAULTS, SC_UI as UI } from "./constants";

export default function SaniCleanCalculator() {
  const [master, setMaster] = useState(SC_DEFAULTS);

  // inputs
  const [region, setRegion] = useState("inside");        // inside | outside
  const [fixtures, setFixtures] = useState(10);
  const [agreementMonths, setAgreementMonths] = useState(12);
  const [tripType, setTripType] = useState("beltway8");  // beltway8 | standard6 | paid7 | waived
  const [parkingAmt, setParkingAmt] = useState(0);
  const [allInclusive, setAllInclusive] = useState("no");// no | yes
  const [smallThreshold, setSmallThreshold] = useState(5);

  const updateMaster = (k, raw) => {
    const val = unmoney(raw);
    setMaster((m) => ({ ...m, [k]: val === null || Number.isNaN(val) ? m[k] : val }));
  };

  const computeTrip = () => {
    if (allInclusive === "yes") return 0;
    if (tripType === "beltway8")  return master.beltwayTrip;
    if (tripType === "standard6") return 6;
    if (tripType === "paid7")     return (master.paidBase || 7) + Math.max(0, Number(parkingAmt) || 0);
    return 0;
  };

  const { perVisit, perMonth, agreement, ruleText } = useMemo(() => {
    let unit  = region === "inside" ? master.insidePrice : master.outsidePrice;
    let regMin= region === "inside" ? (master.insideMin ?? 0) : (master.outsideMin ?? 0);

    const isAllInc = allInclusive === "yes";
    if (isAllInc) { unit = master.allIncPrice; regMin = 0; }

    const fx = Math.max(0, Number(fixtures) || 0);
    const trip = computeTrip();

    let perVisitCalc = Math.max(unit * fx + trip, regMin || 0);
    let rule = isAllInc
      ? "All-Inclusive: trip waived; other services bundled."
      : `Trip = ${money(trip)}; Regional minimum = ${regMin ? money(regMin) : "—"}.`;

    if (!isAllInc && fx > 0 && fx <= Math.max(0, Number(smallThreshold) || 0)) {
      perVisitCalc = Math.max(perVisitCalc, master.smallMin);
      rule = `Small-account rule: fixtures ≤ ${smallThreshold}, minimum ${money(master.smallMin)} (trip included).`;
    }

    const perMonthCalc = perVisitCalc * 4.33; // weekly cadence
    const months = Math.max(1, Number(agreementMonths) || 1);
    const agreementCalc = perMonthCalc * months;

    return { perVisit: perVisitCalc, perMonth: perMonthCalc, agreement: agreementCalc, ruleText: rule };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master, region, fixtures, agreementMonths, tripType, parkingAmt, allInclusive, smallThreshold]);

  return (
    <div>
      <div style={UI.card}>
        <div style={UI.grid}>
          <div style={UI.field}>
            <label>Region</label>
            <select style={UI.input} value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="inside">Inside Beltway</option>
              <option value="outside">Outside Beltway</option>
            </select>
          </div>

          <div style={UI.field}>
            <label>Fixtures (count)</label>
            <input style={UI.input} type="number" min={0} value={fixtures} onChange={(e) => setFixtures(e.target.value)} />
          </div>

          <div style={UI.field}>
            <label>Agreement Months</label>
            <input style={UI.input} type="number" min={1} value={agreementMonths} onChange={(e) => setAgreementMonths(e.target.value)} />
          </div>

          <TripChargeSelector
            tripType={tripType}
            setTripType={setTripType}
            parkingAmt={parkingAmt}
            setParkingAmt={setParkingAmt}
          />

          <div style={UI.field}>
            <label>All-Inclusive?</label>
            <select style={UI.input} value={allInclusive} onChange={(e) => setAllInclusive(e.target.value)}>
              <option value="no">No</option>
              <option value="yes">Yes (Trip waived, $20/fixture)</option>
            </select>
          </div>

          <div style={UI.field}>
            <label>Small-Account Threshold</label>
            <input style={UI.input} type="number" min={0} value={smallThreshold} onChange={(e) => setSmallThreshold(e.target.value)} />
            <small style={{ color: "#4a4a4a" }}>≤ threshold → $50 visit incl. trip</small>
          </div>
        </div>
      </div>

      <div style={UI.card}>
        <h3 style={{ margin: "0 0 10px" }}>Master Rates</h3>
        <table style={UI.table}>
          <thead>
            <tr><th style={UI.thtd}>Item</th><th style={UI.thtd}>Key</th><th style={UI.thtd}>Value</th><th style={UI.thtd}>Notes</th></tr>
          </thead>
          <tbody>
            {[
              ["Inside Beltway (per fixture)", "insidePrice", "Base rate inside beltway"],
              ["Inside Min (per visit)", "insideMin", "Regional minimum"],
              ["Trip — Beltway", "beltwayTrip", "Standard $8"],
              ["Outside Beltway (per fixture)", "outsidePrice", "Base rate outside beltway"],
              ["Outside Min (per visit)", "outsideMin", "— if none"],
              ["Trip — Outside (PDF line)", "outsideTripPDF", "SaniClean line says $8"],
              ["Trip — Paid base", "paidBase", "+ parking pass-through"],
              ["Small-Account Min (≤ threshold)", "smallMin", "Includes trip"],
              ["All-Inclusive (per fixture)", "allIncPrice", "Trip waived"],
            ].map(([label, key, note]) => (
              <tr key={key}>
                <td style={UI.thtd}>{label}</td>
                <td style={UI.thtd}>{key}</td>
                <td style={UI.thtd}>
                  <InlineMoneyEditor
                    value={master[key]}
                    display={master[key] == null ? "—" : money(master[key])}
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
        monthlyLabel="Per Month (×4.33)"
      />
    </div>
  );
}
