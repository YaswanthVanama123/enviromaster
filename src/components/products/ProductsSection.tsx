import React, { useEffect, useMemo, useState, useRef } from "react";
import "./ProductsSection.css";
import { envProductCatalog } from "./productsConfig";
import type { ColumnKey, EnvProduct, ProductRow } from "./productsTypes";

// ---------------------------
// Responsive breakpoint hook
// ---------------------------

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width:1025px)").matches
  );

  useEffect(() => {
    const m = window.matchMedia("(min-width:1025px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    m.addEventListener?.("change", handler);
    return () => m.removeEventListener?.("change", handler);
  }, []);

  return isDesktop;
}

// ---------------------------
// Catalog helpers
// ---------------------------

const ALL_PRODUCTS: EnvProduct[] = envProductCatalog.families.flatMap(
  (family) => family.products
);

// Which family groups live in which column
const COLUMN_FAMILY_FILTER: Record<ColumnKey, (p: EnvProduct) => boolean> = {
  // LEFT band: paper products
  smallProducts: (p) => p.familyKey === "paper",

  // MIDDLE band: dispensers
  dispensers: (p) => p.familyKey === "dispensers",

  // RIGHT band: everything else (chemicals, extras, drains, refresh, etc.)
  bigProducts: (p) => p.familyKey !== "paper" && p.familyKey !== "dispensers",
};

function getProductsForColumn(column: ColumnKey): EnvProduct[] {
  const filter = COLUMN_FAMILY_FILTER[column];
  return ALL_PRODUCTS.filter(filter);
}

function getDefaultRows(column: ColumnKey): ProductRow[] {
  return getProductsForColumn(column)
    .filter((p) => p.displayByAdmin)
    .map((p) => ({
      id: `${column}_${p.key}`,
      productKey: p.key,
      isDefault: true,
    }));
}

function makeRowId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function findProductByKey(key: string | null): EnvProduct | undefined {
  if (!key) return undefined;
  return ALL_PRODUCTS.find((p) => p.key === key);
}

// For dropdown: products for this column that are NOT already used by other rows
function getAvailableProductsForColumn(
  column: ColumnKey,
  usedKeys: Set<string>
): EnvProduct[] {
  return getProductsForColumn(column).filter(
    (p) => !usedKeys.has(p.key)
  );
}

// ---------------------------
// Small re-usable cell pieces
// ---------------------------

function DollarCell({ value }: { value?: number | null }) {
  return (
    <div className="dcell">
      <span className="dollarColor">$</span>
      <input className="in" defaultValue={value ?? ""} />
    </div>
  );
}

function PlainCell({ value }: { value?: string | number | null }) {
  return <input className="in" defaultValue={value ?? ""} />;
}

// ---------------------------
// Name cell with wrapped text + custom dropdown
// ---------------------------

type NameCellProps = {
  product: EnvProduct | undefined;
  options: EnvProduct[]; // remaining products for this column (+ current one if set)
  onChangeProduct: (productKey: string) => void;
  onRemove?: () => void;
};

const NameCell = React.memo(function NameCell({
  product,
  options,
  onChangeProduct,
  onRemove,
}: NameCellProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const filteredOptions = useMemo(
    () =>
      options.filter((opt) =>
        opt.name.toLowerCase().includes(query.toLowerCase())
      ),
    [options, query]
  );

  // Close dropdown when click outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = (key: string) => {
    onChangeProduct(key);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="namecell" ref={wrapperRef}>
      {/* Label inside the table cell (text wraps to 2nd line) */}
      <button
        type="button"
        className="namecell-display"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="namecell-text">
          {product?.name ?? "Select product..."}
        </span>
        <span className="namecell-caret">▾</span>
      </button>

      {onRemove && (
        <button
          className="row-remove"
          title="Remove row"
          type="button"
          onClick={onRemove}
        >
          –
        </button>
      )}

      {/* Dropdown panel below the cell */}
      {open && (
        <div className="namecell-dropdown">
          <input
            className="namecell-search"
            placeholder="Search product..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="namecell-options">
            {filteredOptions.length === 0 ? (
              <div className="namecell-option namecell-option--empty">
                No products
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className="namecell-option"
                  onClick={() => handleSelect(opt.key)}
                >
                  {opt.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// ---------------------------
// Main component
// ---------------------------

export default function ProductsSection() {
  const isDesktop = useIsDesktop();

  const [data, setData] = useState<{
    smallProducts: ProductRow[];
    dispensers: ProductRow[];
    bigProducts: ProductRow[];
  }>(() => ({
    smallProducts: getDefaultRows("smallProducts"),
    dispensers: getDefaultRows("dispensers"),
    bigProducts: getDefaultRows("bigProducts"),
  }));

  const [extraCols, setExtraCols] = useState<{
    smallProducts: { id: string; label: string }[];
    dispensers: { id: string; label: string }[];
    bigProducts: { id: string; label: string }[];
  }>({
    smallProducts: [],
    dispensers: [],
    bigProducts: [],
  });

  const [editingColId, setEditingColId] = useState<string | null>(null);

  const productMap = useMemo(() => {
    const map = new Map<string, EnvProduct>();
    ALL_PRODUCTS.forEach((p) => map.set(p.key, p));
    return map;
  }, []);

  const getProduct = (row: ProductRow | undefined) =>
    row && row.productKey ? productMap.get(row.productKey) : undefined;

  // Utility to update product key for a row
  const updateRowProductKey = (
    bucket: ColumnKey,
    rowId: string,
    productKey: string
  ) =>
    setData((prev) => ({
      ...prev,
      [bucket]: prev[bucket].map((r) =>
        r.id === rowId ? { ...r, productKey } : r
      ),
    }));

  // ---------------------------
  // Row operations
  // ---------------------------

  // + Row (all three bands at once)
  const addRowAll = () => {
    setData((prev) => ({
      smallProducts: [
        ...prev.smallProducts,
        { id: makeRowId("smallProducts"), productKey: null, isDefault: false },
      ],
      dispensers: [
        ...prev.dispensers,
        { id: makeRowId("dispensers"), productKey: null, isDefault: false },
      ],
      bigProducts: [
        ...prev.bigProducts,
        { id: makeRowId("bigProducts"), productKey: null, isDefault: false },
      ],
    }));
  };

  // + Row (single band)
  const addRow = (bucket: ColumnKey) =>
    setData((prev) => ({
      ...prev,
      [bucket]: [
        ...prev[bucket],
        { id: makeRowId(bucket), productKey: null, isDefault: false },
      ],
    }));

  const removeRow = (bucket: ColumnKey, id: string) =>
    setData((prev) => ({
      ...prev,
      [bucket]: prev[bucket].filter((r) => r.id !== id),
    }));

  // ---------------------------
  // Column operations
  // ---------------------------

  const mkCol = (label = "Custom") => ({
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    label,
  });

  const addColAll = () =>
    setExtraCols((c) => ({
      smallProducts: [...c.smallProducts, mkCol()],
      dispensers: [...c.dispensers, mkCol()],
      bigProducts: [...c.bigProducts, mkCol()],
    }));

  const addCol = (bucket: ColumnKey) =>
    setExtraCols((c) => ({
      ...c,
      [bucket]: [...c[bucket], mkCol()],
    }));

  const changeColLabel = (
    bucket: ColumnKey,
    id: string,
    next: string
  ) =>
    setExtraCols((c) => ({
      ...c,
      [bucket]: c[bucket].map((col) =>
        col.id === id ? { ...col, label: next } : col
      ),
    }));

  const removeCol = (bucket: ColumnKey, id: string) =>
    setExtraCols((c) => ({
      ...c,
      [bucket]: c[bucket].filter((col) => col.id !== id),
    }));

  // ---------------------------
  // Row count for desktop table
  // ---------------------------

  const rowsCount = useMemo(
    () =>
      Math.max(
        data.smallProducts.length,
        data.dispensers.length,
        data.bigProducts.length
      ),
    [data]
  );

  // Build dropdown options for a particular row
  const getRowOptions = (bucket: ColumnKey, rowId: string): EnvProduct[] => {
    const usedKeys = new Set(
      data[bucket]
        .filter((r) => r.id !== rowId && r.productKey)
        .map((r) => r.productKey as string)
    );

    const base = getAvailableProductsForColumn(bucket, usedKeys);

    // If current row already has a product, make sure it is present in options
    const currentRow = data[bucket].find((r) => r.id === rowId);
    if (currentRow?.productKey) {
      const current = findProductByKey(currentRow.productKey);
      if (current && !base.find((p) => p.key === current.key)) {
        return [current, ...base];
      }
    }

    return base;
  };

  // ---------------------------
  // Desktop table
  // ---------------------------

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
              {/* LEFT band – paper products */}
              <th className="h h-blue">Products</th>
              <th className="h h-blue center">Amount Per Unit</th>
              {extraCols.smallProducts.map((col) => (
                <th
                  className="h h-blue center th-edit"
                  key={col.id}
                >
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
                    onClick={() => removeCol("smallProducts", col.id)}
                  >
                    –
                  </button>
                </th>
              ))}

              {/* MIDDLE band – dispensers */}
              <th className="h h-blue">Dispensers</th>
              <th className="h h-blue center">Qty</th>
              <th className="h h-blue center">Warranty Rate</th>
              <th className="h h-blue center">
                Replacement Rate/Install
              </th>
              {extraCols.dispensers.map((col) => (
                <th
                  className="h h-blue center th-edit"
                  key={col.id}
                >
                  <input
                    className="th-edit-input"
                    value={col.label}
                    onChange={(e) =>
                      changeColLabel("dispensers", col.id, e.target.value)
                    }
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

              {/* RIGHT band – other products */}
              <th className="h h-blue">Products</th>
              <th className="h h-blue center">Qty</th>
              <th className="h h-blue center">Amount</th>
              <th className="h h-blue center">
                Frequency of Service
              </th>
              {extraCols.bigProducts.map((col) => (
                <th
                  className="h h-blue center th-edit"
                  key={col.id}
                >
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
                    onClick={() => removeCol("bigProducts", col.id)}
                  >
                    –
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: rowsCount }).map((_, i) => {
              const rowSmall = data.smallProducts[i];
              const rowDisp = data.dispensers[i];
              const rowBig = data.bigProducts[i];

              const pSmall = getProduct(rowSmall);
              const pDisp = getProduct(rowDisp);
              const pBig = getProduct(rowBig);

              const rowKey =
                (rowSmall?.id ?? "") +
                  "|" +
                  (rowDisp?.id ?? "") +
                  "|" +
                  (rowBig?.id ?? "") || `row-${i}`;

              return (
                <tr key={rowKey}>
                  {/* LEFT band */}
                  {rowSmall ? (
                    <>
                      <td className="label">
                        <NameCell
                          product={pSmall}
                          options={getRowOptions("smallProducts", rowSmall.id)}
                          onChangeProduct={(key) =>
                            updateRowProductKey("smallProducts", rowSmall.id, key)
                          }
                          onRemove={() =>
                            removeRow("smallProducts", rowSmall.id)
                          }
                        />
                      </td>
                      <td>
                        <DollarCell value={pSmall?.basePrice?.amount} />
                      </td>
                      {extraCols.smallProducts.map((col) => (
                        <td key={col.id}>
                          <DollarCell />
                        </td>
                      ))}
                    </>
                  ) : (
                    <>
                      <td className="label" />
                      <td>
                        <PlainCell />
                      </td>
                      {extraCols.smallProducts.map((col) => (
                        <td key={col.id}>
                          <PlainCell />
                        </td>
                      ))}
                    </>
                  )}

                  {/* MIDDLE band */}
                  {rowDisp ? (
                    <>
                      <td className="label">
                        <NameCell
                          product={pDisp}
                          options={getRowOptions("dispensers", rowDisp.id)}
                          onChangeProduct={(key) =>
                            updateRowProductKey("dispensers", rowDisp.id, key)
                          }
                          onRemove={() =>
                            removeRow("dispensers", rowDisp.id)
                          }
                        />
                      </td>
                      <td className="center">
                        <PlainCell />
                      </td>
                      <td>
                        <DollarCell
                          value={pDisp?.warrantyPricePerUnit?.amount}
                        />
                      </td>
                      <td>
                        <DollarCell value={pDisp?.basePrice?.amount} />
                      </td>
                      {extraCols.dispensers.map((col) => (
                        <td key={col.id}>
                          <DollarCell />
                        </td>
                      ))}
                    </>
                  ) : (
                    <>
                      <td className="label" />
                      <td className="center">
                        <PlainCell />
                      </td>
                      <td>
                        <PlainCell />
                      </td>
                      <td>
                        <PlainCell />
                      </td>
                      {extraCols.dispensers.map((col) => (
                        <td key={col.id}>
                          <PlainCell />
                        </td>
                      ))}
                    </>
                  )}

                  {/* RIGHT band */}
                  {rowBig ? (
                    <>
                      <td className="label">
                        <NameCell
                          product={pBig}
                          options={getRowOptions("bigProducts", rowBig.id)}
                          onChangeProduct={(key) =>
                            updateRowProductKey("bigProducts", rowBig.id, key)
                          }
                          onRemove={() => removeRow("bigProducts", rowBig.id)}
                        />
                      </td>
                      <td className="center">
                        <PlainCell />
                      </td>
                      <td>
                        <DollarCell value={pBig?.basePrice?.amount} />
                      </td>
                      <td className="center">
                        <PlainCell />
                      </td>
                      {extraCols.bigProducts.map((col) => (
                        <td key={col.id}>
                          <DollarCell />
                        </td>
                      ))}
                    </>
                  ) : (
                    <>
                      <td className="label" />
                      <td className="center">
                        <PlainCell />
                      </td>
                      <td>
                        <PlainCell />
                      </td>
                      <td className="center">
                        <PlainCell />
                      </td>
                      {extraCols.bigProducts.map((col) => (
                        <td key={col.id}>
                          <PlainCell />
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

  // ---------------------------
  // Mobile / grouped tables
  // ---------------------------

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
    renderAmountCells,
  }: {
    title: string;
    bucket: ColumnKey;
    renderAmountCells: (product: EnvProduct | undefined) => React.ReactNode;
  }) => {
    const extraKey = bucket;
    return (
      <GroupWrap
        onAddRow={() => addRow(bucket)}
        onAddCol={() => addCol(bucket)}
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
              const product = getProduct(row);
              const options = getRowOptions(bucket, row.id);

              return (
                <tr key={row.id}>
                  <td className="label">
                    <NameCell
                      product={product}
                      options={options}
                      onChangeProduct={(key) =>
                        updateRowProductKey(bucket, row.id, key)
                      }
                      onRemove={() => removeRow(bucket, row.id)}
                    />
                  </td>
                  {renderAmountCells(product)}
                  {extraCols[extraKey].map((col) => (
                    <td key={col.id}>
                      <DollarCell />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </GroupWrap>
    );
  };

  const GroupedTables = () => (
    <>
      <div className="prod__ribbon">
        <div className="prod__title">PRODUCTS</div>
      </div>

      <GroupedTable
        title="Products"
        bucket="smallProducts"
        renderAmountCells={(product) => (
          <td>
            <DollarCell value={product?.basePrice?.amount ?? null} />
          </td>
        )}
      />

      <GroupedTable
        title="Dispensers"
        bucket="dispensers"
        renderAmountCells={(product) => (
          <>
            <td className="center">
              <PlainCell />
            </td>
            <td>
              <DollarCell
                value={product?.warrantyPricePerUnit?.amount ?? null}
              />
            </td>
            <td>
              <DollarCell value={product?.basePrice?.amount ?? null} />
            </td>
          </>
        )}
      />

      <GroupedTable
        title="Products"
        bucket="bigProducts"
        renderAmountCells={(product) => (
          <>
            <td className="center">
              <PlainCell />
            </td>
            <td>
              <DollarCell value={product?.basePrice?.amount ?? null} />
            </td>
            <td className="center">
              <PlainCell />
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
