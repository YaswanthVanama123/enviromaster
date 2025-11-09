import React from "react";
import "./ProductsSection.css";

const A = [
  "EM Proprietary JRT Tissue",
  "EM Proprietary Hardwood Natural",
  "EM Proprietary Hardwood White",
  "Center Pull Towels",
  "Multi-Fold Natural",
  "Multi-Fold White",
  "",
  "",
  "Seat Cover Sleeve",
  "",
  "Grit Soap",
  "",
];

const B = [
  "EM Proprietary Twin JRT",
  "EM Proprietary Towel Mechanical",
  "EM Proprietary Towel Hybrid",
  "Center Pull Towel Dispenser",
  "Multi-Fold Dispenser",
  "",
  "EM Proprietary A/F Dispensers",
  "EM Proprietary Soap Dispenser",
  "Seat Cover Dispenser",
  "Hand Sanitizer Dispenser",
  "Grit Soap Dispenser",
  "SaniPod Receptacle",
];

const C = [
  "EM Urinal Mat",
  "EM Commode Mat",
  "Bowl Clip",
  "Wave 3D Urinal Screen",
  "Splash Hog Urinal Screen",
  "",
  "Surefoot EZ",
  "Daily",
  "Dish Detergent",
];

const rows = Math.max(A.length, B.length, C.length);

function DollarCell() {
  return (
    <div className="dcell">
      <span className="dollarColor">$</span>
      <input className="in" />
    </div>
  );
}

export default function ProductsSection() {
  return (
    <section className="prod">
      <div className="prod__title">PRODUCTS</div>

      {/* ===== Desktop: true 10-column table (perfect alignment) ===== */}
      <div className="table-desktop">
        <table className="grid10">
          <thead>
            <tr>
              <th className="h h-blue">Products</th>
              <th className="h h-blue center">Amount Per Unit</th>
              <th className="h h-blue">Dispensers</th>
              <th className="h h-blue center">Qty</th>
              <th className="h h-blue center">Warranty Rate</th>
              <th className="h h-blue center">Replacement Rate/Install</th>
              <th className="h h-blue">Products</th>
              <th className="h h-blue center">Qty</th>
              <th className="h h-blue center">Amount</th>
              <th className="h h-blue center">Frequency of Service</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                {/* A1 Products */}
                <td className="label">{A[i] || ""}</td>
                {/* A2 Amount Per Unit */}
                <td><DollarCell /></td>

                {/* B1 Dispensers */}
                <td className="label">{B[i] || ""}</td>
                {/* B2 Qty */}
                <td className="center"><input className="in" /></td>
                {/* B3 Warranty */}
                <td><DollarCell /></td>
                {/* B4 Replacement */}
                <td><DollarCell /></td>

                {/* C1 Products */}
                <td className="label">{C[i] || ""}</td>
                {/* C2 Qty */}
                <td className="center"><input className="in" /></td>
                {/* C3 Amount */}
                <td><DollarCell /></td>
                {/* C4 Freq */}
                <td className="center"><input className="in" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Small screens: show grouped tables stacked (A, B, C) ===== */}
      <div className="tables-grouped">
        {/* Group A */}
        <table className="gtable">
          <thead>
            <tr>
              <th className="h h-blue">Products</th>
              <th className="h h-blue center">Amount Per Unit</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={`a${i}`}>
                <td className="label">{A[i] || ""}</td>
                <td><DollarCell /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Group B */}
        <table className="gtable">
          <thead>
            <tr>
              <th className="h h-blue">Dispensers</th>
              <th className="h h-blue center">Qty</th>
              <th className="h h-blue center">Warranty Rate</th>
              <th className="h h-blue center">Replacement Rate/Install</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={`b${i}`}>
                <td className="label">{B[i] || ""}</td>
                <td className="center"><input className="in" /></td>
                <td><DollarCell /></td>
                <td><DollarCell /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Group C */}
        <table className="gtable">
          <thead>
            <tr>
              <th className="h h-blue">Products</th>
              <th className="h h-blue center">Qty</th>
              <th className="h h-blue center">Amount</th>
              <th className="h h-blue center">Frequency of Service</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={`c${i}`}>
                <td className="label">{C[i] || ""}</td>
                <td className="center"><input className="in" /></td>
                <td><DollarCell /></td>
                <td className="center"><input className="in" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
