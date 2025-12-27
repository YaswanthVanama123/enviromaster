import type { RefreshAreaCalcState, RefreshAreaKey, RefreshPowerScrubFormState } from "./refreshPowerScrubTypes";
import type { CustomField } from "../CustomFieldManager";

export const REFRESH_POWER_SCRUB_DRAFT_SCHEMA = "refreshPowerScrubDraftV2";

export type RefreshPowerScrubAreaDraft = {
  enabled: boolean;
  pricingType: NonNullable<RefreshAreaCalcState["pricingType"]>;
  frequencyLabel?: string;
  contractMonths?: number;
  workers?: number;
  workerRate?: number;
  hours?: number;
  hourlyRate?: number;
  insideSqFt?: number;
  outsideSqFt?: number;
  insideRate?: number;
  outsideRate?: number;
  sqFtFixedFee?: number;
  customAmount?: number;
  presetQuantity?: number;
  presetRate?: number;
  includePatioAddon?: boolean;
  patioMode?: string;
  patioAddonRate?: number;
  kitchenSize?: string;
  smallMediumQuantity?: number;
  smallMediumRate?: number;
  smallMediumCustomAmount?: number;
  largeQuantity?: number;
  largeRate?: number;
  largeCustomAmount?: number;
  workerRateIsCustom?: boolean;
  hourlyRateIsCustom?: boolean;
  insideRateIsCustom?: boolean;
  outsideRateIsCustom?: boolean;
  sqFtFixedFeeIsCustom?: boolean;
  presetRateIsCustom?: boolean;
  smallMediumRateIsCustom?: boolean;
  largeRateIsCustom?: boolean;
};

export type RefreshPowerScrubDraftPayload = {
  serviceId: "refreshPowerScrub";
  displayName: "Refresh Power Scrub";
  isActive: boolean;
  schemaVersion: typeof REFRESH_POWER_SCRUB_DRAFT_SCHEMA;
  notes?: string;
  frequency?: string;
  contractMonths?: number;
  tripCharge?: number;
  hourlyRate?: number;
  minimumVisit?: number;
  hourlyRateIsCustom?: boolean;
  minimumVisitIsCustom?: boolean;
  services?: Partial<Record<RefreshAreaKey, RefreshPowerScrubAreaDraft>>;
  customFields?: CustomField[];
};

const AREA_KEYS: RefreshAreaKey[] = ["dumpster", "patio", "walkway", "foh", "boh", "other"];

const includeInDraft = (value: any): value is number | boolean => value !== undefined && value !== null;

const buildAreaDraft = (area: RefreshAreaCalcState, areaKey: RefreshAreaKey): RefreshPowerScrubAreaDraft | undefined => {
  if (!area?.enabled) return undefined;

  const draft: RefreshPowerScrubAreaDraft = {
    enabled: true,
    pricingType: area.pricingType,
    frequencyLabel: area.frequencyLabel,
    contractMonths: area.contractMonths,
  };

  if (includeInDraft(area.workers)) draft.workers = area.workers;
  if (includeInDraft(area.workerRate)) draft.workerRate = area.workerRate;
  if (includeInDraft(area.hours)) draft.hours = area.hours;
  if (includeInDraft(area.hourlyRate)) draft.hourlyRate = area.hourlyRate;
  if (includeInDraft(area.insideSqFt)) draft.insideSqFt = area.insideSqFt;
  if (includeInDraft(area.outsideSqFt)) draft.outsideSqFt = area.outsideSqFt;
  if (includeInDraft(area.insideRate)) draft.insideRate = area.insideRate;
  if (includeInDraft(area.outsideRate)) draft.outsideRate = area.outsideRate;
  if (includeInDraft(area.sqFtFixedFee)) draft.sqFtFixedFee = area.sqFtFixedFee;
  if (includeInDraft(area.customAmount)) draft.customAmount = area.customAmount;
  if (includeInDraft(area.presetQuantity)) draft.presetQuantity = area.presetQuantity;
  if (includeInDraft(area.presetRate)) draft.presetRate = area.presetRate;

  draft.workerRateIsCustom = !!area.workerRateIsCustom;
  draft.hourlyRateIsCustom = !!area.hourlyRateIsCustom;
  draft.insideRateIsCustom = !!area.insideRateIsCustom;
  draft.outsideRateIsCustom = !!area.outsideRateIsCustom;
  draft.sqFtFixedFeeIsCustom = !!area.sqFtFixedFeeIsCustom;
  draft.presetRateIsCustom = !!area.presetRateIsCustom;
  draft.smallMediumRateIsCustom = !!area.smallMediumRateIsCustom;
  draft.largeRateIsCustom = !!area.largeRateIsCustom;

  if (areaKey === "patio") {
    draft.includePatioAddon = area.includePatioAddon ?? false;
    draft.patioMode = area.patioMode;
    if (includeInDraft(area.patioAddonRate)) draft.patioAddonRate = area.patioAddonRate;
  }

  if (areaKey === "boh") {
    if (area.kitchenSize) draft.kitchenSize = area.kitchenSize;
    if (includeInDraft(area.smallMediumQuantity)) draft.smallMediumQuantity = area.smallMediumQuantity;
    if (includeInDraft(area.smallMediumRate)) draft.smallMediumRate = area.smallMediumRate;
    if (includeInDraft(area.smallMediumCustomAmount)) draft.smallMediumCustomAmount = area.smallMediumCustomAmount;
    if (includeInDraft(area.largeQuantity)) draft.largeQuantity = area.largeQuantity;
    if (includeInDraft(area.largeRate)) draft.largeRate = area.largeRate;
    if (includeInDraft(area.largeCustomAmount)) draft.largeCustomAmount = area.largeCustomAmount;
  }

  return draft;
};

export const REFRESH_POWER_SCRUB_DRAFT_CUSTOM_FIELD_ID = "refreshPowerScrubDraftPayload";

export const buildRefreshPowerScrubDraftPayload = (
  formState: RefreshPowerScrubFormState,
  customFields: CustomField[] = []
): RefreshPowerScrubDraftPayload => {
  const services: Record<RefreshAreaKey, RefreshPowerScrubAreaDraft> = {} as any;
  AREA_KEYS.forEach((areaKey) => {
    const draftArea = buildAreaDraft(formState[areaKey], areaKey);
    if (draftArea) {
      services[areaKey] = draftArea;
    }
  });

  const hasServices = Object.keys(services).length > 0;

  return {
    serviceId: "refreshPowerScrub",
    displayName: "Refresh Power Scrub",
    isActive: hasServices,
    schemaVersion: REFRESH_POWER_SCRUB_DRAFT_SCHEMA,
    notes: formState.notes,
    frequency: formState.frequency,
    contractMonths: formState.contractMonths,
    tripCharge: formState.tripCharge,
    hourlyRate: formState.hourlyRate,
    minimumVisit: formState.minimumVisit,
    hourlyRateIsCustom: formState.hourlyRateIsCustom,
    minimumVisitIsCustom: formState.minimumVisitIsCustom,
    services: hasServices ? services : undefined,
    customFields,
  };
};

const mapAreaDraftToForm = (draft: RefreshPowerScrubAreaDraft): Partial<RefreshAreaCalcState> => {
  return {
    enabled: draft.enabled,
    pricingType: draft.pricingType,
    frequencyLabel: draft.frequencyLabel,
    contractMonths: draft.contractMonths,
    workers: draft.workers,
    workerRate: draft.workerRate,
    hours: draft.hours,
    hourlyRate: draft.hourlyRate,
    insideSqFt: draft.insideSqFt,
    outsideSqFt: draft.outsideSqFt,
    insideRate: draft.insideRate,
    outsideRate: draft.outsideRate,
    sqFtFixedFee: draft.sqFtFixedFee,
    customAmount: draft.customAmount,
    presetQuantity: draft.presetQuantity,
    presetRate: draft.presetRate,
    includePatioAddon: draft.includePatioAddon,
    patioMode: draft.patioMode,
    patioAddonRate: draft.patioAddonRate,
    kitchenSize: draft.kitchenSize,
    smallMediumQuantity: draft.smallMediumQuantity,
    smallMediumRate: draft.smallMediumRate,
    smallMediumCustomAmount: draft.smallMediumCustomAmount,
    largeQuantity: draft.largeQuantity,
    largeRate: draft.largeRate,
    largeCustomAmount: draft.largeCustomAmount,
    workerRateIsCustom: draft.workerRateIsCustom,
    hourlyRateIsCustom: draft.hourlyRateIsCustom,
    insideRateIsCustom: draft.insideRateIsCustom,
    outsideRateIsCustom: draft.outsideRateIsCustom,
    sqFtFixedFeeIsCustom: draft.sqFtFixedFeeIsCustom,
    presetRateIsCustom: draft.presetRateIsCustom,
    smallMediumRateIsCustom: draft.smallMediumRateIsCustom,
    largeRateIsCustom: draft.largeRateIsCustom,
  };
};

export const parseRefreshPowerScrubDraftPayload = (
  payload?: RefreshPowerScrubDraftPayload
): Partial<RefreshPowerScrubFormState> | undefined => {
  if (!payload) return undefined;
  if (payload.schemaVersion !== REFRESH_POWER_SCRUB_DRAFT_SCHEMA) return undefined;

  const initial: Partial<RefreshPowerScrubFormState> = {
    notes: payload.notes,
    frequency: payload.frequency,
    contractMonths: payload.contractMonths,
    tripCharge: payload.tripCharge,
    hourlyRate: payload.hourlyRate,
    minimumVisit: payload.minimumVisit,
    hourlyRateIsCustom: payload.hourlyRateIsCustom,
    minimumVisitIsCustom: payload.minimumVisitIsCustom,
    customFields: payload.customFields,
  };

  if (payload.services) {
    AREA_KEYS.forEach((areaKey) => {
      const draftArea = payload.services?.[areaKey];
      if (!draftArea) return;
      initial[areaKey] = mapAreaDraftToForm(draftArea) as RefreshAreaCalcState;
    });
  }

  return initial;
};
