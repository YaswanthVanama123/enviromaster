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
import { VersionDialog } from "./VersionDialog";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { pdfApi } from "../backendservice/api";
import { versionApi } from "../backendservice/api/versionApi";
import type { VersionStatus } from "../backendservice/api/versionApi";
import { useAllServicePricing } from "../backendservice/hooks";
import { createVersionLogFile, hasPriceChanges, getPriceChangeCount, clearPriceChanges, debugFileLogger, getAllVersionLogsForTesting } from "../utils/fileLogger";
import { ServiceAgreement } from "./ServiceAgreement";
import type { ServiceAgreementData } from "./ServiceAgreement/ServiceAgreement";

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
  serviceAgreement?: any; // ✅ Service agreement data (using any to avoid circular dependency)
};

type LocationState = {
  editing?: boolean;
  id?: string;
  returnPath?: string;
  returnState?: any;
  fromPdfViewer?: boolean; // Added to track if coming from PDF viewer
  // ✅ NEW: Version info for status updates when editing versioned PDFs
  editingVersionId?: string;
  editingVersionFile?: string;
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
  const [agreementData, setAgreementData] = useState<ServiceAgreementData | null>(null); // Service Agreement data

  // ✅ NEW: Version dialog state for PDF versioning
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versionStatus, setVersionStatus] = useState<VersionStatus | null>(null);
  const [isCheckingVersions, setIsCheckingVersions] = useState(false);

  // Fetch all service pricing data for context provider
  const { pricingData } = useAllServicePricing();

  // ✅ SIMPLIFIED: Use file logger instead of complex React context
  const hasChanges = hasPriceChanges();
  const changesCount = getPriceChangeCount();

  // ✅ DEBUG: Log change collection status
  console.log(`🔍 [FORMFILLING] File logger status:`, {
    hasChanges,
    changesCount
  });

  // Debug file logger on every render
  debugFileLogger();

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
    console.log('📍 Edit Form: Handling back navigation', {
      fromPdfViewer: locationState.fromPdfViewer,
      returnPath: locationState.returnPath,
      hasReturnState: !!locationState.returnState
    });

    // If we came from PDF viewer, return to PDF viewer with special flag
    if (locationState.fromPdfViewer && locationState.returnPath && locationState.returnState) {
      console.log('📍 Edit Form: Returning to PDF viewer with original context');
      navigate('/pdf-viewer', {
        state: {
          ...locationState.returnState,
          fromEdit: true,
          originalReturnPath: locationState.returnPath,
          originalReturnState: locationState.returnState,
        }
      });
      return;
    }

    // If we have return path info (normal flow)
    if (locationState.returnPath && locationState.returnState) {
      console.log('📍 Edit Form: Using return path:', locationState.returnPath);
      navigate(locationState.returnPath, { state: locationState.returnState });
      return;
    }

    // If we have return path but no state
    if (locationState.returnPath) {
      console.log('📍 Edit Form: Using return path without state:', locationState.returnPath);
      navigate(locationState.returnPath);
      return;
    }

    // Intelligent fallback - avoid browser back to prevent loops
    console.log('📍 Edit Form: Using intelligent fallback navigation');
    const currentUrl = window.location.href;

    if (currentUrl.includes('admin')) {
      navigate('/admin-panel');
    } else {
      navigate('/saved-files');
    }
  };

  useEffect(() => {
    // Extract editing and id from location.state inside useEffect to ensure fresh values
    const { editing = false, id } = locationState;

    console.log("🔍 [FORMFILLING DEBUG] Location state values:", {
      editing,
      id,
      locationState,
      urlId,
      // ✅ NEW: Debug version info
      editingVersionId: locationState.editingVersionId,
      editingVersionFile: locationState.editingVersionFile,
      hasVersionInfo: !!(locationState.editingVersionId)
    });

    // ✅ FIXED: Always use agreement ID directly - no version mapping needed
    const agreementId = urlId || id;

    // Set documentId to agreement ID (form data always lives in the agreement)
    setDocumentId(agreementId || null);
    console.log("🔍 [DOCUMENT ID] Set to agreement ID:", agreementId);

    setIsEditMode(editing || isInEditMode); // Set edit mode state based on URL or state

    // ---- PICK API FOR INITIAL DATA ----
    const useCustomerDoc = (editing || isInEditMode) && !!agreementId;

    const fetchHeaders = async () => {
      console.log('🔄 [FETCH HEADERS] Loading document data (should only happen on document change, NOT tab switches):', {
        useCustomerDoc,
        agreementId,
        urlId,
        editing: locationState.editing
      });

      setLoading(true);
      try {
        let json;

        if (useCustomerDoc) {
          // ✅ FIXED: Always load agreement document for editing
          console.log("🔍 [ENDPOINT DEBUG] Loading agreement document for editing:", {
            useCustomerDoc,
            agreementId,
            note: "Always load main agreement - versions are just PDF snapshots"
          });

          console.log("📝 [AGREEMENT EDIT] Loading agreement for editing:", agreementId);
          json = await pdfApi.getCustomerHeaderForEdit(agreementId!);
        } else {
          // New document - use admin template
          json = await pdfApi.getAdminHeaderById(ADMIN_TEMPLATE_ID);
        }

        const fromBackend = json.payload ?? json;

        console.log("📋 [FormFilling] Loaded from backend:", {
          isEditMode: useCustomerDoc,
          agreementId,
          endpoint: useCustomerDoc ? 'edit-format' : 'admin-template',
          hasServices: !!fromBackend.services,
          services: fromBackend.services,
          servicesKeys: fromBackend.services ? Object.keys(fromBackend.services) : [],
          hasProducts: !!fromBackend.products,
          productsStructure: fromBackend.products ? Object.keys(fromBackend.products) : []
        });

        // Helper function to generate title from customer name
        const generateTitleFromCustomerName = (headerRows: HeaderRow[]): string => {
          console.log("🔍 [TITLE DEBUG] Searching for customer name in headerRows:", headerRows);

          // Extract customer name from headerRows
          for (const row of headerRows) {
            console.log("🔍 [TITLE DEBUG] Checking row:", { labelLeft: row.labelLeft, valueLeft: row.valueLeft, labelRight: row.labelRight, valueRight: row.valueRight });

            // Check left side for various customer name patterns
            if (row.labelLeft) {
              const leftLabel = row.labelLeft.toUpperCase();
              if (leftLabel.includes("CUSTOMER NAME") || leftLabel.includes("CUSTOMER") || leftLabel.includes("CLIENT NAME") || leftLabel.includes("COMPANY NAME")) {
                const customerName = row.valueLeft?.trim();
                if (customerName && customerName.length > 0) {
                  console.log("✅ [TITLE DEBUG] Found customer name on left side:", customerName);
                  return customerName;
                }
              }
            }

            // Check right side for various customer name patterns
            if (row.labelRight) {
              const rightLabel = row.labelRight.toUpperCase();
              if (rightLabel.includes("CUSTOMER NAME") || rightLabel.includes("CUSTOMER") || rightLabel.includes("CLIENT NAME") || rightLabel.includes("COMPANY NAME")) {
                const customerName = row.valueRight?.trim();
                if (customerName && customerName.length > 0) {
                  console.log("✅ [TITLE DEBUG] Found customer name on right side:", customerName);
                  return customerName;
                }
              }
            }
          }

          console.log("⚠️ [TITLE DEBUG] No customer name found in headerRows, using fallback");
          // Fallback to default if no customer name found
          return "Customer Update Addendum";
        };

        // ✅ FIXED: Simplified title logic - always use agreement title
        const dynamicTitle = generateTitleFromCustomerName(fromBackend.headerRows || []);
        const shouldUseBackendTitle = dynamicTitle === "Customer Update Addendum" && fromBackend.headerTitle && fromBackend.headerTitle !== "Customer Update Addendum";
        const finalTitle = shouldUseBackendTitle ? fromBackend.headerTitle : dynamicTitle;

        console.log("🎯 [TITLE DEBUG] Title selection logic:", {
          fromBackendTitle: fromBackend.headerTitle,
          dynamicTitle: dynamicTitle,
          finalTitle: finalTitle
        });

        const cleanPayload: FormPayload = {
          headerTitle: finalTitle,
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
          serviceAgreement: fromBackend.serviceAgreement, // ✅ Include service agreement data for editing
        };

        setPayload(cleanPayload);
      } catch (err) {
        console.error("Error fetching headers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHeaders();
  }, [urlId, locationState.editing, locationState.id]); // ✅ FIXED: Only reload when document ID changes, not on tab switches

  const handleHeaderRowsChange = (rows: HeaderRow[]) => {
    console.log('📝 [HEADER CHANGE] Customer header data updated:', rows);
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

    // Extract customer name from headerRows for both filename and title
    const customerName = extractCustomerName(payload?.headerRows || []);

    // 🔧 DRAFT TITLE FIX: Use customer name as title when available, fallback to current title
    const titleForSave = customerName !== "Unnamed_Customer" ? customerName : (payload?.headerTitle || "Customer Update Addendum");

    console.log("💾 [SAVE DEBUG] Title selection for save:", {
      extractedCustomerName: customerName,
      currentPayloadTitle: payload?.headerTitle,
      finalTitleForSave: titleForSave,
      isUsingCustomerName: customerName !== "Unnamed_Customer"
    });

    return {
      headerTitle: titleForSave,
      headerRows: payload?.headerRows || [],
      products: {
        ...productsForBackend,
        customColumns: productsData.customColumns || { products: [], dispensers: [] }, // Include custom columns inside products
      },
      services: servicesData,
      agreement: payload?.agreement || {
        enviroOf: "",
        customerExecutedOn: "",
        additionalMonths: "",
      },
      serviceAgreement: agreementData, // Include Service Agreement data
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
      // ✅ NEW: Include version context for backend to update correct version status
      versionContext: locationState.editingVersionId ? {
        editingVersionId: locationState.editingVersionId,
        editingVersionFile: locationState.editingVersionFile,
        updateVersionStatus: true
      } : undefined
    };

    try {
      // ✅ SIMPLIFIED: documentId is always the agreement ID now
      if (documentId) {
        // Update existing agreement (backend will also update version status if versionContext provided)
        await pdfApi.updateCustomerHeader(documentId, payloadToSend);
        console.log("Draft updated successfully for agreement:", documentId);

        // ✅ FIXED: Use proper MVC architecture for version status update
        if (locationState.editingVersionId) {
          try {
            console.log(`🔄 Attempting to update version PDF status for ID: ${locationState.editingVersionId}`);
            console.log(`🔄 Using proper MVC API: /api/versions/${locationState.editingVersionId}/status`);
            // Use the proper MVC version status API
            await pdfApi.updateVersionStatus(locationState.editingVersionId, "draft");
            console.log("✅ Version PDF status updated to draft for:", locationState.editingVersionId);
          } catch (statusError) {
            console.error("❌ Failed to update version PDF status:", statusError);
            console.error("❌ Version ID used:", locationState.editingVersionId);
            console.error("❌ Full error:", statusError.response || statusError);
            // Don't fail the draft save if status update fails
          }
        }

        setToastMessage({ message: "Draft saved successfully!", type: "success" });

        // ✅ SIMPLIFIED: Log version changes using file logger
        console.log(`📝 [DEBUG] Checking changes before draft save:`, {
          hasChanges,
          changesCount
        });

        const currentHasChanges = hasPriceChanges();
        const currentChangesCount = getPriceChangeCount();
        if (currentHasChanges) {
          try {
            const documentTitle = payloadToSend.headerTitle || 'Untitled Document';
            console.log(`📝 [DRAFT-SAVE] Creating/updating log file with ${currentChangesCount} changes for draft update`);

            // ✅ NEW: For drafts, always overwrite existing logs to maintain single log per agreement
            await createVersionLogFile({
              agreementId: documentId,
              versionId: locationState.editingVersionId || documentId, // Use version ID if editing a version, otherwise agreement ID
              versionNumber: locationState.editingVersionId ? undefined : 1, // Version number not needed when overwriting version logs
              salespersonId: 'salesperson_001', // TODO: Get from auth context
              salespersonName: 'Sales Person', // TODO: Get from auth context
              saveAction: 'save_draft',
              documentTitle,
            }, {
              overwriteExisting: true,
              overwriteReason: locationState.editingVersionId ? 'version_update' : 'draft_update'
            });

            console.log(`✅ [DRAFT-SAVE] Successfully created log file and cleared changes`);
          } catch (logError) {
            console.error('❌ [DRAFT-SAVE] Failed to create log file:', logError);
            // Don't fail the draft save if logging fails
          }
        }
      } else {
        // Create new draft
        const result = await pdfApi.createCustomerHeader(payloadToSend);
        const newId = result.data?._id || result.data?.id || result.headers["x-customerheaderdoc-id"];
        setDocumentId(newId);
        console.log("Draft created successfully with ID:", newId);
        setToastMessage({ message: "Draft saved successfully!", type: "success" });

        // ✅ SIMPLIFIED: Log version changes using file logger for new draft
        const currentHasChanges = hasPriceChanges();
        const currentChangesCount = getPriceChangeCount();
        if (currentHasChanges && newId) {
          try {
            const documentTitle = payloadToSend.headerTitle || 'Untitled Document';
            console.log(`📝 [DRAFT-CREATE] Creating/updating log file with ${currentChangesCount} changes for new draft`);

            // ✅ NEW: For new drafts, overwrite any existing logs to maintain single log per agreement
            await createVersionLogFile({
              agreementId: newId,
              versionId: newId, // For drafts, use agreement ID as version ID
              versionNumber: 1, // Drafts are always version 1 until they become PDFs
              salespersonId: 'salesperson_001', // TODO: Get from auth context
              salespersonName: 'Sales Person', // TODO: Get from auth context
              saveAction: 'save_draft',
              documentTitle,
            }, {
              overwriteExisting: true,
              overwriteReason: 'draft_update'
            });

            console.log(`✅ [DRAFT-CREATE] Successfully created log file and cleared changes`);
          } catch (logError) {
            console.error('❌ [DRAFT-CREATE] Failed to create log file:', logError);
            // Don't fail the draft save if logging fails
          }
        } else {
          console.log(`ℹ️ [DRAFT-CREATE] No changes to log (hasChanges: ${currentHasChanges}, newId: ${newId})`);
        }
      }
    } catch (err) {
      console.error("Error saving draft:", err);
      setToastMessage({ message: "Failed to save draft. Please try again.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  // Save handler: Save with PDF compilation (simplified version logic)
  const handleSave = async () => {
    if (!payload) return;

    setIsSaving(true);
    setShowSaveModal(false);

    // ✅ FIXED: Handle new documents separately
    if (!documentId) {
      console.log("💾 [SAVE] New document - delegating to handleNormalSave");
      await handleNormalSave();
      return;
    }

    console.log("💾 [SAVE] Starting save process for agreement:", documentId);

    try {
      // 1. ✅ FIXED: Always update the main agreement data first
      const payloadToSend = {
        ...collectFormData(),
        status: "saved",
      };

      // Update the agreement data (no PDF generation yet)
      await pdfApi.updateCustomerHeader(documentId, payloadToSend);
      console.log("✅ [SAVE] Agreement data updated successfully");

      // 2. ✅ NEW: Check version status for PDF generation
      setIsCheckingVersions(true);
      const status = await versionApi.checkVersionStatus(documentId);
      setVersionStatus(status);
      setIsCheckingVersions(false);

      // Show version dialog to ask user: Replace current PDF or create new PDF
      if (status.isFirstTime) {
        // First time - auto-create v1
        console.log("🎯 [FIRST TIME] Auto-creating v1");
        await handleCreateFirstVersion();
      } else {
        // Subsequent saves - show dialog
        console.log("📋 [SUBSEQUENT] Showing version dialog for user choice");
        // ✅ FIXED: Reset saving state before showing dialog
        setIsSaving(false);
        setShowVersionDialog(true);
      }

    } catch (err: any) {
      console.error("❌ [SAVE ERROR] Failed to save agreement:", err);
      setToastMessage({
        message: err.response?.data?.message || "Failed to save agreement. Please try again.",
        type: "error"
      });
      setIsSaving(false);
      setIsCheckingVersions(false);
    }
  };

  // ✅ FIXED: Auto-create first version (v1) - simplified
  const handleCreateFirstVersion = async () => {
    if (!documentId) return;

    try {
      setIsSaving(true);

      // ✅ FIXED: Agreement data was already updated in handleSave, just create PDF
      console.log("📝 [FIRST VERSION] Creating v1 PDF for agreement:", documentId);

      // Create v1 (first version PDF)
      const result = await versionApi.createVersion(documentId, {
        changeNotes: "Initial version",
        replaceRecent: false,
        isFirstTime: true
      });

      console.log("✅ [FIRST VERSION SUCCESS] v1 created successfully:", result);

      // ✅ SIMPLIFIED: Log version changes using file logger for PDF generation
      const currentHasChanges = hasPriceChanges();
      const currentChangesCount = getPriceChangeCount();
      if (currentHasChanges && result.version?.id) {
        try {
          console.log(`📝 [FIRST-VERSION-PDF] Creating log file with ${currentChangesCount} changes for first version PDF`);

          await createVersionLogFile({
            agreementId: documentId,
            versionId: result.version.id,
            versionNumber: result.version.versionNumber || 1,
            salespersonId: 'salesperson_001', // TODO: Get from auth context
            salespersonName: 'Sales Person', // TODO: Get from auth context
            saveAction: 'generate_pdf',
            documentTitle: payload?.headerTitle || 'Untitled Document',
          });

          console.log(`✅ [FIRST-VERSION-PDF] Successfully created log file and cleared changes`);
        } catch (logError) {
          console.error('❌ [FIRST-VERSION-PDF] Failed to create log file:', logError);
          // Don't fail the PDF generation if logging fails
        }
      }

      setToastMessage({
        message: "First version (v1) created successfully!",
        type: "success"
      });

      // Redirect to saved PDFs
      setTimeout(() => {
        navigate("/saved-pdfs");
      }, 1500);

    } catch (err: any) {
      console.error("❌ [FIRST VERSION ERROR] Failed to create v1:", err);
      setToastMessage({
        message: err.response?.data?.message || "Failed to create first version. Please try again.",
        type: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Normal save handler (for new documents - also creates v1 in new system)
  const handleNormalSave = async () => {
    const payloadToSend = {
      ...collectFormData(), // Collect current data from all child components
      status: "saved",
    };

    // Log the complete payload being sent to backend
    console.log("📤 [FormFilling] COMPLETE PAYLOAD BEING SENT TO BACKEND:");
    console.log(JSON.stringify(payloadToSend, null, 2));

    try {
      if (documentId) {
        // ✅ UPDATED: For existing documents, don't use updateAndRecompileCustomerHeader
        // Instead, let the version system handle PDF creation
        console.log("⚠️ [SAVE] Existing document should use version system, not normal save");
        await handleSave(); // Redirect to version system
        return;
      } else {
        // ✅ NEW: Backend now returns JSON (not PDF binary) since PDF creation happens in version system
        const result = await pdfApi.createCustomerHeader(payloadToSend);

        console.log("🔍 [NEW DOCUMENT] Full createCustomerHeader response:", result);

        // ✅ FIXED: Backend now returns JSON with ID in response body
        const newId = result.data?._id ||
                     result.data?.id ||
                     result.headers["x-customerheaderdoc-id"] ||
                     result.headers["X-CustomerHeaderDoc-Id"];

        console.log("🔍 [NEW DOCUMENT] Extracted ID:", newId);
        console.log("🔍 [NEW DOCUMENT] Response data:", result.data);

        if (!newId) {
          console.error("❌ [NEW DOCUMENT] Failed to extract document ID from response");
          throw new Error("Failed to get document ID from server response.");
        }

        setDocumentId(newId);

        console.log("✅ [NEW DOCUMENT] Agreement created successfully:", newId);
        console.log("🎯 [NEW DOCUMENT] Now auto-creating v1...");

        // Auto-create v1 for new document
        const versionResult = await versionApi.createVersion(newId, {
          changeNotes: "Initial version",
          replaceRecent: false,
          isFirstTime: true
        });

        console.log("✅ [NEW DOCUMENT] v1 created successfully:", versionResult);

        // ✅ SIMPLIFIED: Log version changes using file logger for new document PDF
        const currentHasChanges = hasPriceChanges();
        const currentChangesCount = getPriceChangeCount();
        if (currentHasChanges && versionResult.version?.id) {
          try {
            const documentTitle = payloadToSend.headerTitle || 'Untitled Document';
            console.log(`📝 [NEW-DOCUMENT-PDF] Creating log file with ${currentChangesCount} changes for new document first version`);

            await createVersionLogFile({
              agreementId: newId,
              versionId: versionResult.version.id,
              versionNumber: versionResult.version.versionNumber || 1,
              salespersonId: 'salesperson_001', // TODO: Get from auth context
              salespersonName: 'Sales Person', // TODO: Get from auth context
              saveAction: 'generate_pdf',
              documentTitle,
            });

            console.log(`✅ [NEW-DOCUMENT-PDF] Successfully created log file and cleared changes`);
          } catch (logError) {
            console.error('❌ [NEW-DOCUMENT-PDF] Failed to create log file:', logError);
            // Don't fail the PDF generation if logging fails
          }
        }

        setToastMessage({ message: "Agreement created and first version (v1) generated successfully!", type: "success" });

        // Redirect to saved PDFs
        setTimeout(() => {
          navigate("/saved-pdfs");
        }, 1500);
      }
    } catch (err: any) {
      console.error("❌ [SAVE ERROR] Error saving document:", err);

      // Handle other errors normally
      setToastMessage({
        message: err.response?.data?.message || "Failed to save document. Please try again.",
        type: "error"
      });
    }
  };

  // Version dialog handlers
  const handleCreateVersion = async (replaceRecent: boolean, changeNotes: string) => {
    if (!documentId) return;

    try {
      setIsSaving(true);

      console.log("📝 [VERSION CREATE] Creating PDF version for agreement:", documentId);

      // ✅ FIXED: Agreement data was already updated in handleSave, just create PDF version
      const result = await versionApi.createVersion(documentId, {
        changeNotes,
        replaceRecent, // Replace current version or create new version
        isFirstTime: false
      });

      console.log("✅ [VERSION SUCCESS] Version created successfully:", result);

      // ✅ SIMPLIFIED: Log version changes using file logger for subsequent PDF
      const currentHasChanges = hasPriceChanges();
      const currentChangesCount = getPriceChangeCount();
      if (currentHasChanges && result.version?.id) {
        try {
          console.log(`📝 [VERSION-PDF] Creating log file with ${currentChangesCount} changes for version ${result.version.versionNumber}`);

          await createVersionLogFile({
            agreementId: documentId,
            versionId: result.version.id,
            versionNumber: result.version.versionNumber || 1,
            salespersonId: 'salesperson_001', // TODO: Get from auth context
            salespersonName: 'Sales Person', // TODO: Get from auth context
            saveAction: 'generate_pdf',
            documentTitle: payload?.headerTitle || 'Untitled Document',
          });

          console.log(`✅ [VERSION-PDF] Successfully created log file and cleared changes`);
        } catch (logError) {
          console.error('❌ [VERSION-PDF] Failed to create log file:', logError);
          // Don't fail the PDF generation if logging fails
        }
      }

      setToastMessage({
        message: replaceRecent
          ? `Current version replaced successfully!`
          : `Version ${result.version?.versionNumber} created successfully!`,
        type: "success"
      });

      setShowVersionDialog(false);
      setVersionStatus(null);

      // Redirect to saved PDFs
      setTimeout(() => {
        navigate("/saved-pdfs");
      }, 1500);

    } catch (err: any) {
      console.error("❌ [VERSION ERROR] Failed to create version:", err);
      setToastMessage({
        message: err.response?.data?.message || "Failed to create version. Please try again.",
        type: "error"
      });
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
        dispenserFrequencies: extractedDispensers.map(d => ({ name: d.name, frequency: d.frequency })),
        customFieldsDebug: {
          smallProductsWithCustomFields: smallProducts.filter(p => p.customFields && Object.keys(p.customFields).length > 0),
          bigProductsWithCustomFields: bigProducts.filter(p => p.customFields && Object.keys(p.customFields).length > 0),
          dispensersWithCustomFields: extractedDispensers.filter(d => d.customFields && Object.keys(d.customFields).length > 0)
        }
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
    <ServicesProvider backendPricingData={pricingData}>
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
              initialCustomColumns={payload?.products?.customColumns}
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

            {/* Service Agreement Component */}
            <ServiceAgreement
              onAgreementChange={setAgreementData}
              initialData={payload.serviceAgreement} // ✅ Pass loaded service agreement data for editing
            />

            <div className="formfilling__actions">
              <button
                type="button"
                className="formfilling__draftBtn"
                onClick={handleDraft}
                disabled={isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isSaving ? 0.7 : 1,
                  cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {isSaving && (
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid #fff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite'
                  }} />
                )}
                {isSaving ? "Saving..." : "Save as Draft"}
              </button>
              <button
                type="button"
                className="formfilling__saveBtn"
                onClick={() => setShowSaveModal(true)}
                disabled={isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isSaving ? 0.7 : 1,
                  cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {isSaving && (
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid #fff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite'
                  }} />
                )}
                {isSaving ? "Saving..." : "Save & Generate PDF"}
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

        <VersionDialog
          isOpen={showVersionDialog}
          versionStatus={versionStatus}
          onClose={() => {
            setShowVersionDialog(false);
            setVersionStatus(null);
            setIsSaving(false);
          }}
          onCreateVersion={handleCreateVersion}
          loading={isSaving}
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
