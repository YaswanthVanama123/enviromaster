export const RW_DEFAULTS = {
  rateSmall: 1.5,
  rateMedium: 3.0,
  rateLarge: 7.0,
  multInstall: 3.0,      // 300% first time
  mult125: 1.25,         // biweekly/monthly
  multQuarterly: 2.0,    // after first time
  tripBeltway: 8.0,
  tripStandard: 6.0,
  tripPaidBase: 7.0,
};

export const RW_UI = {
  card: { border: "1px solid #e6e6e6", borderRadius: 14, background: "#fff", padding: 18, marginBottom: 14 },
  grid: { display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 },
  field: { gridColumn: "span 3", display: "flex", flexDirection: "column", gap: 6 },
  input: { border: "1px solid #e6e6e6", borderRadius: 10, padding: "10px 12px", outline: "none" },
  table: { width: "100%", borderCollapse: "collapse", border: "1px solid #e6e6e6", borderRadius: 12, overflow: "hidden" },
  thtd: { borderBottom: "1px solid #e6e6e6", padding: "10px 12px", textAlign: "left", verticalAlign: "middle" },
};
