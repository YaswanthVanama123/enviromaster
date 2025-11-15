// src/components/forms/PriceAwareField.tsx
import { useMemo } from "react";
import { usePricing } from "../../pricing/pricingStore";
import type { Frequency, RateColor } from "../../pricing/pricingTypes"; // 👈 type-only


type Props = {
  serviceKey: string;
  frequency: Frequency;
  quantity?: number;
  sqft?: number;
  rooms?: number;
  isInsideBeltway?: boolean;
  paidParking?: boolean;
  rateColor?: RateColor;
  firstTimeInstall?: boolean;
};

export default function PriceAwareField(props: Props) {
  const {
    serviceKey,
    frequency,
    quantity,
    sqft,
    rooms,
    isInsideBeltway,
    paidParking,
    rateColor,
    firstTimeInstall,
  } = props;

  const { compute, findByKey } = usePricing();
  const row = findByKey(serviceKey);

  const price = useMemo(() => {
    if (!row) return null;

    return compute(serviceKey, {
      frequency,
      unitType: row.unitType,
      quantity,
      sqft,
      rooms,
      isInsideBeltway,
      paidParking,
      rateColor,
      firstTimeInstall,
    });
    // Only re-run when these specific values change (not entire props object)
  }, [
    row,
    serviceKey,
    frequency,
    quantity,
    sqft,
    rooms,
    isInsideBeltway,
    paidParking,
    rateColor,
    firstTimeInstall,
    compute,
  ]);

  if (!row) {
    return <div className="price-field">Service not found</div>;
  }
  if (!price) {
    return <div className="price-field">—</div>;
  }

  return (
    <div className="price-field">
      <div className="pf__name">{row.displayName}</div>
      <div className="pf__money">${price.total.toFixed(2)}</div>
      {price.applied?.length > 0 && (
        <div className="pf__notes">{price.applied.join(" · ")}</div>
      )}
    </div>
  );
}
