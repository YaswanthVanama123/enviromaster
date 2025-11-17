import React from "react";

const inputStyle = {
  border: "1px solid #e6e6e6",
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
};

export default function TripChargeSelector({
  tripType,
  setTripType,
  parkingAmt,
  setParkingAmt,
  label = "Trip Charge",
  options = [
    { value: "beltway8", label: "Beltway $8" },
    { value: "standard6", label: "Standard $6" },
    { value: "paid7", label: "Paid $7 + parking" },
    { value: "waived", label: "Waived" },
  ],
}) {
  return (
    <>
      <div style={{ gridColumn: "span 3", display: "flex", flexDirection: "column", gap: 6 }}>
        <label>{label}</label>
        <select style={inputStyle} value={tripType} onChange={(e) => setTripType(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div style={{ gridColumn: "span 3", display: "flex", flexDirection: "column", gap: 6 }}>
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
    </>
  );
}
