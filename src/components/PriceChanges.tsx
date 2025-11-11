import { useState } from "react";
import "./PriceChanges.css";

type Category = "Small Product" | "Dispenser" | "Big Product";

type PriceItem = {
  id: number;
  service: string;
  category: Category;      // 👈 NEW
  currentPrice: number;
  newPrice: number;
  effectiveFrom: string;
  frequency: string;
  lastUpdated: string;
};

const CATEGORIES: Category[] = ["Small Product", "Dispenser", "Big Product"];

export default function PriceChanges() {
  const [data, setData] = useState<PriceItem[]>([
    { id: 1, service: "Restroom",       category: "Small Product", currentPrice: 20, newPrice: 22, effectiveFrom: "2024-05-01", frequency: "Weekly",  lastUpdated: "2024-05-01" },
    { id: 2, service: "Kitchen",        category: "Small Product", currentPrice: 15, newPrice: 15, effectiveFrom: "2024-05-01", frequency: "Weekly",  lastUpdated: "2024-05-01" },
    { id: 3, service: "Drain",          category: "Dispenser",     currentPrice: 30, newPrice: 12, effectiveFrom: "2024-05-01", frequency: "Weekly",  lastUpdated: "2024-05-01" },
    { id: 4, service: "Hand Sanitizer", category: "Dispenser",     currentPrice: 10, newPrice: 12, effectiveFrom: "2024-05-01", frequency: "Monthly", lastUpdated: "2024-05-01" },
    { id: 5, service: "MicroMax Floor", category: "Big Product",   currentPrice: 25, newPrice: 22, effectiveFrom: "2024-05-01", frequency: "Monthly", lastUpdated: "2024-05-01" },
  ]);

  const [alertMessage, setAlertMessage] = useState(
    "Updated 2 min ago: Pavani changed Hand Sanitizer from $10 to $12 — updates visible for 24 hours."
  );

  const handleServiceChange = (id: number, value: string) =>
    setData(prev => prev.map(it => (it.id === id ? { ...it, service: value } : it)));

  const handleCategoryChange = (id: number, value: Category) =>
    setData(prev => prev.map(it => (it.id === id ? { ...it, category: value } : it)));

  const handlePriceChange = (id: number, value: string) =>
    setData(prev => prev.map(it => (it.id === id ? { ...it, newPrice: Number(value) || 0 } : it)));

  const addNewService = () => {
    const today = new Date().toISOString().split("T")[0];
    const newItem: PriceItem = {
      id: Date.now(),
      service: "",
      category: "Small Product",       // 👈 default
      currentPrice: 0,
      newPrice: 0,
      effectiveFrom: today,
      frequency: "Weekly",
      lastUpdated: today,
    };
    setData(prev => [...prev, newItem]);
  };

  const saveChanges = () => {
    setAlertMessage("✅ Changes saved successfully (dummy action).");
  };

  return (
    <section className="pc">
      <div className="pc__hero">Price Changes</div>
      <div className="pc__breadcrumb">Admin Panel &gt; Price Changes</div>
      <div className="pc__alert">{alertMessage}</div>

      <div className="pc__tablewrap">
        <table className="pc__table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Type</th> {/* 👈 NEW COLUMN */}
              <th>Current Price</th>
              <th>New Price</th>
              <th>Effective From</th>
              <th>Frequency</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr key={item.id}>
                <td>
                  <input
                    type="text"
                    className="service-input"
                    value={item.service}
                    placeholder="Enter service name"
                    onChange={e => handleServiceChange(item.id, e.target.value)}
                  />
                </td>
                <td>
                  <select
                    className="service-type"
                    value={item.category}
                    onChange={e => handleCategoryChange(item.id, e.target.value as Category)}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </td>
                <td>${item.currentPrice}</td>
                <td>
                  <input
                    type="number"
                    className="price-input"
                    value={item.newPrice}
                    onChange={e => handlePriceChange(item.id, e.target.value)}
                  />
                </td>
                <td>{new Date(item.effectiveFrom).toLocaleDateString()}</td>
                <td>{item.frequency}</td>
                <td className="clock">⏱️</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pc__footer">
        <button className="pc__btn pc__btn--light" onClick={addNewService}>
          ➕ Add Service
        </button>
        <button className="pc__btn pc__btn--primary" onClick={saveChanges}>
          Save Changes
        </button>
      </div>
    </section>
  );
}
