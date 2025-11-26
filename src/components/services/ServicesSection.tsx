import React from "react";
import "./ServicesSection.css";
import { useServiceConfigs } from "../../backendservice/hooks";

import { SanicleanForm } from "../services/saniclean/SanicleanForm";
import { FoamingDrainForm }  from "../services/foamingDrain/FoamingDrainForm";
import { SaniscrubForm } from "../services/saniscrub/SaniscrubForm";
import { MicrofiberMoppingForm } from "../services/microfiberMopping/MicrofiberMoppingForm";
import { RpmWindowsForm } from "../services/rpmWindows/RpmWindowsForm";
import { RefreshPowerScrubForm } from "../services/refreshPowerScrub/RefreshPowerScrubForm";
import { SanipodForm } from "./sanipod/SanipodForm";
import { CarpetForm } from "./carpetCleaning/CarpetForm";
import { JanitorialForm } from "./purejanitorial/JanitorialForm";
import { StripWaxForm } from "./stripWax/StripWaxForm";

// Map service IDs to their corresponding form components
const SERVICE_COMPONENTS: Record<string, React.FC<any>> = {
  saniclean: SanicleanForm,
  foamingDrain: FoamingDrainForm,
  saniscrub: SaniscrubForm,
  microfiberMopping: MicrofiberMoppingForm,
  rpmWindows: RpmWindowsForm,
  refreshPowerScrub: RefreshPowerScrubForm,
  sanipod: SanipodForm,
  carpetclean: CarpetForm,
  janitorial: JanitorialForm,
  stripwax: StripWaxForm,
};

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
    carpetclean?: any;
    janitorial?:any;
    stripwax?:any;
  };
};

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  initialServices,
}) => {
  // Fetch service configs to determine which services are active
  const { configs, loading } = useServiceConfigs();

  // Filter only active services
  const activeServices = configs.filter(config => config.isActive);

  // Separate RefreshPowerScrub from grid services (it needs full width)
  const gridServices = activeServices.filter(config => config.serviceId !== "refreshPowerScrub");
  const refreshPowerScrubActive = activeServices.some(c => c.serviceId === "refreshPowerScrub");

  if (loading) {
    return (
      <section className="svc">
        <div className="svc-title">SERVICES</div>
        <div style={{ padding: "20px", textAlign: "center" }}>
          Loading services...
        </div>
      </section>
    );
  }

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
        {gridServices.map((config) => {
          const ServiceComponent = SERVICE_COMPONENTS[config.serviceId];
          if (!ServiceComponent) return null;

          return (
            <ServiceComponent
              key={config.serviceId}
              initialData={initialServices?.[config.serviceId as keyof typeof initialServices]}
            />
          );
        })}
      </div>

      {/* RefreshPowerScrub is special - render outside grid for full width, only if active */}
      {refreshPowerScrubActive && (
        <RefreshPowerScrubForm
          initialData={initialServices?.refreshPowerScrub}
        />
      )}
    </section>
  );
};

export default ServicesSection;