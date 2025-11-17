export const q = (name: string): HTMLInputElement | null =>
  document.querySelector(`input[name="${name}"]`);

export const setVal = (name: string, val: string | number) => {
  const el = q(name);
  if (!el) return;
  const txt = typeof val === "number" ? String(val) : val;
  if (el.value !== txt) el.value = txt;
};

export const toNum = (v: any) => Math.max(0, Number(v ?? 0) || 0);

export const uid = (p: string) =>
  `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
