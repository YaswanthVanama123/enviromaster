import type { BaseServiceFormState } from "../common/serviceTypes";

export interface MicrofiberMoppingFormState extends BaseServiceFormState {
  isCombinedWithSani: boolean;
  bathroomsSqFt: number;
  bathroomsRate: number;      // when combined ($10 / 300 ft² => 0.0333)
  extraNonBathSqFt: number;
  extraNonBathRate: number;   // for add-on areas
  standaloneSqFt: number;     // if doing standalone line
  standaloneRate: number;     // $10 / 200 ft² => 0.05
  standaloneMinimum: number;
  dailyMopChemical?: string;
}
