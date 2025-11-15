// src/pricing/pricingStore.tsx
import { createContext, useContext, useMemo, useState } from "react";
import { DEFAULT_ROWS } from "./defaultData";
import { BILLING, TRIP } from "./pricingRules";
import type { PriceRow, PricingState, PriceFormulaInput, ComputedPrice } from "./pricingTypes"; // 👈 type-only
import { computePrice } from "./compute";


interface PricingContextValue extends PricingState {
  upsertRow: (row: PriceRow) => void;
  removeRow: (id: string) => void;
  compute: (
    serviceKey: string,
    input: Omit<PriceFormulaInput, "serviceKey">
  ) => ComputedPrice;
  findByKey: (serviceKey: string) => PriceRow | undefined;
  importRows: (newRows: PriceRow[]) => void;
  exportRows: () => PriceRow[];
}

const PricingContext = createContext<PricingContextValue | null>(null);

export const PricingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [rows, setRows] = useState<PriceRow[]>(DEFAULT_ROWS);

  const value = useMemo<PricingContextValue>(
    () => ({
      rows,
      tripPolicy: TRIP,
      billing: BILLING,

      upsertRow: (row) =>
        setRows((prev) => {
          const idx = prev.findIndex((r) => r.id === row.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = row;
            return copy;
          }
          return [...prev, row];
        }),

      removeRow: (id) => setRows((prev) => prev.filter((r) => r.id !== id)),

      compute: (serviceKey, input) => {
        const row = rows.find((r) => r.serviceKey === serviceKey);
        if (!row)
          return {
            subtotal: 0,
            trip: 0,
            total: 0,
            applied: ["Service not found"],
          };
        return computePrice(row, { ...input, serviceKey });
      },

      findByKey: (serviceKey) => rows.find((r) => r.serviceKey === serviceKey),

      importRows: (newRows) => setRows(newRows),

      exportRows: () => rows,
    }),
    [rows]
  );

  return (
    <PricingContext.Provider value={value}>{children}</PricingContext.Provider>
  );
};

export function usePricing() {
  const ctx = useContext(PricingContext);
  if (!ctx) throw new Error("usePricing must be used inside PricingProvider");
  return ctx;
}
