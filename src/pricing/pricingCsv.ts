import type { PriceRow } from "./pricingTypes";

const HEADER = [
  "id",
  "serviceKey",
  "displayName",
  "category",
  "unitType",
  "minimum",
  "installMultiplier",
  "base.Weekly",
  "base.Biweekly",
  "base.Monthly",
  "base.Bimonthly",
  "base.Quarterly",
  "base.One-Time",
  "base.Hourly",
  "notes",
] as const;

const FREQ_KEYS = [
  "Weekly",
  "Biweekly",
  "Monthly",
  "Bimonthly",
  "Quarterly",
  "One-Time",
  "Hourly",
] as const;

type HeaderKey = (typeof HEADER)[number];
type FreqKey = (typeof FREQ_KEYS)[number];

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  const needsQuote = /[",\n\r]/.test(s) || /^\s|\s$/.test(s);
  if (!needsQuote) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

function csvJoinRow(cols: ReadonlyArray<unknown>): string {
  return cols.map(csvEscape).join(",");
}

function csvSplitLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  const n = line.length;

  while (i < n) {
    if (line[i] === ",") {
      out.push("");
      i++;
      continue;
    }

    let cell = "";
    if (line[i] === '"') {
      i++;
      while (i < n) {
        const ch = line[i];
        if (ch === '"') {
          if (i + 1 < n && line[i + 1] === '"') {
            cell += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          cell += ch;
          i++;
        }
      }
      while (i < n && line[i] !== ",") i++;
      if (i < n && line[i] === ",") i++;
    } else {
      const start = i;
      while (i < n && line[i] !== ",") i++;
      cell = line.slice(start, i);
      if (i < n && line[i] === ",") i++;
      cell = cell.trim();
    }
    out.push(cell);
  }

  if (line.endsWith(",")) out.push("");

  return out;
}

export function toCsv(rows: PriceRow[]): string {
  const head = csvJoinRow(HEADER);
  const data = rows.map((r) =>
    csvJoinRow([
      r.id,
      r.serviceKey,
      r.displayName,
      r.category,
      r.unitType,
      r.minimum ?? "",
      r.installMultiplier ?? "",
      r.base.Weekly ?? "",
      r.base.Biweekly ?? "",
      r.base.Monthly ?? "",
      r.base.Bimonthly ?? "",
      r.base.Quarterly ?? "",
      r.base["One-Time"] ?? "",
      r.base.Hourly ?? "",
      r.notes ?? "",
    ])
  );
  return [head, ...data].join("\n");
}

export function fromCsv(csv: string): PriceRow[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  const headerLine = lines[0];
  const headerCols = csvSplitLine(headerLine);

  const idx: Record<string, number> = {};
  headerCols.forEach((h, i) => (idx[h] = i));

  const get = (cols: string[], key: HeaderKey): string => {
    const i = idx[key];
    return i == null ? "" : cols[i] ?? "";
  };

  const out: PriceRow[] = [];

  for (let li = 1; li < lines.length; li++) {
    const cols = csvSplitLine(lines[li]);
    if (cols.every((c) => c.trim() === "")) continue;

    const base: Partial<Record<FreqKey, number>> = {};
    for (const f of FREQ_KEYS) {
      const raw = get(cols, `base.${f}` as HeaderKey).trim();
      if (raw !== "") {
        const num = Number(raw);
        if (!Number.isNaN(num)) base[f] = num;
      }
    }

    const minimumRaw = get(cols, "minimum").trim();
    const installRaw = get(cols, "installMultiplier").trim();

    const row: PriceRow = {
      id: get(cols, "id").trim(),
      serviceKey: get(cols, "serviceKey").trim(),
      displayName: get(cols, "displayName").trim(),
      category: get(cols, "category").trim() as PriceRow["category"],
      unitType: get(cols, "unitType").trim() as PriceRow["unitType"],
      minimum: minimumRaw === "" ? undefined : Number(minimumRaw),
      installMultiplier: installRaw === "" ? undefined : Number(installRaw),
      base: base as any,
      notes: (() => {
        const n = get(cols, "notes");
        return n === "" ? undefined : n;
      })(),
    };

    out.push(row);
  }

  return out;
}
