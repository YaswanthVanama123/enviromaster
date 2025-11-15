// src/components/pages/ExampleFormPage.tsx
// Remove `import React ...` if you’re on the new JSX transform
import { useState } from "react";
import { PricingProvider } from "../../pricing/pricingStore";
import PriceAwareField from "../forms/PriceAwareField";                 // 👈 fixed path
import type { Frequency } from "../../pricing/pricingTypes";            // 👈 type-only


export default function ExampleFormPage() {
  const [serviceKey, setServiceKey] = useState("saniclean");
  const [frequency, setFrequency] = useState<Frequency>("Weekly");
  const [fixtures, setFixtures] = useState<number>(10);

  return (
    <PricingProvider>
      <div className="form-shell">
        <h2>Form – Auto Price Mapping</h2>

        <label>
          Service
          <select
            value={serviceKey}
            onChange={(e) => setServiceKey(e.target.value)}
          >
            <option value="saniclean">SaniClean</option>
            <option value="saniscrub">SaniScrub</option>
            <option value="windows_small">Windows – Small</option>
            <option value="power_wash_base">Power Wash – Base</option>
          </select>
        </label>

        <label>
          Frequency
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
          >
            <option value="Weekly">Weekly</option>
            <option value="Biweekly">Biweekly</option>
            <option value="Monthly">Monthly</option>
            <option value="Bimonthly">Bimonthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="One-Time">One-Time</option>
            <option value="Hourly">Hourly</option>
          </select>
        </label>

        <label>
          Quantity (fixtures/hours/windows)
          <input
            type="number"
            value={fixtures}
            onChange={(e) => setFixtures(Number(e.target.value))}
            min={0}
          />
        </label>

        <PriceAwareField
          serviceKey={serviceKey}
          frequency={frequency}
          quantity={fixtures}
          isInsideBeltway
        />
      </div>
    </PricingProvider>
  );
}
