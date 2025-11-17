import React from "react";
import { money } from "./money";

const pill = { border: "1px solid #e6e6e6", borderRadius: 999, padding: "8px 12px", display: "inline-block" };

export default function TotalsBar({ perVisit, perMonth, agreement, months, ruleText, monthlyLabel = "Per Month" }) {
  return (
    <div style={{ border: "1px solid #e6e6e6", borderRadius: 14, background: "#fff", padding: 18, marginBottom: 14 }}>
      <h3 style={{ margin: "0 0 10px" }}>Totals</h3>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={pill}>Per Visit: <strong>{money(perVisit)}</strong></div>
        <div style={pill}>{monthlyLabel}: <strong>{money(perMonth)}</strong></div>
        <div style={pill}>Agreement ({months} mo): <strong>{money(agreement)}</strong></div>
      </div>
      {ruleText && <div style={{ marginTop: 8, fontSize: 12, color: "#4a4a4a" }}>{ruleText}</div>}
    </div>
  );
}
