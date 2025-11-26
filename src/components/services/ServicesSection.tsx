import React, { useState } from "react";
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
import { GreaseTrapForm } from "./greaseTrap/GreaseTrapForm";
import { CustomService, type CustomServiceData } from "./CustomService";

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
  greaseTrap: GreaseTrapForm,
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
    janitorial?: any;
    stripwax?: any;
    greaseTrap?: any;
  };
};

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  initialServices,
}) => {
  // Fetch service configs to determine which services are active
  const { configs, loading } = useServiceConfigs();

  // State for which services are currently visible
  const [visibleServices, setVisibleServices] = useState<Set<string>>(() => {
    // Initially show all active services
    return new Set(configs.filter(c => c.isActive).map(c => c.serviceId));
  });

  // State for custom services
  const [customServices, setCustomServices] = useState<CustomServiceData[]>([]);

  // State for "New Service" dropdown
  const [showNewServiceDropdown, setShowNewServiceDropdown] = useState(false);

  // Update visible services when configs load
  React.useEffect(() => {
    if (configs.length > 0) {
      setVisibleServices(new Set(configs.filter(c => c.isActive).map(c => c.serviceId)));
    }
  }, [configs]);

  // Handler to add a service back
  const handleAddService = (serviceId: string) => {
    if (serviceId === "custom") {
      // Add a new custom service
      const newService: CustomServiceData = {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: "Lorem ipsum",
        fields: [],
      };
      setCustomServices((prev) => [...prev, newService]);
    } else {
      // Add an existing service
      setVisibleServices((prev) => new Set([...prev, serviceId]));
    }
    setShowNewServiceDropdown(false);
  };

  // Handler to remove a service
  const handleRemoveService = (serviceId: string) => {
    setVisibleServices((prev) => {
      const next = new Set(prev);
      next.delete(serviceId);
      return next;
    });
  };

  // Handler to update a custom service
  const handleUpdateCustomService = (service: CustomServiceData) => {
    setCustomServices((prev) =>
      prev.map((s) => (s.id === service.id ? service : s))
    );
  };

  // Handler to remove a custom service
  const handleRemoveCustomService = (id: string) => {
    setCustomServices((prev) => prev.filter((s) => s.id !== id));
  };

  // Get available services to add (active but not currently visible)
  const availableServices = configs.filter(
    (config) => config.isActive && !visibleServices.has(config.serviceId)
  );

  // Filter visible services
  const activeVisibleServices = configs.filter(
    (config) => config.isActive && visibleServices.has(config.serviceId)
  );

  // Separate RefreshPowerScrub from grid services
  const gridServices = activeVisibleServices.filter(
    (config) => config.serviceId !== "refreshPowerScrub"
  );
  const refreshPowerScrubVisible = activeVisibleServices.some(
    (c) => c.serviceId === "refreshPowerScrub"
  );

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
          <div className="svc-chooser-wrap">
            <button
              type="button"
              className="svc-btn"
              onClick={() => setShowNewServiceDropdown(!showNewServiceDropdown)}
            >
              + New Service
            </button>
            {showNewServiceDropdown && (
              <div className="svc-chooser">
                <select
                  className="svc-chooser-select"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddService(e.target.value);
                      e.target.value = ""; // Reset dropdown
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select service...
                  </option>
                  {availableServices.map((config) => (
                    <option key={config.serviceId} value={config.serviceId}>
                      {config.label || config.serviceId}
                    </option>
                  ))}
                  <option value="custom">Custom</option>
                </select>
                <button
                  type="button"
                  className="svc-mini svc-mini--neg"
                  onClick={() => setShowNewServiceDropdown(false)}
                  title="Close"
                >
                  ×
                </button>
              </div>
            )}
          </div>
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
              onRemove={() => handleRemoveService(config.serviceId)}
            />
          );
        })}

        {/* Render custom services */}
        {customServices.map((service) => (
          <CustomService
            key={service.id}
            service={service}
            onUpdate={handleUpdateCustomService}
            onRemove={() => handleRemoveCustomService(service.id)}
          />
        ))}
      </div>

      {/* RefreshPowerScrub is special - render outside grid for full width */}
      {refreshPowerScrubVisible && (
        <RefreshPowerScrubForm
          initialData={initialServices?.refreshPowerScrub}
          onRemove={() => handleRemoveService("refreshPowerScrub")}
        />
      )}
    </section>
  );
};

export default ServicesSection;