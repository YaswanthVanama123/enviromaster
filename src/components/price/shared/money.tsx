export const money = (n) => (isNaN(n) ? "$0.00" : `$${Number(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);

export const unmoney = (s) =>
  s && `${s}`.trim() !== "—"
    ? Number(String(s).replace(/[^0-9.\-]/g, "")) || 0
    : null;
