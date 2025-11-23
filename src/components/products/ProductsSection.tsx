// src/features/products/ProductsSection.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ProductsSection.css";

import { envProductCatalog } from "./productsConfig";
import { productsTableLayout } from "./productsTableConfig";
import { useProductsTable } from "./useProductsTable";
import type {
  ProductTableState,
  ProductRowItem as RowItem,
  ProductColumnItem as ColItem,
  ProductTableSectionKey,
} from "./productsTableTypes";

function DollarCell({ defaultValue }: { defaultValue?: number | string }) {
  return (
    <div className="dcell">
      <span className="dollarColor">$</span>
      <input className="in" defaultValue={defaultValue ?? ""} />
    </div>
  );
}

function PlainCell({ defaultValue }: { defaultValue?: number | string }) {
  return <input className="in" defaultValue={defaultValue ?? ""} />;
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
    if (onRename && next && next !== item.name) onRename(next);
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
          {onRemove && (
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
            onClick={() => item.isCustom && onRename && setIsEditing(true)}
            title={item.isCustom ? "Click to edit" : undefined}
            role={item.isCustom ? "button" : undefined}
          >
            {item.name}
          </span>
          {onRemove && (
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

/** Find a product in the catalog by key */
function findProduct(productKey?: string) {
  if (!productKey) return undefined;
  for (const family of envProductCatalog.families) {
    const found = family.products.find((p) => p.key === productKey);
    if (found) return found;
  }
  return undefined;
}

type BucketKey = ProductTableSectionKey;

interface ProductOption {
  id: string;
  productKey: string;
  label: string;
}

/** Searchable dropdown cell used when a new row is added. */
function ProductSelectCell({
  options,
  onSelect,
  onRemove,
}: {
  options: ProductOption[];
  onSelect: (option: ProductOption) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => o.label.toLowerCase().includes(t));
  }, [options, term]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="product-select" ref={containerRef}>
      <div className="product-select-top">
        <input
          className="product-select-input"
          placeholder="Search product…"
          value={term}
          onFocus={() => setOpen(true)}
          onChange={(e) => setTerm(e.target.value)}
        />
        <button
          className="row-remove"
          title="Remove row"
          type="button"
          onClick={onRemove}
        >
          –
        </button>
      </div>
      {open && (
        <div className="product-select-list">
          {filtered.length === 0 ? (
            <div className="product-select-empty">No matches</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="product-select-option"
                onClick={() => {
                  onSelect(opt);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function ProductsSection() {
  const baseTable = useProductsTable();
  const [data, setData] = useState<ProductTableState>(baseTable);

  const [extraCols, setExtraCols] = useState<{
    smallProducts: ColItem[];
    dispensers: ColItem[];
    bigProducts: ColItem[];
  }>({
    smallProducts: [],
    dispensers: [],
    bigProducts: [],
  });

  const [editingColId, setEditingColId] = useState<string | null>(null);

  const isDesktop = useIsDesktop();

  // ---------------------------------------------------------------------------
  // Build dropdown options per column:
  // Only products from that bucket which:
  //  - have a productKey
  //  - have a price (basePrice or warranty)
  //  - are NOT already used in that bucket
  // ---------------------------------------------------------------------------
  const productOptions: Record<BucketKey, ProductOption[]> = useMemo(() => {
    const buildOptions = (bucket: BucketKey): ProductOption[] => {
      const usedKeys = new Set(
        data[bucket].map((r) => r.productKey).filter(Boolean) as string[]
      );

      return (
        productsTableLayout[bucket]
          .filter((cfg) => cfg.productKey)
          .filter((cfg) => !usedKeys.has(cfg.productKey!))
          .map((cfg, idx) => {
            const product = findProduct(cfg.productKey);
            if (!product) return null;
            if (!product.basePrice && !product.warrantyPricePerUnit) {
              // skip unpriced products
              return null;
            }
            const label = cfg.overrideLabel ?? product.name;
            return {
              id: `${bucket}-${cfg.productKey}-${idx}`,
              productKey: cfg.productKey!,
              label,
            } as ProductOption;
          })
          .filter((o): o is ProductOption => o !== null)
      );
    };

    return {
      smallProducts: buildOptions("smallProducts"),
      dispensers: buildOptions("dispensers"),
      bigProducts: buildOptions("bigProducts"),
    };
  }, [data]);

  const rows = useMemo(
    () =>
      Math.max(
        data.smallProducts.length,
        data.dispensers.length,
        data.bigProducts.length
      ),
    [data]
  );

  // ---------------------------------------------------------------------------
  // Row helpers
  // ---------------------------------------------------------------------------

  const mkRow = (selectMode = false): RowItem => ({
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name: selectMode ? "" : "Custom",
    isCustom: true,
    isSelectMode: selectMode,
  });

  const addRowAll = () =>
    setData((d) => {
      const ra = mkRow(true);
      const rb = mkRow(true);
      const rc = mkRow(true);
      return {
        smallProducts: [...d.smallProducts, ra],
        dispensers: [...d.dispensers, rb],
        bigProducts: [...d.bigProducts, rc],
      };
    });

  const addRow = (bucket: BucketKey) =>
    setData((d) => {
      const r = mkRow(true);
      return { ...d, [bucket]: [...d[bucket], r] };
    });

  const renameRow = (bucket: BucketKey, id: string, next: string) =>
    setData((d) => ({
      ...d,
      [bucket]: d[bucket].map((it) =>
        it.id === id ? { ...it, name: next, isSelectMode: false } : it
      ),
    }));

  const removeRow = (bucket: BucketKey, id: string) =>
    setData((d) => ({
      ...d,
      [bucket]: d[bucket].filter((it) => it.id !== id),
    }));

  const setRowProduct = (
    bucket: BucketKey,
    id: string,
    productKey: string,
    label: string
  ) =>
    setData((d) => ({
      ...d,
      [bucket]: d[bucket].map((it) => {
        if (it.id !== id) return it;
        const product = findProduct(productKey);
        return {
          ...it,
          productKey,
          product,
          name: label,
          isCustom: !productKey,
          isSelectMode: false,
        };
      }),
    }));

  // ---------------------------------------------------------------------------
  // Column helpers
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderName = (bucket: BucketKey, row: RowItem) => {
    if (row.isSelectMode) {
      return (
        <ProductSelectCell
          options={productOptions[bucket]}
          onSelect={(opt) => setRowProduct(bucket, row.id, opt.productKey, opt.label)}
          onRemove={() => removeRow(bucket, row.id)}
        />
      );
    }

    return (
      <NameCell
        item={row}
        onRename={row.isCustom ? (v) => renameRow(bucket, row.id, v) : undefined}
        onRemove={() => removeRow(bucket, row.id)}
      />
    );
  };

  // ---------------------------------------------------------------------------
  // Desktop grid
  // ---------------------------------------------------------------------------

  const DesktopTable = () => (
    <>
      <div className="prod__ribbon">
        <div className="prod__title prod__title--hasActions">
          PRODUCTS
          <div className="prod__title-actions">
            <button className="prod__add" onClick={addRowAll} type="button">
              + Row
            </button>
            <button className="prod__add" onClick={addColAll} type="button">
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

              <th className="h h-blue">Products</th>
              <th className="h h-blue center">Qty</th>
              <th className="h h-blue center">Amount</th>
              <th className="h h-blue center">Frequency of Service</th>
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

              const rowKey =
                [a?.id ?? "", b?.id ?? "", c?.id ?? ""]
                  .filter(Boolean)
                  .join("|") || `row-${i}`;

              return (
                <tr key={rowKey}>
                  {/* LEFT – small products */}
                  {a ? (
                    <>
                      <td className="label">{renderName("smallProducts", a)}</td>
                      <td>
                        <DollarCell defaultValue={a.product?.basePrice?.amount} />
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

                  {/* MIDDLE – dispensers */}
                  {b ? (
                    <>
                      <td className="label">{renderName("dispensers", b)}</td>
                      <td className="center">
                        <PlainCell />
                      </td>
                      <td>
                        <DollarCell
                          defaultValue={b.product?.warrantyPricePerUnit?.amount}
                        />
                      </td>
                      <td>
                        <DollarCell defaultValue={b.product?.basePrice?.amount} />
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

                  {/* RIGHT – big products */}
                  {c ? (
                    <>
                      <td className="label">{renderName("bigProducts", c)}</td>
                      <td className="center">
                        <PlainCell />
                      </td>
                      <td>
                        <DollarCell defaultValue={c.product?.basePrice?.amount} />
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

  // ---------------------------------------------------------------------------
  // Mobile / grouped tables
  // ---------------------------------------------------------------------------

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
    bucket: BucketKey;
    extraKey: keyof typeof extraCols;
    renderAmountCells: (row: RowItem) => React.ReactNode;
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
                <th className="h h-blue center">Replacement Rate/Install</th>
              </>
            ) : (
              <>
                <th className="h h-blue center">Qty</th>
                <th className="h h-blue center">Amount</th>
                <th className="h h-blue center">Frequency of Service</th>
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
          {data[bucket].map((row) => (
            <tr key={row.id}>
              <td className="label">{renderName(bucket, row)}</td>
              {renderAmountCells(row)}
              {extraCols[extraKey].map((col) => (
                <td key={col.id}>
                  <DollarCell />
                </td>
              ))}
            </tr>
          ))}
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
        renderAmountCells={(row) => (
          <td>
            <DollarCell defaultValue={row.product?.basePrice?.amount} />
          </td>
        )}
      />

      <GroupedTable
        title="Dispensers"
        bucket="dispensers"
        extraKey="dispensers"
        renderAmountCells={(row) => (
          <>
            <td className="center">
              <PlainCell />
            </td>
            <td>
              <DollarCell
                defaultValue={row.product?.warrantyPricePerUnit?.amount}
              />
            </td>
            <td>
              <DollarCell defaultValue={row.product?.basePrice?.amount} />
            </td>
          </>
        )}
      />

      <GroupedTable
        title="Products"
        bucket="bigProducts"
        extraKey="bigProducts"
        renderAmountCells={(row) => (
          <>
            <td className="center">
              <PlainCell />
            </td>
            <td>
              <DollarCell defaultValue={row.product?.basePrice?.amount} />
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
