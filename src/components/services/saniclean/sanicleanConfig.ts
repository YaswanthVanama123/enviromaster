// src/features/services/saniclean/sanicleanConfig.ts

import type { SaniRegion } from "./sanicleanTypes";

export const SANICLEAN_FIXTURE_RATE: Record<SaniRegion, number> = {
  inside: 7,   // example numbers – plug in from your pricing table
  outside: 6,
  standard: 6.5,
};

export const SANICLEAN_TRIP_CHARGE: Record<SaniRegion, number> = {
  inside: 8,
  outside: 6,
  standard: 7,
};

export const SANICLEAN_MINIMUM_WEEKLY = 40; // example minimum
 