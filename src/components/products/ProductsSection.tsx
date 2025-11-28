// src/components/products/ProductsSection.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from "react";
import "./ProductsSection.css";
import { useActiveProductCatalog } from "../../backendservice/hooks";
import type { ColumnKey, EnvProduct, ProductRow } from "./productsTypes";
import { useServicesContextOptional } from "../services/ServicesContext";

// Export interface for ref handle
export interface ProductsSectionHandle {
  getData: () => {
    smallProducts: ProductRow[];
    dispensers: ProductRow[];
    bigProducts: ProductRow[];
  };
}

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

// Hook to convert backend catalog to EnvProduct format
function useProductCatalog() {
  const { catalog, loading } = useActiveProductCatalog();

  return useMemo(() => {
    if (!catalog) return { products: [], loading };

    const allProducts: EnvProduct[] = catalog.families.flatMap((family) =>
      family.products
        // Show ALL products, including those with displayByAdmin: false
        .map((p) => ({
          key: p.key,
          name: p.name,
          familyKey: family.key,
          kind: p.kind || "",
          basePrice: p.basePrice,
          warrantyPricePerUnit: p.warrantyPricePerUnit,
          displayByAdmin: p.displayByAdmin !== false,
          effectivePerRollPriceInternal: p.effectivePerRollPriceInternal,
          suggestedCustomerRollPrice: p.suggestedCustomerRollPrice,
          quantityPerCase: p.quantityPerCase,
          quantityPerCaseLabel: p.quantityPerCaseLabel,
        }))
    );

    return { products: allProducts, loading };
  }, [catalog, loading]);
}

// Which families live in which band/column group
const COLUMN_FAMILY_FILTER: Record<ColumnKey, (p: EnvProduct) => boolean> = {
  // LEFT band: paper products
  smallProducts: (p) => p.familyKey === "paper",

  // MIDDLE band: dispensers
  dispensers: (p) => p.familyKey === "dispensers",

  // RIGHT band: everything else
  bigProducts: (p) => p.familyKey !== "paper" && p.familyKey !== "dispensers",
};

function getProductsForColumn(column: ColumnKey, allProducts: EnvProduct[]): EnvProduct[] {
  const filter = COLUMN_FAMILY_FILTER[column];
  return allProducts.filter(filter);
}

function getDefaultRows(column: ColumnKey, allProducts: EnvProduct[]): ProductRow[] {
  // Return only products with displayByAdmin: true as default rows
  return getProductsForColumn(column, allProducts)
    .filter((p) => p.displayByAdmin !== false)
    .map((p) => ({
      id: `${column}_${p.key}`,
      productKey: p.key,
      isDefault: true,
    }));
}

function makeRowId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function findProductByKey(key: string | null, allProducts: EnvProduct[]): EnvProduct | undefined {
  if (!key) return undefined;
  return allProducts.find((p) => p.key === key);
}

// For dropdown: products NOT already used + products with displayByAdmin: false
function getAvailableProductsForColumn(
  column: ColumnKey,
  usedKeys: Set<string>,
  allProducts: EnvProduct[]
): EnvProduct[] {
  return getProductsForColumn(column, allProducts).filter((p) =>
    // Show if NOT already used
    !usedKeys.has(p.key) ||
    // OR if displayByAdmin is false (always show these)
    p.displayByAdmin === false
  );
}

// ---------------------------
// Small re-usable cells
// ---------------------------

type DollarCellProps = {
  value: number | "" | null | undefined;
  onChange?: (value: number | "") => void;
  readOnly?: boolean;
};

const DollarCell = React.memo(function DollarCell({ value, onChange, readOnly }: DollarCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditingRef = useRef(false);
  const lastValueRef = useRef(value);

  // Initialize the input value on mount only
  useEffect(() => {
    if (inputRef.current && inputRef.current.value === "") {
      const initialValue = value === null || value === undefined || value === "" ? "" : String(value);
      inputRef.current.value = initialValue;
      lastValueRef.current = value;
    }
  }, []);

  // Update only when value changes AND user is not editing
  useEffect(() => {
    if (value !== lastValueRef.current) {
      const isFocused = inputRef.current === document.activeElement;

      // Only update if not editing AND not focused
      if (inputRef.current && !isEditingRef.current && !isFocused) {
        const newValue = value === null || value === undefined || value === "" ? "" : String(value);
        inputRef.current.value = newValue;
        lastValueRef.current = value;
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onChange) return;
    const raw = e.target.value;

    if (raw === "") {
      onChange("");
      return;
    }
    const num = Number(raw);
    if (!Number.isNaN(num)) {
      onChange(num);
    }
  };

  const handleFocus = () => {
    isEditingRef.current = true;
  };

  const handleBlur = () => {
    isEditingRef.current = false;
    lastValueRef.current = value;
    // Sync value on blur
    if (inputRef.current) {
      const newValue = value === null || value === undefined || value === "" ? "" : String(value);
      inputRef.current.value = newValue;
    }
  };

  const defaultValue = value === null || value === undefined || value === "" ? "" : String(value);

  return (
    <div className="dcell">
      <span className="dollarColor">$</span>
      <input
        ref={inputRef}
        className="in"
        type="text"
        defaultValue={defaultValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        // disabled={readOnly || !onChange}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if value actually changed
  return prevProps.value === nextProps.value && prevProps.readOnly === nextProps.readOnly;
});

function PlainCell({ value }: { value?: string | number | null }) {
  const displayValue = value === null || value === undefined ? "" : String(value);
  return (
    <input
      className="in"
      type="text"
      value={displayValue}
      readOnly
    />
  );
}

type QtyCellProps = {
  value: number | "" | undefined;
  onChange: (value: number | "") => void;
};

const QtyCell = React.memo(function QtyCell({ value, onChange }: QtyCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditingRef = useRef(false);
  const lastValueRef = useRef(value);

  // Initialize the input value on mount only
  useEffect(() => {
    if (inputRef.current && inputRef.current.value === "") {
      const initialValue = value === "" || value === undefined ? "" : String(value);
      inputRef.current.value = initialValue;
      lastValueRef.current = value;
    }
  }, []);

  // Update only when value changes AND user is not editing
  useEffect(() => {
    if (value !== lastValueRef.current) {
      const isFocused = inputRef.current === document.activeElement;

      // Only update if not editing AND not focused
      if (inputRef.current && !isEditingRef.current && !isFocused) {
        const newValue = value === "" || value === undefined ? "" : String(value);
        inputRef.current.value = newValue;
        lastValueRef.current = value;
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    if (raw === "") {
      onChange("");
      return;
    }
    if (!/^\d+$/.test(raw)) {
      return;
    }
    const num = Number(raw);
    if (!Number.isNaN(num)) {
      onChange(num);
    }
  };

  const handleFocus = () => {
    isEditingRef.current = true;
  };

  const handleBlur = () => {
    isEditingRef.current = false;
    lastValueRef.current = value;
    // Sync value on blur
    if (inputRef.current) {
      const newValue = value === "" || value === undefined ? "" : String(value);
      inputRef.current.value = newValue;
    }
  };

  const defaultValue = value === "" || value === undefined ? "" : String(value);

  return (
    <input
      ref={inputRef}
      className="in"
      type="text"
      defaultValue={defaultValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if value actually changed
  return prevProps.value === nextProps.value;
});




// ---------------------------
// Name cell with wrapped text + custom dropdown
// ---------------------------

type NameCellProps = {
  product: EnvProduct | undefined;
  options: EnvProduct[]; // remaining products for this band (+ current row product)
  onChangeProduct: (productKey: string) => void;
  onRemove?: () => void;

  // support custom rows
  isCustom?: boolean;
  customName?: string;
  onChangeCustomName?: (name: string) => void;
  onSelectCustom?: () => void;
};

const NameCell = React.memo(function NameCell({
  product,
  options,
  onChangeProduct,
  onRemove,
  isCustom,
  customName,
  onChangeCustomName,
  onSelectCustom,
}: NameCellProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Always call all hooks before any conditional returns
  const filteredOptions = useMemo(
    () =>
      options.filter((opt) =>
        opt.name.toLowerCase().includes(query.toLowerCase())
      ),
    [options, query]
  );

  // close dropdown on outside click
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

  // If row is "Custom", show a simple text input instead of dropdown
  if (isCustom) {
    return (
      <div className="namecell">
        <input
          className="in"
          value={customName ?? ""}
          placeholder="Custom product..."
          onChange={(e) => onChangeCustomName?.(e.target.value)}
        />
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
      </div>
    );
  }

  const handleSelect = (key: string) => {
    onChangeProduct(key);
    setOpen(false);
    setQuery("");
  };

  const handleSelectCustom = () => {
    onSelectCustom?.();
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="namecell" ref={wrapperRef}>
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
              <>
                {filteredOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className="namecell-option"
                    onClick={() => handleSelect(opt.key)}
                  >
                    {opt.name}
                  </button>
                ))}
                {/* Custom option at the bottom */}
                <button
                  type="button"
                  className="namecell-option namecell-option--custom"
                  onClick={handleSelectCustom}
                >
                  + Custom product
                </button>
              </>
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

// Helper: Check if product is included in SaniClean All-Inclusive
function isProductIncludedInSaniClean(productKey: string | null): boolean {
  if (!productKey) return false;

  const includedProducts = [
    "extra_sanipod_receptacle",
    "disp_sanipod_receptacle",
    "extra_urinal_mats",
    "extra_commode_mats",
    "extra_bowl_clip",
    "extra_urinal_screen",
    "extra_wave3d_urinal_screen",
    "extra_splash_hog_urinal_screen",
    "extra_vertical_urinal_screen",
    "extra_microfiber_mop",
  ];

  return includedProducts.includes(productKey);
}

const ProductsSection = forwardRef<ProductsSectionHandle>((props, ref) => {
  const isDesktop = useIsDesktop();
  const servicesContext = useServicesContextOptional();
  const isSanicleanAllInclusive =
    servicesContext?.isSanicleanAllInclusive ?? false;

  // Fetch products from backend
  const { products: allProducts, loading } = useProductCatalog();

  const [data, setData] = useState<{
    smallProducts: ProductRow[];
    dispensers: ProductRow[];
    bigProducts: ProductRow[];
  }>(() => ({
    smallProducts: [],
    dispensers: [],
    bigProducts: [],
  }));

  // Initialize default rows when products load
  useEffect(() => {
    if (!loading && allProducts.length > 0) {
      setData({
        smallProducts: getDefaultRows("smallProducts", allProducts),
        dispensers: getDefaultRows("dispensers", allProducts),
        bigProducts: getDefaultRows("bigProducts", allProducts),
      });
    }
  }, [loading, allProducts]);

  const [extraCols, setExtraCols] = useState<{
    smallProducts: { id: string; label: string }[];
    dispensers: { id: string; label: string }[];
    bigProducts: { id: string; label: string }[];
  }>({
    smallProducts: [],
    dispensers: [],
    bigProducts: [],
  });

  const productMap = useMemo(() => {
    const map = new Map<string, EnvProduct>();
    allProducts.forEach((p) => map.set(p.key, p));
    return map;
  }, [allProducts]);

  const getProduct = useCallback(
    (row: ProductRow | undefined) =>
      row && row.productKey ? productMap.get(row.productKey) : undefined,
    [productMap]
  );

  // Generic row updater
  const updateRowField = useCallback(
    (bucket: ColumnKey, rowId: string, patch: Partial<ProductRow>) => {
      setData((prev) => {
        const newBucket = prev[bucket].map((r) =>
          r.id === rowId ? { ...r, ...patch } : r
        );

        // Only update if something actually changed
        if (JSON.stringify(newBucket) === JSON.stringify(prev[bucket])) {
          return prev;
        }

        return {
          ...prev,
          [bucket]: newBucket,
        };
      });
    },
    []
  );

  const updateRowProductKey = useCallback(
    (bucket: ColumnKey, rowId: string, productKey: string) =>
      updateRowField(bucket, rowId, {
        productKey,
        isCustom: false,
        customName: undefined,
      }),
    [updateRowField]
  );

  // ---------------------------
  // Row operations
  // ---------------------------

  const addRowAll = useCallback(() => {
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
  }, []);

  const addRow = useCallback(
    (bucket: ColumnKey) =>
      setData((prev) => ({
        ...prev,
        [bucket]: [
          ...prev[bucket],
          { id: makeRowId(bucket), productKey: null, isDefault: false },
        ],
      })),
    []
  );

  const removeRow = useCallback(
    (bucket: ColumnKey, id: string) =>
      setData((prev) => ({
        ...prev,
        [bucket]: prev[bucket].filter((r) => r.id !== id),
      })),
    []
  );

  // ---------------------------
  // Column operations
  // ---------------------------

  const mkCol = (label = "Custom") => ({
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    label,
  });

  const addColAll = useCallback(
    () =>
      setExtraCols((c) => ({
        smallProducts: [...c.smallProducts, mkCol()],
        dispensers: [...c.dispensers, mkCol()],
        bigProducts: [...c.bigProducts, mkCol()],
      })),
    []
  );

  const addCol = useCallback(
    (bucket: ColumnKey) =>
      setExtraCols((c) => ({
        ...c,
        [bucket]: [...c[bucket], mkCol()],
      })),
    []
  );

  const changeColLabel = useCallback(
    (bucket: ColumnKey, id: string, next: string) =>
      setExtraCols((c) => ({
        ...c,
        [bucket]: c[bucket].map((col) =>
          col.id === id ? { ...col, label: next } : col
        ),
      })),
    []
  );

  const removeCol = useCallback(
    (bucket: ColumnKey, id: string) =>
      setExtraCols((c) => ({
        ...c,
        [bucket]: c[bucket].filter((col) => col.id !== id),
      })),
    []
  );

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
  const getRowOptions = useCallback((bucket: ColumnKey, rowId: string): EnvProduct[] => {
    const usedKeys = new Set(
      data[bucket]
        .filter((r) => r.id !== rowId && r.productKey)
        .map((r) => r.productKey as string)
    );

    const base = getAvailableProductsForColumn(bucket, usedKeys, allProducts);

    const currentRow = data[bucket].find((r) => r.id === rowId);
    if (currentRow?.productKey) {
      const current = findProductByKey(currentRow.productKey, allProducts);
      if (current && !base.find((p) => p.key === current.key)) {
        return [current, ...base];
      }
    }

    return base;
  }, [data, allProducts]);

  // ---------------------------
  // Helpers for totals
  // ---------------------------

  const getSmallUnitPrice = (row: ProductRow, product?: EnvProduct) =>
    row.unitPriceOverride ?? product?.basePrice?.amount ?? 0;

  const getDispReplacementPrice = (row: ProductRow, product?: EnvProduct) =>
    row.replacementPriceOverride ?? product?.basePrice?.amount ?? 0;

  const getBigAmount = (row: ProductRow, product?: EnvProduct) =>
    row.amountOverride ?? product?.basePrice?.amount ?? 0;

  const getQty = (row?: ProductRow) => row?.qty ?? 0;

  // Expose getData method via ref
  useImperativeHandle(ref, () => ({
    getData: () => {
      // Enrich data with calculated values
      const enrichedSmallProducts = data.smallProducts.map((row) => {
        const product = getProduct(row);
        return {
          ...row,
          // Include calculated/displayed values
          unitPrice: row.unitPriceOverride ?? product?.basePrice?.amount,
          qty: row.qty,
          total: row.totalOverride ?? (getSmallUnitPrice(row, product) * getQty(row)),
        };
      });

      const enrichedDispensers = data.dispensers.map((row) => {
        const product = getProduct(row);
        return {
          ...row,
          // Include calculated/displayed values
          qty: row.qty,
          warrantyRate: row.warrantyPriceOverride ?? product?.warrantyPricePerUnit?.amount,
          replacementRate: row.replacementPriceOverride ?? product?.basePrice?.amount,
          total: row.totalOverride ?? (getDispReplacementPrice(row, product) * getQty(row)),
        };
      });

      const enrichedBigProducts = data.bigProducts.map((row) => {
        const product = getProduct(row);
        return {
          ...row,
          // Include calculated/displayed values
          qty: row.qty,
          amount: row.amountOverride ?? product?.basePrice?.amount,
          total: row.totalOverride ?? (getBigAmount(row, product) * getQty(row)),
        };
      });

      return {
        smallProducts: enrichedSmallProducts,
        dispensers: enrichedDispensers,
        bigProducts: enrichedBigProducts,
      };
    }
  }), [data, getProduct]);

  // ---------------------------
  // Desktop table
  // ---------------------------

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
              {/* LEFT band – paper products */}
              <th className="h h-blue">Products</th>
              <th className="h h-blue center">Amount Per Unit</th>
              <th className="h h-blue center">Qty</th>
              <th className="h h-blue center">Total</th>
              {extraCols.smallProducts.map((col) => (
                <th className="h h-blue center th-edit" key={col.id}>
                  <input
                    className="th-edit-input"
                    value={col.label}
                    onChange={(e) =>
                      changeColLabel("smallProducts", col.id, e.target.value)
                    }
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
              <th className="h h-blue center">Replacement Rate/Install</th>
              <th className="h h-blue center">Total</th>
              {extraCols.dispensers.map((col) => (
                <th className="h h-blue center th-edit" key={col.id}>
                  <input
                    className="th-edit-input"
                    value={col.label}
                    onChange={(e) =>
                      changeColLabel("dispensers", col.id, e.target.value)
                    }
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
              <th className="h h-blue center">Frequency of Service</th>
              <th className="h h-blue center">Total</th>
              {extraCols.bigProducts.map((col) => (
                <th className="h h-blue center th-edit" key={col.id}>
                  <input
                    className="th-edit-input"
                    value={col.label}
                    onChange={(e) =>
                      changeColLabel("bigProducts", col.id, e.target.value)
                    }
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

              // Stable row key: combine all three IDs plus index
              const rowKey = `${rowSmall?.id ?? `s${i}`}_${rowDisp?.id ?? `d${i}`}_${rowBig?.id ?? `b${i}`}`;

              return (
                <tr key={rowKey}>
                  {/* LEFT band: Products + Amount Per Unit + Qty + Total */}
                  {rowSmall ? (
                    <>
                      <td className="label">
                        <NameCell
                          product={pSmall}
                          options={getRowOptions("smallProducts", rowSmall.id)}
                          onChangeProduct={(key) =>
                            updateRowProductKey(
                              "smallProducts",
                              rowSmall.id,
                              key
                            )
                          }
                          onSelectCustom={() =>
                            updateRowField("smallProducts", rowSmall.id, {
                              productKey: null,
                              isCustom: true,
                              customName: "",
                            })
                          }
                          isCustom={rowSmall.isCustom}
                          customName={rowSmall.customName}
                          onChangeCustomName={(name) =>
                            updateRowField("smallProducts", rowSmall.id, {
                              customName: name,
                            })
                          }
                          onRemove={() =>
                            removeRow("smallProducts", rowSmall.id)
                          }
                        />
                      </td>
                      <td>
                        <DollarCell
                          value={
                            rowSmall.unitPriceOverride ??
                            pSmall?.basePrice?.amount ??
                            ""
                          }
                          onChange={(val) =>
                            updateRowField("smallProducts", rowSmall.id, {
                              unitPriceOverride:
                                val === "" ? undefined : (val as number),
                            })
                          }
                        />
                      </td>
                      <td className="center">
                        <QtyCell
                          value={rowSmall.qty ?? ""}
                          onChange={(val) =>
                            updateRowField("smallProducts", rowSmall.id, {
                              qty: val === "" ? undefined : (val as number),
                            })
                          }
                        />
                      </td>
                      <td>
                        <DollarCell
                          value={
                            rowSmall.totalOverride ??
                            getSmallUnitPrice(rowSmall, pSmall) *
                              getQty(rowSmall)
                          }
                          onChange={(val) =>
                            updateRowField("smallProducts", rowSmall.id, {
                              totalOverride:
                                val === "" ? undefined : (val as number),
                            })
                          }
                        />
                      </td>
                      {extraCols.smallProducts.map((col) => (
                        <td key={col.id}>
                          <DollarCell
                            value={rowSmall.customFields?.[col.id] ?? ""}
                            onChange={(val) =>
                              updateRowField("smallProducts", rowSmall.id, {
                                customFields: {
                                  ...rowSmall.customFields,
                                  [col.id]: val,
                                },
                              })
                            }
                          />
                        </td>
                      ))}
                    </>
                  ) : (
                    <>
                      <td className="label" />
                      <td>
                        <PlainCell />
                      </td>
                      <td className="center">
                        <PlainCell />
                      </td>
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

                  {/* MIDDLE band: Dispensers + Qty + Warranty + Replacement + Total */}
                  {rowDisp ? (
                    <>
                      <td className="label">
                        <NameCell
                          product={pDisp}
                          options={getRowOptions("dispensers", rowDisp.id)}
                          onChangeProduct={(key) =>
                            updateRowProductKey("dispensers", rowDisp.id, key)
                          }
                          onSelectCustom={() =>
                            updateRowField("dispensers", rowDisp.id, {
                              productKey: null,
                              isCustom: true,
                              customName: "",
                            })
                          }
                          isCustom={rowDisp.isCustom}
                          customName={rowDisp.customName}
                          onChangeCustomName={(name) =>
                            updateRowField("dispensers", rowDisp.id, {
                              customName: name,
                            })
                          }
                          onRemove={() => removeRow("dispensers", rowDisp.id)}
                        />
                      </td>
                      <td className="center">
                        <QtyCell
                          value={rowDisp.qty ?? ""}
                          onChange={(val) =>
                            updateRowField("dispensers", rowDisp.id, {
                              qty: val === "" ? undefined : (val as number),
                            })
                          }
                        />
                      </td>
                      <td>
                        <DollarCell
                          value={
                            rowDisp.warrantyPriceOverride ??
                            pDisp?.warrantyPricePerUnit?.amount ??
                            ""
                          }
                          onChange={(val) =>
                            updateRowField("dispensers", rowDisp.id, {
                              warrantyPriceOverride:
                                val === "" ? undefined : (val as number),
                            })
                          }
                        />
                      </td>
                      <td>
                        <DollarCell
                          value={
                            rowDisp.replacementPriceOverride ??
                            pDisp?.basePrice?.amount ??
                            ""
                          }
                          onChange={(val) =>
                            updateRowField("dispensers", rowDisp.id, {
                              replacementPriceOverride:
                                val === "" ? undefined : (val as number),
                            })
                          }
                        />
                      </td>
                      <td>
                        <DollarCell
                          value={
                            rowDisp.totalOverride ??
                            getDispReplacementPrice(rowDisp, pDisp) *
                              getQty(rowDisp)
                          }
                          onChange={(val) =>
                            updateRowField("dispensers", rowDisp.id, {
                              totalOverride:
                                val === "" ? undefined : (val as number),
                            })
                          }
                        />
                      </td>
                      {extraCols.dispensers.map((col) => (
                        <td key={col.id}>
                          <DollarCell
                            value={rowDisp.customFields?.[col.id] ?? ""}
                            onChange={(val) =>
                              updateRowField("dispensers", rowDisp.id, {
                                customFields: {
                                  ...rowDisp.customFields,
                                  [col.id]: val,
                                },
                              })
                            }
                          />
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

                  {/* RIGHT band: Products + Qty + Amount + Frequency + Total */}
                  {rowBig ? (
                    <>
                      <td className="label">
                        <NameCell
                          product={pBig}
                          options={getRowOptions("bigProducts", rowBig.id)}
                          onChangeProduct={(key) =>
                            updateRowProductKey("bigProducts", rowBig.id, key)
                          }
                          onSelectCustom={() =>
                            updateRowField("bigProducts", rowBig.id, {
                              productKey: null,
                              isCustom: true,
                              customName: "",
                            })
                          }
                          isCustom={rowBig.isCustom}
                          customName={rowBig.customName}
                          onChangeCustomName={(name) =>
                            updateRowField("bigProducts", rowBig.id, {
                              customName: name,
                            })
                          }
                          onRemove={() => removeRow("bigProducts", rowBig.id)}
                        />
                      </td>
                      <td className="center">
                        <QtyCell
                          value={rowBig.qty ?? ""}
                          onChange={(val) =>
                            updateRowField("bigProducts", rowBig.id, {
                              qty: val === "" ? undefined : (val as number),
                            })
                          }
                        />
                      </td>
                      <td>
                        <DollarCell
                          value={
                            rowBig.amountOverride ??
                            pBig?.basePrice?.amount ??
                            ""
                          }
                          onChange={(val) =>
                            updateRowField("bigProducts", rowBig.id, {
                              amountOverride:
                                val === "" ? undefined : (val as number),
                            })
                          }
                        />
                      </td>
                      <td className="center">
                        <PlainCell />
                      </td>
                      <td>
                        <DollarCell
                          value={
                            rowBig.totalOverride ??
                            getBigAmount(rowBig, pBig) * getQty(rowBig)
                          }
                          onChange={(val) =>
                            updateRowField("bigProducts", rowBig.id, {
                              totalOverride:
                                val === "" ? undefined : (val as number),
                            })
                          }
                        />
                      </td>
                      {extraCols.bigProducts.map((col) => (
                        <td key={col.id}>
                          <DollarCell
                            value={rowBig.customFields?.[col.id] ?? ""}
                            onChange={(val) =>
                              updateRowField("bigProducts", rowBig.id, {
                                customFields: {
                                  ...rowBig.customFields,
                                  [col.id]: val,
                                },
                              })
                            }
                          />
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
                      <td>
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
    renderAmountCells: (
      row: ProductRow,
      product?: EnvProduct
    ) => React.ReactNode;
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
                <>
                  <th className="h h-blue center">Amount Per Unit</th>
                  <th className="h h-blue center">Qty</th>
                  <th className="h h-blue center">Total</th>
                </>
              ) : bucket === "dispensers" ? (
                <>
                  <th className="h h-blue center">Qty</th>
                  <th className="h h-blue center">Warranty Rate</th>
                  <th className="h h-blue center">
                    Replacement Rate/Install
                  </th>
                  <th className="h h-blue center">Total</th>
                </>
              ) : (
                <>
                  <th className="h h-blue center">Qty</th>
                  <th className="h h-blue center">Amount</th>
                  <th className="h h-blue center">
                    Frequency of Service
                  </th>
                  <th className="h h-blue center">Total</th>
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
                      onSelectCustom={() =>
                        updateRowField(bucket, row.id, {
                          productKey: null,
                          isCustom: true,
                          customName: "",
                        })
                      }
                      isCustom={row.isCustom}
                      customName={row.customName}
                      onChangeCustomName={(name) =>
                        updateRowField(bucket, row.id, {
                          customName: name,
                        })
                      }
                      onRemove={() => removeRow(bucket, row.id)}
                    />
                  </td>
                  {renderAmountCells(row, product)}
                  {extraCols[extraKey].map((col) => (
                    <td key={col.id}>
                      <DollarCell
                        value={row.customFields?.[col.id] ?? ""}
                        onChange={(val) =>
                          updateRowField(bucket, row.id, {
                            customFields: {
                              ...row.customFields,
                              [col.id]: val,
                            },
                          })
                        }
                      />
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

      {/* smallProducts grouped */}
      <GroupedTable
        title="Products"
        bucket="smallProducts"
        renderAmountCells={(row, product) => (
          <>
            <td>
              <DollarCell
                value={
                  row.unitPriceOverride ?? product?.basePrice?.amount ?? ""
                }
                onChange={(val) =>
                  updateRowField("smallProducts", row.id, {
                    unitPriceOverride:
                      val === "" ? undefined : (val as number),
                  })
                }
              />
            </td>
            <td className="center">
              <QtyCell
                value={row.qty ?? ""}
                onChange={(val) =>
                  updateRowField("smallProducts", row.id, {
                    qty: val === "" ? undefined : (val as number),
                  })
                }
              />
            </td>
            <td>
              <DollarCell
                value={
                  row.totalOverride ??
                  getSmallUnitPrice(row, product) * getQty(row)
                }
                onChange={(val) =>
                  updateRowField("smallProducts", row.id, {
                    totalOverride: val === "" ? undefined : (val as number),
                  })
                }
              />
            </td>
          </>
        )}
      />

      {/* dispensers grouped */}
      <GroupedTable
        title="Dispensers"
        bucket="dispensers"
        renderAmountCells={(row, product) => (
          <>
            <td className="center">
              <QtyCell
                value={row.qty ?? ""}
                onChange={(val) =>
                  updateRowField("dispensers", row.id, {
                    qty: val === "" ? undefined : (val as number),
                  })
                }
              />
            </td>
            <td>
              <DollarCell
                value={
                  row.warrantyPriceOverride ??
                  product?.warrantyPricePerUnit?.amount ??
                  ""
                }
                onChange={(val) =>
                  updateRowField("dispensers", row.id, {
                    warrantyPriceOverride:
                      val === "" ? undefined : (val as number),
                  })
                }
              />
            </td>
            <td>
              <DollarCell
                value={
                  row.replacementPriceOverride ??
                  product?.basePrice?.amount ??
                  ""
                }
                onChange={(val) =>
                  updateRowField("dispensers", row.id, {
                    replacementPriceOverride:
                      val === "" ? undefined : (val as number),
                  })
                }
              />
            </td>
            <td>
              <DollarCell
                value={
                  row.totalOverride ??
                  getDispReplacementPrice(row, product) * getQty(row)
                }
                onChange={(val) =>
                  updateRowField("dispensers", row.id, {
                    totalOverride: val === "" ? undefined : (val as number),
                  })
                }
              />
            </td>
          </>
        )}
      />

      {/* bigProducts grouped */}
      <GroupedTable
        title="Products"
        bucket="bigProducts"
        renderAmountCells={(row, product) => (
          <>
            <td className="center">
              <QtyCell
                value={row.qty ?? ""}
                onChange={(val) =>
                  updateRowField("bigProducts", row.id, {
                    qty: val === "" ? undefined : (val as number),
                  })
                }
              />
            </td>
            <td>
              <DollarCell
                value={
                  row.amountOverride ?? product?.basePrice?.amount ?? ""
                }
                onChange={(val) =>
                  updateRowField("bigProducts", row.id, {
                    amountOverride:
                      val === "" ? undefined : (val as number),
                  })
                }
              />
            </td>
            <td className="center">
              <PlainCell />
            </td>
            <td>
              <DollarCell
                value={
                  row.totalOverride ??
                  getBigAmount(row, product) * getQty(row)
                }
                onChange={(val) =>
                  updateRowField("bigProducts", row.id, {
                    totalOverride: val === "" ? undefined : (val as number),
                  })
                }
              />
            </td>
          </>
        )}
      />
    </>
  );

  return (
    <section className="prod">
      {isDesktop ? DesktopTable() : GroupedTables()}
    </section>
  );
});

ProductsSection.displayName = "ProductsSection";
export default ProductsSection;
