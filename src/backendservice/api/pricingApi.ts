import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

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
    const token =
      localStorage.getItem("adminToken") ||
      localStorage.getItem("token") ||
      "";

    const res = await axios.get(`${API_BASE_URL}/api/pricefix`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    return Array.isArray(res.data) ? res.data : [];
  },

  async getMasterPricing(): Promise<PriceFixDocument | null> {
    const list = await this.getPriceFix();
    return list.find((d) => d.key === "servicePricingMaster") || null;
  },
};
