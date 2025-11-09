import React, { useEffect, useMemo, useState } from "react";
import "./ProductsSection.css";

const dummyResponse = {
  smallProducts: [
    "EM Proprietary JRT Tissue",
    "EM Proprietary Hardwood Natural",
    "EM Proprietary Hardwood White",
    "Center Pull Towels",
    "Multi-Fold Natural",
    "Multi-Fold White",
    "",
    "",
    "Seat Cover Sleeve",
    "",
    "Grit Soap",
    "",
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

const toItems = (arr: string[]): RowItem[] =>
  arr.map((name, idx) => ({ id: `base_${idx}`, name, isCustom: false }));

function DollarCell() {
  return (
    <div className="dcell">
      <span className="dollarColor">$</span>
      <input className="in" />
    </div>
  );
}

function NameCell({
  item,
  onChange,
  onRemove,
}: {
  item: RowItem;
  onChange?: (v: string) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="namecell">
      {item.isCustom ? (
        <>
          <input
            className="name-edit"
            value={item.name}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder="Enter name…"
          />
          <button className="row-remove" title="Remove row" onClick={onRemove} type="button">
            –
          </button>
        </>
      ) : (
        <span>{item.name}</span>
      )}
    </div>
  );
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width:1025px)").matches
  );
  useEffect(() => {
    const m = window.matchMedia("(min-width:1025px)");
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    m.addEventListener?.("change", h);
    return () => m.removeEventListener?.("change", h);
  }, []);
  return isDesktop;
}

export default function ProductsSection() {
  const [data, setData] = useState(() => ({
    smallProducts: toItems(dummyResponse.smallProducts),
    dispensers: toItems(dummyResponse.dispensers),
    bigProducts: toItems(dummyResponse.bigProducts),
  }));

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
    name: "",
    isCustom: true,
  });

  const addRowAll = () =>
    setData((d) => ({
      smallProducts: [...d.smallProducts, mkRow()],
      dispensers: [...d.dispensers, mkRow()],
      bigProducts: [...d.bigProducts, mkRow()],
    }));

  const addRow = (bucket: keyof typeof data) =>
    setData((d) => ({ ...d, [bucket]: [...d[bucket], mkRow()] }));

  const changeName = (bucket: keyof typeof data, id: string, next: string) =>
    setData((d) => ({
      ...d,
      [bucket]: d[bucket].map((it) => (it.id === id ? { ...it, name: next } : it)),
    }));

  const removeRow = (bucket: keyof typeof data, id: string) =>
    setData((d) => ({ ...d, [bucket]: d[bucket].filter((it) => it.id !== id) }));

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

  const changeColLabel = (bucket: keyof typeof extraCols, id: string, next: string) =>
    setExtraCols((c) => ({
      ...c,
      [bucket]: c[bucket].map((col) => (col.id === id ? { ...col, label: next } : col)),
    }));

  const removeCol = (bucket: keyof typeof extraCols, id: string) =>
    setExtraCols((c) => ({ ...c, [bucket]: c[bucket].filter((col) => col.id !== id) }));

  const DesktopTable = () => (
    <>
      <div className="prod__ribbon">
        <div className="prod__title prod__title--hasActions">
          PRODUCTS
          <div className="prod__title-actions">
            <button className="prod__add" onClick={addRowAll} type="button">+ Row</button>
            <button className="prod__add" onClick={addColAll} type="button">+ Column</button>
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
                    onChange={(e) => changeColLabel("smallProducts", col.id, e.target.value)}
                    onFocus={() => setEditingColId(col.id)}
                    autoFocus={editingColId === col.id}
                  />
                  <button
                    className="th-remove"
                    title="Remove column"
                    type="button"
                    onClick={() => removeCol("smallProducts", col.id)}
                  >
                    –
                  </button>
                </th>
              ))}

              <th className="h h-blue">Dispensers</th>
              <th className="h h-blue center">Qty</th>
              <th className="h h-blue center">Warranty Rate</th>
              <th className="h h-blue center">Replacement Rate/Install</th>
              {extraCols.dispensers.map((col) => (
                <th className="h h-blue center th-edit" key={col.id}>
                  <input
                    className="th-edit-input"
                    value={col.label}
                    onChange={(e) => changeColLabel("dispensers", col.id, e.target.value)}
                    onFocus={() => setEditingColId(col.id)}
                    autoFocus={editingColId === col.id}
                  />
                  <button
                    className="th-remove"
                    title="Remove column"
                    type="button"
                    onClick={() => removeCol("dispensers", col.id)}
                  >
                    –
                  </button>
                </th>
              ))}

              <th className="h h-blue">Products</th>
              <th className="h h-blue center">Qty</th>
              <th className="h h-blue center">Amount</th>
              <th className="h h-blue center">Frequency of Service</th>
              {extraCols.bigProducts.map((col) => (
                <th className="h h-blue center th-edit" key={col.id}>
                  <input
                    className="th-edit-input"
                    value={col.label}
                    onChange={(e) => changeColLabel("bigProducts", col.id, e.target.value)}
                    onFocus={() => setEditingColId(col.id)}
                    autoFocus={editingColId === col.id}
                  />
                  <button
                    className="th-remove"
                    title="Remove column"
                    type="button"
                    onClick={() => removeCol("bigProducts", col.id)}
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

              return (
                <tr key={i}>
                  <td className="label">
                    {a && (
                      <NameCell
                        item={a}
                        onChange={(v) => changeName("smallProducts", a.id, v)}
                        onRemove={a.isCustom ? () => removeRow("smallProducts", a.id) : undefined}
                      />
                    )}
                  </td>
                  <td><DollarCell /></td>
                  {extraCols.smallProducts.map((col) => (
                    <td key={col.id}><DollarCell /></td>
                  ))}

                  <td className="label">
                    {b && (
                      <NameCell
                        item={b}
                        onChange={(v) => changeName("dispensers", b.id, v)}
                        onRemove={b.isCustom ? () => removeRow("dispensers", b.id) : undefined}
                      />
                    )}
                  </td>
                  <td className="center"><input className="in" /></td>
                  <td><DollarCell /></td>
                  <td><DollarCell /></td>
                  {extraCols.dispensers.map((col) => (
                    <td key={col.id}><DollarCell /></td>
                  ))}

                  <td className="label">
                    {c && (
                      <NameCell
                        item={c}
                        onChange={(v) => changeName("bigProducts", c.id, v)}
                        onRemove={c.isCustom ? () => removeRow("bigProducts", c.id) : undefined}
                      />
                    )}
                  </td>
                  <td className="center"><input className="in" /></td>
                  <td><DollarCell /></td>
                  <td className="center"><input className="in" /></td>
                  {extraCols.bigProducts.map((col) => (
                    <td key={col.id}><DollarCell /></td>
                  ))}
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
        <button className="prod__add" onClick={onAddRow} type="button">+ Row</button>
        <button className="prod__add" onClick={onAddCol} type="button">+ Col</button>
      </div>
      {children}
    </div>
  );

  const GroupedTables = () => (
    <>
      <div className="prod__ribbon">
        <div className="prod__title">PRODUCTS</div>
      </div>

      <GroupWrap
        onAddRow={() => addRow("smallProducts")}
        onAddCol={() => addCol("smallProducts")}
      >
        <table className="gtable">
          <thead>
            <tr>
              <th className="h h-blue">Products</th>
              <th className="h h-blue center">Amount Per Unit</th>
              {extraCols.smallProducts.map((col) => (
                <th className="h h-blue center th-edit" key={col.id}>
                  <input
                    className="th-edit-input"
                    value={col.label}
                    onChange={(e) => changeColLabel("smallProducts", col.id, e.target.value)}
                    onFocus={() => setEditingColId(col.id)}
                    autoFocus={editingColId === col.id}
                  />
                  <button
                    className="th-remove"
                    title="Remove column"
                    type="button"
                    onClick={() => removeCol("smallProducts", col.id)}
                  >
                    –
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.smallProducts.map((a) => (
              <tr key={a.id}>
                <td className="label">
                  <NameCell
                    item={a}
                    onChange={a.isCustom ? (v) => changeName("smallProducts", a.id, v) : undefined}
                    onRemove={a.isCustom ? () => removeRow("smallProducts", a.id) : undefined}
                  />
                </td>
                <td><DollarCell /></td>
                {extraCols.smallProducts.map((col) => (
                  <td key={col.id}><DollarCell /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </GroupWrap>

      <GroupWrap
        onAddRow={() => addRow("dispensers")}
        onAddCol={() => addCol("dispensers")}
      >
        <table className="gtable">
          <thead>
            <tr>
              <th className="h h-blue">Dispensers</th>
              <th className="h h-blue center">Qty</th>
              <th className="h h-blue center">Warranty Rate</th>
              <th className="h h-blue center">Replacement Rate/Install</th>
              {extraCols.dispensers.map((col) => (
                <th className="h h-blue center th-edit" key={col.id}>
                  <input
                    className="th-edit-input"
                    value={col.label}
                    onChange={(e) => changeColLabel("dispensers", col.id, e.target.value)}
                    onFocus={() => setEditingColId(col.id)}
                    autoFocus={editingColId === col.id}
                  />
                  <button
                    className="th-remove"
                    title="Remove column"
                    type="button"
                    onClick={() => removeCol("dispensers", col.id)}
                  >
                    –
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.dispensers.map((b) => (
              <tr key={b.id}>
                <td className="label">
                  <NameCell
                    item={b}
                    onChange={b.isCustom ? (v) => changeName("dispensers", b.id, v) : undefined}
                    onRemove={b.isCustom ? () => removeRow("dispensers", b.id) : undefined}
                  />
                </td>
                <td className="center"><input className="in" /></td>
                <td><DollarCell /></td>
                <td><DollarCell /></td>
                {extraCols.dispensers.map((col) => (
                  <td key={col.id}><DollarCell /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </GroupWrap>

      <GroupWrap
        onAddRow={() => addRow("bigProducts")}
        onAddCol={() => addCol("bigProducts")}
      >
        <table className="gtable">
          <thead>
            <tr>
              <th className="h h-blue">Products</th>
              <th className="h h-blue center">Qty</th>
              <th className="h h-blue center">Amount</th>
              <th className="h h-blue center">Frequency of Service</th>
              {extraCols.bigProducts.map((col) => (
                <th className="h h-blue center th-edit" key={col.id}>
                  <input
                    className="th-edit-input"
                    value={col.label}
                    onChange={(e) => changeColLabel("bigProducts", col.id, e.target.value)}
                    onFocus={() => setEditingColId(col.id)}
                    autoFocus={editingColId === col.id}
                  />
                  <button
                    className="th-remove"
                    title="Remove column"
                    type="button"
                    onClick={() => removeCol("bigProducts", col.id)}
                  >
                    –
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.bigProducts.map((c) => (
              <tr key={c.id}>
                <td className="label">
                  <NameCell
                    item={c}
                    onChange={c.isCustom ? (v) => changeName("bigProducts", c.id, v) : undefined}
                    onRemove={c.isCustom ? () => removeRow("bigProducts", c.id) : undefined}
                  />
                </td>
                <td className="center"><input className="in" /></td>
                <td><DollarCell /></td>
                <td className="center"><input className="in" /></td>
                {extraCols.bigProducts.map((col) => (
                  <td key={col.id}><DollarCell /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </GroupWrap>
    </>
  );

  return (
    <section className="prod">{isDesktop ? <DesktopTable /> : <GroupedTables />}</section>
  );
}
