import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import CustomerSection from "./CustomerSection";
import ProductsSection, { ProductsSectionHandle } from "./products/ProductsSection";
import "./FormFilling.css";
import { ServicesSection } from "./services/ServicesSection";
import ServicesDataCollector, { ServicesDataHandle } from "./services/ServicesDataCollector";
import { ServicesProvider } from "./services/ServicesContext";
import ConfirmationModal from "./ConfirmationModal";
import axios from "axios";

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
const ADMIN_TEMPLATE_ID = "691b6ea14e85329ebac5f752";

export default function FormFilling() {
  const location = useLocation();

  const [payload, setPayload] = useState<FormPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refs to collect data from child components
  const productsRef = useRef<ProductsSectionHandle>(null);
  const servicesRef = useRef<ServicesDataHandle>(null);

  useEffect(() => {
    // Extract editing and id from location.state inside useEffect to ensure fresh values
    const { editing = false, id }: LocationState = (location.state ?? {}) as LocationState;

    // Update documentId when location changes
    setDocumentId(id || null);

    // ---- PICK API FOR INITIAL DATA ----
    const useCustomerDoc = editing && !!id;

    const url = useCustomerDoc
      ? `http://localhost:5000/api/pdf/customer-headers/${id}`
      : `http://localhost:5000/api/pdf/admin-headers/${ADMIN_TEMPLATE_ID}`;

    const fetchHeaders = async () => {
      setLoading(true);
      try {
        const res = await axios.get(url, {
          headers: {
            Accept: "application/json",
          },
        });

        const json = res.data;
        const fromBackend = json.payload ?? json;

        const cleanPayload: FormPayload = {
          headerTitle: fromBackend.headerTitle ?? "Customer Update Addendum",
          headerRows: fromBackend.headerRows ?? [],
          products: fromBackend.products ?? {
            headers: [],
            rows: [],
          },
          services: fromBackend.services ?? {
            topRow: [],
            bottomRow: [],
            refreshPowerScrub: {
              heading: "REFRESH POWER SCRUB",
              columns: [],
              freqLabels: [],
            },
            notes: {
              heading: "SERVICE NOTES",
              lines: 3,
              textLines: [],
            },
          },
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

  // Helper function to collect all current form data
  const collectFormData = () => {
    // Get products data from ProductsSection ref
    const productsData = productsRef.current?.getData() || {
      smallProducts: [],
      dispensers: [],
      bigProducts: [],
    };

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

    return {
      headerTitle: payload?.headerTitle || "",
      headerRows: payload?.headerRows || [],
      products: productsData,
      services: servicesData,
      agreement: payload?.agreement || {
        enviroOf: "",
        customerExecutedOn: "",
        additionalMonths: "",
      },
    };
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
        const res = await axios.put(
          `http://localhost:5000/api/pdf/customer-headers/${documentId}`,
          payloadToSend,
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        if (res.status === 200) {
          console.log("Draft updated successfully:", res.data);
          alert("Draft saved successfully!");
        }
      } else {
        // Create new draft
        const res = await axios.post(
          "http://localhost:5000/api/pdf/customer-header",
          payloadToSend,
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        if (res.status === 200 || res.status === 201) {
          const newId = res.headers["x-customerheaderdoc-id"] || res.data._id || res.data.id;
          setDocumentId(newId);
          console.log("Draft created successfully with ID:", newId);
          alert("Draft saved successfully!");
        }
      }
    } catch (err) {
      console.error("Error saving draft:", err);
      alert("Failed to save draft. Please try again.");
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

    try {
      if (documentId) {
        // Update existing document
        const res = await axios.put(
          `http://localhost:5000/api/pdf/customer-headers/${documentId}?recompile=true`,
          payloadToSend,
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        if (res.status === 200) {
          console.log("Document saved and PDF compiled:", res.data);
          alert("Form saved and PDF generated successfully!");
        }
      } else {
        // Create new document with PDF compilation
        const res = await axios.post(
          "http://localhost:5000/api/pdf/customer-header",
          payloadToSend,
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        if (res.status === 200 || res.status === 201) {
          const newId = res.headers["x-customerheaderdoc-id"] || res.data._id || res.data.id;
          setDocumentId(newId);
          console.log("Document created and PDF compiled:", newId);
          alert("Form saved and PDF generated successfully!");
        }
      }
    } catch (err) {
      console.error("Error saving document:", err);
      alert("Failed to save document. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // map backend product rows → lists for ProductsSection
  const initialSmallProducts =
    payload?.products?.rows?.map((row: string[]) => row[0] ?? "") ??
    undefined;
  const initialDispensers =
    payload?.products?.rows?.map((row: string[]) => row[2] ?? "") ??
    undefined;
  const initialBigProducts =
    payload?.products?.rows?.map((row: string[]) => row[6] ?? "") ??
    undefined;

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

            <ProductsSection ref={productsRef} />

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
      </div>
    </ServicesProvider>
  );
}
