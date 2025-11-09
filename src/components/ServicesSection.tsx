import React, { useMemo, useState } from "react";
import "./ServicesSection.css";

const Under = ({
  name,
  type = "text",
  className = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { name?: string }) => (
  <input className={`svc-in ${className}`} name={name} type={type} {...rest} />
);

const Dollar = ({ name }: { name?: string }) => (
  <div className="svc-dollar">
    <span>$</span>
    <input className="svc-in-box" name={name} />
  </div>
);

type RowKind = "text" | "money" | "calc";

type TextRow = { id: string; kind: "text"; label: string; name: string; isCustom?: boolean };
type MoneyRow = { id: string; kind: "money"; label: string; name: string; isCustom?: boolean };
type CalcRow = {
  id: string;
  kind: "calc";
  label: string;
  qtyName: string;
  rateName: string;
  totalName: string;
  isCustom?: boolean;
};

type Row = TextRow | MoneyRow | CalcRow;

type ServiceGroup = { id: string; title: string; items: Row[]; isCustom?: boolean };

type ServicesData = {
  groups: ServiceGroup[];
  rps: {
    amounts: { label: string; name: string }[];
    freqs: { label: string; name: string }[];
  };
  serviceNotes: { name: string }[];
};

const uid = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const initialData: ServicesData = {
  groups: [
    {
      id: "g_rh",
      title: "RESTROOM & HYGIENE",
      items: [
        { id: "rh1", kind: "text", label: "Restrooms", name: "restrooms" },
        { id: "rh2", kind: "text", label: "Bowls", name: "bowls" },
        { id: "rh3", kind: "text", label: "Urinals", name: "urinals" },
        { id: "rh4", kind: "text", label: "Sinks", name: "sinks" },
        { id: "rh5", kind: "money", label: "Total Sani Charge", name: "saniCharge" },
        { id: "rh6", kind: "text", label: "Frequency", name: "saniFrequency" },
      ],
    },
    {
      id: "g_fd",
      title: "FOAMING DRAIN",
      items: [
        { id: "fd1", kind: "text", label: "Kitchen", name: "fdKitchen" },
        { id: "fd2", kind: "text", label: "Restrooms", name: "fdRestrooms" },
        { id: "fd3", kind: "text", label: "Bar Area", name: "fdBarArea" },
        { id: "fd4", kind: "text", label: "Total Drains", name: "fdTotal" },
        { id: "fd5", kind: "money", label: "Foaming Drain Charge", name: "fdCharge" },
        { id: "fd6", kind: "text", label: "Frequency", name: "fdFrequency" },
      ],
    },
    {
      id: "g_ss",
      title: "SCRUB SERVICE",
      items: [
        { id: "ss1", kind: "text", label: "No. of Rooms", name: "scrRooms" },
        { id: "ss2", kind: "text", label: "Square Footage", name: "scrSqft" },
        { id: "ss3", kind: "text", label: "Tiles (Small/Large)", name: "scrTiles" },
        { id: "ss4", kind: "money", label: "Sani-Scrub Charge", name: "scrCharge" },
        { id: "ss5", kind: "text", label: "Frequency", name: "scrFrequency" },
      ],
    },
    {
      id: "g_hs",
      title: "HAND SANITIZER",
      items: [
        { id: "hs1", kind: "text", label: "No. of Sanitizers", name: "hsCount" },
        { id: "hs2", kind: "money", label: "Sanitizer Charge", name: "hsCharge" },
        { id: "hs3", kind: "text", label: "Frequency", name: "hsFrequency" },
      ],
    },
    {
      id: "g_mm",
      title: "MICROMAX FLOOR",
      items: [
        { id: "mm1", kind: "calc", label: "No. of Rooms", qtyName: "mmRooms", rateName: "mmRate", totalName: "mmTotal" },
        { id: "mm2", kind: "text", label: "MicroMax Frequency", name: "mmFrequency" },
      ],
    },
    {
      id: "g_rpm",
      title: "RPM WINDOW",
      items: [
        { id: "rpm1", kind: "calc", label: "No. of Windows", qtyName: "rpmWindows", rateName: "rpmRate", totalName: "rpmTotal" },
        { id: "rpm2", kind: "text", label: "RPM Frequency", name: "rpmFrequency" },
      ],
    },
    {
      id: "g_sp",
      title: "SANIPOD",
      items: [
        { id: "sp1", kind: "calc", label: "No. of Fem Bins", qtyName: "spBins", rateName: "spRate", totalName: "spTotal" },
        { id: "sp2", kind: "text", label: "SaniPod Frequency", name: "spFrequency" },
      ],
    },
    {
      id: "g_tc",
      title: "TRIP CHARGE",
      items: [{ id: "tc1", kind: "money", label: "Trip Charge", name: "tripCharge" }],
    },
  ],
  rps: {
    amounts: [
      { label: "Dumpster $", name: "rpsDumpsterAmount" },
      { label: "Patio $", name: "rpsPatioAmount" },
      { label: "Walkway $", name: "rpsWalkwayAmount" },
      { label: "FOH $", name: "rpsFohAmount" },
      { label: "BOH $", name: "rpsBohAmount" },
      { label: "Other $", name: "rpsOtherAmount" },
    ],
    freqs: [
      { label: "Freq", name: "rpsDumpsterFreq" },
      { label: "Freq", name: "rpsPatioFreq" },
      { label: "Freq", name: "rpsWalkwayFreq" },
      { label: "Freq", name: "rpsFohFreq" },
      { label: "Freq", name: "rpsBohFreq" },
      { label: "Freq", name: "rpsOtherFreq" },
    ],
  },
  serviceNotes: [{ name: "serviceNote1" }, { name: "serviceNote2" }],
};

export default function ServicesSection() {
  const [groups, setGroups] = useState<ServiceGroup[]>(initialData.groups);

  const [chooserFor, setChooserFor] = useState<string | null>(null);
  const [chooserType, setChooserType] = useState<RowKind>("text");

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
    setGroups((prev) => prev.map((g) => (g.id === gid ? { ...g, title } : g)));

  const openChooser = (gid: string) => {
    setChooserFor((curr) => (curr === gid ? null : gid));
    setChooserType("text");
  };

  const addChosenField = (gid: string) => {
    const base = uid("custom");
    let newRow: Row;
    if (chooserType === "calc") {
      newRow = {
        id: uid("r"),
        kind: "calc",
        label: "Custom Calc",
        qtyName: `${base}_qty`,
        rateName: `${base}_rate`,
        totalName: `${base}_total`,
        isCustom: true,
      };
    } else if (chooserType === "money") {
      newRow = {
        id: uid("r"),
        kind: "money",
        label: "Custom",
        name: `${base}_amount`,
        isCustom: true,
      };
    } else {
      newRow = {
        id: uid("r"),
        kind: "text",
        label: "Custom",
        name: `${base}_text`,
        isCustom: true,
      };
    }
    setGroups((prev) =>
      prev.map((g) => (g.id === gid ? { ...g, items: [...g.items, newRow] } : g))
    );
    setChooserFor(null);
  };

  const removeField = (gid: string, rid: string) =>
    setGroups((prev) =>
      prev.map((g) =>
        g.id === gid ? { ...g, items: g.items.filter((r) => r.id !== rid) } : g
      )
    );

  const renameField = (gid: string, rid: string, label: string) =>
    setGroups((prev) =>
      prev.map((g) =>
        g.id === gid
          ? {
              ...g,
              items: g.items.map((r) => (r.id === rid ? { ...r, label } as Row : r)),
            }
          : g
      )
    );

  const dataForRender: ServicesData = useMemo(
    () => ({ ...initialData, groups }),
    [groups]
  );

  return (
    <section className="svc">
      <div className="svc-title svc-title--hasActions">
        SERVICES
        <div className="svc-actions">
          <button type="button" className="svc-btn" onClick={addService}>
            + New
          </button>
        </div>
      </div>

      <div className="svc-grid">
        {dataForRender.groups.map((grp) => (
          <div className="svc-card" key={grp.id}>
            <div className="svc-h-row">
              {grp.isCustom ? (
                <input
                  className="svc-h-input"
                  value={grp.title}
                  onChange={(e) => renameService(grp.id, e.target.value.toUpperCase())}
                />
              ) : (
                <h3 className="svc-h">{grp.title}</h3>
              )}

              <div className="svc-h-actions">
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
                    <div className="svc-chooser">
                      <select
                        className="svc-chooser-select"
                        value={chooserType}
                        onChange={(e) =>
                          setChooserType(e.target.value as RowKind)
                        }
                      >
                        <option value="text">Text</option>
                        <option value="money">Money</option>
                        <option value="calc">Calc</option>
                      </select>
                      <button
                        type="button"
                        className="svc-btn svc-btn--small"
                        onClick={() => addChosenField(grp.id)}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        className="svc-mini svc-mini--neg"
                        title="Close"
                        onClick={() => setChooserFor(null)}
                      >
                        ×
                      </button>
                    </div>
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
              </div>
            </div>

            {grp.items.map((row) => {
              const LabelEl = (
                <>
                  {row.isCustom ? (
                    <input
                      className={`svc-label-edit ${row.kind === "money" ? "svc-red" : ""}`}
                      value={row.label}
                      onChange={(e) => renameField(grp.id, row.id, e.target.value)}
                    />
                  ) : (
                    <label className={row.kind === "money" ? "svc-red" : ""}>
                      {row.label}
                    </label>
                  )}
                </>
              );

              if (row.kind === "text") {
                return (
                  <div className="svc-row" key={row.id}>
                    {LabelEl}
                    <div className="svc-row-right">
                      <Under name={row.name} />
                      {row.isCustom && (
                        <button
                          type="button"
                          className="svc-mini svc-mini--inline"
                          title="Remove"
                          onClick={() => removeField(grp.id, row.id)}
                        >
                          –
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              if (row.kind === "money") {
                return (
                  <div className="svc-row svc-row-charge" key={row.id}>
                    {LabelEl}
                    <div className="svc-row-right">
                      <Dollar name={row.name} />
                      {row.isCustom && (
                        <button
                          type="button"
                          className="svc-mini svc-mini--inline"
                          title="Remove"
                          onClick={() => removeField(grp.id, row.id)}
                        >
                          –
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div className="svc-row" key={row.id}>
                  {LabelEl}
                  <div className="svc-row-right">
                    <div className="svc-inline svc-inline--tight">
                      <Under name={row.qtyName} className="sm" />
                      <span>@</span>
                      <Under name={row.rateName} className="sm" />
                      <span>=</span>
                      <Under name={row.totalName} className="sm" />
                    </div>
                    {row.isCustom && (
                      <button
                        type="button"
                        className="svc-mini svc-mini--inline"
                        title="Remove"
                        onClick={() => removeField(grp.id, row.id)}
                      >
                        –
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div className="svc-card svc-card--wide">
          <h3 className="svc-h">REFRESH POWER SCRUB</h3>
          <div className="rps-wrap">
            <table className="rps">
              <tbody>
                <tr>
                  {initialData.rps.amounts.map((c) => (
                    <td key={c.name}>
                      <div className="rps-inline">
                        <span className="rps-label">{c.label}</span>
                        <input className="rps-line" name={c.name} type="text" />
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  {initialData.rps.freqs.map((c, i) => (
                    <td key={`${c.name}-${i}`}>
                      <div className="rps-inline">
                        <span className="rps-label">{c.label}</span>
                        <input className="rps-line" name={c.name} type="text" />
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
            <input className="svc-note-line" type="text" name="serviceNote1" />
            <input className="svc-note-line" type="text" name="serviceNote2" />
          </div>
        </div>
      </div>
    </section>
  );
}
