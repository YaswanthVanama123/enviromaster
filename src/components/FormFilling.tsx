import { useEffect, useState, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
};

type LocationState = {
  editing?: boolean;
  id?: string;
};

// customer document we were using before (for saving when not editing an existing one)
const CUSTOMER_FALLBACK_ID = "6918cecbf0b2846a9c562fd6";
// admin template for "new" forms (read-only template to prefill)
const ADMIN_TEMPLATE_ID = "692dc43b3811afcdae0d5547";

export default function FormFilling() {
  const location = useLocation();
  const navigate = useNavigate();

  const [payload, setPayload] = useState<FormPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false); // Track if we're in edit mode

  // Refs to collect data from child components
  const productsRef = useRef<ProductsSectionHandle>(null);
  const servicesRef = useRef<ServicesDataHandle>(null);

  useEffect(() => {
    // Extract editing and id from location.state inside useEffect to ensure fresh values
    const { editing = false, id }: LocationState = (location.state ?? {}) as LocationState;

    // Update documentId when location changes
    setDocumentId(id || null);
    setIsEditMode(editing); // Set edit mode state

    // ---- PICK API FOR INITIAL DATA ----
    const useCustomerDoc = editing && !!id;

    const fetchHeaders = async () => {
      setLoading(true);
      try {
        const json = useCustomerDoc
          ? await pdfApi.getCustomerHeaderById(id!)
          : await pdfApi.getAdminHeaderById(ADMIN_TEMPLATE_ID);

        const fromBackend = json.payload ?? json;

        console.log("📋 [FormFilling] Loaded from backend:", {
          isEditMode: useCustomerDoc,
          hasServices: !!fromBackend.services,
          services: fromBackend.services,
          servicesKeys: fromBackend.services ? Object.keys(fromBackend.services) : []
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
        };

        setPayload(cleanPayload);
      } catch (err) {
        console.error("Error fetching headers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHeaders();
  }, [location]);

  const handleHeaderRowsChange = (rows: HeaderRow[]) => {
    setPayload((prev) => (prev ? { ...prev, headerRows: rows } : prev));
  };

  // Helper function to transform products data to backend format
  const transformProductsToBackendFormat = (productsData: any) => {
    const { smallProducts, dispensers, bigProducts } = productsData;

    // Transform to array of products with proper field names for backend
    const transformedSmallProducts = smallProducts.map((p: any) => ({
      displayName: p.displayName || "",
      qty: p.qty || 0,
      unitPrice: p.unitPrice || 0,
      total: p.total || 0,
    }));

    const transformedDispensers = dispensers.map((d: any) => ({
      displayName: d.displayName || "",
      qty: d.qty || 0,
      warrantyRate: d.warrantyRate || 0,
      replacementRate: d.replacementRate || 0,
      total: d.total || 0,
    }));

    const transformedBigProducts = bigProducts.map((b: any) => ({
      displayName: b.displayName || "",
      qty: b.qty || 0,
      amount: b.amount || 0,
      total: b.total || 0,
    }));

    return {
      smallProducts: transformedSmallProducts,
      dispensers: transformedDispensers,
      bigProducts: transformedBigProducts,
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

    console.log("📦 Products transformed for backend:", productsForBackend);

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

    // Check if backend sent data in new format (smallProducts/dispensers/bigProducts)
    if (products.smallProducts || products.dispensers || products.bigProducts) {
      // New format - extract fields the backend sends
      const extractProductData = (productArray: any[], type: 'small' | 'dispenser' | 'big') => {
        return productArray.map((p: any) => {
          // Backend can send: displayName, productName, customName, or productKey
          const name = p.displayName || p.productName || p.customName || p.productKey || "";

          if (type === 'small') {
            return {
              name,
              unitPrice: safeParseFloat(String(p.unitPrice || p.unitPriceOverride || p.amountPerUnit || p.amount || "")),
              qty: safeParseInt(String(p.qty || p.quantity || "")),
              total: safeParseFloat(String(p.total || p.totalOverride || p.lineTotal || p.extPrice || "")),
            };
          } else if (type === 'dispenser') {
            return {
              name,
              qty: safeParseInt(String(p.qty || p.quantity || "")),
              warrantyRate: safeParseFloat(String(p.warrantyRate || p.warrantyPriceOverride || p.warranty || "")),
              replacementRate: safeParseFloat(String(p.replacementRate || p.replacementPriceOverride || p.replacement || "")),
              total: safeParseFloat(String(p.total || p.totalOverride || p.lineTotal || p.extPrice || "")),
            };
          } else { // big
            return {
              name,
              qty: safeParseInt(String(p.qty || p.quantity || "")),
              amount: safeParseFloat(String(p.amount || p.amountPerUnit || p.unitPriceOverride || p.unitPrice || "")),
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
      // Small products (columns 0-3)
      if (row[0] && row[0].trim() !== "") {
        smallProducts.push({
          name: row[0],
          unitPrice: safeParseFloat(row[1]),
          qty: safeParseInt(row[2]),
          total: safeParseFloat(row[3]),
        });
      }

      // Dispensers (columns 4-8)
      if (row[4] && row[4].trim() !== "") {
        dispensers.push({
          name: row[4],
          qty: safeParseInt(row[5]),
          warrantyRate: safeParseFloat(row[6]),
          replacementRate: safeParseFloat(row[7]),
          total: safeParseFloat(row[8]),
        });
      }

      // Big products (columns 9-13)
      if (row[9] && row[9].trim() !== "") {
        bigProducts.push({
          name: row[9],
          qty: safeParseInt(row[10]),
          amount: safeParseFloat(row[11]),
          total: safeParseFloat(row[13]),
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
      <div className="center-align">
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
            />

            <ServicesSection initialServices={payload.services} />
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
