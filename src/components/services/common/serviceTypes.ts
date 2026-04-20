
import type { CustomField } from "../CustomFieldManager";

export type ServiceId =
  | "saniclean"
  | "saniscrub"
  | "rpmWindows"
  | "refreshPowerScrub"
  | "microfiberMopping"
  | "foamingDrain"
  | "sanipod";

export type BillingFrequency =
  | "oneTime"
  | "weekly"
  | "biweekly"
  | "twicePerMonth"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "biannual"
  | "annual";

export interface BaseServiceFormState {
  frequency: BillingFrequency;
  tripChargeIncluded?: boolean;
  notes?: string;
}


export interface ServiceQuoteResult {
  serviceId: ServiceId;
  displayName: string;
  perVisitPrice: number;   
  annualPrice: number;     
  detailsBreakdown: string[];
}


export interface ServiceMeta {
  id: ServiceId;
  label: string;
  description?: string;
}


export interface ServiceInitialData<T> {
  initialData?: Partial<T> & { customFields?: CustomField[] };
  onRemove?: () => void;
}
