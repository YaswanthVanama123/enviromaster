// src/components/products/ProductsSection.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from "react";
import "./ProductsSection.css";
import { useActiveProductCatalog } from "../../backendservice/hooks";
import type { ColumnKey, EnvProduct, ProductRow } from "./productsTypes";
import { useServicesContextOptional } from "../services/ServicesContext";
import { useVersionChangeCollection, getProductTypeFromFamily, getFieldType } from "../../hooks/useVersionChangeCollection";

// Export interface for ref handle
export interface ProductsSectionHandle {
  getData: () => {
    products: ProductRow[];
    dispensers: ProductRow[];
    products: ProductRow[];
  };
}

// Initial product data from backend
export interface InitialProductData {
  name: string;
  qty?: number;
  unitPrice?: number;
  warrantyRate?: number;
  replacementRate?: number;
  amount?: number;
  total?: number;
  frequency?: string;  // ✅ CRITICAL: Added frequency field
}

// Props interface
interface ProductsSectionProps {
  initialSmallProducts?: string[] | InitialProductData[];
  initialDispensers?: string[] | InitialProductData[];
  initialBigProducts?: string[] | InitialProductData[];
  initialCustomColumns?: {
    products: { id: string; label: string }[];
    dispensers: { id: string; label: string }[];
  };
  activeTab?: string; // ✅ Added activeTab prop for URL-based tab switching
  onTabChange?: (tab: string) => void; // ✅ Added tab change callback
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

// Which families live in which band/column group - MERGED: Products = small + big combined
const COLUMN_FAMILY_FILTER: Record<ColumnKey, (p: EnvProduct) => boolean> = {
  // Products column: ALL non-dispenser products (paper + other products combined)
  products: (p) => p.familyKey !== "dispensers",

  // Dispensers column: dispensers only
  dispensers: (p) => p.familyKey === "dispensers",
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

  // Clean value: convert NaN, null, undefined to empty string
  const cleanValue = (val: number | "" | null | undefined): string => {
    if (val === null || val === undefined || val === "" || (typeof val === 'number' && isNaN(val))) {
      return "";
    }
    return String(val);
  };

  // Initialize the input value on mount only
  useEffect(() => {
    if (inputRef.current && inputRef.current.value === "") {
      inputRef.current.value = cleanValue(value);
      lastValueRef.current = value;
    }
  }, []);

  // Update only when value changes AND user is not editing
  useEffect(() => {
    if (value !== lastValueRef.current) {
      const isFocused = inputRef.current === document.activeElement;

      // Only update if not editing AND not focused
      if (inputRef.current && !isEditingRef.current && !isFocused) {
        inputRef.current.value = cleanValue(value);
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
      inputRef.current.value = cleanValue(value);
    }
  };

  const defaultValue = cleanValue(value);

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

  // Clean value: convert NaN, null, undefined, 0 to empty string
  const cleanValue = (val: number | "" | undefined): string => {
    if (val === undefined || val === "" || (typeof val === 'number' && isNaN(val))) {
      return "";
    }
    return String(val);
  };

  // Initialize the input value on mount only
  useEffect(() => {
    if (inputRef.current && inputRef.current.value === "") {
      inputRef.current.value = cleanValue(value);
      lastValueRef.current = value;
    }
  }, []);

  // Update only when value changes AND user is not editing
  useEffect(() => {
    if (value !== lastValueRef.current) {
      const isFocused = inputRef.current === document.activeElement;

      // Only update if not editing AND not focused
      if (inputRef.current && !isEditingRef.current && !isFocused) {
        inputRef.current.value = cleanValue(value);
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
      inputRef.current.value = cleanValue(value);
    }
  };

  const defaultValue = cleanValue(value);

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

type FrequencyCellProps = {
  value?: string;
  onChange: (value: string) => void;
};

const FrequencyCell = React.memo(function FrequencyCell({ value, onChange }: FrequencyCellProps) {
  const frequencyOptions = [
    { value: "", label: "Select..." },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "bi-weekly", label: "Bi-Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  return (
    <select
      className="in frequency-select"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "4px 8px",
        border: "1px solid #ccc",
        borderRadius: "4px",
        fontSize: "14px",
        backgroundColor: "white",
      }}
    >
      {frequencyOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}, (prevProps, nextProps) => {
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

// Helper: Convert initial product data to ProductRow objects
function convertInitialToRows(
  bucket: ColumnKey,
  productData: string[] | InitialProductData[],
  allProducts: EnvProduct[]
): ProductRow[] {
  // Create a map of product names to product keys
  const nameToProductMap = new Map<string, EnvProduct>();
  allProducts.forEach((p) => {
    nameToProductMap.set(p.name.toLowerCase(), p);
  });

  // Helper to safely get number value (filter out NaN, 0, null, undefined)
  const safeNumber = (value: number | undefined | null): number | undefined => {
    if (value === null || value === undefined || isNaN(value) || value === 0) {
      return undefined;
    }
    return value;
  };

  return productData
    .filter((item) => {
      if (typeof item === 'string') {
        return item && item.trim() !== "";
      } else {
        return item && item.name && item.name.trim() !== "";
      }
    })
    .map((item, index) => {
      // Handle both string and InitialProductData formats
      const name = typeof item === 'string' ? item : item.name;
      const normalizedName = name.toLowerCase();
      const product = nameToProductMap.get(normalizedName);

      if (product) {
        // Found matching product in catalog
        const row: ProductRow = {
          id: `${bucket}-${Date.now()}-${index}`,
          productKey: product.key,
          isCustom: false,
        };

        // Add quantity and price overrides if provided
        if (typeof item !== 'string') {
          const qty = safeNumber(item.qty);
          if (qty !== undefined) {
            row.qty = qty;
          }

          // ✅ CRITICAL: Preserve frequency from backend data
          if (item.frequency) {
            row.frequency = item.frequency;
          }

          // ✅ CRITICAL: Preserve custom fields from backend data
          if (item.customFields) {
            row.customFields = item.customFields;
            console.log(`📦 [convertInitialToRows] Preserved custom fields for "${name}":`, item.customFields);
          }

          // For small products
          if (bucket === 'products') {
            const unitPrice = safeNumber(item.unitPrice);
            if (unitPrice !== undefined) {
              row.unitPriceOverride = unitPrice;
            }
            const total = safeNumber(item.total);
            if (total !== undefined) {
              row.totalOverride = total;
            }
          }

          // For dispensers
          if (bucket === 'dispensers') {
            const warrantyRate = safeNumber(item.warrantyRate);
            if (warrantyRate !== undefined) {
              row.warrantyPriceOverride = warrantyRate;
            }
            const replacementRate = safeNumber(item.replacementRate);
            if (replacementRate !== undefined) {
              row.replacementPriceOverride = replacementRate;
            }
            const total = safeNumber(item.total);
            if (total !== undefined) {
              row.totalOverride = total;
            }
          }

          // For big products
          if (bucket === 'products') {
            const amount = safeNumber(item.amount);
            if (amount !== undefined) {
              row.amountOverride = amount;
            }
            const total = safeNumber(item.total);
            if (total !== undefined) {
              row.totalOverride = total;
            }
          }
        }

        return row;
      } else {
        // Product not found in catalog, treat as custom
        const row: ProductRow = {
          id: `${bucket}-${Date.now()}-${index}`,
          productKey: null,
          isCustom: true,
          customName: name,
        };

        // Add quantity and price overrides for custom products too
        if (typeof item !== 'string') {
          const qty = safeNumber(item.qty);
          if (qty !== undefined) {
            row.qty = qty;
          }

          // ✅ CRITICAL: Preserve frequency from backend data for custom products too
          if (item.frequency) {
            row.frequency = item.frequency;
          }

          // ✅ CRITICAL: Preserve custom fields from backend data for custom products too
          if (item.customFields) {
            row.customFields = item.customFields;
            console.log(`📦 [convertInitialToRows] Preserved custom fields for custom product "${name}":`, item.customFields);
          }

          const total = safeNumber(item.total);
          if (total !== undefined) {
            row.totalOverride = total;
          }
        }

        return row;
      }
    });
}

const ProductsSection = forwardRef<ProductsSectionHandle, ProductsSectionProps>((props, ref) => {
  const { initialSmallProducts, initialDispensers, initialBigProducts, initialCustomColumns, activeTab, onTabChange } = props;
  const isDesktop = useIsDesktop();
  const servicesContext = useServicesContextOptional();
  const isSanicleanAllInclusive =
    servicesContext?.isSanicleanAllInclusive ?? false;

  // ✅ NEW: Version Change Collection Setup
  const { addChange } = useVersionChangeCollection();

  // ✅ Tab Management
  const [currentTab, setCurrentTab] = useState<string>(() => {
    return activeTab || 'form'; // Default to 'form' tab
  });

  // Update tab when activeTab prop changes
  useEffect(() => {
    if (activeTab && activeTab !== currentTab) {
      setCurrentTab(activeTab);
    }
  }, [activeTab, currentTab]);

  // Handle tab change with callback to parent
  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };

  // Valid tab values - MERGED: Only 2 categories now
  const validTabs = ['products', 'dispensers'];

  // Fetch products from backend
  const { products: allProducts, loading } = useProductCatalog();

  const [data, setData] = useState<{
    products: ProductRow[];      // MERGED: small + big products combined
    dispensers: ProductRow[];    // Dispensers remain separate
  }>(() => ({
    products: [],
    dispensers: [],
  }));

  // Initialize default rows when products load
  useEffect(() => {
    if (!loading && allProducts.length > 0) {
      // If initial data is provided, use it; otherwise use defaults
      // MERGE small and big products into single "products" category
      const hasInitialData = initialSmallProducts || initialDispensers || initialBigProducts;

      if (hasInitialData) {
        console.log("📦 Loading products from edit mode (MERGED structure):", {
          initialSmallProducts,
          initialDispensers,
          initialBigProducts
        });

        // Combine products + products into single products array
        const mergedProducts = [
          ...(initialSmallProducts ? convertInitialToRows("products", initialSmallProducts, allProducts) : []),
          ...(initialBigProducts ? convertInitialToRows("products", initialBigProducts, allProducts) : [])
        ];

        // If no initial data provided, get default rows for both product types
        if (!initialSmallProducts && !initialBigProducts) {
          const smallProductDefaults = getProductsForColumn("products", allProducts)
            .filter((p) => p.familyKey === "paper" && p.displayByAdmin !== false)
            .map((p) => ({
              id: `products_${p.key}`,
              productKey: p.key,
              isDefault: true,
            }));

          const bigProductDefaults = getProductsForColumn("products", allProducts)
            .filter((p) => p.familyKey !== "paper" && p.familyKey !== "dispensers" && p.displayByAdmin !== false)
            .map((p) => ({
              id: `products_${p.key}`,
              productKey: p.key,
              isDefault: true,
            }));

          mergedProducts.push(...smallProductDefaults, ...bigProductDefaults);
        }

        setData({
          products: mergedProducts,  // MERGED: small + big combined
          dispensers: initialDispensers
            ? convertInitialToRows("dispensers", initialDispensers, allProducts)
            : getDefaultRows("dispensers", allProducts),
        });
      } else {
        // Default: merge small and big default rows
        const smallProductDefaults = getProductsForColumn("products", allProducts)
          .filter((p) => p.familyKey === "paper" && p.displayByAdmin !== false)
          .map((p) => ({
            id: `products_${p.key}`,
            productKey: p.key,
            isDefault: true,
          }));

        const bigProductDefaults = getProductsForColumn("products", allProducts)
          .filter((p) => p.familyKey !== "paper" && p.familyKey !== "dispensers" && p.displayByAdmin !== false)
          .map((p) => ({
            id: `products_${p.key}`,
            productKey: p.key,
            isDefault: true,
          }));

        const mergedProducts = [...smallProductDefaults, ...bigProductDefaults];

        setData({
          products: mergedProducts,  // MERGED: small + big combined
          dispensers: getDefaultRows("dispensers", allProducts),
        });
      }
    }
  }, [loading, allProducts, initialSmallProducts, initialDispensers, initialBigProducts]);

  const [extraCols, setExtraCols] = useState<{
    products: { id: string; label: string }[];    // MERGED: small + big combined
    dispensers: { id: string; label: string }[];
  }>(() => ({
    products: initialCustomColumns?.products || [],
    dispensers: initialCustomColumns?.dispensers || [],
  }));

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

  // Generic row updater with price override logging
  const updateRowField = useCallback(
    (bucket: ColumnKey, rowId: string, patch: Partial<ProductRow>) => {
      setData((prev) => {
        const currentRow = prev[bucket].find((r) => r.id === rowId);
        if (!currentRow) return prev;

        const newBucket = prev[bucket].map((r) =>
          r.id === rowId ? { ...r, ...patch } : r
        );

        // Only update if something actually changed
        if (JSON.stringify(newBucket) === JSON.stringify(prev[bucket])) {
          return prev;
        }

        // ✅ NEW: Price override logging
        const product = getProduct(currentRow);
        if (product && currentRow.productKey) {
          // Check if any price-related fields are being updated
          const priceFields = ['unitPriceOverride', 'amountOverride', 'warrantyPriceOverride', 'replacementPriceOverride', 'totalOverride'];

          for (const field of priceFields) {
            if (patch[field as keyof ProductRow] !== undefined) {
              const newValue = patch[field as keyof ProductRow] as number;
              const oldValue = currentRow[field as keyof ProductRow] as number;

              // Only log if there's an actual change from a base price to an override
              if (newValue !== oldValue && newValue !== undefined) {
                // Determine original value (from product catalog or previous override)
                let originalValue = 0;
                switch (field) {
                  case 'unitPriceOverride':
                    originalValue = oldValue || product.basePrice?.amount || 0;
                    break;
                  case 'amountOverride':
                    originalValue = oldValue || product.basePrice?.amount || 0;
                    break;
                  case 'warrantyPriceOverride':
                    originalValue = oldValue || product.warrantyPricePerUnit?.amount || 0;
                    break;
                  case 'replacementPriceOverride':
                    originalValue = oldValue || product.basePrice?.amount || 0;
                    break;
                  case 'totalOverride':
                    // For total, calculate the original based on unit price * qty
                    const qty = currentRow.qty || 0;
                    if (bucket === 'dispensers') {
                      originalValue = oldValue || ((product.basePrice?.amount || 0) * qty);
                    } else {
                      const unitPrice = product.familyKey === 'paper'
                        ? (product.basePrice?.amount || 0)
                        : (product.basePrice?.amount || 0);
                      originalValue = oldValue || (unitPrice * qty);
                    }
                    break;
                }

                // Only log if override is different from original
                if (originalValue !== newValue) {
                  // Collect the change for version-based batch logging
                  addChange({
                    productKey: product.key,
                    productName: product.name,
                    productType: getProductTypeFromFamily(product.familyKey),
                    fieldType: getFieldType(field),
                    fieldDisplayName: getFieldType(field),
                    originalValue: originalValue,
                    newValue: newValue,
                    quantity: currentRow.qty || 0,
                    frequency: currentRow.frequency || ''
                  });

                  console.log(`📝 [PRODUCT-CHANGE-COLLECTION] Added change for ${product.name}:`, {
                    field,
                    from: originalValue,
                    to: newValue,
                    change: newValue - originalValue,
                    changePercent: originalValue ? ((newValue - originalValue) / originalValue * 100).toFixed(2) + '%' : 'N/A'
                  });
                }
              }
            }
          }
        }

        return {
          ...prev,
          [bucket]: newBucket,
        };
      });
    },
    [addChange, getProduct]
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
      products: [
        ...prev.products,
        { id: makeRowId("products"), productKey: null, isDefault: false },
      ],
      dispensers: [
        ...prev.dispensers,
        { id: makeRowId("dispensers"), productKey: null, isDefault: false },
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
        products: [...c.products, mkCol()],
        dispensers: [...c.dispensers, mkCol()],
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
        data.products.length,    // MERGED: products column
        data.dispensers.length   // Dispensers column
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
      // MERGED PRODUCTS: Handle mixed small + big products in single array
      // Split them back into separate categories for backend compatibility
      const allProducts = data.products.map((row) => {
        const product = getProduct(row);

        // Determine if this is a small product (paper) or big product (other)
        const isSmallProduct = product?.familyKey === "paper";

        if (isSmallProduct) {
          // Small product pricing logic
          const unitPrice = row.unitPriceOverride ?? product?.basePrice?.amount;
          const qty = row.qty ?? 0;
          const total = row.totalOverride ?? (unitPrice ? unitPrice * qty : 0);

          return {
            ...row,
            displayName: row.customName || product?.name || row.productKey || "",
            unitPrice,
            qty,
            total,
            frequency: row.frequency,
            productType: 'small',
            customFields: row.customFields || {}
          };
        } else {
          // Big product pricing logic
          const qty = row.qty ?? 0;
          const amount = row.amountOverride ?? product?.basePrice?.amount;
          const total = row.totalOverride ?? (amount ? amount * qty : 0);

          return {
            ...row,
            displayName: row.customName || product?.name || row.productKey || "",
            qty,
            amount,
            total,
            frequency: row.frequency,
            productType: 'big',
            customFields: row.customFields || {}
          };
        }
      });

      // Split merged products back into small/big for backend compatibility
      const enrichedSmallProducts = allProducts.filter(p => p.productType === 'small');
      const enrichedBigProducts = allProducts.filter(p => p.productType === 'big');

      const enrichedDispensers = data.dispensers.map((row) => {
        const product = getProduct(row);
        const qty = row.qty ?? 0;
        const warrantyRate = row.warrantyPriceOverride ?? product?.warrantyPricePerUnit?.amount;
        const replacementRate = row.replacementPriceOverride ?? product?.basePrice?.amount;
        const total = row.totalOverride ?? (replacementRate ? replacementRate * qty : 0);

        return {
          ...row,
          displayName: row.customName || product?.name || row.productKey || "",
          qty,
          warrantyRate,
          replacementRate,
          total,
          frequency: row.frequency,
          customFields: row.customFields || {}
        };
      });

      console.log("📊 [ProductsSection] getData() called");
      console.log("📊 [ProductsSection] Raw data state:", {
        productsCount: data.products.length,
        dispensersCount: data.dispensers.length,
        customColumnsProducts: extraCols.products.length,
        customColumnsDispensers: extraCols.dispensers.length
      });

      // Debug: Check if any products have customFields
      const productsWithCustomFields = allProducts.filter(p => p.customFields && Object.keys(p.customFields).length > 0);
      const dispensersWithCustomFields = enrichedDispensers.filter(d => d.customFields && Object.keys(d.customFields).length > 0);

      console.log("📊 [ProductsSection] Custom Fields Debug:", {
        productsWithCustomFields: productsWithCustomFields.length,
        dispensersWithCustomFields: dispensersWithCustomFields.length,
        customColumnDefs: {
          products: extraCols.products,
          dispensers: extraCols.dispensers
        }
      });

      // Debug: Show sample custom fields if they exist
      if (productsWithCustomFields.length > 0) {
        console.log("📊 [ProductsSection] Sample product with custom fields:", productsWithCustomFields[0]);
      }
      if (dispensersWithCustomFields.length > 0) {
        console.log("📊 [ProductsSection] Sample dispenser with custom fields:", dispensersWithCustomFields[0]);
      }

      return {
        smallProducts: enrichedSmallProducts,
        dispensers: enrichedDispensers,
        bigProducts: enrichedBigProducts,
        // Include custom column definitions
        customColumns: {
          products: extraCols.products,
          dispensers: extraCols.dispensers
        }
      };

      console.log("📊 [ProductsSection] Returning data:", {
        smallProductsCount: enrichedSmallProducts.length,
        dispensersCount: enrichedDispensers.length,
        bigProductsCount: enrichedBigProducts.length
      });
    }
  }), [data, getProduct]);

  // ---------------------------
  // Reference Tables for Salespeople
  // ---------------------------

  // Helper function to get product description
  const getProductDescription = (product: EnvProduct): string => {
    const descriptions: Record<string, string> = {
      // Paper Products
      'paper_towel_premium': 'High-quality paper towels for general cleaning and spill control',
      'paper_towel_standard': 'Standard paper towels for everyday cleaning tasks',
      'toilet_paper_premium': 'Premium toilet paper for guest restrooms and high-traffic areas',
      'toilet_paper_standard': 'Standard toilet paper for employee restrooms',
      'napkins_premium': 'High-quality napkins for dining areas and customer-facing spaces',
      'napkins_standard': 'Standard napkins for break rooms and staff areas',

      // Chemical Products
      'all_purpose_cleaner': 'Multi-surface cleaner for general cleaning tasks',
      'glass_cleaner': 'Streak-free glass and mirror cleaner',
      'disinfectant_spray': 'EPA-approved disinfectant for sanitizing surfaces',
      'floor_cleaner': 'Professional floor cleaning solution for all floor types',
      'degreaser': 'Heavy-duty degreaser for kitchen and industrial cleaning',
      'bathroom_cleaner': 'Specialized cleaner for bathroom fixtures and surfaces',

      // Dispensers
      'paper_towel_dispenser': 'Wall-mounted dispenser for paper towels',
      'toilet_paper_dispenser': 'Commercial toilet paper dispenser',
      'soap_dispenser': 'Automatic or manual soap dispenser',
      'sanitizer_dispenser': 'Touch-free hand sanitizer dispenser',
      'napkin_dispenser': 'Counter-top or wall-mounted napkin dispenser',

      // Default descriptions by family
      'paper': 'Paper product for cleaning and hygiene',
      'chemicals': 'Cleaning chemical for maintenance and sanitation',
      'dispensers': 'Dispenser for paper or liquid products',
      'equipment': 'Cleaning equipment and tools',
      'supplies': 'General cleaning supplies and accessories'
    };

    // Try exact key match first
    if (descriptions[product.key]) {
      return descriptions[product.key];
    }

    // Try family-based description
    if (descriptions[product.familyKey]) {
      return descriptions[product.familyKey];
    }

    // Generate description based on product kind or name
    if (product.kind) {
      return `${product.kind} - Professional cleaning product`;
    }

    // Default description
    return 'Professional cleaning product for commercial use';
  };

  const ProductsReferenceTable = () => {
    const productsForReference = getProductsForColumn("products", allProducts);

    return (
      <div className="reference-table-container">
        <div className="prod__ribbon">
          <div className="prod__title">PRODUCTS REFERENCE - FOR SALESPEOPLE</div>
        </div>
        <div className="reference-table-wrapper" style={{
          overflowX: 'auto',
          marginTop: '16px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px'
        }}>
          <table className="reference-table" style={{
            width: '100%',
            minWidth: '900px',
            borderCollapse: 'collapse',
            backgroundColor: '#fff'
          }}>
            <thead>
              <tr>
                <th className="h h-blue" style={{ width: '20%', minWidth: '180px' }}>Product Name</th>
                <th className="h h-blue" style={{ width: '30%', minWidth: '250px' }}>Description & Use Case</th>
                <th className="h h-blue center" style={{ width: '12%', minWidth: '100px' }}>Family</th>
                <th className="h h-blue center" style={{ width: '12%', minWidth: '100px' }}>Base Price</th>
                <th className="h h-blue center" style={{ width: '10%', minWidth: '80px' }}>Unit</th>
                <th className="h h-blue center" style={{ width: '16%', minWidth: '120px' }}>Case Info</th>
              </tr>
            </thead>
            <tbody>
              {productsForReference.map((product) => (
                <tr key={product.key}>
                  <td className="label" style={{
                    fontWeight: '600',
                    padding: '12px 8px',
                    borderBottom: '1px solid #e5e7eb',
                    wordWrap: 'break-word'
                  }}>
                    {product.name}
                  </td>
                  <td className="label" style={{
                    fontSize: '13px',
                    color: '#4b5563',
                    lineHeight: '1.4',
                    padding: '12px 8px',
                    borderBottom: '1px solid #e5e7eb',
                    wordWrap: 'break-word'
                  }}>
                    {getProductDescription(product)}
                  </td>
                  <td className="center" style={{
                    padding: '12px 8px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    {product.familyKey}
                  </td>
                  <td className="center" style={{
                    padding: '12px 8px',
                    borderBottom: '1px solid #e5e7eb',
                    fontWeight: '600',
                    color: '#059669'
                  }}>
                    ${product.basePrice?.amount ? product.basePrice.amount.toFixed(2) : 'N/A'}
                  </td>
                  <td className="center" style={{
                    padding: '12px 8px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    {product.basePrice?.uom || 'Each'}
                  </td>
                  <td className="center" style={{
                    padding: '12px 8px',
                    borderBottom: '1px solid #e5e7eb',
                    fontSize: '12px'
                  }}>
                    {product.quantityPerCase ? `${product.quantityPerCase} per case` : 'N/A'}
                    {product.basePrice?.unitSizeLabel && (
                      <div style={{fontSize: '11px', color: '#666', marginTop: '2px'}}>
                        {product.basePrice.unitSizeLabel}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Helper function to get dispenser description
  const getDispenserDescription = (dispenser: EnvProduct): string => {
    const descriptions: Record<string, string> = {
      // Specific dispenser descriptions
      'paper_towel_dispenser_basic': 'Basic wall-mounted paper towel dispenser for low-traffic areas',
      'paper_towel_dispenser_premium': 'Premium automatic paper towel dispenser with sensor activation',
      'toilet_paper_dispenser_single': 'Single-roll toilet paper dispenser for small restrooms',
      'toilet_paper_dispenser_double': 'Double-roll toilet paper dispenser for high-traffic restrooms',
      'soap_dispenser_manual': 'Manual push-button soap dispenser',
      'soap_dispenser_automatic': 'Touch-free automatic soap dispenser with sensor',
      'sanitizer_dispenser_wall': 'Wall-mounted hand sanitizer dispenser',
      'sanitizer_dispenser_floor': 'Floor-standing hand sanitizer dispenser for high-traffic areas',
      'napkin_dispenser_counter': 'Counter-top napkin dispenser for dining areas',
      'napkin_dispenser_wall': 'Wall-mounted napkin dispenser for break rooms',

      // General dispenser descriptions by type
      'paper_towel_dispenser': 'Reliable paper towel dispenser for commercial restrooms and kitchens',
      'toilet_paper_dispenser': 'Durable toilet paper dispenser designed for heavy commercial use',
      'soap_dispenser': 'Professional soap dispenser for maintaining proper hand hygiene',
      'sanitizer_dispenser': 'Hand sanitizer dispenser to promote health and safety protocols',
      'napkin_dispenser': 'Convenient napkin dispenser for food service and dining areas',
      'tissue_dispenser': 'Facial tissue dispenser for office and public spaces',
      'cup_dispenser': 'Paper cup dispenser for water stations and break rooms',
      'glove_dispenser': 'Disposable glove dispenser for food service and cleaning',

      // Default by family
      'dispensers': 'Commercial dispenser for maintaining supplies and hygiene standards'
    };

    // Try exact key match first
    if (descriptions[dispenser.key]) {
      return descriptions[dispenser.key];
    }

    // Try partial key matching for common dispenser types
    const keyLower = dispenser.key.toLowerCase();
    if (keyLower.includes('paper_towel')) return descriptions['paper_towel_dispenser'];
    if (keyLower.includes('toilet_paper')) return descriptions['toilet_paper_dispenser'];
    if (keyLower.includes('soap')) return descriptions['soap_dispenser'];
    if (keyLower.includes('sanitizer')) return descriptions['sanitizer_dispenser'];
    if (keyLower.includes('napkin')) return descriptions['napkin_dispenser'];
    if (keyLower.includes('tissue')) return descriptions['tissue_dispenser'];
    if (keyLower.includes('cup')) return descriptions['cup_dispenser'];
    if (keyLower.includes('glove')) return descriptions['glove_dispenser'];

    // Try name-based matching
    const nameLower = dispenser.name.toLowerCase();
    if (nameLower.includes('paper towel')) return descriptions['paper_towel_dispenser'];
    if (nameLower.includes('toilet paper')) return descriptions['toilet_paper_dispenser'];
    if (nameLower.includes('soap')) return descriptions['soap_dispenser'];
    if (nameLower.includes('sanitizer')) return descriptions['sanitizer_dispenser'];
    if (nameLower.includes('napkin')) return descriptions['napkin_dispenser'];

    // Default description
    return descriptions['dispensers'];
  };

  const DispensersReferenceTable = () => {
    const dispensersForReference = getProductsForColumn("dispensers", allProducts);

    return (
      <div className="reference-table-container">
        <div className="prod__ribbon">
          <div className="prod__title">DISPENSERS REFERENCE - FOR SALESPEOPLE</div>
        </div>
        <div className="reference-table-wrapper" style={{
          overflowX: 'auto',
          marginTop: '16px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px'
        }}>
          <table className="reference-table" style={{
            width: '100%',
            minWidth: '1100px',
            borderCollapse: 'collapse',
            backgroundColor: '#fff'
          }}>
            <thead>
              <tr>
                <th className="h h-blue" style={{ width: '18%', minWidth: '160px' }}>Dispenser Name</th>
                <th className="h h-blue" style={{ width: '25%', minWidth: '220px' }}>Description & Use Case</th>
                <th className="h h-blue center" style={{ width: '12%', minWidth: '100px' }}>Base Price</th>
                <th className="h h-blue center" style={{ width: '10%', minWidth: '80px' }}>Unit</th>
                <th className="h h-blue center" style={{ width: '12%', minWidth: '100px' }}>Warranty Rate</th>
                <th className="h h-blue center" style={{ width: '12%', minWidth: '100px' }}>Warranty Period</th>
                <th className="h h-blue center" style={{ width: '11%', minWidth: '90px' }}>Best For</th>
              </tr>
            </thead>
            <tbody>
              {dispensersForReference.map((dispenser) => (
                <tr key={dispenser.key}>
                  <td className="label" style={{
                    fontWeight: '600',
                    padding: '12px 8px',
                    borderBottom: '1px solid #e5e7eb',
                    wordWrap: 'break-word'
                  }}>
                    {dispenser.name}
                  </td>
                  <td className="label" style={{
                    fontSize: '13px',
                    color: '#4b5563',
                    lineHeight: '1.4',
                    padding: '12px 8px',
                    borderBottom: '1px solid #e5e7eb',
                    wordWrap: 'break-word'
                  }}>
                    {getDispenserDescription(dispenser)}
                  </td>
                  <td className="center" style={{
                    padding: '12px 8px',
                    borderBottom: '1px solid #e5e7eb',
                    fontWeight: '600',
                    color: '#059669'
                  }}>
                    ${dispenser.basePrice?.amount ? dispenser.basePrice.amount.toFixed(2) : 'N/A'}
                  </td>
                  <td className="center" style={{
                    padding: '12px 8px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    {dispenser.basePrice?.uom || 'Each'}
                  </td>
                  <td className="center" style={{
                    padding: '12px 8px',
                    borderBottom: '1px solid #e5e7eb',
                    fontWeight: '600',
                    color: '#dc2626'
                  }}>
                    ${dispenser.warrantyPricePerUnit?.amount ? dispenser.warrantyPricePerUnit.amount.toFixed(2) : 'N/A'}
                  </td>
                  <td className="center" style={{
                    padding: '12px 8px',
                    borderBottom: '1px solid #e5e7eb',
                    fontSize: '12px'
                  }}>
                    {dispenser.warrantyPricePerUnit?.billingPeriod || 'Per week'}
                  </td>
                  <td className="center" style={{
                    fontSize: '12px',
                    color: '#059669',
                    fontWeight: '500',
                    padding: '12px 8px',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    {dispenser.name.toLowerCase().includes('automatic') || dispenser.name.toLowerCase().includes('sensor') ? 'High Traffic' :
                     dispenser.name.toLowerCase().includes('premium') || dispenser.name.toLowerCase().includes('commercial') ? 'Commercial Use' :
                     dispenser.name.toLowerCase().includes('basic') || dispenser.name.toLowerCase().includes('standard') ? 'Standard Use' :
                     'All Areas'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ---------------------------
  // Tab Navigation Component
  // ---------------------------

  const TabNavigation = () => (
    <div className="product-tabs-container">
      <div className="product-tabs">
        <button
          type="button"
          className={`product-tab ${currentTab === 'form' ? 'active' : ''}`}
          onClick={() => handleTabChange('form')}
        >
          Form
        </button>
        <button
          type="button"
          className={`product-tab ${currentTab === 'products' ? 'active' : ''}`}
          onClick={() => handleTabChange('products')}
        >
          Products Reference
        </button>
        <button
          type="button"
          className={`product-tab ${currentTab === 'dispensers' ? 'active' : ''}`}
          onClick={() => handleTabChange('dispensers')}
        >
          Dispensers Reference
        </button>
      </div>
    </div>
  );

  // ---------------------------
  // Desktop table
  // ---------------------------

  const DesktopTable = () => {
    return (
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
                {/* Products band */}
                <th className="h h-blue">Products</th>
                <th className="h h-blue center">Qty</th>
                <th className="h h-blue center">Unit Price/Amount</th>
                <th className="h h-blue center">Frequency of Service</th>
                <th className="h h-blue center">Total</th>
                {extraCols.products.map((col) => (
                  <th className="h h-blue center th-edit" key={col.id}>
                    <textarea
                      className="th-edit-input"
                      value={col.label}
                      onChange={(e) =>
                        changeColLabel("products", col.id, e.target.value)
                      }
                      rows={1}
                    />
                    <button
                      className="th-remove"
                      title="Remove column"
                      type="button"
                      onClick={() => removeCol("products", col.id)}
                    >
                      –
                    </button>
                  </th>
                ))}

                {/* Dispensers band */}
                <th className="h h-blue">Dispensers</th>
                <th className="h h-blue center">Qty</th>
                <th className="h h-blue center">Warranty Rate</th>
                <th className="h h-blue center">Replacement Rate/Install</th>
                <th className="h h-blue center">Frequency of Service</th>
                <th className="h h-blue center">Total</th>
                {extraCols.dispensers.map((col) => (
                  <th className="h h-blue center th-edit" key={col.id}>
                    <textarea
                      className="th-edit-input"
                      value={col.label}
                      onChange={(e) =>
                        changeColLabel("dispensers", col.id, e.target.value)
                      }
                      rows={1}
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
              {Array.from({ length: rowsCount }).map((_, i) => {
                const rowProduct = data.products[i];
                const rowDisp = data.dispensers[i];

                const pProduct = getProduct(rowProduct);
                const pDisp = getProduct(rowDisp);

                // Row key for React
                const rowKey = `${rowProduct?.id ?? `p${i}`}_${rowDisp?.id ?? `d${i}`}`;

                return (
                  <tr key={rowKey}>
                    {/* Products column */}
                    {rowProduct ? (
                      <>
                        <td className="label">
                          <NameCell
                            product={pProduct}
                            options={getRowOptions("products", rowProduct.id)}
                            onChangeProduct={(key) =>
                              updateRowProductKey("products", rowProduct.id, key)
                            }
                            onSelectCustom={() =>
                              updateRowField("products", rowProduct.id, {
                                productKey: null,
                                isCustom: true,
                                customName: "",
                              })
                            }
                            isCustom={rowProduct.isCustom}
                            customName={rowProduct.customName}
                            onChangeCustomName={(name) =>
                              updateRowField("products", rowProduct.id, {
                                customName: name,
                              })
                            }
                            onRemove={() =>
                              removeRow("products", rowProduct.id)
                            }
                          />
                        </td>
                        <td className="center">
                          <QtyCell
                            value={rowProduct.qty ?? ""}
                            onChange={(val) =>
                              updateRowField("products", rowProduct.id, {
                                qty: val === "" ? undefined : (val as number),
                              })
                            }
                          />
                        </td>
                        <td>
                          <DollarCell
                            value={
                              (pProduct?.familyKey === "paper"
                                ? rowProduct.unitPriceOverride ?? pProduct?.basePrice?.amount
                                : rowProduct.amountOverride ?? pProduct?.basePrice?.amount
                              ) ?? ""
                            }
                            onChange={(val) => {
                              const field = pProduct?.familyKey === "paper" ? "unitPriceOverride" : "amountOverride";
                              updateRowField("products", rowProduct.id, {
                                [field]: val === "" ? undefined : (val as number),
                              });
                            }}
                          />
                        </td>
                        <td className="center">
                          <FrequencyCell
                            value={rowProduct.frequency}
                            onChange={(val) =>
                              updateRowField("products", rowProduct.id, {
                                frequency: val,
                              })
                            }
                          />
                        </td>
                        <td>
                          <DollarCell
                            value={
                              (rowProduct.totalOverride ??
                              ((pProduct?.familyKey === "paper"
                                ? getSmallUnitPrice(rowProduct, pProduct)
                                : getBigAmount(rowProduct, pProduct)
                              ) * getQty(rowProduct))) || ""
                            }
                            onChange={(val) =>
                              updateRowField("products", rowProduct.id, {
                                totalOverride:
                                  val === "" ? undefined : (val as number),
                              })
                            }
                          />
                        </td>
                        {extraCols.products.map((col) => (
                          <td key={col.id}>
                            <DollarCell
                              value={rowProduct.customFields?.[col.id] ?? ""}
                              onChange={(val) =>
                                updateRowField("products", rowProduct.id, {
                                  customFields: {
                                    ...rowProduct.customFields,
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
                        <td className="center"><PlainCell /></td>
                        <td><PlainCell /></td>
                        <td className="center"><PlainCell /></td>
                        <td><PlainCell /></td>
                        {extraCols.products.map((col) => (
                          <td key={col.id}><PlainCell /></td>
                        ))}
                      </>
                    )}

                    {/* Dispensers column */}
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
                        <td className="center">
                          <FrequencyCell
                            value={rowDisp.frequency}
                            onChange={(val) =>
                              updateRowField("dispensers", rowDisp.id, {
                                frequency: val,
                              })
                            }
                          />
                        </td>
                        <td>
                          <DollarCell
                            value={
                              (rowDisp.totalOverride ??
                              getDispReplacementPrice(rowDisp, pDisp) *
                                getQty(rowDisp)) || ""
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
                        <td className="center"><PlainCell /></td>
                        <td><PlainCell /></td>
                        <td><PlainCell /></td>
                        <td className="center"><PlainCell /></td>
                        <td><PlainCell /></td>
                        {extraCols.dispensers.map((col) => (
                          <td key={col.id}><PlainCell /></td>
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
  };

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
              {bucket === "products" ? (
                <>
                  <th className="h h-blue center">Qty</th>
                  <th className="h h-blue center">Unit Price/Amount</th>
                  <th className="h h-blue center">Frequency of Service</th>
                  <th className="h h-blue center">Total</th>
                </>
              ) : bucket === "dispensers" ? (
                <>
                  <th className="h h-blue center">Qty</th>
                  <th className="h h-blue center">Warranty Rate</th>
                  <th className="h h-blue center">
                    Replacement Rate/Install
                  </th>
                  <th className="h h-blue center">Frequency of Service</th>
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
                  <textarea
                    className="th-edit-input"
                    value={col.label}
                    onChange={(e) =>
                      changeColLabel(extraKey, col.id, e.target.value)
                    }
                    rows={1}
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

  const GroupedTables = () => {
    return (
      <>
        <div className="prod__ribbon">
          <div className="prod__title">PRODUCTS</div>
        </div>

        {/* Products grouped table */}
        <GroupedTable
          title="Products"
          bucket="products"
          renderAmountCells={(row, product) => {
            // Determine if this is a paper product (small) or other product (big)
            const isSmallProduct = product?.familyKey === "paper";

            return (
              <>
                <td className="center">
                  <QtyCell
                    value={row.qty ?? ""}
                    onChange={(val) =>
                      updateRowField("products", row.id, {
                        qty: val === "" ? undefined : (val as number),
                      })
                    }
                  />
                </td>
                <td>
                  <DollarCell
                    value={
                      isSmallProduct
                        ? (row.unitPriceOverride ?? product?.basePrice?.amount ?? "")
                        : (row.amountOverride ?? product?.basePrice?.amount ?? "")
                    }
                    onChange={(val) => {
                      const field = isSmallProduct ? "unitPriceOverride" : "amountOverride";
                      updateRowField("products", row.id, {
                        [field]: val === "" ? undefined : (val as number),
                      });
                    }}
                  />
                </td>
                <td className="center">
                  <FrequencyCell
                    value={row.frequency}
                    onChange={(val) =>
                      updateRowField("products", row.id, {
                        frequency: val,
                      })
                    }
                  />
                </td>
                <td>
                  <DollarCell
                    value={
                      (row.totalOverride ??
                      (isSmallProduct
                        ? getSmallUnitPrice(row, product) * getQty(row)
                        : getBigAmount(row, product) * getQty(row)
                      )) || ""
                    }
                    onChange={(val) =>
                      updateRowField("products", row.id, {
                        totalOverride: val === "" ? undefined : (val as number),
                      })
                    }
                  />
                </td>
              </>
            );
          }}
        />

        {/* Dispensers grouped table */}
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
              <td className="center">
                <FrequencyCell
                  value={row.frequency}
                  onChange={(val) =>
                    updateRowField("dispensers", row.id, {
                      frequency: val,
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
      </>
    );
  };

  return (
    <section className="prod">
      <TabNavigation />

      {loading && (
        <div className="loading-message">
          Loading products...
        </div>
      )}

      {!loading && (
        <>
          {currentTab === 'form' && (
            isDesktop ? DesktopTable() : GroupedTables()
          )}
          {currentTab === 'products' && <ProductsReferenceTable />}
          {currentTab === 'dispensers' && <DispensersReferenceTable />}
        </>
      )}
    </section>
  );
});

ProductsSection.displayName = "ProductsSection";
export default ProductsSection;
