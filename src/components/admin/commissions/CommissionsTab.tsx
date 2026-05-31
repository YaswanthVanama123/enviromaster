import React, { useState, useCallback } from "react";
import { CommissionCalculator } from "./CommissionCalculator";
import { CommissionRulesManager } from "./CommissionRulesManager";
import "./CommissionsTab.css";

type SubTab = "calculator" | "rules";

export const CommissionsTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("rules");

  
  const handleRecordSaved = useCallback(() => {}, []);

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
          <span className="subtab-icon">C</span>
          Calculator
        </button>
        <button
          className={`subtab-btn ${activeSubTab === "rules" ? "active" : ""}`}
          onClick={() => setActiveSubTab("rules")}
        >
          <span className="subtab-icon">R</span>
          Rules Config
        </button>
      </div>

      <div className="commissions-content">
        {activeSubTab === "calculator" && <CommissionCalculator onRecordSaved={handleRecordSaved} />}
        {activeSubTab === "rules" && <CommissionRulesManager />}
      </div>
    </div>
  );
};
