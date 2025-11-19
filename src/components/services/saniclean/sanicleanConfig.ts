import type { SaniRegion } from "./sanicleanTypes";

export const SANICLEAN_FIXTURE_RATE: Record<SaniRegion, number> = {
  inside: 7,
  outside: 6,
  standard: 6.5,
};

export const SANICLEAN_TRIP_CHARGE: Record<SaniRegion, number> = {
  inside: 8,
  outside: 6,
  standard: 7,
};

export const DEFAULT_MIN_WEEKLY = 40;
