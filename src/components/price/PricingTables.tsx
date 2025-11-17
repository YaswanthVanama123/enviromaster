import React, { useState } from "react";
import SaniCleanCalculator from "./saniclean/SaniCleanCalculator";
import RpmWindowsCalculator from "./rpmwindows/RpmWindowsCalculator";

const card = { border: "1px solid #e6e6e6", borderRadius: 14, background: "#fff", padding: 18, marginBottom: 14 };

export default function PricingTables() {
  const [tab, setTab] = useState("SaniClean");

  const tabs = [
    { key: "SaniClean", component: <SaniCleanCalculator /> },
    { key: "RPM Windows", component: <RpmWindowsCalculator /> },
    // Add new services easily:
    // { key: "SaniScrub", component: <SaniScrubCalculator /> },
    // { key: "Drains", component: <DrainsCalculator /> },
    // { key: "Microfiber Mopping", component: <MoppingCalculator /> },
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
              cursor: "pointer",
            }}
          >
            {t.key}
          </button>
        ))}
      </div>

      {/* Current tab content */}
      {tabs.find((t) => t.key === tab)?.component}
    </div>
  );
}
