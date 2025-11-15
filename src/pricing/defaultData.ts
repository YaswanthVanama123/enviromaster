// src/pricing/defaultData.ts
// src/pricing/defaultData.ts
import type { PriceRow } from "./pricingTypes"; // 👈 type-only


export const DEFAULT_ROWS: PriceRow[] = [
  {
    id: "saniclean",
    serviceKey: "saniclean",
    displayName: "SaniClean (per fixture)",
    category: "Service",
    base: { Weekly: 7 },
    unitType: "per_fixture",
    minimum: 40,
    notes: "Inside beltway base $7/fixture weekly, $40 min; trip applies.",
  },
  {
    id: "saniscrub",
    serviceKey: "saniscrub",
    displayName: "SaniScrub (per fixture)",
    category: "Service",
    base: { Monthly: 25, Bimonthly: 35, Quarterly: 40 },
    unitType: "per_fixture",
    minimum: 175,
    installMultiplier: 3,
    notes: "2×/month with Sani: $15 off monthly fixture rate.",
  },
  {
    id: "mopping",
    serviceKey: "mopping",
    displayName: "Microfiber Mopping (per bathroom)",
    category: "Service",
    base: { Weekly: 10 },
    unitType: "per_bathroom",
    notes: "$10/bathroom (or $10/300 sq ft if large).",
  },

  // Windows (RPM – both sides)
  {
    id: "windows_small",
    serviceKey: "windows_small",
    displayName: "Windows – Small (both sides)",
    category: "Service",
    base: { Weekly: 1.5 },
    unitType: "per_window_small",
    installMultiplier: 3,
    notes: "Biweekly/Monthly = 125%; Quarterly = 200% after first time (first time 300%).",
  },
  {
    id: "windows_medium",
    serviceKey: "windows_medium",
    displayName: "Windows – Medium (both sides)",
    category: "Service",
    base: { Weekly: 3 },
    unitType: "per_window_medium",
    installMultiplier: 3,
  },
  {
    id: "windows_large",
    serviceKey: "windows_large",
    displayName: "Windows – Large/Door (both sides)",
    category: "Service",
    base: { Weekly: 7 },
    unitType: "per_window_large",
    installMultiplier: 3,
  },

  // Drains
  {
    id: "drain_standard",
    serviceKey: "drain_standard",
    displayName: "Drains – Standard",
    category: "Service",
    base: { Weekly: 10 },
    unitType: "per_drain",
    notes:
      "Included in all-inclusive; many drains weekly: $20 + $4/drain (handle as custom template in UI).",
  },
  {
    id: "green_drain",
    serviceKey: "green_drain",
    displayName: "Green Drain",
    category: "Dispenser",
    base: { Weekly: 5 },
    unitType: "per_item",
    notes: "$100 install + $5/wk.",
  },

  // Dispensers
  {
    id: "sani_pod",
    serviceKey: "sani_pod",
    displayName: "SaniPod",
    category: "Dispenser",
    base: { Weekly: 3 },
    unitType: "per_item",
    notes: "$25 install; stand-alone: $8/wk or $3/wk each + $40.",
  },

  // Power-wash (Refresh)
  {
    id: "power_wash_base",
    serviceKey: "power_wash_base",
    displayName: "Power Wash – Base (2 workers)",
    category: "Service",
    base: { Hourly: 200 },
    unitType: "per_hour",
    minimum: 475,
    notes:
      "$75 trip + $200/hr/worker ×2 ≈ $475 minimum. Use separate templates for dumpster/FOH/BOH/patio menus.",
  },

  // Floors
  {
    id: "floors_vct",
    serviceKey: "floors_vct",
    displayName: "Floors – Strip & Wax (VCT)",
    category: "Service",
    base: { "One-Time": 0.75 },
    unitType: "per_sqft",
    minimum: 550,
  },
];

export default DEFAULT_ROWS;
