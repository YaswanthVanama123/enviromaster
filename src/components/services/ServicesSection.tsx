// src/components/services/ServicesSection.tsx
import React, { useEffect, useMemo, useState } from "react";
import "./ServicesSection.css";
import type {
  BackendServiceBlock,
  BackendServiceRow,
  BackendServicesPayload,
  Row,
  RowKind,
  ServiceGroup,
  ServicesData,
} from "./types";
import { uid } from "./utils/dom";
import ServiceCard from "./components/ServiceCard";
import RowText from "./components/RowText";
import RowMoney from "./components/RowMoney";
import RowCalc from "./components/RowCalc";
import FieldChooser from "./components/FieldChooser";
import { useServiceCalcs } from "./hooks/useServiceCalcs";
import { useSerializeServices } from "./hooks/useSerializeServices";

/** ----------------- Backend → UI mapping ----------------- */
function mapBackendToServicesData(
  services: BackendServicesPayload
): ServicesData {
  // find block by heading in either topRow or bottomRow
  const findBlock = (heading: string): BackendServiceBlock | undefined => {
    return (
      services.topRow.find((b) => b.heading === heading) ||
      services.bottomRow.find((b) => b.heading === heading)
    );
  };

  // find row inside a block by label
  const findRow = (
    block: BackendServiceBlock | undefined,
    label: string
  ): BackendServiceRow | undefined => {
    if (!block) return undefined;
    return block.rows.find((r) => r.label === label);
  };

  const groups: ServiceGroup[] = [];

  /** ---------- RESTROOM & HYGIENE (Sani) ---------- */
  {
    const block = findBlock("RESTROOM & HYGIENE");
    const totalFixtures = findRow(block, "Total Fixtures");
    const region = findRow(
      block,
      "Inside Beltway / Outside / Standard"
    );
    const weekly = findRow(block, "SaniClean Weekly");
    const allIncl = findRow(
      block,
      "All-Inclusive Rate Per Fixture"
    );
    const minWeekly = findRow(block, "Minimum Weekly Charge");
    const trip = findRow(block, "Trip Charge");
    const freq = findRow(block, "Frequency");

    groups.push({
      id: "g_rh",
      title: "RESTROOM & HYGIENE",
      items: [
        {
          id: "rh_totalFixtures",
          kind: "text",
          label: "Total Fixtures",
          name: "saniTotalFixtures",
          defaultValue: totalFixtures?.value ?? "",
        },
        {
          id: "rh_region",
          kind: "text",
          label: "Inside Beltway / Outside / Standard",
          name: "saniRegion",
          defaultValue: region?.value ?? "",
        },
        {
          id: "rh_weekly",
          kind: "calc",
          label: "SaniClean Weekly",
          qtyName: "saniWeeklyQty",
          rateName: "saniRatePerFixture",
          totalName: "saniWeeklyTotal",
          defaultQty: weekly?.v1 ?? "",
          defaultRate: weekly?.v2 ?? "",
          defaultTotal: weekly?.v3 ?? "",
        },
        {
          id: "rh_allIncl",
          kind: "money",
          label: "All-Inclusive Rate Per Fixture",
          name: "saniAllInclusiveRate",
          defaultValue: allIncl?.value ?? "",
        },
        {
          id: "rh_minWeekly",
          kind: "money",
          label: "Minimum Weekly Charge",
          name: "saniMinWeeklyCharge",
          defaultValue: minWeekly?.value ?? "",
        },
        {
          id: "rh_trip",
          kind: "money",
          label: "Trip Charge",
          name: "tripCharge",
          defaultValue: trip?.value ?? "",
        },
        {
          id: "rh_freq",
          kind: "text",
          label: "Frequency",
          name: "saniFrequency",
          defaultValue: freq?.value ?? "",
        },
      ],
    });
  }

  /** ---------- FOAMING DRAIN ---------- */
  {
    const block = findBlock("FOAMING DRAIN");
    const total = findRow(block, "Total Drains");
    const traps = findRow(block, "No. of Grease Traps");
    const stdSrv = findRow(block, "Standard Drain Service");
    const lgPlan = findRow(block, "Large Drain Plan");
    const baseCharge = findRow(
      block,
      "Base Charge for Large Drain Plan"
    );
    const installMult = findRow(block, "Install Multiplier");
    const freq = findRow(block, "Frequency");

    groups.push({
      id: "g_fd",
      title: "FOAMING DRAIN",
      items: [
        {
          id: "fd_total",
          kind: "text",
          label: "Total Drains",
          name: "fdTotalDrains",
          defaultValue: total?.value ?? "",
        },
        {
          id: "fd_traps",
          kind: "text",
          label: "No. of Grease Traps",
          name: "fdGreaseTraps",
          defaultValue: traps?.value ?? "",
        },
        {
          id: "fd_std",
          kind: "calc",
          label: "Standard Drain Service",
          qtyName: "fdStandardQty",
          rateName: "fdStandardRate",
          totalName: "fdStandardTotal",
          defaultQty: stdSrv?.v1 ?? "",
          defaultRate: stdSrv?.v2 ?? "",
          defaultTotal: stdSrv?.v3 ?? "",
        },
        {
          id: "fd_lg",
          kind: "calc",
          label: "Large Drain Plan",
          qtyName: "fdLargeQty",
          rateName: "fdLargeRate",
          totalName: "fdLargeTotal",
          defaultQty: lgPlan?.v1 ?? "",
          defaultRate: lgPlan?.v2 ?? "",
          defaultTotal: lgPlan?.v3 ?? "",
        },
        {
          id: "fd_base",
          kind: "money",
          label: "Base Charge for Large Drain Plan",
          name: "fdLargeBaseCharge",
          defaultValue: baseCharge?.value ?? "",
        },
        {
          id: "fd_mult",
          kind: "text",
          label: "Install Multiplier",
          name: "fdInstallMultiplier",
          defaultValue: installMult?.value ?? "",
        },
        {
          id: "fd_freq",
          kind: "text",
          label: "Frequency",
          name: "fdFrequency",
          defaultValue: freq?.value ?? "",
        },
      ],
    });
  }

  /** ---------- SCRUB SERVICE ---------- */
  {
    const block = findBlock("SCRUB SERVICE");
    const serviceFreq = findRow(block, "Service Frequency");
    const bath = findRow(block, "Bathroom Fixtures");
    const minCharge = findRow(block, "Fixture Minimum Charge");
    const nonBath = findRow(block, "Non-Bathroom Area");
    const addUnit = findRow(
      block,
      "Additional 500 sq ft Unit Rate $"
    );
    const installMult = findRow(block, "Install Multiplier");

    groups.push({
      id: "g_ss",
      title: "SCRUB SERVICE",
      items: [
        {
          id: "ss_freq",
          kind: "text",
          label: "Service Frequency",
          name: "scrFrequency",
          defaultValue: serviceFreq?.value ?? "",
        },
        {
          id: "ss_bath",
          kind: "calc",
          label: "Bathroom Fixtures",
          qtyName: "scrBathFixturesQty",
          rateName: "scrBathFixturesRate",
          totalName: "scrBathFixturesTotal",
          defaultQty: bath?.v1 ?? "",
          defaultRate: bath?.v2 ?? "",
          defaultTotal: bath?.v3 ?? "",
        },
        {
          id: "ss_min",
          kind: "money",
          label: "Fixture Minimum Charge",
          name: "scrFixtureMinimumCharge",
          defaultValue: minCharge?.value ?? "",
        },
        {
          id: "ss_nonBath",
          kind: "calc",
          label: "Non-Bathroom Area",
          qtyName: "scrNonBathQty",
          rateName: "scrNonBathRate",
          totalName: "scrNonBathTotal",
          defaultQty: nonBath?.v1 ?? "",
          defaultRate: nonBath?.v2 ?? "",
          defaultTotal: nonBath?.v3 ?? "",
        },
        {
          id: "ss_addUnit",
          kind: "money",
          label: "Additional 500 sq ft Unit Rate $",
          name: "scrAdditionalUnitRate",
          defaultValue: addUnit?.value ?? "",
        },
        {
          id: "ss_mult",
          kind: "text",
          label: "Install Multiplier",
          name: "scrInstallMultiplier",
          defaultValue: installMult?.value ?? "",
        },
      ],
    });
  }

  /** ---------- HAND SANITIZER ---------- */
  {
    const block = findBlock("HAND SANITIZER");
    const count = findRow(block, "No. of Dispensers");
    const fills = findRow(block, "Hand Sanitizer Fills");
    const perGallon = findRow(
      block,
      "Hand Sanitizer Per Gallon"
    );
    const install = findRow(block, "Dispenser Install Charge");
    const warranty = findRow(block, "Warranty Per Dispenser");
    const freq = findRow(block, "Frequency");

    groups.push({
      id: "g_hs",
      title: "HAND SANITIZER",
      items: [
        {
          id: "hs_count",
          kind: "text",
          label: "No. of Dispensers",
          name: "hsDispensers",
          defaultValue: count?.value ?? "",
        },
        {
          id: "hs_fills",
          kind: "calc",
          label: "Hand Sanitizer Fills",
          qtyName: "hsFillsQty",
          rateName: "hsFillsRate",
          totalName: "hsFillsTotal",
          defaultQty: fills?.v1 ?? "",
          defaultRate: fills?.v2 ?? "",
          defaultTotal: fills?.v3 ?? "",
        },
        {
          id: "hs_perGall",
          kind: "money",
          label: "Hand Sanitizer Per Gallon",
          name: "hsPerGallon",
          defaultValue: perGallon?.value ?? "",
        },
        {
          id: "hs_install",
          kind: "money",
          label: "Dispenser Install Charge",
          name: "hsInstallCharge",
          defaultValue: install?.value ?? "",
        },
        {
          id: "hs_warranty",
          kind: "money",
          label: "Warranty Per Dispenser",
          name: "hsWarrantyPer",
          defaultValue: warranty?.value ?? "",
        },
        {
          id: "hs_freq",
          kind: "text",
          label: "Frequency",
          name: "hsFrequency",
          defaultValue: freq?.value ?? "",
        },
      ],
    });
  }

  /** ---------- MICROMAX FLOOR ---------- */
  {
    const block = findBlock("MICROMAX FLOOR");
    const combined = findRow(block, "Is Combined with Sani?");
    const baths = findRow(block, "Bathrooms Included");
    const extraNonBath = findRow(block, "Extra Non-Bath Area");
    const standalone = findRow(block, "Standalone Mopping");
    const minCharge = findRow(
      block,
      "Standalone Minimum Charge"
    );
    const dailyMop = findRow(block, "Daily Mop Chemical");
    const freq = findRow(block, "Frequency");

    groups.push({
      id: "g_mm",
      title: "MICROMAX FLOOR",
      items: [
        {
          id: "mm_combined",
          kind: "text",
          label: "Is Combined with Sani?",
          name: "mmCombinedWithSani",
          defaultValue: combined?.value ?? "",
        },
        {
          id: "mm_baths",
          kind: "calc",
          label: "Bathrooms Included",
          qtyName: "mmBathroomsQty",
          rateName: "mmBathroomsRate",
          totalName: "mmBathroomsTotal",
          defaultQty: baths?.v1 ?? "",
          defaultRate: baths?.v2 ?? "",
          defaultTotal: baths?.v3 ?? "",
        },
        {
          id: "mm_extra",
          kind: "calc",
          label: "Extra Non-Bath Area",
          qtyName: "mmExtraNonBathQty",
          rateName: "mmExtraNonBathRate",
          totalName: "mmExtraNonBathTotal",
          defaultQty: extraNonBath?.v1 ?? "",
          defaultRate: extraNonBath?.v2 ?? "",
          defaultTotal: extraNonBath?.v3 ?? "",
        },
        {
          id: "mm_standalone",
          kind: "calc",
          label: "Standalone Mopping",
          qtyName: "mmStandaloneQty",
          rateName: "mmStandaloneRate",
          totalName: "mmStandaloneTotal",
          defaultQty: standalone?.v1 ?? "",
          defaultRate: standalone?.v2 ?? "",
          defaultTotal: standalone?.v3 ?? "",
        },
        {
          id: "mm_min",
          kind: "money",
          label: "Standalone Minimum Charge",
          name: "mmStandaloneMinCharge",
          defaultValue: minCharge?.value ?? "",
        },
        {
          id: "mm_daily",
          kind: "money",
          label: "Daily Mop Chemical",
          name: "mmDailyMopChemical",
          defaultValue: dailyMop?.value ?? "",
        },
        {
          id: "mm_freq",
          kind: "text",
          label: "Frequency",
          name: "mmFrequency",
          defaultValue: freq?.value ?? "",
        },
      ],
    });
  }

  /** ---------- RPM WINDOW ---------- */
  {
    const block = findBlock("RPM WINDOW");
    const small = findRow(block, "Small Windows");
    const medium = findRow(block, "Medium Windows");
    const large = findRow(block, "Large Windows");
    const trip = findRow(block, "Trip Charge");
    const mult = findRow(block, "Install Multiplier");
    const freq = findRow(block, "Service Frequency");

    groups.push({
      id: "g_rpm",
      title: "RPM WINDOW",
      items: [
        {
          id: "rpm_small",
          kind: "calc",
          label: "Small Windows",
          qtyName: "rpmSmallQty",
          rateName: "rpmSmallRate",
          totalName: "rpmSmallTotal",
          defaultQty: small?.v1 ?? "",
          defaultRate: small?.v2 ?? "",
          defaultTotal: small?.v3 ?? "",
        },
        {
          id: "rpm_medium",
          kind: "calc",
          label: "Medium Windows",
          qtyName: "rpmMediumQty",
          rateName: "rpmMediumRate",
          totalName: "rpmMediumTotal",
          defaultQty: medium?.v1 ?? "",
          defaultRate: medium?.v2 ?? "",
          defaultTotal: medium?.v3 ?? "",
        },
        {
          id: "rpm_large",
          kind: "calc",
          label: "Large Windows",
          qtyName: "rpmLargeQty",
          rateName: "rpmLargeRate",
          totalName: "rpmLargeTotal",
          defaultQty: large?.v1 ?? "",
          defaultRate: large?.v2 ?? "",
          defaultTotal: large?.v3 ?? "",
        },
        {
          id: "rpm_trip",
          kind: "money",
          label: "Trip Charge",
          name: "rpmTripCharge",
          defaultValue: trip?.value ?? "",
        },
        {
          id: "rpm_mult",
          kind: "text",
          label: "Install Multiplier",
          name: "rpmInstallMultiplier",
          defaultValue: mult?.value ?? "",
        },
        {
          id: "rpm_freq",
          kind: "text",
          label: "Service Frequency",
          name: "rpmFrequency",
          defaultValue: freq?.value ?? "",
        },
      ],
    });
  }

  /** ---------- SANIPOD ---------- */
  {
    const block = findBlock("SANIPOD");
    const count = findRow(block, "Number of SaniPods");
    const weekly = findRow(block, "SaniPod Weekly");
    const install = findRow(block, "Install Charge per SaniPod");
    const extraBagsPerWeek = findRow(block, "Extra Bags per Week");
    const extraBagPrice = findRow(block, "Extra Bag Price");
    const minCharge = findRow(
      block,
      "Standalone Minimum Charge"
    );
    const freq = findRow(block, "Frequency");

    groups.push({
      id: "g_sp",
      title: "SANIPOD",
      items: [
        {
          id: "sp_count",
          kind: "text",
          label: "Number of SaniPods",
          name: "spCount",
          defaultValue: count?.value ?? "",
        },
        {
          id: "sp_weekly",
          kind: "calc",
          label: "SaniPod Weekly",
          qtyName: "spWeeklyQty",
          rateName: "spWeeklyRate",
          totalName: "spWeeklyTotal",
          defaultQty: weekly?.v1 ?? "",
          defaultRate: weekly?.v2 ?? "",
          defaultTotal: weekly?.v3 ?? "",
        },
        {
          id: "sp_install",
          kind: "money",
          label: "Install Charge per SaniPod",
          name: "spInstallCharge",
          defaultValue: install?.value ?? "",
        },
        {
          id: "sp_extraWeek",
          kind: "text",
          label: "Extra Bags per Week",
          name: "spExtraBagsPerWeek",
          defaultValue: extraBagsPerWeek?.value ?? "",
        },
        {
          id: "sp_extraPrice",
          kind: "money",
          label: "Extra Bag Price",
          name: "spExtraBagPrice",
          defaultValue: extraBagPrice?.value ?? "",
        },
        {
          id: "sp_min",
          kind: "money",
          label: "Standalone Minimum Charge",
          name: "spStandaloneMinCharge",
          defaultValue: minCharge?.value ?? "",
        },
        {
          id: "sp_freq",
          kind: "text",
          label: "Frequency",
          name: "spFrequency",
          defaultValue: freq?.value ?? "",
        },
      ],
    });
  }

  /** ---------- TRIP CHARGE ---------- */
  {
    const block = findBlock("TRIP CHARGE");
    const std = findRow(block, "Standard Trip Charge");
    const inside = findRow(block, "Inside Beltway Trip Charge");
    const paid = findRow(block, "Paid Parking Trip Charge");
    const twoPerson = findRow(block, "Two-Person Trip Charge");
    const notes = findRow(block, "Trip Notes");

    groups.push({
      id: "g_tc",
      title: "TRIP CHARGE",
      items: [
        {
          id: "tc_standard",
          kind: "money",
          label: "Standard Trip Charge",
          name: "tripStandardCharge",
          defaultValue: std?.value ?? "",
        },
        {
          id: "tc_inside",
          kind: "money",
          label: "Inside Beltway Trip Charge",
          name: "tripInsideBeltwayCharge",
          defaultValue: inside?.value ?? "",
        },
        {
          id: "tc_paid",
          kind: "money",
          label: "Paid Parking Trip Charge",
          name: "tripPaidParkingCharge",
          defaultValue: paid?.value ?? "",
        },
        {
          id: "tc_twoPerson",
          kind: "money",
          label: "Two-Person Trip Charge",
          name: "tripTwoPersonCharge",
          defaultValue: twoPerson?.value ?? "",
        },
        {
          id: "tc_notes",
          kind: "text",
          label: "Trip Notes",
          name: "tripNotes",
          defaultValue: notes?.value ?? "",
        },
      ],
    });
  }

  /** ---------- REFRESH POWER SCRUB & SERVICE NOTES ---------- */

  const rps = {
    amounts:
      services.refreshPowerScrub?.columns?.map((label, idx) => ({
        label,
        name: `rpsAmount_${idx}`,
      })) ?? [
        { label: "Dumpster $", name: "rpsDumpsterAmount" },
        { label: "Patio $", name: "rpsPatioAmount" },
        { label: "Walkway $", name: "rpsWalkwayAmount" },
        { label: "FOH $", name: "rpsFohAmount" },
        { label: "BOH $", name: "rpsBohAmount" },
        { label: "Other $", name: "rpsOtherAmount" },
      ],
    freqs:
      services.refreshPowerScrub?.freqLabels?.map((label, idx) => ({
        label,
        name: `rpsFreq_${idx}`,
      })) ?? [
        { label: "Freq", name: "rpsDumpsterFreq" },
        { label: "Freq", name: "rpsPatioFreq" },
        { label: "Freq", name: "rpsWalkwayFreq" },
        { label: "Freq", name: "rpsFohFreq" },
        { label: "Freq", name: "rpsBohFreq" },
        { label: "Freq", name: "rpsOtherFreq" },
      ],
  };

  const serviceNotes =
    services.notes?.textLines?.map((txt, idx) => ({
      name: `serviceNote${idx + 1}`,
      defaultValue: txt,
    })) ?? [{ name: "serviceNote1" }, { name: "serviceNote2" }];

  return { groups, rps, serviceNotes };
}

/** ----------------- Component ----------------- */
export default function ServicesSection({
  initialServices,
}: {
  initialServices?: BackendServicesPayload;
}) {
  // start empty; JSON mapping will fill groups/rps/notes
  const [groups, setGroups] = useState<ServiceGroup[]>([]);
  const [rps, setRps] = useState<ServicesData["rps"]>({
    amounts: [],
    freqs: [],
  });
  const [serviceNotes, setServiceNotes] = useState<
    ServicesData["serviceNotes"]
  >([]);

  const [chooserFor, setChooserFor] = useState<string | null>(null);
  const [chooserType, setChooserType] = useState<RowKind>("text");

  // backend structural payload → UI groups
  useEffect(() => {
    if (!initialServices) return;
    const mapped = mapBackendToServicesData(initialServices);
    setGroups(mapped.groups);
    setRps(mapped.rps);
    setServiceNotes(mapped.serviceNotes);
  }, [initialServices]);

  // bind Sani + RPM calculations (and any future ones)
  useServiceCalcs([groups]);

  const serialize = useSerializeServices();

  const addService = () => {
    const g: ServiceGroup = {
      id: uid("g"),
      title: "CUSTOM SERVICE",
      items: [],
      isCustom: true,
    };
    setGroups((prev) => [...prev, g]);
  };

  const removeService = (gid: string) =>
    setGroups((prev) => prev.filter((g) => g.id !== gid));

  const renameService = (gid: string, title: string) =>
    setGroups((prev) =>
      prev.map((g) => (g.id === gid ? { ...g, title } : g))
    );

  const openChooser = (gid: string) => {
    setChooserFor((curr) => (curr === gid ? null : gid));
    setChooserType("text");
  };

  const addChosenField = (gid: string) => {
    const base = uid("custom");
    let newRow: Row =
      chooserType === "calc"
        ? {
            id: uid("r"),
            kind: "calc",
            label: "Custom Calc",
            qtyName: `${base}_qty`,
            rateName: `${base}_rate`,
            totalName: `${base}_total`,
            isCustom: true,
          }
        : chooserType === "money"
        ? {
            id: uid("r"),
            kind: "money",
            label: "Custom",
            name: `${base}_amount`,
            isCustom: true,
          }
        : {
            id: uid("r"),
            kind: "text",
            label: "Custom",
            name: `${base}_text`,
            isCustom: true,
          };

    setGroups((prev) =>
      prev.map((g) =>
        g.id === gid ? { ...g, items: [...g.items, newRow] } : g
      )
    );
    setChooserFor(null);
  };

  const dataForRender: ServicesData = useMemo(
    () => ({ groups, rps, serviceNotes }),
    [groups, rps, serviceNotes]
  );

  return (
    <section className="svc">
      <div className="svc-title svc-title--hasActions">
        SERVICES
        <div className="svc-actions">
          <button type="button" className="svc-btn" onClick={addService}>
            + New
          </button>
          {/* Example: save to backend
          <button
            type="button"
            className="svc-btn"
            onClick={() => console.log(serialize())}
          >
            Save
          </button>
          */}
        </div>
      </div>

      <div className="svc-grid">
        {dataForRender.groups.map((grp) => (
          <ServiceCard
            key={grp.id}
            title={grp.title}
            isCustom={grp.isCustom}
            onRename={(v) => renameService(grp.id, v)}
            headerActions={
              <>
                <div className="svc-chooser-wrap">
                  <button
                    type="button"
                    className="svc-mini"
                    title="Add field"
                    onClick={() => openChooser(grp.id)}
                  >
                    +
                  </button>
                  {chooserFor === grp.id && (
                    <FieldChooser
                      value={chooserType}
                      onChange={setChooserType}
                      onAdd={() => addChosenField(grp.id)}
                      onClose={() => setChooserFor(null)}
                    />
                  )}
                </div>
                {grp.isCustom && (
                  <button
                    type="button"
                    className="svc-mini svc-mini--neg"
                    title="Remove service"
                    onClick={() => removeService(grp.id)}
                  >
                    –
                  </button>
                )}
              </>
            }
          >
            {grp.items.map((row) => {
              const common = {
                onRemove: () =>
                  setGroups((prev) =>
                    prev.map((g) =>
                      g.id === grp.id
                        ? {
                            ...g,
                            items: g.items.filter((r) => r.id !== row.id),
                          }
                        : g
                    )
                  ),
                onRename: (label: string) =>
                  setGroups((prev) =>
                    prev.map((g) =>
                      g.id === grp.id
                        ? {
                            ...g,
                            items: g.items.map((r) =>
                              r.id === row.id ? ({ ...r, label } as Row) : r
                            ),
                          }
                        : g
                    )
                  ),
              };

              if (row.kind === "text") {
                return <RowText key={row.id} row={row} {...common} />;
              }
              if (row.kind === "money") {
                return <RowMoney key={row.id} row={row} {...common} />;
              }
              return <RowCalc key={row.id} row={row} {...common} />;
            })}
          </ServiceCard>
        ))}

        <div className="svc-card svc-card--wide">
          <h3 className="svc-h">REFRESH POWER SCRUB</h3>
          <div className="rps-wrap">
            <table className="rps">
              <tbody>
                <tr>
                  {dataForRender.rps.amounts.map((c) => (
                    <td key={c.name}>
                      <div className="rps-inline">
                        <span className="rps-label">{c.label}</span>
                        <input
                          className="rps-line"
                          name={c.name}
                          type="text"
                          defaultValue={c.defaultValue}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  {dataForRender.rps.freqs.map((c, i) => (
                    <td key={`${c.name}-${i}`}>
                      <div className="rps-inline">
                        <span className="rps-label">{c.label}</span>
                        <input
                          className="rps-line"
                          name={c.name}
                          type="text"
                          defaultValue={c.defaultValue}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="svc-card svc-card--wide">
          <h3 className="svc-h">SERVICE NOTES</h3>
          <div className="svc-notes">
            {dataForRender.serviceNotes.map((sn) => (
              <input
                key={sn.name}
                className="svc-note-line"
                type="text"
                name={sn.name}
                defaultValue={sn.defaultValue}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
