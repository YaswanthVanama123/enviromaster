import type { BaseServiceFormState } from "../common/serviceTypes";

export interface FoamingDrainFormState extends BaseServiceFormState {
  totalDrains: number;
  greaseTraps: number;
  standardPlanRate: number; // per-drain
  largePlanRate: number;    // per-large-drain
  largePlanCount: number;
  baseChargeForLargePlan: number;
  installMultiplier: number;
}
