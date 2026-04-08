import React, { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch, faTimes, faChevronDown, faChevronUp,
  faCheckCircle, faTimesCircle, faInfoCircle,
  faWindowMaximize, faBolt, faDollarSign, faSync,
  faRuler, faCalendar, faWind, faDroplet, faChartBar,
  faOilCan, faLeaf, faPlus, faBroom, faBuilding,
  faLandmark, faStar, faClock, faCity, faTree,
  faBox, faStore, faSoap, faTicket, faCheck,
  faClipboard, faTrash, faShoppingBag, faShower,
  faWandMagicSparkles, faUtensils, faCog, faLayerGroup,
  faTag, faImage, faLink, faExternalLinkAlt, faAlignLeft,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { ServiceConfig } from "../../backendservice/types/serviceConfig.types";
import "ckeditor5/ckeditor5-content.css";
import "./ServicesReferenceSection.css";

// ─── Per-service icon + accent colour ────────────────────────────────────────
interface ServiceMeta { icon: IconDefinition; color: string; bg: string }
const SERVICE_META: Record<string, ServiceMeta> = {
  rpmWindows:        { icon: faWindowMaximize, color: "#0ea5e9", bg: "#e0f2fe" },
  saniclean:         { icon: faSoap,           color: "#7c3aed", bg: "#ede9fe" },
  foamingDrain:      { icon: faDroplet,        color: "#10b981", bg: "#d1fae5" },
  saniscrub:         { icon: faShower,         color: "#0284c7", bg: "#e0f2fe" },
  microfiberMopping: { icon: faBroom,          color: "#2563eb", bg: "#dbeafe" },
  electrostaticSpray:{ icon: faBolt,           color: "#dc2626", bg: "#fee2e2" },
  stripWax:          { icon: faWandMagicSparkles, color: "#d97706", bg: "#fef3c7" },
  stripwax:          { icon: faWandMagicSparkles, color: "#d97706", bg: "#fef3c7" },
  carpetCleaning:    { icon: faBuilding,       color: "#7c3aed", bg: "#ede9fe" },
  carpetclean:       { icon: faBuilding,       color: "#7c3aed", bg: "#ede9fe" },
  pureJanitorial:    { icon: faStore,          color: "#059669", bg: "#d1fae5" },
  janitorial:        { icon: faStore,          color: "#059669", bg: "#d1fae5" },
  refreshPowerScrub: { icon: faSync,           color: "#ea580c", bg: "#ffedd5" },
  sanipod:           { icon: faTrash,          color: "#6d28d9", bg: "#ede9fe" },
  greaseTrap:        { icon: faOilCan,         color: "#b45309", bg: "#fef3c7" },
};
const FALLBACK_META: ServiceMeta = { icon: faCog, color: "#6b7280", bg: "#f3f4f6" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function camelToLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/_/g, " ")
    .trim();
}

type VType = "dollar" | "multiplier" | "percent" | "months" | "sqft" | "bool" | "text" | "count";

function classifyKey(key: string): VType {
  const k = key.toLowerCase();
  if (/price|charge|rate|minimum|cost|fee|amount|surcharge/.test(k)) return "dollar";
  if (/multiplier|factor|ratio/.test(k)) return "multiplier";
  if (/percent|pct|percentage/.test(k)) return "percent";
  if (/months|month/.test(k)) return "months";
  if (/sqft|squarefeet|squarefoot/.test(k)) return "sqft";
  return "count";
}

function formatPrimitive(key: string, value: unknown): { display: string; unit: string; vtype: VType } {
  if (typeof value === "boolean") return { display: value ? "Yes" : "No", unit: "", vtype: "bool" };
  if (typeof value === "string")  return { display: value, unit: "", vtype: "text" };
  if (typeof value !== "number")  return { display: String(value), unit: "", vtype: "text" };
  const vtype = classifyKey(key);
  switch (vtype) {
    case "dollar":     return { display: `$${value.toFixed(2)}`,  unit: "per visit",   vtype };
    case "multiplier": return { display: `${value}×`,             unit: "multiplier",  vtype };
    case "percent":    return { display: `${value}%`,             unit: "percent",     vtype };
    case "months":     return { display: String(value),           unit: "months",      vtype };
    case "sqft":       return { display: String(value),           unit: "sq ft",       vtype };
    default:           return { display: String(value),           unit: "",            vtype: "count" };
  }
}

type FieldEntry  = { key: string; label: string; display: string; unit: string; vtype: VType };
type Section     = { sectionKey: string; title: string; icon: IconDefinition; fields: FieldEntry[]; subsections: Section[] };

// Map known section keys to icons (mirrors getTabs() in ServicePricingDetailedView)
const SECTION_ICONS: Record<string, IconDefinition> = {
  windowPricingBothSidesIncluded: faWindowMaximize,
  installPricing: faBolt,
  minimumChargePerVisit: faDollarSign,
  tripCharges: faBolt,
  frequencyPriceMultipliers: faSync,
  frequencyMetadata: faCalendar,
  installationMultipliers: faBolt,
  unitPricing: faRuler,
  minimums: faDollarSign,
  variants: faStar,
  standardFull: faStar,
  noSealant: faDroplet,
  wellMaintained: faWandMagicSparkles,
  standardRates: faDroplet,
  volumePricing: faChartBar,
  greaseTrapPricing: faOilCan,
  greenDrainPricing: faLeaf,
  addOns: faPlus,
  basicRates: faBroom,
  hugeBathroomPricing: faBuilding,
  extraAreaPricing: faLandmark,
  standalonePricingWithoutSaniClean: faStar,
  baseRates: faClock,
  shortJobPricing: faBolt,
  serviceMultipliers: faTimes,
  monthlyConversions: faCalendar,
  dustingVacuumingOptions: faBroom,
  smoothBreakdown: faChartBar,
  geographicPricing: faCity,
  insideBeltway: faCity,
  outsideBeltway: faTree,
  allInclusivePackagePricing: faBox,
  smallBathroomMinimums: faStore,
  soapUpgradePricing: faSoap,
  warrantyCredits: faTicket,
  includedItems: faCheck,
  monthlyAddOnSupplyPricing: faClipboard,
  microfiberMoppingAddon: faBroom,
  corePricingIncludedWithSaniClean: faTrash,
  extraBagPricing: faShoppingBag,
  bathroomPricing: faShower,
  nonBathroomPricing: faLandmark,
  serviceFrequencies: faCalendar,
  discountsAndFees: faTicket,
  coreRates: faDollarSign,
  areaSpecificPricing: faUtensils,
  squareFootagePricing: faRuler,
  rateCategories: faChartBar,
  __root__: faCog,
};

function getIcon(key: string): IconDefinition {
  return SECTION_ICONS[key] ?? faLayerGroup;
}

function buildSections(obj: Record<string, unknown>): Section[] {
  const sections: Section[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "object" && !Array.isArray(value)) {
      const inner = value as Record<string, unknown>;
      const fields: FieldEntry[] = [];
      const subsections: Section[] = [];
      for (const [subKey, subVal] of Object.entries(inner)) {
        if (subVal === null || subVal === undefined) continue;
        if (typeof subVal === "object" && !Array.isArray(subVal)) {
          subsections.push(...buildSections({ [subKey]: subVal }));
        } else if (!Array.isArray(subVal)) {
          const { display, unit, vtype } = formatPrimitive(subKey, subVal);
          fields.push({ key: subKey, label: camelToLabel(subKey), display, unit, vtype });
        }
      }
      sections.push({ sectionKey: key, title: camelToLabel(key), icon: getIcon(key), fields, subsections });
    } else if (!Array.isArray(value)) {
      const { display, unit, vtype } = formatPrimitive(key, value);
      const entry: FieldEntry = { key, label: camelToLabel(key), display, unit, vtype };
      const existing = sections.find((s) => s.sectionKey === "__root__");
      if (existing) existing.fields.push(entry);
      else sections.unshift({ sectionKey: "__root__", title: "General", icon: faCog, fields: [entry], subsections: [] });
    }
  }
  return sections;
}

// ─── FieldRow — matches spd__field style ─────────────────────────────────────
function FieldRow({ label, display, unit, vtype }: FieldEntry) {
  const valueClass = {
    dollar: "srf-val--dollar", multiplier: "srf-val--multiplier",
    percent: "srf-val--percent", months: "srf-val--months",
    sqft: "srf-val--sqft", count: "srf-val--count",
    bool: "srf-val--bool", text: "srf-val--text",
  }[vtype] ?? "srf-val--count";

  return (
    <div className="srf-field">
      <div className="srf-field__label">{label}</div>
      <div className="srf-field__right">
        <span className={`srf-field__value ${valueClass}`}>{display}</span>
        {unit && <span className="srf-field__unit">{unit}</span>}
      </div>
    </div>
  );
}

// ─── SubSection ───────────────────────────────────────────────────────────────
function SubSection({ section }: { section: Section }) {
  const [open, setOpen] = useState(true);
  if (section.fields.length === 0 && section.subsections.length === 0) return null;
  return (
    <div className="srf-subsection">
      <button type="button" className="srf-subsection__toggle" onClick={() => setOpen((o) => !o)}>
        <FontAwesomeIcon icon={section.icon} className="srf-subsection__icon" />
        <span>{section.title}</span>
        <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="srf-subsection__chevron" />
      </button>
      {open && (
        <div className="srf-subsection__body">
          {section.fields.map((f) => <FieldRow key={f.key} {...f} />)}
          {section.subsections.map((sub) => <SubSection key={sub.sectionKey} section={sub} />)}
        </div>
      )}
    </div>
  );
}

// ─── ServiceReferenceCard ─────────────────────────────────────────────────────
function ServiceReferenceCard({ config }: { config: ServiceConfig }) {
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const meta = SERVICE_META[config.serviceId] ?? FALLBACK_META;

  const sections = useMemo(() => buildSections(config.config ?? {}), [config.config]);

  // "__desc__" is a synthetic tab key for the description tab
  const hasDescription = Boolean(config.description);
  const allTabs = useMemo(() => {
    if (!hasDescription) return sections;
    return [
      { sectionKey: "__desc__", title: "Description", icon: faAlignLeft, fields: [], subsections: [] },
      ...sections,
    ];
  }, [sections, hasDescription]);

  const activeKey = activeSection ?? allTabs[0]?.sectionKey ?? null;
  const activeSecObj = sections.find((s) => s.sectionKey === activeKey) ?? sections[0];

  return (
    <div className={`srf-card ${expanded ? "srf-card--open" : ""}`}>

      {/* ── Header row ── */}
      <button
        type="button"
        className="srf-card__header"
        onClick={() => setExpanded((e) => !e)}
        style={{ borderLeftColor: meta.color }}
      >
        {/* Icon badge */}
        <span className="srf-card__icon-wrap" style={{ background: meta.bg, color: meta.color }}>
          <FontAwesomeIcon icon={meta.icon} />
        </span>

        {/* Name + ID */}
        <div className="srf-card__titles">
          <span className="srf-card__name">{config.label || config.serviceId}</span>
          <span className="srf-card__id">{config.serviceId}</span>
        </div>

        {/* Badges */}
        <div className="srf-card__badges">
          {config.version && (
            <span className="srf-badge srf-badge--version">v{config.version}</span>
          )}
          {config.tags?.map((t) => (
            <span key={t} className="srf-badge srf-badge--tag">
              <FontAwesomeIcon icon={faTag} className="srf-badge__icon" />{t}
            </span>
          ))}
          <span className={`srf-badge ${config.isActive ? "srf-badge--active" : "srf-badge--inactive"}`}>
            <FontAwesomeIcon
              icon={config.isActive ? faCheckCircle : faTimesCircle}
              className="srf-badge__icon"
            />
            {config.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Expand chevron */}
        <FontAwesomeIcon
          icon={expanded ? faChevronUp : faChevronDown}
          className="srf-card__chevron"
          style={{ color: meta.color }}
        />
      </button>

      {/* ── Description strip (always visible when present) ── */}
      {config.description && (
        <div className="srf-card__desc">
          <FontAwesomeIcon icon={faInfoCircle} className="srf-card__desc-icon" />
          <div
            className="srf-card__desc-html ck-content"
            dangerouslySetInnerHTML={{ __html: config.description }}
          />
        </div>
      )}

      {/* ── Expanded pricing body ── */}
      {expanded && (
        <div className="srf-card__body">
          {allTabs.length === 0 ? (
            <p className="srf-empty">No pricing configuration available.</p>
          ) : (
            <>
              {/* Tab strip */}
              <div className="srf-tabs">
                {allTabs.map((s) => (
                  <button
                    key={s.sectionKey}
                    type="button"
                    className={`srf-tab ${activeKey === s.sectionKey ? "srf-tab--active" : ""}`}
                    style={activeKey === s.sectionKey
                      ? { background: meta.color, borderColor: meta.color }
                      : {}}
                    onClick={() => setActiveSection(s.sectionKey)}
                  >
                    <FontAwesomeIcon icon={s.icon} className="srf-tab__icon" />
                    <span>{s.title}</span>
                  </button>
                ))}
              </div>

              {/* Description tab body */}
              {activeKey === "__desc__" ? (
                <div className="srf-section-body">
                  <div
                    className="srf-desc-body ck-content"
                    dangerouslySetInnerHTML={{ __html: config.description! }}
                  />
                </div>
              ) : (
                /* Pricing section fields */
                activeSecObj && (
                  <div className="srf-section-body">
                    {activeSecObj.fields.map((f) => <FieldRow key={f.key} {...f} />)}
                    {activeSecObj.subsections.map((sub) => (
                      <SubSection key={sub.sectionKey} section={sub} />
                    ))}
                    {activeSecObj.fields.length === 0 && activeSecObj.subsections.length === 0 && (
                      <p className="srf-empty">No fields in this section.</p>
                    )}
                  </div>
                )
              )}
            </>
          )}

          {/* ── Images gallery ── */}
          {config.images && config.images.length > 0 && (
            <div className="srf-media-section">
              <div className="srf-media-header">
                <FontAwesomeIcon icon={faImage} className="srf-media-icon" />
                <span>Images</span>
              </div>
              <div className="srf-image-grid">
                {config.images.map((img, idx) => {
                  const src = img.url.startsWith("/")
                    ? `${(import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:5000"}${img.url}`
                    : img.url;
                  return (
                    <div key={idx} className="srf-image-card">
                      <img src={src} alt={img.caption || "service image"} className="srf-image-thumb" />
                      {img.caption && <p className="srf-image-caption">{img.caption}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Links ── */}
          {config.links && config.links.length > 0 && (
            <div className="srf-media-section">
              <div className="srf-media-header">
                <FontAwesomeIcon icon={faLink} className="srf-media-icon" />
                <span>Links</span>
              </div>
              <div className="srf-links-list">
                {config.links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="srf-link-item"
                  >
                    <FontAwesomeIcon icon={faExternalLinkAlt} className="srf-link-icon" />
                    <span className="srf-link-label">{link.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
interface Props { configs: ServiceConfig[] }

export function ServicesReferenceSection({ configs }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return configs;
    return configs.filter(
      (c) =>
        c.label?.toLowerCase().includes(q) ||
        c.serviceId.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [configs, search]);

  return (
    <div className="srf-root">
      {/* ── Banner (matches svc-title style) ── */}
      <div className="srf-banner">
        <div className="srf-banner__title">SERVICES REFERENCE</div>
        <div className="srf-banner__sub">
          FOR SALESPEOPLE &mdash; click any service card to expand its full pricing
        </div>
      </div>

      {/* ── Search + count ── */}
      <div className="srf-toolbar">
        <div className="srf-search-wrap">
          <FontAwesomeIcon icon={faSearch} className="srf-search__icon" />
          <input
            className="srf-search"
            type="text"
            placeholder="Search by name, service ID, tag or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="srf-search__clear" onClick={() => setSearch("")}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>
        <span className="srf-count">
          {filtered.length} of {configs.length} service{configs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Legend ── */}
      <div className="srf-legend">
        <span className="srf-legend__item srf-val--dollar">
          <FontAwesomeIcon icon={faDollarSign} style={{ marginRight: 4 }} /> Price / Rate
        </span>
        <span className="srf-legend__item srf-val--multiplier">
          <FontAwesomeIcon icon={faTimes} style={{ marginRight: 4 }} /> Multiplier
        </span>
        <span className="srf-legend__item srf-val--percent">
          <FontAwesomeIcon icon={faChartBar} style={{ marginRight: 4 }} /> Percent
        </span>
        <span className="srf-legend__item srf-val--months">
          <FontAwesomeIcon icon={faCalendar} style={{ marginRight: 4 }} /> Duration
        </span>
        <span className="srf-legend__item srf-val--count">
          <FontAwesomeIcon icon={faLayerGroup} style={{ marginRight: 4 }} /> Count / Other
        </span>
      </div>

      {/* ── Cards ── */}
      <div className="srf-list">
        {filtered.length === 0 ? (
          <div className="srf-no-results">No services match &ldquo;{search}&rdquo;</div>
        ) : (
          filtered.map((c) => <ServiceReferenceCard key={c.serviceId} config={c} />)
        )}
      </div>
    </div>
  );
}
