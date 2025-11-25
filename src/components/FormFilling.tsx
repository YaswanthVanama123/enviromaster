import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import CustomerSection from "./CustomerSection";
// import ProductsSection from "./ProductsSection";
import ProductsSection from "./products/ProductsSection";
// import ServicesSection from "./ServicesSection";
import "./FormFilling.css";
import { ServicesSection } from "./services/ServicesSection";
import { ServicesProvider } from "./services/ServicesContext";
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
  const { editing = false, id }: LocationState = (location.state ?? {}) as LocationState;

  const [payload, setPayload] = useState<FormPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
  }, [editing, id]);

  const handleHeaderRowsChange = (rows: HeaderRow[]) => {
    setPayload((prev) => (prev ? { ...prev, headerRows: rows } : prev));
  };

  const handleSave = async () => {
    if (!payload) return;

    // when editing: update that specific customer header doc
    // when not editing: fallback to the same customer doc id as before
    const effectiveIdForSave =
      editing && id ? id : CUSTOMER_FALLBACK_ID;

    const payloadToSend: FormPayload = {
      ...payload,
      agreement: {
        enviroOf: payload.agreement?.enviroOf ?? "",
        customerExecutedOn: payload.agreement?.customerExecutedOn ?? "",
        additionalMonths: payload.agreement?.additionalMonths ?? "",
      },
    };

    try {
      const res = await axios.put(
        `http://localhost:5000/api/pdf/customer-headers/${effectiveIdForSave}`,
        payloadToSend,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (res.status === 200) {
        console.log("200 response from backend:", res.data);
      } else {
        console.error("Save failed with status:", res.status);
      }
    } catch (err) {
      console.error("Error calling backend:", err);
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

            <ProductsSection
              // initialSmallProducts={initialSmallProducts}
              // initialDispensers={initialDispensers}
              // initialBigProducts={initialBigProducts}
            />

            <ServicesSection initialServices={payload.services} />

            <div className="formfilling__actions">
              <button
                type="button"
                className="formfilling__saveBtn"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </ServicesProvider>
  );
}
