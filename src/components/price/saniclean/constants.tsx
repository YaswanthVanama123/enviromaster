export const SC_DEFAULTS = {
  insidePrice: 7,
  insideMin: 40,
  beltwayTrip: 8,

  outsidePrice: 6,
  outsideMin: null, // "—"
  outsideTripPDF: 8,

  paidBase: 7,
  smallMin: 50,
  allIncPrice: 20,
};

export const SC_UI = {
  card: { border: "1px solid #e6e6e6", borderRadius: 14, background: "#fff", padding: 18, marginBottom: 14 },
  grid: { display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 },
  field: { gridColumn: "span 3", display: "flex", flexDirection: "column", gap: 6 },
  input: { border: "1px solid #e6e6e6", borderRadius: 10, padding: "10px 12px", outline: "none" },
  table: { width: "100%", borderCollapse: "collapse", border: "1px solid #e6e6e6", borderRadius: 12, overflow: "hidden" },
  thtd: { borderBottom: "1px solid #e6e6e6", padding: "10px 12px", textAlign: "left", verticalAlign: "middle" },
};
