import { useEffect, useState, useRef, useMemo } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import CustomerSection from "./CustomerSection";
import ProductsSection from "./products/ProductsSection";
import type { ProductsSectionHandle } from "./products/ProductsSection";
import "./FormFilling.css";
import { ServicesSection } from "./services/ServicesSection";
import ServicesDataCollector from "./services/ServicesDataCollector";
import type{ ServicesDataHandle } from "./services/ServicesDataCollector";
import { ServicesProvider } from "./services/ServicesContext";
import ConfirmationModal from "./ConfirmationModal";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { pdfApi } from "../backendservice/api";

type HeaderRow = {
  labelLeft: string;
  valueLeft: string;
  labelRight: string;
  valueRight: string;
};

type ProductsPayload = {
  headers: string[];
  rows: string[][];
  smallProducts?: any[];
  dispensers?: any[];
  bigProducts?: any[];
};

type ServiceLine = {
  type: "line" | "bold" | "atCharge";
  label: string;
  value?: string;
  v1?: string;
  v2?: string;
  v3?: string;
};

type ServiceBlock = {
  heading: string;
  rows: ServiceLine[];
};

type ServicesPayload = {
  topRow: ServiceBlock[];
  bottomRow: ServiceBlock[];
  refreshPowerScrub: {
    heading: string;
    columns: string[];
    freqLabels: string[];
  };
  notes: {
    heading: string;
    lines: number;
    textLines: string[];
  };
};

type AgreementPayload = {
  enviroOf: string;
  customerExecutedOn: string;
  additionalMonths: string;
};

export type FormPayload = {
  headerTitle: string;
  headerRows: HeaderRow[];
  products: ProductsPayload;
  services: ServicesPayload;
  agreement: AgreementPayload;
  customColumns?: {
    products: { id: string; label: string }[];
    dispensers: { id: string; label: string }[];
  };
};

type LocationState = {
  editing?: boolean;
  id?: string;
  returnPath?: string;
  returnState?: any;
};

// customer document we were using before (for saving when not editing an existing one)
const CUSTOMER_FALLBACK_ID = "6918cecbf0b2846a9c562fd6";
// admin template for "new" forms (read-only template to prefill)
const ADMIN_TEMPLATE_ID = "692dc43b3811afcdae0d5547";

export default function FormFilling() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: urlId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [payload, setPayload] = useState<FormPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false); // Track if we're in edit mode

  // Detect if we're in edit mode based on URL path
  const isInEditMode = location.pathname.startsWith('/edit/pdf');
  const locationState = (location.state ?? {}) as LocationState;

  // Get tab parameters from URL
  const productTab = searchParams.get('productTab') || undefined;
  const serviceTab = searchParams.get('serviceTab') || undefined;

  // Refs to collect data from child components
  const productsRef = useRef<ProductsSectionHandle>(null);
  const servicesRef = useRef<ServicesDataHandle>(null);

  // Handle back navigation
  const handleBack = () => {
    if (locationState.returnPath && locationState.returnState) {
      navigate(locationState.returnPath, { state: locationState.returnState });
    } else if (locationState.returnPath) {
      navigate(locationState.returnPath);
    } else {
      navigate(-1); // Fallback to browser back
    }
  };

  useEffect(() => {
    // Extract editing and id from location.state inside useEffect to ensure fresh values
    const { editing = false, id } = locationState;

    // Use URL param if available, otherwise use location state id
    const finalId = urlId || id;

    // Update documentId when location changes
    setDocumentId(finalId || null);
    setIsEditMode(editing || isInEditMode); // Set edit mode state based on URL or state

    // ---- PICK API FOR INITIAL DATA ----
    const useCustomerDoc = (editing || isInEditMode) && !!finalId;

    const fetchHeaders = async () => {
      setLoading(true);
      try {
        const json = useCustomerDoc
          ? await pdfApi.getCustomerHeaderForEdit(finalId!) // ← FIXED: Use edit-format endpoint
          : await pdfApi.getAdminHeaderById(ADMIN_TEMPLATE_ID);

        const fromBackend = json.payload ?? json;

        console.log("📋 [FormFilling] Loaded from backend:", {
          isEditMode: useCustomerDoc,
          endpoint: useCustomerDoc ? 'edit-format' : 'admin-template',
          hasServices: !!fromBackend.services,
          services: fromBackend.services,
          servicesKeys: fromBackend.services ? Object.keys(fromBackend.services) : [],
          hasProducts: !!fromBackend.products,
          productsStructure: fromBackend.products ? Object.keys(fromBackend.products) : []
        });

        const cleanPayload: FormPayload = {
          headerTitle: fromBackend.headerTitle ?? "Customer Update Addendum",
          headerRows: fromBackend.headerRows ?? [],
          products: fromBackend.products ?? {
            headers: [],
            rows: [],
          },
          services: fromBackend.services ?? {},
          agreement: {
            enviroOf: fromBackend.agreement?.enviroOf ?? "",
            customerExecutedOn:
              fromBackend.agreement?.customerExecutedOn ?? "",
            additionalMonths:
              fromBackend.agreement?.additionalMonths ?? "",
          },
          customColumns: fromBackend.customColumns ?? { products: [], dispensers: [] }, // ← Include custom columns from backend
        };

        setPayload(cleanPayload);
      } catch (err) {
        console.error("Error fetching headers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHeaders();
  }, [location, urlId]);

  const handleHeaderRowsChange = (rows: HeaderRow[]) => {
    setPayload((prev) => (prev ? { ...prev, headerRows: rows } : prev));
  };

  // Helper function to transform products data to backend format
  const transformProductsToBackendFormat = (productsData: any) => {
    const { smallProducts, dispensers, bigProducts } = productsData;

    // MERGE small and big products into single "products" array for 2-category backend
    const mergedProducts = [
      // Small products with unitPrice
      ...smallProducts.map((p: any) => ({
        displayName: p.displayName || "",
        qty: p.qty || 0,
        unitPrice: p.unitPrice || 0,
        frequency: p.frequency || "",
        total: p.total || 0,
        customFields: p.customFields || {}, // ✅ Include custom fields
      })),
      // Big products with amount
      ...bigProducts.map((b: any) => ({
        displayName: b.displayName || "",
        qty: b.qty || 0,
        amount: b.amount || 0,
        frequency: b.frequency || "",
        total: b.total || 0,
        customFields: b.customFields || {}, // ✅ Include custom fields
      }))
    ];

    const transformedDispensers = dispensers.map((d: any) => ({
      displayName: d.displayName || "",
      qty: d.qty || 0,
      warrantyRate: d.warrantyRate || 0,
      replacementRate: d.replacementRate || 0,
      frequency: d.frequency || "",
      total: d.total || 0,
      customFields: d.customFields || {}, // ✅ Include custom fields
    }));

    // Return 2-category structure that backend expects
    return {
      products: mergedProducts,  // MERGED: small + big products combined
      dispensers: transformedDispensers,
    };
  };

  // Helper function to collect all current form data
  const collectFormData = () => {
    // Get products data from ProductsSection ref
    const productsData = productsRef.current?.getData() || {
      smallProducts: [],
      dispensers: [],
      bigProducts: [],
    };

    console.log("📦 Products data from ProductsSection:", productsData);

    // Transform products to backend format
    const productsForBackend = transformProductsToBackendFormat(productsData);

    console.log("📦 Products transformed for backend (2-category):", productsForBackend);
    console.log("📦 Merged products count:", productsForBackend.products.length);
    console.log("📦 Dispensers count:", productsForBackend.dispensers.length);

    // Get services data from ServicesDataCollector ref
    const servicesData = servicesRef.current?.getData() || {
      saniclean: null,
      foamingDrain: null,
      saniscrub: null,
      microfiberMopping: null,
      rpmWindows: null,
      refreshPowerScrub: null,
      sanipod: null,
      carpetclean: null,
      janitorial: null,
      stripwax: null,
    };

    // Extract customer name from headerRows
    const customerName = extractCustomerName(payload?.headerRows || []);

    return {
      headerTitle: payload?.headerTitle || "",
      headerRows: payload?.headerRows || [],
      products: productsForBackend,
      services: servicesData,
      agreement: payload?.agreement || {
        enviroOf: "",
        customerExecutedOn: "",
        additionalMonths: "",
      },
      customerName, // Add customer name for PDF filename
      customColumns: productsData.customColumns || { products: [], dispensers: [] }, // Include custom columns
    };
  };

  // Helper function to extract customer name from headerRows
  const extractCustomerName = (headerRows: HeaderRow[]): string => {
    for (const row of headerRows) {
      // Check left side
      if (row.labelLeft && row.labelLeft.toUpperCase().includes("CUSTOMER NAME")) {
        return row.valueLeft?.trim() || "Unnamed_Customer";
      }
      // Check right side
      if (row.labelRight && row.labelRight.toUpperCase().includes("CUSTOMER NAME")) {
        return row.valueRight?.trim() || "Unnamed_Customer";
      }
    }
    return "Unnamed_Customer";
  };

  // Draft handler: Save without PDF compilation and Zoho
  const handleDraft = async () => {
    if (!payload) return;

    setIsSaving(true);

    const payloadToSend = {
      ...collectFormData(), // Collect current data from all child components
      status: "draft",
    };

    try {
      if (documentId) {
        // Update existing draft
        await pdfApi.updateCustomerHeader(documentId, payloadToSend);
        console.log("Draft updated successfully");
        setToastMessage({ message: "Draft saved successfully!", type: "success" });
      } else {
        // Create new draft
        const result = await pdfApi.createCustomerHeader(payloadToSend);
        const newId = result.headers["x-customerheaderdoc-id"] || result.data._id || result.data.id;
        setDocumentId(newId);
        console.log("Draft created successfully with ID:", newId);
        setToastMessage({ message: "Draft saved successfully!", type: "success" });
      }
    } catch (err) {
      console.error("Error saving draft:", err);
      setToastMessage({ message: "Failed to save draft. Please try again.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  // Save handler: Save with PDF compilation and Zoho
  const handleSave = async () => {
    if (!payload) return;

    setIsSaving(true);
    setShowSaveModal(false);

    const payloadToSend = {
      ...collectFormData(), // Collect current data from all child components
      status: "pending_approval",
    };

    // Log the complete payload being sent to backend
    console.log("📤 [FormFilling] COMPLETE PAYLOAD BEING SENT TO BACKEND:");
    console.log(JSON.stringify(payloadToSend, null, 2));
    console.log("📤 [FormFilling] SERVICES DATA:");
    console.log(JSON.stringify(payloadToSend.services, null, 2));

    try {
      if (documentId) {
        // Update existing document with PDF recompilation
        await pdfApi.updateAndRecompileCustomerHeader(documentId, payloadToSend);
        console.log("Document saved and PDF compiled");
        setToastMessage({ message: "Form saved and PDF generated successfully!", type: "success" });

        // Redirect to saved files after a short delay to show the success message
        setTimeout(() => {
          navigate("/saved-pdfs");
        }, 1500);
      } else {
        // Create new document with PDF compilation
        const result = await pdfApi.createCustomerHeader(payloadToSend);
        const newId = result.headers["x-customerheaderdoc-id"] || result.data._id || result.data.id;
        setDocumentId(newId);
        console.log("Document created and PDF compiled:", newId);
        setToastMessage({ message: "Form saved and PDF generated successfully!", type: "success" });

        // Redirect to saved files after a short delay to show the success message
        setTimeout(() => {
          navigate("/saved-pdfs");
        }, 1500);
      }
    } catch (err) {
      console.error("Error saving document:", err);
      setToastMessage({ message: "Failed to save document. Please try again.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to safely parse numbers, returning undefined for empty/invalid values
  const safeParseFloat = (value: string | undefined): number | undefined => {
    if (!value || value.trim() === "") return undefined;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  };

  const safeParseInt = (value: string | undefined): number | undefined => {
    if (!value || value.trim() === "") return undefined;
    const parsed = parseInt(value);
    return isNaN(parsed) ? undefined : parsed;
  };

  // Helper function to extract products from backend format
  const extractProductsFromBackend = () => {
    const products = payload?.products;
    if (!products) {
      return {
        smallProducts: undefined,
        dispensers: undefined,
        bigProducts: undefined,
      };
    }

    console.log("🔍 [extractProductsFromBackend] Raw products data:", products);

    // Check if backend sent data in edit-format (products[] + dispensers[])
    if (products.products && products.dispensers) {
      console.log("✅ [extractProductsFromBackend] Using edit-format structure");

      // Extract products array (which contains merged small + big products)
      const extractedProducts = products.products.map((p: any) => {
        const name = p.displayName || p.customName || p.productName || p.productKey || "";
        const productType = p._productType || (p.unitPrice ? 'small' : 'big');

        if (productType === 'small') {
          return {
            name,
            unitPrice: safeParseFloat(String(p.unitPrice || "")),
            qty: safeParseInt(String(p.qty || "")),
            frequency: p.frequency || "", // ← PRESERVED from edit-format endpoint
            total: safeParseFloat(String(p.total || "")),
            customFields: p.customFields || {}, // ← PRESERVE custom fields
          };
        } else {
          return {
            name,
            qty: safeParseInt(String(p.qty || "")),
            amount: safeParseFloat(String(p.amount || "")),
            frequency: p.frequency || "", // ← PRESERVED from edit-format endpoint
            total: safeParseFloat(String(p.total || "")),
            customFields: p.customFields || {}, // ← PRESERVE custom fields
          };
        }
      });

      // Separate small and big products
      const smallProducts = extractedProducts.filter(p => 'unitPrice' in p);
      const bigProducts = extractedProducts.filter(p => 'amount' in p);

      // Extract dispensers with preserved frequency
      const extractedDispensers = products.dispensers.map((d: any) => {
        const name = d.displayName || d.customName || d.productName || d.productKey || "";
        return {
          name,
          qty: safeParseInt(String(d.qty || "")),
          warrantyRate: safeParseFloat(String(d.warrantyRate || "")),
          replacementRate: safeParseFloat(String(d.replacementRate || "")),
          frequency: d.frequency || "", // ← CRITICAL: PRESERVED from edit-format endpoint
          total: safeParseFloat(String(d.total || "")),
          customFields: d.customFields || {}, // ← PRESERVE custom fields
        };
      });

      console.log("✅ [extractProductsFromBackend] Extracted data:", {
        smallProducts: smallProducts.length,
        bigProducts: bigProducts.length,
        dispensers: extractedDispensers.length,
        dispenserFrequencies: extractedDispensers.map(d => ({ name: d.name, frequency: d.frequency }))
      });

      return {
        smallProducts: smallProducts.length > 0 ? smallProducts : undefined,
        dispensers: extractedDispensers.length > 0 ? extractedDispensers : undefined,
        bigProducts: bigProducts.length > 0 ? bigProducts : undefined,
      };
    }

    // Check if backend sent data in legacy format (smallProducts/dispensers/bigProducts)
    if (products.smallProducts || products.dispensers || products.bigProducts) {
      console.log("⚠️ [extractProductsFromBackend] Using legacy 3-array structure");

      // Legacy format - extract fields the backend sends
      const extractProductData = (productArray: any[], type: 'small' | 'dispenser' | 'big') => {
        return productArray.map((p: any) => {
          // Backend can send: displayName, productName, customName, or productKey
          const name = p.displayName || p.productName || p.customName || p.productKey || "";

          if (type === 'small') {
            return {
              name,
              unitPrice: safeParseFloat(String(p.unitPrice || p.unitPriceOverride || p.amountPerUnit || p.amount || "")),
              qty: safeParseInt(String(p.qty || p.quantity || "")),
              frequency: p.frequency || "",
              total: safeParseFloat(String(p.total || p.totalOverride || p.lineTotal || p.extPrice || "")),
            };
          } else if (type === 'dispenser') {
            return {
              name,
              qty: safeParseInt(String(p.qty || p.quantity || "")),
              warrantyRate: safeParseFloat(String(p.warrantyRate || p.warrantyPriceOverride || p.warranty || "")),
              replacementRate: safeParseFloat(String(p.replacementRate || p.replacementPriceOverride || p.replacement || "")),
              frequency: p.frequency || "",
              total: safeParseFloat(String(p.total || p.totalOverride || p.lineTotal || p.extPrice || "")),
            };
          } else { // big
            return {
              name,
              qty: safeParseInt(String(p.qty || p.quantity || "")),
              amount: safeParseFloat(String(p.amount || p.amountPerUnit || p.unitPriceOverride || p.unitPrice || "")),
              frequency: p.frequency || "",
              total: safeParseFloat(String(p.total || p.totalOverride || p.lineTotal || p.extPrice || "")),
            };
          }
        });
      };

      return {
        smallProducts: products.smallProducts ? extractProductData(products.smallProducts, 'small') : undefined,
        dispensers: products.dispensers ? extractProductData(products.dispensers, 'dispenser') : undefined,
        bigProducts: products.bigProducts ? extractProductData(products.bigProducts, 'big') : undefined,
      };
    }

    // Legacy format - extract from rows (for backward compatibility)
    const rows = products.rows;
    if (!rows || rows.length === 0) {
      return {
        smallProducts: undefined,
        dispensers: undefined,
        bigProducts: undefined,
      };
    }

    const smallProducts: any[] = [];
    const dispensers: any[] = [];
    const bigProducts: any[] = [];

    rows.forEach((row: string[]) => {
      // Small products (columns 0-4): name, unitPrice, frequency, qty, total
      if (row[0] && row[0].trim() !== "") {
        smallProducts.push({
          name: row[0],
          unitPrice: safeParseFloat(row[1]),
          frequency: row[2] || "",
          qty: safeParseInt(row[3]),
          total: safeParseFloat(row[4]),
        });
      }

      // Dispensers (columns 5-10): name, qty, warrantyRate, replacementRate, frequency, total
      if (row[5] && row[5].trim() !== "") {
        dispensers.push({
          name: row[5],
          qty: safeParseInt(row[6]),
          warrantyRate: safeParseFloat(row[7]),
          replacementRate: safeParseFloat(row[8]),
          frequency: row[9] || "",
          total: safeParseFloat(row[10]),
        });
      }

      // Big products (columns 11-15): name, qty, amount, frequency, total
      if (row[11] && row[11].trim() !== "") {
        bigProducts.push({
          name: row[11],
          qty: safeParseInt(row[12]),
          amount: safeParseFloat(row[13]),
          frequency: row[14] || "",
          total: safeParseFloat(row[15]),
        });
      }
    });

    return {
      smallProducts: smallProducts.length > 0 ? smallProducts : undefined,
      dispensers: dispensers.length > 0 ? dispensers : undefined,
      bigProducts: bigProducts.length > 0 ? bigProducts : undefined,
    };
  };

  // Extract products when payload is available
  // ONLY use initial products if we're in EDIT MODE
  const extractedProducts = useMemo(() => {
    // If NOT in edit mode, return undefined so ProductsSection uses catalog defaults
    if (!isEditMode) {
      return { smallProducts: undefined, dispensers: undefined, bigProducts: undefined };
    }

    // If in edit mode, use saved products
    if (!payload?.products) return { smallProducts: undefined, dispensers: undefined, bigProducts: undefined };
    return extractProductsFromBackend();
  }, [payload?.products, isEditMode]);

  console.log("📦 Initial products extracted from payload:", {
    isEditMode,
    extractedProducts,
    rawProductRows: payload?.products?.rows
  });

  console.log("🔧 Services being passed to ServicesSection:", {
    hasPayload: !!payload,
    servicesData: payload?.services,
    servicesKeys: payload?.services ? Object.keys(payload.services) : []
  });

  return (
    <ServicesProvider>
      <div className={`center-align ${isInEditMode ? 'edit-mode-container' : ''}`}>
        {isInEditMode && (
          <div className="edit-mode-header">
            <button
              type="button"
              className="edit-back-button"
              onClick={handleBack}
              title="Go back"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              <span>Back</span>
            </button>
          </div>
        )}

        {loading && !payload && (
          <div className="formfilling__loading">Loading…</div>
        )}

        {payload && (
          <>
            <CustomerSection
              headerTitle={payload.headerTitle}
              headerRows={payload.headerRows}
              onHeaderRowsChange={handleHeaderRowsChange}
            />

            <ProductsSection
              ref={productsRef}
              initialSmallProducts={extractedProducts.smallProducts}
              initialDispensers={extractedProducts.dispensers}
              initialBigProducts={extractedProducts.bigProducts}
              initialCustomColumns={payload?.customColumns}
              activeTab={productTab}
              onTabChange={(tab) => {
                const newParams = new URLSearchParams(searchParams);
                if (tab) {
                  newParams.set('productTab', tab);
                } else {
                  newParams.delete('productTab');
                }
                setSearchParams(newParams, { replace: true });
              }}
            />

            <ServicesSection
              initialServices={payload.services}
              activeTab={serviceTab}
              onTabChange={(tab) => {
                const newParams = new URLSearchParams(searchParams);
                if (tab) {
                  newParams.set('serviceTab', tab);
                } else {
                  newParams.delete('serviceTab');
                }
                setSearchParams(newParams, { replace: true });
              }}
            />
            <ServicesDataCollector ref={servicesRef} />

            <div className="formfilling__actions">
              <button
                type="button"
                className="formfilling__draftBtn"
                onClick={handleDraft}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save as Draft"}
              </button>
              <button
                type="button"
                className="formfilling__saveBtn"
                onClick={() => setShowSaveModal(true)}
                disabled={isSaving}
              >
                Save & Generate PDF
              </button>
            </div>
          </>
        )}

        <ConfirmationModal
          isOpen={showSaveModal}
          title="Confirm Save"
          message="Are you sure you want to save this form and convert it to PDF? This will compile the document and store it in Zoho CRM."
          confirmText="Yes, Save & Generate"
          cancelText="Cancel"
          onConfirm={handleSave}
          onCancel={() => setShowSaveModal(false)}
        />

        {toastMessage && (
          <Toast
            message={toastMessage.message}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        )}
      </div>
    </ServicesProvider>
  );
}
