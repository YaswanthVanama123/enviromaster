import type { BaseServiceFormState } from "../common/serviceTypes";

export type RefreshAreaType = "kitchen" | "frontOfHouse" | "patio" | "dumpster";

export interface RefreshPowerScrubFormState extends BaseServiceFormState {
  areaType: RefreshAreaType;
  hours: number;
  workers: number;
  hourlyRatePerWorker: number;
  tripCharge: number;
  minimumVisit: number;
}
