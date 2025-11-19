import type { BaseServiceFormState } from "../common/serviceTypes";

export interface SaniscrubFormState extends BaseServiceFormState {
  fixtureCount: number;
  fixtureUnitRate: number;     // $/fixture
  fixtureMinimumCharge: number;
  nonBathroomSqFt: number;
  nonBathroomRate: number;     // $/sq ft
  addl500SqFtUnitRate: number; // for extra blocks (if needed)
  installMultiplier: number;   // 1x, 2x, 3x ...
}
