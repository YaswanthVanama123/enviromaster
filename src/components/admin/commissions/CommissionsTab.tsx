import React, { useState } from "react";
import { CommissionCalculator } from "./CommissionCalculator";
import { CommissionRulesManager } from "./CommissionRulesManager";
import { CommissionHistory } from "./CommissionHistory";
import "./CommissionsTab.css";

type SubTab = "calculator" | "history" | "rules";

export const CommissionsTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("calculator");

  return (
    <div className="commissions-tab-container">
      <div className="commissions-header">
        <h2>Commission Calculator</h2>
        <p className="commissions-subtitle">
          Calculate sales commissions based on account type, pricing line, and quota achievement
        </p>
      </div>

      <div className="commissions-subtab-bar">
        <button
          className={`subtab-btn ${activeSubTab === "calculator" ? "active" : ""}`}
          onClick={() => setActiveSubTab("calculator")}
        >
          <span className="subtab-icon">🧮</span>
          Calculator
        </button>
        <button
          className={`subtab-btn ${activeSubTab === "history" ? "active" : ""}`}
          onClick={() => setActiveSubTab("history")}
        >
          <span className="subtab-icon">📋</span>
          History
        </button>
        <button
          className={`subtab-btn ${activeSubTab === "rules" ? "active" : ""}`}
          onClick={() => setActiveSubTab("rules")}
        >
          <span className="subtab-icon">⚙️</span>
          Rules Config
        </button>
      </div>

      <div className="commissions-content">
        {activeSubTab === "calculator" && <CommissionCalculator />}
        {activeSubTab === "history" && <CommissionHistory />}
        {activeSubTab === "rules" && <CommissionRulesManager />}
      </div>
    </div>
  );
};
