import type { BaseServiceFormState } from "../common/serviceTypes";

export type SaniRegion = "inside" | "outside" | "standard";

export interface SanicleanFormState extends BaseServiceFormState {
  fixtureCount: number;
  region: SaniRegion; // Inside Beltway / Outside / Standard
  allInclusiveRatePerFixture: number;
  minimumWeeklyCharge: number;
  tripCharge: number;
}
