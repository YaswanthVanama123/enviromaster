import React, { useState, useCallback } from "react";
import { SalesPersonManager } from "./SalesPersonManager";
import { AgreementForm } from "./AgreementForm";
import { AgreementList } from "./AgreementList";
import { QuotaDashboard } from "./QuotaDashboard";
import "./QuotaTab.css";

type SubTab = "dashboard" | "agreements" | "new-agreement" | "sales-persons";

export const QuotaTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedSalesPersonId, setSelectedSalesPersonId] = useState<string | null>(null);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleAgreementCreated = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    setActiveSubTab("agreements");
  }, []);

  const handleViewAgreements = useCallback((salesPersonId: string) => {
    setSelectedSalesPersonId(salesPersonId);
    setActiveSubTab("agreements");
  }, []);

  return (
    <div className="quota-tab-container">
      <div className="quota-header">
        <h2>Quota & Agreement Tracking</h2>
        <p className="quota-subtitle">
          Track sales person quotas, agreements, and commission performance
        </p>
      </div>

      <div className="quota-subtab-bar">
        <button
          className={`subtab-btn ${activeSubTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveSubTab("dashboard")}
        >
          <span className="subtab-icon">D</span>
          Dashboard
        </button>
        <button
          className={`subtab-btn ${activeSubTab === "new-agreement" ? "active" : ""}`}
          onClick={() => setActiveSubTab("new-agreement")}
        >
          <span className="subtab-icon">+</span>
          New Agreement
        </button>
        <button
          className={`subtab-btn ${activeSubTab === "agreements" ? "active" : ""}`}
          onClick={() => setActiveSubTab("agreements")}
        >
          <span className="subtab-icon">A</span>
          Agreements
        </button>
        <button
          className={`subtab-btn ${activeSubTab === "sales-persons" ? "active" : ""}`}
          onClick={() => setActiveSubTab("sales-persons")}
        >
          <span className="subtab-icon">S</span>
          Sales Persons
        </button>
      </div>

      <div className="quota-content">
        {activeSubTab === "dashboard" && (
          <QuotaDashboard
            key={`dashboard-${refreshKey}`}
            onViewAgreements={handleViewAgreements}
          />
        )}
        {activeSubTab === "new-agreement" && (
          <AgreementForm onAgreementCreated={handleAgreementCreated} />
        )}
        {activeSubTab === "agreements" && (
          <AgreementList
            key={`agreements-${refreshKey}`}
            initialSalesPersonId={selectedSalesPersonId}
            onClearFilter={() => setSelectedSalesPersonId(null)}
          />
        )}
        {activeSubTab === "sales-persons" && (
          <SalesPersonManager
            key={`sales-persons-${refreshKey}`}
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </div>
  );
};
