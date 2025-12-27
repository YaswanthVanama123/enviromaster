/// <reference types="vitest" />

import { describe, it, expect } from "vitest";
import {
  buildRefreshPowerScrubDraftPayload,
  parseRefreshPowerScrubDraftPayload,
  REFRESH_POWER_SCRUB_DRAFT_SCHEMA,
} from "./refreshPowerScrubDraftPayload";
import { transformRefreshPowerScrubData } from "../common/dataTransformers";
import type {
  RefreshAreaCalcState,
  RefreshAreaKey,
  RefreshPowerScrubFormState,
} from "./refreshPowerScrubTypes";

const AREA_KEYS: RefreshAreaKey[] = [
  "dumpster",
  "patio",
  "walkway",
  "foh",
  "boh",
  "other",
];

const createAreaState = (overrides: Partial<RefreshAreaCalcState> = {}): RefreshAreaCalcState => ({
  enabled: false,
  pricingType: "preset",
  workers: 2,
  hours: 0,
  hourlyRate: 200,
  workerRate: 200,
  insideSqFt: 0,
  outsideSqFt: 0,
  insideRate: 0.6,
  outsideRate: 0.4,
  sqFtFixedFee: 200,
  customAmount: 0,
  workerRateIsCustom: false,
  hourlyRateIsCustom: false,
  insideRateIsCustom: false,
  outsideRateIsCustom: false,
  sqFtFixedFeeIsCustom: false,
  presetRateIsCustom: false,
  smallMediumRateIsCustom: false,
  largeRateIsCustom: false,
  presetQuantity: 1,
  presetRate: undefined,
  kitchenSize: "smallMedium",
  smallMediumQuantity: 0,
  smallMediumRate: undefined,
  smallMediumCustomAmount: 0,
  largeQuantity: 0,
  largeRate: undefined,
  largeCustomAmount: 0,
  patioMode: "standalone",
  includePatioAddon: false,
  patioAddonRate: undefined,
  frequencyLabel: "",
  contractMonths: 12,
  ...overrides,
});

const createBaseFormState = (): RefreshPowerScrubFormState => ({
  tripCharge: 75,
  hourlyRate: 200,
  minimumVisit: 400,
  hourlyRateIsCustom: false,
  minimumVisitIsCustom: false,
  frequency: "monthly",
  contractMonths: 12,
  notes: "draft-test",
  dumpster: createAreaState(),
  patio: createAreaState(),
  walkway: createAreaState(),
  foh: createAreaState(),
  boh: createAreaState(),
  other: createAreaState(),
});

const mergeFormStateWithPartial = (
  baseState: RefreshPowerScrubFormState,
  partial?: Partial<RefreshPowerScrubFormState>
): RefreshPowerScrubFormState => {
  if (!partial) {
    return baseState;
  }

  const merged: any = {
    ...baseState,
    ...partial,
  };

  AREA_KEYS.forEach((areaKey) => {
    const override = (partial as any)[areaKey] as Partial<RefreshAreaCalcState> | undefined;
    merged[areaKey] = {
      ...baseState[areaKey],
      ...(override ?? {}),
    };
  });

  return merged as RefreshPowerScrubFormState;
};

describe("refresh power scrub draft payload helpers", () => {
  it("builds a lean V2 payload containing only enabled services", () => {
    const state = createBaseFormState();
    state.dumpster = createAreaState({
      enabled: true,
      pricingType: "perHour",
      hours: 3,
      hourlyRate: 70,
      frequencyLabel: "Weekly",
    });

    const payload = buildRefreshPowerScrubDraftPayload(state);

    expect(payload.serviceId).toBe("refreshPowerScrub");
    expect(payload.schemaVersion).toBe(REFRESH_POWER_SCRUB_DRAFT_SCHEMA);
    expect(Object.keys(payload.services || {})).toEqual(["dumpster"]);
    expect(payload.services?.dumpster?.hours).toBe(3);
    expect(payload.services?.dumpster?.hourlyRate).toBe(70);
    expect(payload.frequency).toBe("monthly");
  });

  it("round-trips via the parser and keeps BOH large/small data intact", () => {
    const state = createBaseFormState();
    state.boh = createAreaState({
      enabled: true,
      smallMediumQuantity: 2,
      smallMediumRate: 180,
      smallMediumRateIsCustom: true,
      largeQuantity: 1,
      largeRate: 250,
      largeRateIsCustom: true,
      frequencyLabel: "Bi-annual",
    });

    const customFields = [
      {
        id: "manual-note",
        name: "manual-note",
        type: "text",
        value: "boh-updates",
      },
    ];

    const payload = buildRefreshPowerScrubDraftPayload(state, customFields);
    const parsed = parseRefreshPowerScrubDraftPayload(payload);
    expect(parsed).toBeDefined();
    expect(parsed?.boh?.smallMediumRate).toBe(180);
    expect(parsed?.boh?.largeRate).toBe(250);
    expect(parsed?.boh?.smallMediumRateIsCustom).toBe(true);
    expect(parsed?.customFields).toEqual(customFields);

    const mergedState = mergeFormStateWithPartial(state, parsed);
    const rebuiltPayload = buildRefreshPowerScrubDraftPayload(mergedState, parsed?.customFields);
    expect(rebuiltPayload).toEqual(payload);
  });

  it("migrates legacy overrides stored within customFields", () => {
    const overrides = {
      boh: {
        smallMediumRate: 160,
        largeRate: 260,
      },
    };

    const legacyStructuredData = {
      isActive: true,
      notes: "legacy",
      hourlyRate: 200,
      minimumVisit: 400,
      frequency: "monthly",
      contractMonths: 24,
      tripCharge: 75,
      boh: {
        enabled: true,
      },
      customFields: [
        {
          id: "refreshPowerScrubOverrides",
          name: "refreshPowerScrubOverrides",
          type: "text",
          value: JSON.stringify(overrides),
          isInternal: true,
        },
      ],
    };

    const transformed = transformRefreshPowerScrubData(legacyStructuredData);
    expect(transformed).toBeDefined();
    expect(transformed?.boh?.smallMediumRate).toBe(160);
    expect(transformed?.boh?.largeRate).toBe(260);
    expect(transformed?.boh?.smallMediumRateIsCustom).toBe(true);
    expect(transformed?.boh?.largeRateIsCustom).toBe(true);
  });
});
