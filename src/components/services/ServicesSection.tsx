import React, { useState } from "react";
import "./ServicesSection.css";
import { SERVICE_META, SERVICE_ORDER } from "../services/common/serviceRegistry";
import type { ServiceId } from "../services/common/serviceTypes";
import { SanicleanForm } from "../services/saniclean/SanicleanForm";
import { SaniscrubForm } from "../services/saniscrub/SaniscrubForm";
import { RpmWindowsForm } from "../services/rpmWindows/RpmWindowsForm";
import { RefreshPowerScrubForm } from "../services/refreshPowerScrub/RefreshPowerScrubForm";
import { MicrofiberMoppingForm } from "../services/microfiberMopping/MicrofiberMoppingForm";
import { FoamingDrainForm } from "../services/foamingDrain/FoamingDrainForm";
import type { ServicesSectionProps } from "./ServicesSection.d";

const renderFormForService = (id: ServiceId, initialServices: any) => {
  switch (id) {
    case "saniclean":
      return <SanicleanForm initialData={initialServices.saniclean} />;
    case "saniscrub":
      return <SaniscrubForm initialData={initialServices.saniscrub} />;
    case "rpmWindows":
      return <RpmWindowsForm initialData={initialServices.rpmWindows} />;
    case "refreshPowerScrub":
      return <RefreshPowerScrubForm initialData={initialServices.refreshPowerScrub} />;
    case "microfiberMopping":
      return <MicrofiberMoppingForm initialData={initialServices.microfiberMopping} />;
    case "foamingDrain":
      return <FoamingDrainForm initialData={initialServices.foamingDrain} />;
    default:
      return null;
  }
};

export const ServicesSection: React.FC<ServicesSectionProps> = ({ initialServices }) => {
  const [selected, setSelected] = useState<ServiceId>("saniclean");

  return (
    <section className="svc">
      <h2 className="svc-title">Services & Pricing</h2>
      <p className="svc-sub">
        Select a service, enter the quantities and frequencies, and we’ll calculate the
        per-visit and annual pricing based on your program rules.
      </p>

      <div className="svc-tabs">
        {SERVICE_ORDER.map((id) => {
          const meta = SERVICE_META[id];
          const isActive = id === selected;
          return (
            <button
              key={id}
              type="button"
              className={`svc-tab ${isActive ? "svc-tab--active" : ""}`}
              onClick={() => setSelected(id)}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      <div className="svc-grid">
        {renderFormForService(selected, initialServices)}
      </div>

      <div className="svc-notes">
        <h3 className="svc-notes-title">Notes</h3>
        <div className="svc-notes-body">
          <p className="svc-notes-text">
            Use this section to capture any special circumstances, exclusions, or
            adjustments that should be reflected in the proposal or customer addendum.
          </p>
        </div>
      </div>
    </section>
  );
};
