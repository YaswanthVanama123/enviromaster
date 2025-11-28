import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ProductsSection.css";

const dummyResponse = {
  smallProducts: [
    "EM Proprietary JRT Tissue",
    "EM Proprietary Hardwood Natural",
    "EM Proprietary Hardwood White",
    "Center Pull Towels",
    "Multi-Fold Natural",
    "Multi-Fold White",
    "Seat Cover Sleeve",
    "Grit Soap",
  ],
  dispensers: [
    "EM Proprietary Twin JRT",
    "EM Proprietary Towel Mechanical",
    "EM Proprietary Towel Hybrid",
    "Center Pull Towel Dispenser",
    "Multi-Fold Dispenser",
    "",
    "EM Proprietary A/F Dispensers",
    "EM Proprietary Soap Dispenser",
    "Seat Cover Dispenser",
    "Hand Sanitizer Dispenser",
    "Grit Soap Dispenser",
    "SaniPod Receptacle",
  ],
  bigProducts: [
    "EM Urinal Mat",
    "EM Commode Mat",
    "Bowl Clip",
    "Wave 3D Urinal Screen",
    "Splash Hog Urinal Screen",
    "",
    "Surefoot EZ",
    "Daily",
    "Dish Detergent",
  ],
};

type RowItem = { id: string; name: string; isCustom: boolean };
type ColItem = { id: string; label: string; isCustom: boolean };

type ProductsSectionProps = {
  initialSmallProducts?: string[];
  initialDispensers?: string[];
  initialBigProducts?: string[];
};

const toItems = (arr: string[]): RowItem[] =>
  arr.map((name, idx) => ({ id: `base_${idx}`, name, isCustom: false }));

function DollarCell({ name }: { name?: string }) {
  return (
    <div className="dcell">
      <span className="dollarColor">$</span>
      <input
        className="in"
        type="text"
        name={name}
        autoComplete="off"
        placeholder=""
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => console.log('DollarCell focused:', name)}
      />
    </div>
  );
}

function PlainCell({ name }: { name?: string }) {
  return (
    <input
      className="in"
      type="text"
      name={name}
      autoComplete="off"
      placeholder=""
      tabIndex={0}
      onClick={(e) => e.stopPropagation()}
      onFocus={(e) => console.log('PlainCell focused:', name)}
    />
  );
}

const NameCell = React.memo(function NameCell({
  item,
  onRename,
  onRemove,
}: {
  item: RowItem;
  onRename?: (v: string) => void;
  onRemove?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(item.name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(item.name);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [isEditing, item.name]);

  const commit = () => {
    const next = draft.trim();
    if (onRename && next !== item.name) onRename(next);
    setIsEditing(false);
  };
  const cancel = () => {
    setDraft(item.name);
    setIsEditing(false);
  };

  return (
    <div className="namecell">
      {isEditing ? (
        <>
          <input
            ref={inputRef}
            className="name-edit"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") cancel();
            }}
            placeholder="Enter name…"
          />
          {item.isCustom && (
            <button
              className="row-remove"
              title="Remove row"
              onClick={onRemove}
              type="button"
            >
              –
            </button>
          )}
        </>
      ) : (
        <>
          <span
            className={`name-label ${item.isCustom ? "editable" : ""}`}
            onClick={() => item.isCustom && setIsEditing(true)}
            title={item.isCustom ? "Click to edit" : undefined}
            role={item.isCustom ? "button" : undefined}
          >
            {item.name}
          </span>
          {item.isCustom && (
            <button
              className="row-remove"
              title="Remove row"
              onClick={onRemove}
              type="button"
            >
              –
            </button>
          )}
        </>
      )}
    </div>
  );
});

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width:1025px)").matches
  );
  useEffect(() => {
    const m = window.matchMedia("(min-width:1025px)");
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    m.addEventListener?.("change", h);
    return () => m.removeEventListener?.("change", h);
  }, []);
  return isDesktop;
}

export default function ProductsSection({
  initialSmallProducts,
  initialDispensers,
  initialBigProducts,
}: ProductsSectionProps) {
  const [data, setData] = useState(() => ({
    smallProducts: toItems(
      initialSmallProducts ?? dummyResponse.smallProducts
    ),
    dispensers: toItems(initialDispensers ?? dummyResponse.dispensers),
    bigProducts: toItems(initialBigProducts ?? dummyResponse.bigProducts),
  }));

  useEffect(() => {
    if (
      !initialSmallProducts &&
      !initialDispensers &&
      !initialBigProducts
    ) {
      return;
    }

    setData((prev) => ({
      smallProducts: initialSmallProducts
        ? toItems(initialSmallProducts)
        : prev.smallProducts,
      dispensers: initialDispensers
        ? toItems(initialDispensers)
        : prev.dispensers,
      bigProducts: initialBigProducts
        ? toItems(initialBigProducts)
        : prev.bigProducts,
    }));
  }, [initialSmallProducts, initialDispensers, initialBigProducts]);

  const [extraCols, setExtraCols] = useState<{
    smallProducts: ColItem[];
    dispensers: ColItem[];
    bigProducts: ColItem[];
  }>({ smallProducts: [], dispensers: [], bigProducts: [] });

  const [editingColId, setEditingColId] = useState<string | null>(null);

  const isDesktop = useIsDesktop();

  const rows = useMemo(
    () =>
      Math.max(
        data.smallProducts.length,
        data.dispensers.length,
        data.bigProducts.length
      ),
    [data]
  );

  const mkRow = (): RowItem => ({
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name: "Custom",
    isCustom: true,
  });

  const addRowAll = () =>
    setData((d) => {
      const ra = mkRow();
      const rb = mkRow();
      const rc = mkRow();
      return {
        smallProducts: [...d.smallProducts, ra],
        dispensers: [...d.dispensers, rb],
        bigProducts: [...d.bigProducts, rc],
      };
    });

  const addRow = (bucket: keyof typeof data) =>
    setData((d) => {
      const r = mkRow();
      return { ...d, [bucket]: [...d[bucket], r] };
    });

  const renameRow = (
    bucket: keyof typeof data,
    id: string,
    next: string
  ) =>
    setData((d) => ({
      ...d,
      [bucket]: d[bucket].map((it) =>
        it.id === id ? { ...it, name: next } : it
      ),
    }));

  const removeRow = (bucket: keyof typeof data, id: string) =>
    setData((d) => ({
      ...d,
      [bucket]: d[bucket].filter((it) => it.id !== id),
    }));

  const mkCol = (label = "Custom"): ColItem => ({
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    label,
    isCustom: true,
  });

  const addColAll = () =>
    setExtraCols((c) => ({
      smallProducts: [...c.smallProducts, mkCol()],
      dispensers: [...c.dispensers, mkCol()],
      bigProducts: [...c.bigProducts, mkCol()],
    }));

  const addCol = (bucket: keyof typeof extraCols) =>
    setExtraCols((c) => ({ ...c, [bucket]: [...c[bucket], mkCol()] }));

  const changeColLabel = (
    bucket: keyof typeof extraCols,
    id: string,
    next: string
  ) =>
    setExtraCols((c) => ({
      ...c,
      [bucket]: c[bucket].map((col) =>
        col.id === id ? { ...col, label: next } : col
      ),
    }));

  const removeCol = (bucket: keyof typeof extraCols, id: string) =>
    setExtraCols((c) => ({
      ...c,
      [bucket]: c[bucket].filter((col) => col.id !== id),
    }));

  const DesktopTable = () => (
    <>
      <div className="prod__ribbon">
        <div className="prod__title prod__title--hasActions">
          PRODUCTS
          <div className="prod__title-actions">
            <button
              className="prod__add"
              onClick={addRowAll}
              type="button"
            >
              + Row
            </button>
            <button
              className="prod__add"
              onClick={addColAll}
              type="button"
            >
              + Column
            </button>
          </div>
        </div>
      </div>

      <div className="table-desktop">
        <table className="grid10">
          <thead>
            <tr>
              <th className="h h-blue">Products</th>
              <th className="h h-blue center">Amount Per Unit</th>
              {extraCols.smallProducts.map((col) => (
                <th className="h h-blue center th-edit" key={col.id}>
                  <input
                    className="th-edit-input"
                    value={col.label}
                    onChange={(e) =>
                      changeColLabel("smallProducts", col.id, e.target.value)
                    }
                    onFocus={() => setEditingColId(col.id)}
                    autoFocus={editingColId === col.id}
                  />
                  <button
                    className="th-remove"
                    title="Remove column"
                    type="button"
                    onClick={() =>
                      removeCol("smallProducts", col.id)
                    }
                  >
                    –
                  </button>
                </th>
              ))}

              <th className="h h-blue">Dispensers</th>
              <th className="h h-blue center">Qty</th>
              <th className="h h-blue center">Warranty Rate</th>
              <th className="h h-blue center">
                Replacement Rate/Install
              </th>
              {extraCols.dispensers.map((col) => (
                <th className="h h-blue center th-edit" key={col.id}>
                  <input
                    className="th-edit-input"
                    value={col.label}
                    onChange={(e) =>
                      changeColLabel(
                        "dispensers",
                        col.id,
                        e.target.value
                      )
                    }
                    onFocus={() => setEditingColId(col.id)}
                    autoFocus={editingColId === col.id}
                  />
                  <button
                    className="th-remove"
                    title="Remove column"
                    type="button"
                    onClick={() =>
                      removeCol("dispensers", col.id)
                    }
                  >
                    –
                  </button>
                </th>
              ))}

              <th className="h h-blue">Products</th>
              <th className="h h-blue center">Qty</th>
              <th className="h h-blue center">Amount</th>
              <th className="h h-blue center">
                Frequency of Service
              </th>
              {extraCols.bigProducts.map((col) => (
                <th className="h h-blue center th-edit" key={col.id}>
                  <input
                    className="th-edit-input"
                    value={col.label}
                    onChange={(e) =>
                      changeColLabel("bigProducts", col.id, e.target.value)
                    }
                    onFocus={() => setEditingColId(col.id)}
                    autoFocus={editingColId === col.id}
                  />
                  <button
                    className="th-remove"
                    title="Remove column"
                    type="button"
                    onClick={() =>
                      removeCol("bigProducts", col.id)
                    }
                  >
                    –
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: rows }).map((_, i) => {
              const a = data.smallProducts[i];
              const b = data.dispensers[i];
              const c = data.bigProducts[i];

              const rowKey =
                [a?.id ?? "", b?.id ?? "", c?.id ?? ""]
                  .filter(Boolean)
                  .join("|") || `row-${i}`;

              return (
                <tr key={rowKey}>
                  {a ? (
                    <>
                      <td className="label">
                        <NameCell
                          item={a}
                          onRename={
                            a.isCustom
                              ? (v) =>
                                  renameRow(
                                    "smallProducts",
                                    a.id,
                                    v
                                  )
                              : undefined
                          }
                          onRemove={
                            a.isCustom
                              ? () =>
                                  removeRow(
                                    "smallProducts",
                                    a.id
                                  )
                              : undefined
                          }
                        />
                      </td>
                      <td>
                        <DollarCell name={`smallProducts_${a.id}_amount`} />
                      </td>
                      {extraCols.smallProducts.map((col) => (
                        <td key={col.id}>
                          <PlainCell name={`smallProducts_${a.id}_${col.id}`} />
                        </td>
                      ))}
                    </>
                  ) : (
                    <>
                      <td className="label"></td>
                      <td>
                        <PlainCell name={`smallProducts_empty_${i}_amount`} />
                      </td>
                      {extraCols.smallProducts.map((col) => (
                        <td key={col.id}>
                          <PlainCell name={`smallProducts_empty_${i}_${col.id}`} />
                        </td>
                      ))}
                    </>
                  )}

                  {b ? (
                    <>
                      <td className="label">
                        <NameCell
                          item={b}
                          onRename={
                            b.isCustom
                              ? (v) =>
                                  renameRow(
                                    "dispensers",
                                    b.id,
                                    v
                                  )
                              : undefined
                          }
                          onRemove={
                            b.isCustom
                              ? () =>
                                  removeRow(
                                    "dispensers",
                                    b.id
                                  )
                              : undefined
                          }
                        />
                      </td>
                      <td className="center">
                        <PlainCell name={`dispensers_${b.id}_qty`} />
                      </td>
                      <td>
                        <DollarCell name={`dispensers_${b.id}_warranty`} />
                      </td>
                      <td>
                        <DollarCell name={`dispensers_${b.id}_replacement`} />
                      </td>
                      {extraCols.dispensers.map((col) => (
                        <td key={col.id}>
                          <PlainCell name={`dispensers_${b.id}_${col.id}`} />
                        </td>
                      ))}
                    </>
                  ) : (
                    <>
                      <td className="label" />
                      <td className="center">
                        <PlainCell name={`dispensers_empty_${i}_qty`} />
                      </td>
                      <td>
                        <PlainCell name={`dispensers_empty_${i}_warranty`} />
                      </td>
                      <td>
                        <PlainCell name={`dispensers_empty_${i}_replacement`} />
                      </td>
                      {extraCols.dispensers.map((col) => (
                        <td key={col.id}>
                          <PlainCell name={`dispensers_empty_${i}_${col.id}`} />
                        </td>
                      ))}
                    </>
                  )}

                  {c ? (
                    <>
                      <td className="label">
                        <NameCell
                          item={c}
                          onRename={
                            c.isCustom
                              ? (v) =>
                                  renameRow(
                                    "bigProducts",
                                    c.id,
                                    v
                                  )
                              : undefined
                          }
                          onRemove={
                            c.isCustom
                              ? () =>
                                  removeRow(
                                    "bigProducts",
                                    c.id
                                  )
                              : undefined
                          }
                        />
                      </td>
                      <td className="center">
                        <PlainCell name={`bigProducts_${c.id}_qty`} />
                      </td>
                      <td>
                        <DollarCell name={`bigProducts_${c.id}_amount`} />
                      </td>
                      <td className="center">
                        <PlainCell name={`bigProducts_${c.id}_frequency`} />
                      </td>
                      {extraCols.bigProducts.map((col) => (
                        <td key={col.id}>
                          <PlainCell name={`bigProducts_${c.id}_${col.id}`} />
                        </td>
                      ))}
                    </>
                  ) : (
                    <>
                      <td className="label" />
                      <td className="center">
                        <PlainCell name={`bigProducts_empty_${i}_qty`} />
                      </td>
                      <td>
                        <PlainCell name={`bigProducts_empty_${i}_amount`} />
                      </td>
                      <td className="center">
                        <PlainCell name={`bigProducts_empty_${i}_frequency`} />
                      </td>
                      {extraCols.bigProducts.map((col) => (
                        <td key={col.id}>
                          <PlainCell name={`bigProducts_empty_${i}_${col.id}`} />
                        </td>
                      ))}
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );

  const GroupWrap = ({
    children,
    onAddRow,
    onAddCol,
  }: {
    children: React.ReactNode;
    onAddRow: () => void;
    onAddCol: () => void;
  }) => (
    <div className="gwrap">
      <div className="gactions">
        <button className="prod__add" onClick={onAddRow} type="button">
          + Row
        </button>
        <button className="prod__add" onClick={onAddCol} type="button">
          + Col
        </button>
      </div>
      {children}
    </div>
  );

  const GroupedTable = ({
    title,
    bucket,
    extraKey,
    renderAmountCells,
  }: {
    title: string;
    bucket: keyof typeof data;
    extraKey: keyof typeof extraCols;
    renderAmountCells: (hasName: boolean, rowId: string) => React.ReactNode;
  }) => (
    <GroupWrap
      onAddRow={() => addRow(bucket)}
      onAddCol={() => addCol(extraKey)}
    >
      <table className="gtable">
        <thead>
          <tr>
            <th className="h h-blue">{title}</th>
            {bucket === "smallProducts" ? (
              <th className="h h-blue center">Amount Per Unit</th>
            ) : bucket === "dispensers" ? (
              <>
                <th className="h h-blue center">Qty</th>
                <th className="h h-blue center">Warranty Rate</th>
                <th className="h h-blue center">
                  Replacement Rate/Install
                </th>
              </>
            ) : (
              <>
                <th className="h h-blue center">Qty</th>
                <th className="h h-blue center">Amount</th>
                <th className="h h-blue center">
                  Frequency of Service
                </th>
              </>
            )}
            {extraCols[extraKey].map((col) => (
              <th className="h h-blue center th-edit" key={col.id}>
                <input
                  className="th-edit-input"
                  value={col.label}
                  onChange={(e) =>
                    changeColLabel(extraKey, col.id, e.target.value)
                  }
                  onFocus={() => setEditingColId(col.id)}
                  autoFocus={editingColId === col.id}
                />
                <button
                  className="th-remove"
                  title="Remove column"
                  type="button"
                  onClick={() => removeCol(extraKey, col.id)}
                >
                  –
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data[bucket].map((row) => {
            const hasName = !!row.name;
            return (
              <tr key={row.id}>
                <td className="label">
                  <NameCell
                    item={row}
                    onRename={
                      row.isCustom
                        ? (v) => renameRow(bucket, row.id, v)
                        : undefined
                    }
                    onRemove={
                      row.isCustom
                        ? () => removeRow(bucket, row.id)
                        : undefined
                    }
                  />
                </td>
                {renderAmountCells(hasName, row.id)}
                {extraCols[extraKey].map((col) => (
                  <td key={col.id}>
                    <PlainCell name={`${bucket}_${row.id}_${col.id}`} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </GroupWrap>
  );

  const GroupedTables = () => (
    <>
      <div className="prod__ribbon">
        <div className="prod__title">PRODUCTS</div>
      </div>

      <GroupedTable
        title="Products"
        bucket="smallProducts"
        extraKey="smallProducts"
        renderAmountCells={(hasName, rowId) => (
          <td>{hasName ? <DollarCell name={`smallProducts_${rowId}_amount`} /> : <PlainCell name={`smallProducts_${rowId}_amount`} />}</td>
        )}
      />

      <GroupedTable
        title="Dispensers"
        bucket="dispensers"
        extraKey="dispensers"
        renderAmountCells={(hasName, rowId) => (
          <>
            <td className="center">
              <PlainCell name={`dispensers_${rowId}_qty`} />
            </td>
            <td>{hasName ? <DollarCell name={`dispensers_${rowId}_warranty`} /> : <PlainCell name={`dispensers_${rowId}_warranty`} />}</td>
            <td>{hasName ? <DollarCell name={`dispensers_${rowId}_replacement`} /> : <PlainCell name={`dispensers_${rowId}_replacement`} />}</td>
          </>
        )}
      />

      <GroupedTable
        title="Products"
        bucket="bigProducts"
        extraKey="bigProducts"
        renderAmountCells={(hasName, rowId) => (
          <>
            <td className="center">
              <PlainCell name={`bigProducts_${rowId}_qty`} />
            </td>
            <td>{hasName ? <DollarCell name={`bigProducts_${rowId}_amount`} /> : <PlainCell name={`bigProducts_${rowId}_amount`} />}</td>
            <td className="center">
              <PlainCell name={`bigProducts_${rowId}_frequency`} />
            </td>
          </>
        )}
      />
    </>
  );

  return (
    <section className="prod">
      {isDesktop ? <DesktopTable /> : <GroupedTables />}
    </section>
  );
}
