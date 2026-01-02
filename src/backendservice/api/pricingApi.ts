import { apiClient } from "../utils/apiClient";

export interface RestroomHygienePricing {
  ratePerFixture?: number;
  weeklyMinimum?: number;
  smallAccountThreshold?: number;
  smallAccountMinimum?: number;
}

export interface TripChargePricing {
  standard?: number;
  insideBeltway?: number;
  paidParking?: number;
  twoPerson?: number;
}

export interface RpmWindowPricing {
  smallWindowRate?: number;
  mediumWindowRate?: number;
  largeWindowRate?: number;
  installMultiplierFirstTime?: number;
}

export interface ServicesPricing {
  restroomHygiene?: RestroomHygienePricing;
  tripCharge?: TripChargePricing;
  rpmWindow?: RpmWindowPricing;
}

export interface PriceFixDocument {
  _id: string;
  key: string;
  services: ServicesPricing;
}

export const pricingApi = {
  async getPriceFix(): Promise<PriceFixDocument[]> {
    const res = await apiClient.get<PriceFixDocument[]>(`/api/pricefix`);
    if (res.error) throw new Error(res.error);
    return Array.isArray(res.data) ? res.data : [];
  },

  async getMasterPricing(): Promise<PriceFixDocument | null> {
    const list = await this.getPriceFix();
    return list.find((d) => d.key === "servicePricingMaster") || null;
  },
};
