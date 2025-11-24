import React from "react";
import "./ServicesSection.css";

import { SanicleanForm } from "../services/saniclean/SanicleanForm";
import { FoamingDrainForm }  from "../services/foamingDrain/FoamingDrainForm";
import { SaniscrubForm } from "../services/saniscrub/SaniscrubForm";
import { MicrofiberMoppingForm } from "../services/microfiberMopping/MicrofiberMoppingForm";
import { RpmWindowsForm } from "../services/rpmWindows/RpmWindowsForm";
import { RefreshPowerScrubForm } from "../services/refreshPowerScrub/RefreshPowerScrubForm";
import { SanipodForm } from "./sanipod/SanipodForm";

// Optional prop if you prefill from backend
type ServicesSectionProps = {
  initialServices?: {
    saniclean?: any;
    foamingDrain?: any;
    saniscrub?: any;
    microfiberMopping?: any;
    rpmWindows?: any;
    refreshPowerScrub?: any;
    sanipod?: any;
  };
};

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  initialServices,
}) => {
  return (
    <section className="svc">
      <div className="svc-title svc-title--hasActions">
        SERVICES
        <div className="svc-actions">
          <button type="button" className="svc-btn">
            + New
          </button>
        </div>
      </div>

      <div className="svc-grid">
        <SanicleanForm initialData={initialServices?.saniclean} />
        <FoamingDrainForm initialData={initialServices?.foamingDrain} />
        <SaniscrubForm initialData={initialServices?.saniscrub} />
        <MicrofiberMoppingForm
          initialData={initialServices?.microfiberMopping}
        />
        <RpmWindowsForm initialData={initialServices?.rpmWindows} />
        <SanipodForm initialData={initialServices?.sanipod} />

      </div>
              <RefreshPowerScrubForm
          initialData={initialServices?.refreshPowerScrub}
        />
    </section>
  );
};

export default ServicesSection;