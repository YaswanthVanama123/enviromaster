// src/features/services/refreshPowerScrub/refreshPowerScrubTypes.ts
import type { BaseServiceFormState } from "../common/serviceTypes";

export type RefreshAreaType =
  | "kitchen"
  | "frontOfHouse"
  | "patio"
  | "dumpster";

export interface RefreshPowerScrubFormState extends BaseServiceFormState {
  // existing pricing inputs
  areaType: RefreshAreaType;
  hours: number;
  workers: number;
  hourlyRatePerWorker: number;
  tripCharge: number;
  minimumVisit: number;

  // NEW: header-table dollar amounts
  dumpsterAmount: number;
  patioAmount: number;
  walkwayAmount: number;
  fohAmount: number;
  bohAmount: number;
  otherAmount: number;

  // NEW: header-table frequencies (text like "Weekly", "Monthly")
  dumpsterFreq: string;
  patioFreq: string;
  walkwayFreq: string;
  fohFreq: string;
  bohFreq: string;
  otherFreq: string;
}
