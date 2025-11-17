export type RowKind = "text" | "money" | "calc";

export type TextRow = {
  id: string;
  kind: "text";
  label: string;
  name: string;
  defaultValue?: string;
  isCustom?: boolean;
};

export type MoneyRow = {
  id: string;
  kind: "money";
  label: string;
  name: string;
  defaultValue?: string;
  isCustom?: boolean;
};

export type CalcRow = {
  id: string;
  kind: "calc";
  label: string;
  qtyName: string;
  rateName: string;
  totalName: string;
  defaultQty?: string;
  defaultRate?: string;
  defaultTotal?: string;
  isCustom?: boolean;
};

export type Row = TextRow | MoneyRow | CalcRow;

export type ServiceGroup = {
  id: string;
  title: string;
  items: Row[];
  isCustom?: boolean;
};

export type ServicesData = {
  groups: ServiceGroup[];
  rps: {
    amounts: { label: string; name: string; defaultValue?: string }[];
    freqs: { label: string; name: string; defaultValue?: string }[];
  };
  serviceNotes: { name: string; defaultValue?: string }[];
};

/** Backend structural payload (what you already pass in) */
export type BackendServiceRow = {
  type: "line" | "bold" | "atCharge";
  label: string;
  value?: string;
  v1?: string;
  v2?: string;
  v3?: string;
};

export type BackendServiceBlock = {
  heading: string;
  rows: BackendServiceRow[];
};

export type BackendServicesPayload = {
  topRow: BackendServiceBlock[];
  bottomRow: BackendServiceBlock[];
  refreshPowerScrub: { heading: string; columns: string[]; freqLabels: string[] };
  notes: { heading: string; lines: number; textLines: string[] };
};
