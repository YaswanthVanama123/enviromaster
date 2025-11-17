import React, { useMemo, useState } from "react";

/** Simple UI primitives (no external deps) */
const card = {
  border: "1px solid #e6e6e6",
  borderRadius: 14,
  boxShadow: "0 1px 2px rgba(0,0,0,.05)",
  background: "#fff",
  padding: 18,
  marginBottom: 14,
};
const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(12, 1fr)",
  gap: 12,
};
const field = { gridColumn: "span 3", display: "flex", flexDirection: "column", gap: 6 };
const inputStyle = {
  border: "1px solid #e6e6e6",
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
};
const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  border: "1px solid #e6e6e6",
  borderRadius: 12,
  overflow: "hidden",
};
const thtd = { borderBottom: "1px solid #e6e6e6", padding: "10px 12px", textAlign: "left", verticalAlign: "middle" };
const pill = { border: "1px solid #e6e6e6", borderRadius: 999, padding: "8px 12px", display: "inline-block" };

const money = (n) => (isNaN(n) ? "$0.00" : `$${Number(n).toFixed(2)}`);
const unmoney = (s) =>
  s && `${s}`.trim() !== "—" ? Number(String(s).replace(/[^0-9.\-]/g, "")) || 0 : null;

/* -------------------------------------------
   SaniClean (per fixture) — Calculator
-------------------------------------------- */
function SaniCleanCalculator() {
  // editable “master” values (seeded to PDF defaults)
  const [master, setMaster] = useState({
    insidePrice: 7,
    insideMin: 40,
    beltwayTrip: 8,

    outsidePrice: 6,
    outsideMin: null, // “—”
    outsideTripPDF: 8,

    paidBase: 7,
    smallMin: 50,
    allIncPrice: 20,
  });

  // inputs
  const [region, setRegion] = useState("inside"); // inside | outside
  const [fixtures, setFixtures] = useState(10);
  const [agreementMonths, setAgreementMonths] = useState(12);
  const [tripType, setTripType] = useState("beltway8"); // beltway8 | standard6 | paid7 | waived
  const [parkingAmt, setParkingAmt] = useState(0);
  const [allInclusive, setAllInclusive] = useState("no"); // no | yes
  const [smallThreshold, setSmallThreshold] = useState(5);

  const { perVisit, perMonth, agreement, ruleText } = useMemo(() => {
    // resolve base unit/min by region
    let unit = region === "inside" ? master.insidePrice : master.outsidePrice;
    let regMin = region === "inside" ? master.insideMin ?? 0 : master.outsideMin ?? 0;

    // All-Inclusive overrides
    const isAllInc = allInclusive === "yes";
    if (isAllInc) {
      unit = master.allIncPrice;
      regMin = 0;
    }

    // trip
    let trip = 0;
    if (!isAllInc) {
      if (tripType === "beltway8") trip = master.beltwayTrip;
      else if (tripType === "standard6") trip = 6;
      else if (tripType === "paid7") trip = (master.paidBase || 7) + Math.max(0, Number(parkingAmt) || 0);
      else trip = 0;
    }

    // compute per-visit
    const fx = Math.max(0, Number(fixtures) || 0);
    let perVisitCalc = Math.max(unit * fx + trip, regMin || 0);

    let rule = isAllInc
      ? "All-Inclusive: trip waived; other services bundled."
      : `Trip = ${money(trip)}; Regional minimum = ${regMin ? money(regMin) : "—"}.`;

    // small-account rule
    if (!isAllInc && fx > 0 && fx <= Math.max(0, Number(smallThreshold) || 0)) {
      perVisitCalc = Math.max(perVisitCalc, master.smallMin);
      rule = `Small-account rule: fixtures ≤ ${smallThreshold}, minimum ${money(master.smallMin)} (trip included).`;
    }

    const perMonthCalc = perVisitCalc * 4.33; // weekly cadence
    const months = Math.max(1, Number(agreementMonths) || 1);
    const agreementCalc = perMonthCalc * months;

    return {
      perVisit: perVisitCalc,
      perMonth: perMonthCalc,
      agreement: agreementCalc,
      ruleText: rule,
    };
  }, [master, region, fixtures, agreementMonths, tripType, parkingAmt, allInclusive, smallThreshold]);

  // helpers to edit master table cells
  const updateMaster = (k, raw) => {
    const val = unmoney(raw);
    setMaster((m) => ({ ...m, [k]: val === null || Number.isNaN(val) ? m[k] : val }));
  };

  const reset = () =>
    setMaster({
      insidePrice: 7,
      insideMin: 40,
      beltwayTrip: 8,
      outsidePrice: 6,
      outsideMin: null,
      outsideTripPDF: 8,
      paidBase: 7,
      smallMin: 50,
      allIncPrice: 20,
    });

  return (
    <div>
      <div style={card}>
        <div style={grid}>
          <div style={field}>
            <label>Region</label>
            <select style={inputStyle} value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="inside">Inside Beltway</option>
              <option value="outside">Outside Beltway</option>
            </select>
          </div>

          <div style={field}>
            <label>Fixtures (count)</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              value={fixtures}
              onChange={(e) => setFixtures(e.target.value)}
            />
          </div>

          <div style={field}>
            <label>Agreement Months</label>
            <input
              style={inputStyle}
              type="number"
              min={1}
              value={agreementMonths}
              onChange={(e) => setAgreementMonths(e.target.value)}
            />
          </div>

          <div style={field}>
            <label>Trip Charge</label>
            <select style={inputStyle} value={tripType} onChange={(e) => setTripType(e.target.value)}>
              <option value="beltway8">Beltway $8</option>
              <option value="standard6">Standard $6</option>
              <option value="paid7">Paid $7 + parking</option>
              <option value="waived">Waived</option>
            </select>
          </div>

          <div style={field}>
            <label>Parking (only for paid)</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              step="0.01"
              value={parkingAmt}
              onChange={(e) => setParkingAmt(e.target.value)}
            />
          </div>

          <div style={field}>
            <label>All-Inclusive?</label>
            <select style={inputStyle} value={allInclusive} onChange={(e) => setAllInclusive(e.target.value)}>
              <option value="no">No</option>
              <option value="yes">Yes (Trip waived, $20/fixture)</option>
            </select>
          </div>

          <div style={field}>
            <label>Small-Account Threshold</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              value={smallThreshold}
              onChange={(e) => setSmallThreshold(e.target.value)}
            />
            <small style={{ color: "#4a4a4a" }}>≤ threshold → $50 visit incl. trip</small>
          </div>
        </div>
      </div>

      <div style={card}>
        <h3 style={{ margin: "0 0 10px" }}>Master Rates</h3>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thtd}>Item</th>
              <th style={thtd}>Key</th>
              <th style={thtd}>Value</th>
              <th style={thtd}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Inside Beltway (per fixture)", "insidePrice", "price", "Base rate inside beltway"],
              ["Inside Min (per visit)", "insideMin", "money", "Regional minimum"],
              ["Trip — Beltway", "beltwayTrip", "money", "Standard $8"],

              ["Outside Beltway (per fixture)", "outsidePrice", "price", "Base rate outside beltway"],
              ["Outside Min (per visit)", "outsideMin", "moneyOrDash", "— if none"],
              ["Trip — Outside (PDF line)", "outsideTripPDF", "money", "SaniClean section shows $8"],

              ["Trip — Paid base", "paidBase", "money", "+ parking pass-through"],
              ["Small-Account Minimum (≤ threshold)", "smallMin", "money", "Includes trip"],
              ["All-Inclusive (per fixture)", "allIncPrice", "price", "Trip waived"],
            ].map(([label, key, mode, note]) => (
              <tr key={key}>
                <td style={thtd}>{label}</td>
                <td style={thtd}>{key}</td>
                <td style={thtd}>
                  <InlineMoneyEditor
                    value={master[key]}
                    display={mode === "moneyOrDash" && master[key] == null ? "—" : money(master[key] ?? 0)}
                    onCommit={(v) => updateMaster(key, v)}
                  />
                </td>
                <td style={thtd}>{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <h3 style={{ margin: "0 0 10px" }}>Totals</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={pill}>Per Visit: <strong>{money(perVisit)}</strong></div>
          <div style={pill}>Per Month (×4.33): <strong>{money(perMonth)}</strong></div>
          <div style={pill}>Agreement ({agreementMonths} mo): <strong>{money(agreement)}</strong></div>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#4a4a4a" }}>{ruleText}</div>
      </div>

      <div style={{ ...card, display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          onClick={reset}
          style={{ border: "1px solid #ff4500", color: "#ff4500", background: "#fff", borderRadius: 10, padding: "10px 14px", fontWeight: 600 }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------
   RPM Windows (both sides) — Calculator
-------------------------------------------- */
function RpmWindowsCalculator() {
  const [master, setMaster] = useState({
    rateSmall: 1.5,
    rateMedium: 3,
    rateLarge: 7,
    multInstall: 3.0, // 300%
    mult125: 1.25,    // biweekly/monthly
    multQuarterly: 2.0,
    tripBeltway: 8,
    tripStandard: 6,
    tripPaidBase: 7,
  });

  const [freq, setFreq] = useState("weekly"); // weekly | biweekly | monthly | quarterly
  const [firstTime, setFirstTime] = useState("no"); // no | yes
  const [tripType, setTripType] = useState("beltway8"); // beltway8 | standard6 | paid7 | waived
  const [parkingAmt, setParkingAmt] = useState(0);
  const [agreementMonths, setAgreementMonths] = useState(12);

  const [small, setSmall] = useState(10);
  const [medium, setMedium] = useState(5);
  const [large, setLarge] = useState(2);

  const [includeMirrors, setIncludeMirrors] = useState("no"); // no | yes
  const [sm, setSm] = useState(0);
  const [mm, setMm] = useState(0);
  const [lm, setLm] = useState(0);

  const visitsPerMonth = (f) =>
    ({ weekly: 4.33, biweekly: 2.165, monthly: 1, quarterly: 0.25 }[f] ?? 4.33);

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

    const freqTxt =
      firstTime === "yes"
        ? `${labelForFreq(freq)} ×3.00 (first-time install)`
        : `${labelForFreq(freq)} ×${mult.toFixed(2)}`;

    const rule = `${freqTxt}. Trip = ${money(tripCharge(tripType, parkingAmt))}.`;

    return { perVisit: perVisitCalc, perMonth: perMonthCalc, agreement: agreementCalc, ruleText: rule };
  }, [
    master,
    freq,
    firstTime,
    tripType,
    parkingAmt,
    agreementMonths,
    small,
    medium,
    large,
    includeMirrors,
    sm,
    mm,
    lm,
  ]);

  const updateMaster = (k, raw) => {
    const val = unmoney(raw);
    setMaster((m) => ({ ...m, [k]: val === null || Number.isNaN(val) ? m[k] : val }));
  };

  const reset = () => {
    setMaster({
      rateSmall: 1.5,
      rateMedium: 3,
      rateLarge: 7,
      multInstall: 3.0,
      mult125: 1.25,
      multQuarterly: 2.0,
      tripBeltway: 8,
      tripStandard: 6,
      tripPaidBase: 7,
    });
    setFreq("weekly");
    setFirstTime("no");
    setTripType("beltway8");
    setParkingAmt(0);
    setAgreementMonths(12);
    setSmall(10);
    setMedium(5);
    setLarge(2);
    setIncludeMirrors("no");
    setSm(0);
    setMm(0);
    setLm(0);
  };

  return (
    <div>
      <div style={card}>
        <div style={grid}>
          <div style={field}>
            <label>Frequency</label>
            <select style={inputStyle} value={freq} onChange={(e) => setFreq(e.target.value)}>
              <option value="weekly">Weekly (×1.00)</option>
              <option value="biweekly">Biweekly (×1.25)</option>
              <option value="monthly">Monthly (×1.25)</option>
              <option value="quarterly">Quarterly (×2.00 after first)</option>
            </select>
          </div>

          <div style={field}>
            <label>First Time (Install 300%)</label>
            <select style={inputStyle} value={firstTime} onChange={(e) => setFirstTime(e.target.value)}>
              <option value="no">No</option>
              <option value="yes">Yes (installers handle)</option>
            </select>
          </div>

          <div style={field}>
            <label>Trip Charge</label>
            <select style={inputStyle} value={tripType} onChange={(e) => setTripType(e.target.value)}>
              <option value="beltway8">Beltway $8</option>
              <option value="standard6">Standard $6</option>
              <option value="paid7">Paid $7 + parking</option>
              <option value="waived">Waived</option>
            </select>
          </div>

          <div style={field}>
            <label>Parking (only for paid)</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              step="0.01"
              value={parkingAmt}
              onChange={(e) => setParkingAmt(e.target.value)}
            />
          </div>

          <div style={field}>
            <label>Agreement Months</label>
            <input
              style={inputStyle}
              type="number"
              min={1}
              value={agreementMonths}
              onChange={(e) => setAgreementMonths(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={card}>
        <h3 style={{ margin: "0 0 10px" }}>Counts (both sides)</h3>
        <div style={grid}>
          <div style={field}>
            <label>Small Windows</label>
            <input style={inputStyle} type="number" min={0} value={small} onChange={(e) => setSmall(e.target.value)} />
          </div>
          <div style={field}>
            <label>Medium Windows</label>
            <input style={inputStyle} type="number" min={0} value={medium} onChange={(e) => setMedium(e.target.value)} />
          </div>
          <div style={field}>
            <label>Large / Door Windows</label>
            <input style={inputStyle} type="number" min={0} value={large} onChange={(e) => setLarge(e.target.value)} />
          </div>
          <div style={field}>
            <label>Include Mirrors?</label>
            <select style={inputStyle} value={includeMirrors} onChange={(e) => setIncludeMirrors(e.target.value)}>
              <option value="no">No</option>
              <option value="yes">Yes (same pricing)</option>
            </select>
          </div>
          <div style={field}>
            <label>Small Mirrors</label>
            <input style={inputStyle} type="number" min={0} value={sm} onChange={(e) => setSm(e.target.value)} />
          </div>
          <div style={field}>
            <label>Medium Mirrors</label>
            <input style={inputStyle} type="number" min={0} value={mm} onChange={(e) => setMm(e.target.value)} />
          </div>
          <div style={field}>
            <label>Large Mirrors</label>
            <input style={inputStyle} type="number" min={0} value={lm} onChange={(e) => setLm(e.target.value)} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#4a4a4a", marginTop: 6 }}>
          Mirror chem/technique same as windows → priced the same per size.
        </div>
      </div>

      <div style={card}>
        <h3 style={{ margin: "0 0 10px" }}>Master Rates & Multipliers</h3>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thtd}>Item</th>
              <th style={thtd}>Key</th>
              <th style={thtd}>Value</th>
              <th style={thtd}>Notes</th>
            </tr>
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
                <td style={thtd}>{label}</td>
                <td style={thtd}>{key}</td>
                <td style={thtd}>
                  <InlineMoneyEditor
                    value={master[key]}
                    display={money(master[key])}
                    onCommit={(v) => updateMaster(key, v, setMaster)}
                  />
                </td>
                <td style={thtd}>{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={card}>
        <h3 style={{ margin: "0 0 10px" }}>Totals</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={pill}>Per Visit: <strong>{money(perVisit)}</strong></div>
          <div style={pill}>Per Month: <strong>{money(perMonth)}</strong></div>
          <div style={pill}>Agreement ({agreementMonths} mo): <strong>{money(agreement)}</strong></div>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "#4a4a4a" }}>{ruleText}</div>
      </div>

      <div style={{ ...card, display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          onClick={reset}
          style={{ border: "1px solid #ff4500", color: "#ff4500", background: "#fff", borderRadius: 10, padding: "10px 14px", fontWeight: 600 }}
        >
          Reset
        </button>
      </div>

      <div style={{ ...card }}>
        <h3 style={{ margin: "0 0 10px" }}>Value Proposition</h3>
        <ul style={{ margin: "6px 0 0 18px" }}>
          <li>
            <strong>Protects glass:</strong> Janitorial crews often seal grime causing haze. We acid wash, seal, and
            maintain so the glass looks new.
          </li>
          <li>
            <strong>Lower weekday costs:</strong> No extra chemicals between visits—microfiber towels and water (we can
            include towels).
          </li>
        </ul>
      </div>
    </div>
  );
}

function labelForFreq(freq) {
  return { weekly: "Weekly", biweekly: "Biweekly", monthly: "Monthly", quarterly: "Quarterly" }[freq] || "Weekly";
}

/** Inline money editor (click → edit → Enter/blur to commit) */
function InlineMoneyEditor({ value, display, onCommit }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(display ?? money(value ?? 0));

  return editing ? (
    <input
      style={{ ...inputStyle, width: 140 }}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        onCommit(text);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onCommit(text);
          setEditing(false);
        }
      }}
      autoFocus
    />
  ) : (
    <button
      type="button"
      onClick={() => {
        setText(display ?? money(value ?? 0));
        setEditing(true);
      }}
      style={{
        border: "1px dashed transparent",
        borderRadius: 8,
        padding: "6px 10px",
        cursor: "pointer",
        background: "#fff",
      }}
      title="Click to edit"
    >
      {display ?? money(value ?? 0)}
    </button>
  );
}

/* -------------------------------------------
   Parent: PricingTables
-------------------------------------------- */
export default function PricingTables() {
  const [tab, setTab] = useState("SaniClean");

  const tabs = [
    { key: "SaniClean", component: <SaniCleanCalculator /> },
    { key: "RPM Windows", component: <RpmWindowsCalculator /> },
    // Add next: { key: "SaniScrub", component: <SaniScrubCalculator /> },
    // Add next: { key: "Microfiber Mopping", component: <MoppingCalculator /> },
    // Add next: { key: "Drains", component: <DrainsCalculator /> },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "28px auto", padding: "0 16px 48px" }}>
      <h1 style={{ fontSize: 24, margin: 0 }}>Pricing Tables</h1>
      <p style={{ color: "#4a4a4a", marginTop: 8, marginBottom: 16 }}>
        Choose a service to configure its rates, rules, and agreement totals.
      </p>

      {/* Tabs */}
      <div style={{ ...card, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid #e6e6e6",
              background: tab === t.key ? "#fff1eb" : "#fff",
              color: tab === t.key ? "#ff4500" : "#212121",
              fontWeight: 600,
            }}
          >
            {t.key}
          </button>
        ))}
      </div>

      {/* Content */}
      {tabs.find((t) => t.key === tab)?.component}
    </div>
  );
}
