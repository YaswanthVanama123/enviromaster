// src/components/SavedFilesAgreements.tsx
// ✅ CORRECTED: Single document per agreement with attachedFiles array
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { pdfApi, emailApi, manualUploadApi } from "../backendservice/api";
import type {
  SavedFileListItem,
  SavedFileGroup,
  AddFileToAgreementRequest,
  LogDocument,
  AgreementStatus,
  VersionStatus,
} from "../backendservice/api/pdfApi";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileAlt, faEye, faDownload, faEnvelope, faPencilAlt,
  faUpload, faFolder, faFolderOpen, faChevronDown, faChevronRight,
  faPlus, faCheckSquare, faSquare, faCloudUploadAlt, faTrash, faEdit
} from "@fortawesome/free-solid-svg-icons";
import EmailComposer, { type EmailData } from "./EmailComposer";
import { ZohoUpload } from "./ZohoUpload";
import "./SavedFiles.css";

type FileStatus =
  | "saved"
  | "draft"
  | "uploaded"
  | "processing"
  | "completed"
  | "failed"
  | "pending_approval"
  | "approved_salesman"
  | "approved_admin"
  | "attached";

// ✅ UPDATED: Include manual upload statuses in the system
const EXISTING_STATUSES: { value: string; label: string; color: string; canManuallySelect: boolean }[] = [
  { value: 'draft', label: 'Draft', color: '#6b7280', canManuallySelect: false }, // System controlled - only for agreements without PDFs
  { value: 'saved', label: 'Saved', color: '#059669', canManuallySelect: false }, // Default after PDF creation
  { value: 'uploaded', label: 'Uploaded', color: '#3b82f6', canManuallySelect: false }, // Default for manual uploads
  { value: 'processing', label: 'Processing', color: '#f59e0b', canManuallySelect: false }, // System controlled - Zoho upload in progress
  { value: 'completed', label: 'Completed', color: '#10b981', canManuallySelect: false }, // System controlled - Zoho upload completed
  { value: 'failed', label: 'Failed', color: '#ef4444', canManuallySelect: false }, // System controlled - Zoho upload failed
  { value: 'pending_approval', label: 'Pending Approval', color: '#f59e0b', canManuallySelect: true },
  { value: 'approved_salesman', label: 'Approved by Salesman', color: '#3b82f6', canManuallySelect: true },
  { value: 'approved_admin', label: 'Approved by Admin', color: '#10b981', canManuallySelect: true },
  { value: 'attached', label: 'Attached File', color: '#8b5cf6', canManuallySelect: false }, // For attached files and logs
];

// Helper function to get status configuration
const getStatusConfig = (status: string) => {
  return EXISTING_STATUSES.find(s => s.value === status) ||
         { value: status, label: status, color: '#6b7280', canManuallySelect: true };
};

// Get available statuses for dropdown based on file type and admin context
const getAvailableStatusesForDropdown = (currentStatus: string, isLatestVersion: boolean = true, fileType?: string, isInAdminContext: boolean = false) => {
  return EXISTING_STATUSES.filter(status => {
    // Always allow current status to stay
    if (status.value === currentStatus) return true;

    // ✅ CONTEXT-BASED FILTERING: Filter approval statuses based on admin context
    if (!status.canManuallySelect) return false; // Skip system-controlled statuses

    // In normal saved-pdfs view: hide "approved by admin" option
    if (!isInAdminContext && status.value === 'approved_admin') {
      return false;
    }

    // In admin panel view: hide "approved by salesman" option
    if (isInAdminContext && status.value === 'approved_salesman') {
      return false;
    }

    // For manual uploads (attached_pdf), allow remaining approval workflow statuses
    if (fileType === 'attached_pdf') {
      return true; // Allow: pending_approval, and remaining approval status based on context
    }

    // For latest versions of PDFs, allow manual status changes (filtered by context above)
    if (isLatestVersion) return true;

    // For old versions, don't allow changes
    return false;
  });
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.max(1, Math.floor(diffMs / 1000));
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return `${day} day${day > 1 ? "s" : ""} ago`;
  if (hr > 0) return `${hr} hour${hr > 1 ? "s" : ""} ago`;
  if (min > 0) return `${min} minute${min > 1 ? "s" : ""} ago`;
  return `${sec} sec ago`;
}

const STATUS_LABEL: Record<FileStatus, string> = {
  saved: "Saved",
  draft: "Draft",
  uploaded: "Uploaded",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  pending_approval: "Pending Approval",
  approved_salesman: "Approved by Salesman",
  approved_admin: "Approved by Admin",
  attached: "Attached File",
};

export default function SavedFilesAgreements() {
  // ✅ CORRECTED: agreements is the source of truth (each is one MongoDB document)
  const [agreements, setAgreements] = useState<SavedFileGroup[]>([]);
  const [expandedAgreements, setExpandedAgreements] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalAgreements, setTotalAgreements] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [agreementsPerPage] = useState(20);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  // Selection state - for individual files within agreements
  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});

  // Email composer state
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [currentEmailFile, setCurrentEmailFile] = useState<SavedFileListItem | null>(null);

  // Zoho upload state
  const [zohoUploadOpen, setZohoUploadOpen] = useState(false);
  const [currentZohoFile, setCurrentZohoFile] = useState<SavedFileListItem | null>(null);

  // Bulk Zoho upload state
  const [bulkZohoUploadOpen, setBulkZohoUploadOpen] = useState(false);
  const [selectedFilesForBulkUpload, setSelectedFilesForBulkUpload] = useState<SavedFileListItem[]>([]);

  // File upload state
  const [fileUploadOpen, setFileUploadOpen] = useState(false);
  const [currentUploadAgreement, setCurrentUploadAgreement] = useState<SavedFileGroup | null>(null);

  // ✅ NEW: Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: 'file' | 'folder', id: string, title: string} | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // ✅ NEW: Status change state
  const [statusChangeLoading, setStatusChangeLoading] = useState<Record<string, boolean>>({});

  const navigate = useNavigate();
  const location = useLocation();
  const isInAdminContext = location.pathname.includes("/admin-panel");
  const returnPath = isInAdminContext ? "/admin-panel/saved-pdfs" : "/saved-pdfs";

  // ✅ UPDATED: Handle status change for different file types including manual uploads
  const handleStatusChange = async (file: SavedFileListItem, newStatus: string) => {
    if (statusChangeLoading[file.id]) return;

    console.log(`📊 [STATUS-CHANGE] Updating ${file.fileName} (${file.fileType}) from ${file.status} to ${newStatus}`);

    setStatusChangeLoading(prev => ({ ...prev, [file.id]: true }));

    try {
      // ✅ FIX: Handle different file types appropriately
      if (file.fileType === 'version_pdf') {
        // For version PDFs, use the file.id directly as the version ID
        console.log(`📊 [STATUS-CHANGE-DEBUG] Using file.id as version ID: ${file.id}`);
        await pdfApi.updateVersionStatus(file.id, newStatus);
      } else if (file.fileType === 'main_pdf' && file.agreementId) {
        // For main agreement PDFs, update agreement status
        await pdfApi.updateDocumentStatus(file.agreementId, newStatus);
      } else if (file.fileType === 'attached_pdf') {
        // ✅ NEW: For manually uploaded attached files, update manual upload status
        console.log(`📊 [MANUAL-UPLOAD-STATUS] Updating manual upload ${file.id} to ${newStatus}`);
        await manualUploadApi.updateStatus(file.id, newStatus);
      } else {
        throw new Error(`Cannot update status for file type: ${file.fileType}`);
      }

      setToastMessage({
        message: `Status updated to "${getStatusConfig(newStatus).label}" successfully!`,
        type: "success"
      });

      // Refresh the agreements to show updated status
      await fetchAgreements(currentPage, query);

    } catch (error) {
      console.error("Failed to update status:", error);
      setToastMessage({
        message: "Failed to update status. Please try again.",
        type: "error"
      });
    } finally {
      setStatusChangeLoading(prev => ({ ...prev, [file.id]: false }));
    }
  };

  // ✅ UPDATED: Fetch agreements AND disable individual log calls (logs should come from grouped API)
  const fetchAgreements = async (page = 1, search = "") => {
    setLoading(true);
    setError(null);
    try {
      console.log(`📁 [AGREEMENTS] Fetching page ${page} with search: "${search}"`);

      // 1. Fetch grouped files (agreements with PDFs) - backend should include logs automatically
      const groupedResponse = await pdfApi.getSavedFilesGrouped(page, agreementsPerPage, {
        search: search.trim() || undefined,
        includeLogs: true // ✅ Request logs to be included by backend
      });

      console.log(`📁 [AGREEMENTS] Loaded ${groupedResponse.groups.length} agreements with PDFs`);

      // 2. ✅ OPTIMIZED: Use lightweight summary API for draft-only agreements
      console.log(`📋 [DRAFT-DEBUG] Fetching customer headers summary for draft detection...`);
      const headersResponse = await pdfApi.getCustomerHeadersSummary();

      console.log(`📋 [DRAFT-DEBUG] Headers API response:`, {
        totalItems: headersResponse.items?.length || 0,
        sampleItems: headersResponse.items?.slice(0, 3).map(h => ({
          id: h._id,
          status: h.status,
          title: h.headerTitle,
          updatedAt: h.updatedAt
        })),
        allStatuses: [...new Set(headersResponse.items?.map(h => h.status) || [])]
      });

      // Find draft agreements that don't appear in the grouped response (no PDFs)
      const groupedIds = new Set(groupedResponse.groups.map(g => g.id));
      console.log(`📋 [DRAFT-DEBUG] Grouped IDs (agreements with PDFs):`, Array.from(groupedIds));

      // Debug filtering step by step
      const allHeaders = headersResponse.items || [];
      const headersNotInGrouped = allHeaders.filter(header => !groupedIds.has(header._id));
      const draftHeaders = headersNotInGrouped.filter(header => header.status === 'draft');

      console.log(`📋 [DRAFT-DEBUG] Filtering steps:`, {
        totalHeaders: allHeaders.length,
        headersNotInGrouped: headersNotInGrouped.length,
        headersWithDraftStatus: draftHeaders.length,
        draftHeadersDetails: draftHeaders.map(h => ({
          id: h._id,
          status: h.status,
          title: h.headerTitle,
          updatedAt: h.updatedAt
        }))
      });

      // Apply search filter if provided
      const draftOnlyHeaders = draftHeaders.filter(header =>
        !search.trim() ||
        (header.headerTitle &&
         header.headerTitle.toLowerCase().includes(search.trim().toLowerCase()))
      );

      if (search.trim()) {
        console.log(`📋 [DRAFT-DEBUG] Search filter "${search}" applied:`, {
          beforeSearchFilter: draftHeaders.length,
          afterSearchFilter: draftOnlyHeaders.length,
          filteredOut: draftHeaders.filter(h =>
            !(h.headerTitle && h.headerTitle.toLowerCase().includes(search.trim().toLowerCase()))
          ).map(h => ({ id: h._id, title: h.headerTitle }))
        });
      }

      // 3. ✅ OPTIMIZED: Convert lightweight draft headers to SavedFileGroup format
      const draftGroups: SavedFileGroup[] = draftOnlyHeaders.map(header => ({
        id: header._id,
        agreementTitle: header.headerTitle || `Agreement ${header._id}`,
        agreementStatus: 'draft' as AgreementStatus, // ✅ NEW: Agreement is in draft status
        fileCount: 0, // No PDFs yet
        latestUpdate: header.updatedAt,
        statuses: [header.status],
        hasUploads: false,
        files: [], // No files yet - this is the key issue we're fixing
        hasVersions: false, // ✅ NEW: No versions exist yet
        isDraftOnly: true, // ✅ NEW: Flag for draft-only agreements
      }));

      console.log(`📁 [DRAFT-ONLY] Found ${draftGroups.length} draft-only agreements:`,
        draftGroups.map(d => ({ id: d.id, title: d.agreementTitle, status: d.agreementStatus }))
      );

      // 4. ✅ DISABLED: No longer merge logs on frontend - backend should include them
      const allAgreements = [...groupedResponse.groups, ...draftGroups];

      // ✅ FIX STATUS DROPDOWNS: Ensure canChangeStatus is set correctly for version PDFs
      allAgreements.forEach(agreement => {
        // ✅ FALLBACK: If backend doesn't set isLatestVersion, determine it from version numbers
        if (agreement.files.some(file => file.isLatestVersion === undefined)) {
          console.log(`🔧 [FALLBACK] Backend didn't set isLatestVersion for ${agreement.agreementTitle}, determining from version numbers`);

          // Find the highest version number for each file type
          const versionFiles = agreement.files.filter(file => file.fileType === 'version_pdf' || file.fileType === 'main_pdf');

          // Extract version numbers and find the highest one
          let highestVersionNumber = 0;
          const versionMap = new Map<number, SavedFileListItem[]>();

          versionFiles.forEach(file => {
            const versionMatch = file.fileName.match(/Version (\d+)/i);
            const versionNumber = versionMatch ? parseInt(versionMatch[1], 10) : 1;

            if (versionNumber > highestVersionNumber) {
              highestVersionNumber = versionNumber;
            }

            if (!versionMap.has(versionNumber)) {
              versionMap.set(versionNumber, []);
            }
            versionMap.get(versionNumber)!.push(file);
          });

          // Mark files with highest version number as latest
          const latestVersionFiles = versionMap.get(highestVersionNumber) || [];
          latestVersionFiles.forEach(file => {
            file.isLatestVersion = true;
            console.log(`✅ [FALLBACK] Marked as latest: ${file.fileName} (v${highestVersionNumber})`);
          });

          // Mark all other version files as not latest
          versionFiles.forEach(file => {
            if (file.isLatestVersion === undefined) {
              file.isLatestVersion = false;
            }
          });
        }

        // Set canChangeStatus based on file type and version status
        agreement.files.forEach(file => {
          // ✅ DEBUG: Log file details for attached files
          if (file.fileType === 'attached_pdf') {
            console.log(`🔍 [ATTACHED-FILE-DEBUG] File: ${file.fileName}`, {
              id: file.id,
              fileType: file.fileType,
              status: file.status,
              hasPdf: file.hasPdf,
              fileSize: file.fileSize,
              createdAt: file.createdAt
            });

            // ✅ TEMPORARY FIX: Force hasPdf = true for attached files with fileSize > 0
            // This works around the backend pdfBuffer issue
            if (file.fileSize && file.fileSize > 0) {
              console.log(`🔧 [TEMP-FIX] Forcing hasPdf = true for ${file.fileName} (fileSize: ${file.fileSize})`);
              file.hasPdf = true;
            }
          }

          if (file.fileType === 'version_pdf' || file.fileType === 'main_pdf') {
            // Version PDFs can change status if they are the latest version
            file.canChangeStatus = file.isLatestVersion === true;

            // ✅ DEBUG: Log file status dropdown eligibility
            console.log(`🔍 [STATUS-DEBUG] File: ${file.fileName}, Type: ${file.fileType}, IsLatest: ${file.isLatestVersion}, CanChange: ${file.canChangeStatus}`);
          } else if (file.fileType === 'attached_pdf') {
            // ✅ NEW: Manual uploads can change status (except system-controlled statuses)
            const systemControlledStatuses = ['processing', 'completed', 'failed'];
            file.canChangeStatus = !systemControlledStatuses.includes(file.status);

            console.log(`🔍 [MANUAL-STATUS-DEBUG] File: ${file.fileName}, Type: ${file.fileType}, Status: ${file.status}, CanChange: ${file.canChangeStatus}, HasPdf: ${file.hasPdf}`);
          } else {
            // Other file types (logs, attachments) cannot change status
            file.canChangeStatus = false;
          }
        });
      });

      console.log(`📁 [FINAL] Total agreements: ${allAgreements.length} (${groupedResponse.groups.length} with PDFs, ${draftGroups.length} draft-only)`);

      setAgreements(allAgreements);
      setTotalAgreements(groupedResponse.totalGroups + draftGroups.length);
      setTotalFiles(allAgreements.reduce((sum, agreement) => sum + agreement.files.length, 0));
      setCurrentPage(page);
    } catch (err) {
      console.error("Error fetching agreements:", err);
      setError("Unable to load agreements. Please try again.");
      setAgreements([]);
      setTotalAgreements(0);
      setTotalFiles(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Use timeout for query changes, immediate for initial load
    const timeoutId = setTimeout(() => {
      fetchAgreements(1, query);
    }, query === "" ? 0 : 500); // No delay for empty query (initial load), 500ms delay for search

    return () => clearTimeout(timeoutId);
  }, [query]); // Only depends on query

  // Selection helpers
  const selectedFileIds = useMemo(() =>
    Object.entries(selectedFiles)
      .filter(([, selected]) => selected)
      .map(([id]) => id),
    [selectedFiles]
  );

  const selectedFileObjects = useMemo(() => {
    const allFiles: SavedFileListItem[] = [];
    agreements.forEach(agreement => allFiles.push(...agreement.files));
    const filteredFiles = allFiles.filter(file => selectedFiles[file.id]);

    // ✅ DEBUG: Log selected file objects to check fileType preservation
    if (filteredFiles.length > 0) {
      console.log(`🔍 [SELECTED-FILES-DEBUG] Found ${filteredFiles.length} selected files:`);
      filteredFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.fileName} (ID: ${file.id}, Type: ${file.fileType || 'undefined'}, AgreementID: ${file.agreementId || 'undefined'})`);
      });
    }

    return filteredFiles;
  }, [agreements, selectedFiles]);

  const hasSelectedFiles = selectedFileIds.length > 0;

  // Selection handlers
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => ({ ...prev, [fileId]: !prev[fileId] }));
  };

  const toggleAgreementSelection = (agreementId: string) => {
    const agreement = agreements.find(a => a.id === agreementId);
    if (!agreement) return;

    const isAgreementSelected = agreement.files.every(file => selectedFiles[file.id]);
    const newSelectedFiles = { ...selectedFiles };

    agreement.files.forEach(file => {
      newSelectedFiles[file.id] = !isAgreementSelected;
    });

    setSelectedFiles(newSelectedFiles);
  };

  const selectAllFiles = () => {
    const newSelectedFiles: Record<string, boolean> = {};
    agreements.forEach(agreement => {
      agreement.files.forEach(file => {
        newSelectedFiles[file.id] = true;
      });
    });
    setSelectedFiles(newSelectedFiles);
  };

  const clearAllSelections = () => {
    setSelectedFiles({});
  };

  // Check if agreement is partially or fully selected
  const getAgreementSelectionState = (agreement: SavedFileGroup) => {
    const selectedCount = agreement.files.filter(file => selectedFiles[file.id]).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === agreement.files.length) return 'all';
    return 'partial';
  };

  // Bulk Zoho upload handler
  const handleBulkZohoUpload = () => {
    // ✅ UPDATED: Support both PDFs and TXT log files for bulk upload
    const uploadableFiles = selectedFileObjects.filter(file => file.hasPdf || file.fileType === 'version_log');

    // ✅ DEBUG: Log the selected files to check fileType preservation
    console.log(`🔍 [BULK-UPLOAD-DEBUG] Selected ${uploadableFiles.length} uploadable files (PDFs + TXT logs):`);
    uploadableFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.fileName} (ID: ${file.id}, Type: ${file.fileType || 'undefined'}, AgreementID: ${file.agreementId || 'undefined'})`);
    });

    if (uploadableFiles.length === 0) {
      setToastMessage({
        message: "Please select files (PDFs or TXT logs) to upload to Zoho.",
        type: "error"
      });
      return;
    }
    setSelectedFilesForBulkUpload(uploadableFiles);
    setBulkZohoUploadOpen(true);
  };

  const toggleAgreement = (agreementId: string) => {
    setExpandedAgreements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(agreementId)) {
        newSet.delete(agreementId);
      } else {
        newSet.add(agreementId);
      }
      return newSet;
    });
  };

  const isAgreementExpanded = (agreementId: string) => expandedAgreements.has(agreementId);

  // File action handlers (same as before)
  const handleView = async (file: SavedFileListItem) => {
    try {
      // For main PDF files, load details; for attached files, navigate directly
      if (file.fileType === 'main_pdf') {
        await pdfApi.getSavedFileDetails(file.id);
      }

      // ✅ SMART NAVIGATION: Include document type for correct API selection
      let documentType: string;
      if (file.fileType === 'main_pdf') {
        documentType = 'agreement';
      } else if (file.fileType === 'version_pdf') {
        documentType = 'version'; // ✅ FIX: Map version_pdf to 'version' for PDFViewer
      } else if (file.fileType === 'version_log') {
        documentType = 'version-log'; // ✅ NEW: Handle version logs
      } else if (file.fileType === 'attached_pdf') {
        documentType = 'manual-upload'; // ✅ FIX: Use manual-upload type for manually uploaded files
      } else {
        documentType = 'attached-file';
      }

      console.log(`📄 [VIEW] Navigating to PDF viewer: ${file.id} (type: ${documentType})`);

      navigate("/pdf-viewer", {
        state: {
          documentId: file.id,
          fileName: file.title,
          documentType: documentType, // ✅ Updated: Specify document type for correct API
          originalReturnPath: returnPath,
        },
      });
    } catch (err) {
      setToastMessage({
        message: "Unable to load this document. Please try again.",
        type: "error"
      });
    }
  };

  const handleDownload = async (file: SavedFileListItem) => {
    try {
      let blob: Blob;

      // ✅ Use different download methods based on file type
      if (file.fileType === 'main_pdf') {
        blob = await pdfApi.downloadPdf(file.id);
      } else if (file.fileType === 'version_pdf') {
        // ✅ FIX: Use version PDF API for version PDFs
        blob = await pdfApi.downloadVersionPdf(file.id);
      } else if (file.fileType === 'version_log') {
        // ✅ Download version log files using version log API
        blob = await pdfApi.downloadVersionLog(file.id);
      } else if (file.fileType === 'attached_pdf') {
        // ✅ FIX: Use manual upload API for manually uploaded attached files
        blob = await manualUploadApi.downloadFile(file.id);
      } else {
        // Handle other attached files
        blob = await pdfApi.downloadAttachedFile(file.id);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // ✅ Use appropriate file extension based on file type
      let safeName: string;
      if (file.fileType === 'version_log') {
        // ✅ UPDATED: Version logs already have .txt extension in fileName
        safeName = file.fileName || "EnviroMaster_Version_Log.txt";
      } else {
        // For PDFs, add .pdf extension if not present
        const extension = '.pdf';
        const baseFileName = file.fileName || "EnviroMaster_Document";
        safeName = baseFileName.endsWith('.pdf') ? baseFileName : baseFileName.replace(/[^\w\-]+/g, "_") + extension;
      }
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setToastMessage({ message: "Unable to download this file. Please try again.", type: "error" });
    }
  };

  const handleEmail = (file: SavedFileListItem) => {
    setCurrentEmailFile(file);
    setEmailComposerOpen(true);
  };

  const handleZohoUpload = (file: SavedFileListItem) => {
    // ✅ UPDATED: Support both PDFs and TXT log files for Zoho upload
    const isUploadableFile = file.hasPdf || file.fileType === 'version_log';
    if (!isUploadableFile) {
      setToastMessage({
        message: "This document doesn't have a file to upload. Please generate a PDF or ensure the file exists.",
        type: "error"
      });
      return;
    }
    setCurrentZohoFile(file);
    setZohoUploadOpen(true);
  };

  // ✅ NEW: Handle Zoho upload for entire agreement (folder-level upload)
  const handleAgreementZohoUpload = (agreement: SavedFileGroup) => {
    // ✅ UPDATED: Support both PDFs and TXT log files for agreement upload
    const uploadableFiles = agreement.files.filter(file => file.hasPdf || file.fileType === 'version_log');

    if (uploadableFiles.length === 0) {
      setToastMessage({
        message: "This agreement has no uploadable files. Please generate PDFs first or ensure log files exist.",
        type: "error"
      });
      return;
    }

    // For single file agreements, use the single file upload modal
    if (uploadableFiles.length === 1) {
      setCurrentZohoFile(uploadableFiles[0]);
      setZohoUploadOpen(true);
    } else {
      // ✅ FIXED: For multiple files, use original file IDs but handle them properly in backend
      console.log(`🔍 [FOLDER-UPLOAD] Uploading ${uploadableFiles.length} files (PDFs + TXT logs) from agreement folder`);
      setSelectedFilesForBulkUpload(uploadableFiles); // Use original file structure
      setBulkZohoUploadOpen(true);
    }
  };

  const handleEdit = async (file: SavedFileListItem) => {
    try {
      // ✅ FIXED: Allow editing main PDFs and latest version PDFs
      const canEdit = file.fileType === 'main_pdf' ||
                     (file.fileType === 'version_pdf' && file.isLatestVersion === true);

      if (!canEdit) {
        setToastMessage({
          message: "Only the latest version of agreements can be edited.",
          type: "error"
        });
        return;
      }

      console.log(`📝 [EDIT] Editing agreement: ${file.agreementId || file.id}`);

      // ✅ DEBUG: Log file properties to verify we're using file.id as version ID
      console.log(`📝 [EDIT-DEBUG] File properties:`, {
        fileId: file.id,
        fileType: file.fileType,
        versionId: file.versionId,
        agreementId: file.agreementId,
        fileName: file.fileName,
        isLatestVersion: file.isLatestVersion,
        usingFileIdAsVersionId: file.fileType === 'version_pdf'
      });

      const versionIdToPass = file.fileType === 'version_pdf' ? file.id : undefined;
      console.log(`📝 [EDIT-DEBUG] Using file.id as version ID:`, versionIdToPass);

      // ✅ FIXED: Navigate using agreement ID and pass version info if editing a version PDF
      navigate(`/edit/pdf/${file.agreementId || file.id}`, {
        state: {
          editing: true,
          id: file.agreementId || file.id,
          returnPath: returnPath,
          // ✅ NEW: Pass version info for status updates
          editingVersionId: versionIdToPass,
          editingVersionFile: file.fileType === 'version_pdf' ? file.id : undefined,
        },
      });
    } catch (err) {
      setToastMessage({
        message: "Unable to load this document for editing. Please try again.",
        type: "error"
      });
    }
  };

  // ✅ NEW: Edit Agreement handler for draft-only agreements
  const handleEditAgreement = async (agreement: SavedFileGroup) => {
    try {
      console.log(`📝 [EDIT AGREEMENT] Editing draft agreement: ${agreement.id}`);

      navigate(`/edit/pdf/${agreement.id}`, {
        state: {
          editing: true,
          id: agreement.id,
          returnPath: returnPath,
        },
      });
    } catch (err) {
      setToastMessage({
        message: "Unable to load this agreement for editing. Please try again.",
        type: "error"
      });
    }
  };

  // ✅ NEW: Add file to agreement handler
  const handleAddFileToAgreement = (agreement: SavedFileGroup) => {
    setCurrentUploadAgreement(agreement);
    setFileUploadOpen(true);
  };

  // ✅ NEW: Process file upload to agreement
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !currentUploadAgreement) return;

    try {
      setToastMessage({
        message: "Uploading files...",
        type: "success"
      });

      const fileArray = Array.from(files);
      const processedFiles = [];

      // Read each file's binary content
      for (const file of fileArray) {
        const fileBuffer = await readFileAsArrayBuffer(file);

        processedFiles.push({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          description: `Uploaded ${file.name}`,
          pdfBuffer: Array.from(new Uint8Array(fileBuffer)), // Convert ArrayBuffer to number array
        });
      }

      const request: AddFileToAgreementRequest = {
        files: processedFiles
      };

      const response = await pdfApi.addFilesToAgreement(currentUploadAgreement.id, request);

      setToastMessage({
        message: `Successfully added ${response.addedFiles.length} file(s) to ${currentUploadAgreement.agreementTitle}`,
        type: "success"
      });

      // Refresh agreements to show new files
      fetchAgreements(currentPage, query);

      setFileUploadOpen(false);
      setCurrentUploadAgreement(null);
    } catch (error) {
      console.error('File upload error:', error);
      setToastMessage({
        message: "Failed to add files to agreement. Please try again.",
        type: "error"
      });
    }
  };

  // ✅ NEW: Delete confirmation handlers
  const handleDelete = (type: 'file' | 'folder', id: string, title: string) => {
    setItemToDelete({ type, id, title });
    setDeleteConfirmText('');
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || deleteConfirmText !== 'DELETE') {
      setToastMessage({
        message: "Please type 'DELETE' to confirm",
        type: "error"
      });
      return;
    }

    try {
      let result;
      if (itemToDelete.type === 'folder') {
        result = await pdfApi.deleteAgreement(itemToDelete.id);
      } else {
        result = await pdfApi.deleteFile(itemToDelete.id);
      }

      if (result.success) {
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
        setDeleteConfirmText('');

        setToastMessage({
          message: `${itemToDelete.type === 'folder' ? 'Agreement' : 'File'} moved to trash successfully!`,
          type: "success"
        });

        // Refresh the list
        await fetchAgreements(currentPage, query);
      } else {
        setToastMessage({
          message: result.message || "Failed to delete. Please try again.",
          type: "error"
        });
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      setToastMessage({
        message: "Failed to delete. Please try again.",
        type: "error"
      });
    }
  };

  // Helper function to read file as ArrayBuffer
  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  return (
    <section className="sf">
      <div className="sf__toolbar">
        <div className="sf__search">
          <input
            type="text"
            placeholder="Search agreements..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Bulk actions toolbar */}
        <div className="sf__actions">
          {hasSelectedFiles && (
            <>
              <div className="sf__selection-info" style={{
                fontSize: '14px',
                color: '#6b7280',
                fontWeight: '500',
                padding: '0 8px'
              }}>
                {selectedFileIds.length} file{selectedFileIds.length !== 1 ? 's' : ''} selected
              </div>

              <button
                type="button"
                className="sf__btn sf__btn--light"
                onClick={clearAllSelections}
              >
                Clear Selection
              </button>

              <button
                type="button"
                className="sf__btn sf__btn--primary zoho-upload-btn"
                onClick={handleBulkZohoUpload}
                disabled={selectedFileObjects.filter(f => f.hasPdf || f.fileType === 'version_log').length === 0}
              >
                <FontAwesomeIcon icon={faUpload} style={{ marginRight: '6px' }} />
                Upload to Zoho ({selectedFileObjects.filter(f => f.hasPdf || f.fileType === 'version_log').length})
              </button>
            </>
          )}

          {!hasSelectedFiles && (
            <button
              type="button"
              className="sf__btn sf__btn--light"
              onClick={selectAllFiles}
              disabled={totalFiles === 0}
            >
              <FontAwesomeIcon icon={faCheckSquare} style={{ marginRight: '6px' }} />
              Select All
            </button>
          )}
        </div>

        <div className="sf__stats">
          {totalAgreements} agreements • {totalFiles} files
        </div>
      </div>

      <div className="sf__groups">
        {loading && (
          <div className="sf__loading">
            Loading agreements...
          </div>
        )}

        {!loading && error && (
          <div className="sf__error">
            {error}
          </div>
        )}

        {!loading && !error && agreements.length === 0 && (
          <div className="sf__empty">
            {query ? `No agreements found matching "${query}"` : "No agreements found."}
          </div>
        )}

        {!loading && !error && agreements.map((agreement) => {
          const agreementSelectionState = getAgreementSelectionState(agreement);

          return (
            <div key={agreement.id} className="sf__group" style={{
              background: '#fff',
              border: '1px solid #e6e6e6',
              borderRadius: '10px',
              marginBottom: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
            }}>
              <div
                className="sf__group-header"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px',
                  cursor: 'pointer',
                  borderBottom: isAgreementExpanded(agreement.id) ? '1px solid #f0f0f0' : 'none'
                }}
              >
                {/* Agreement checkbox */}
                <div style={{ marginRight: '12px' }} onClick={(e) => e.stopPropagation()}>
                  <FontAwesomeIcon
                    icon={agreementSelectionState === 'none' ? faSquare : faCheckSquare}
                    style={{
                      color: agreementSelectionState !== 'none' ? '#3b82f6' : '#d1d5db',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                    onClick={() => toggleAgreementSelection(agreement.id)}
                  />
                </div>

                {/* Expand/collapse arrow */}
                <FontAwesomeIcon
                  icon={isAgreementExpanded(agreement.id) ? faChevronDown : faChevronRight}
                  style={{
                    color: '#6b7280',
                    fontSize: '14px',
                    marginRight: '8px'
                  }}
                  onClick={() => toggleAgreement(agreement.id)}
                />

                {/* Folder icon */}
                <FontAwesomeIcon
                  icon={isAgreementExpanded(agreement.id) ? faFolderOpen : faFolder}
                  style={{
                    color: '#f59e0b',
                    fontSize: '18px',
                    marginRight: '12px'
                  }}
                />

                {/* Agreement title and metadata */}
                <div style={{ flex: 1 }} onClick={() => toggleAgreement(agreement.id)}>
                  <span style={{
                    fontWeight: '600',
                    fontSize: '16px',
                    color: '#374151'
                  }}>
                    {agreement.agreementTitle}
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginTop: '4px',
                    fontSize: '13px',
                    color: '#6b7280'
                  }}>
                    <span>{agreement.fileCount} files</span>
                    <span>{timeAgo(agreement.latestUpdate)}</span>
                    {agreement.hasUploads && (
                      <span style={{
                        background: '#fef3c7',
                        color: '#92400e',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        📤 Zoho
                      </span>
                    )}
                    {/* ✅ NEW: Agreement Status Badge (show draft for agreements without PDFs) */}
                    {agreement.isDraftOnly && (
                      <span style={{
                        background: getStatusConfig('draft').color,
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        📝 {getStatusConfig('draft').label}
                      </span>
                    )}
                  </div>
                </div>

                {/* ✅ CORRECTED: Add file button and Zoho upload button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Zoho Bigin Upload Button */}
                  <button
                    style={{
                      background: '#f97316',
                      border: '1px solid #ea580c',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: '#fff',
                      fontWeight: '500',
                      opacity: agreement.files.filter(f => f.hasPdf || f.fileType === 'version_log').length > 0 ? 1 : 0.5
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAgreementZohoUpload(agreement);
                    }}
                    disabled={agreement.files.filter(f => f.hasPdf || f.fileType === 'version_log').length === 0}
                    title={`Upload ${agreement.files.filter(f => f.hasPdf || f.fileType === 'version_log').length} files to Zoho Bigin`}
                  >
                    <FontAwesomeIcon icon={faCloudUploadAlt} style={{ fontSize: '10px' }} />
                    Zoho
                  </button>

                  {/* Add File Button */}
                  <button
                    style={{
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: '#374151',
                      fontWeight: '500'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddFileToAgreement(agreement);
                    }}
                    title="Add file to this agreement"
                  >
                    <FontAwesomeIcon icon={faPlus} style={{ fontSize: '10px' }} />
                    Add
                  </button>

                  {/* ✅ NEW: Edit Agreement button for draft-only agreements */}
                  {agreement.fileCount === 0 && (
                    <button
                      style={{
                        background: '#3b82f6',
                        border: '1px solid #2563eb',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: '#fff',
                        fontWeight: '500'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAgreement(agreement);
                      }}
                      title="Edit this draft agreement"
                    >
                      <FontAwesomeIcon icon={faPencilAlt} style={{ fontSize: '10px' }} />
                      Edit Agreement
                    </button>
                  )}

                  {/* ✅ NEW: Delete Agreement button */}
                  <button
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fca5a5',
                      borderRadius: '6px',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: '#dc2626',
                      fontWeight: '500',
                      marginLeft: '8px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete('folder', agreement.id, agreement.agreementTitle);
                    }}
                    title="Delete this agreement (move to trash)"
                  >
                    <FontAwesomeIcon icon={faTrash} style={{ fontSize: '10px' }} />
                    Delete
                  </button>
                </div>
              </div>

              {isAgreementExpanded(agreement.id) && (
                <div style={{ padding: '0 16px 16px' }}>
                  {agreement.files.map((file) => (
                    <div
                      key={file.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        background: selectedFiles[file.id] ? '#f0f9ff' : '#fafafa',
                        border: '1px solid',
                        borderColor: selectedFiles[file.id] ? '#bae6fd' : '#f0f0f0',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* File checkbox */}
                      <div style={{ marginRight: '12px' }}>
                        <FontAwesomeIcon
                          icon={selectedFiles[file.id] ? faCheckSquare : faSquare}
                          style={{
                            color: selectedFiles[file.id] ? '#3b82f6' : '#d1d5db',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                          onClick={() => toggleFileSelection(file.id)}
                        />
                      </div>

                      {/* File info */}
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FontAwesomeIcon
                          icon={faFileAlt}
                          style={{
                            color: file.fileType === 'main_pdf'
                              ? '#2563eb'
                              : file.fileType === 'version_pdf'
                              ? '#7c3aed'  // Purple for version PDFs
                              : file.fileType === 'version_log'
                              ? '#f59e0b'  // Orange for version logs
                              : '#10b981',
                            fontSize: '16px'
                          }}
                        />
                        <span style={{
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          {file.fileName}
                        </span>
                        {file.hasPdf && (
                          <span style={{
                            fontSize: '12px',
                            color: '#10b981'
                          }}>
                            📎
                          </span>
                        )}
                        <span style={{
                          fontSize: '12px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: file.fileType === 'main_pdf'
                            ? '#e0f2fe'
                            : file.fileType === 'version_pdf'
                            ? '#f3e8ff'  // Light purple for version PDFs
                            : file.fileType === 'version_log'
                            ? '#fef3c7'  // Light orange for version logs
                            : '#f0fdf4',
                          color: file.fileType === 'main_pdf'
                            ? '#0e7490'
                            : file.fileType === 'version_pdf'
                            ? '#7c2d12'  // Dark purple for version PDFs
                            : file.fileType === 'version_log'
                            ? '#92400e'  // Dark orange for version logs
                            : '#166534',
                          fontWeight: '600'
                        }}>
                          {file.fileType === 'main_pdf'
                            ? 'Main Agreement'
                            : file.fileType === 'version_pdf'
                            ? `Version ${(file as any).versionNumber || ''}`  // Show version number
                            : file.fileType === 'version_log'
                            ? `Log v${(file as any).versionNumber || ''}`  // Show log version number
                            : 'Attached'}
                        </span>

                        {file.description && (
                          <span style={{
                            fontSize: '11px',
                            color: '#6b7280',
                            fontStyle: 'italic'
                          }}>
                            {file.description}
                          </span>
                        )}
                      </div>

                      {/* File actions */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {/* ✅ FIXED: Show edit button for main PDFs AND latest version PDFs */}
                        {(file.fileType === 'main_pdf' || (file.fileType === 'version_pdf' && file.isLatestVersion === true)) && (
                          <button
                            className="iconbtn"
                            title="Edit Agreement"
                            onClick={() => handleEdit(file)}
                          >
                            <FontAwesomeIcon icon={faPencilAlt} />
                          </button>
                        )}
                        <button
                          className="iconbtn"
                          title="View"
                          onClick={() => handleView(file)}
                          disabled={!file.hasPdf}
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        <button
                          className="iconbtn"
                          title="Download"
                          onClick={() => handleDownload(file)}
                          disabled={!file.hasPdf}
                        >
                          <FontAwesomeIcon icon={faDownload} />
                        </button>
                        <button
                          className="iconbtn"
                          title="Share via Email"
                          onClick={() => handleEmail(file)}
                          disabled={!file.hasPdf}
                        >
                          <FontAwesomeIcon icon={faEnvelope} />
                        </button>
                        <button
                          className="iconbtn zoho-upload-btn"
                          title="Upload to Zoho Bigin"
                          onClick={() => handleZohoUpload(file)}
                          disabled={!file.hasPdf && file.fileType !== 'version_log'}
                        >
                          <FontAwesomeIcon icon={faUpload} />
                        </button>

                        {/* ✅ UPDATED: Status Dropdown for PDFs and manual uploads */}
                        {(file.fileType === 'main_pdf' || file.fileType === 'version_pdf' || file.fileType === 'attached_pdf') && (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            {file.canChangeStatus && !statusChangeLoading[file.id] ? (
                              <select
                                value={file.status}
                                onChange={(e) => handleStatusChange(file, e.target.value)}
                                style={{
                                  fontSize: '11px',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #d1d5db',
                                  background: getStatusConfig(file.status).color,
                                  color: '#fff',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  outline: 'none',
                                  minWidth: '120px'
                                }}
                                title="Change status"
                              >
                                {getAvailableStatusesForDropdown(file.status, file.isLatestVersion, file.fileType, isInAdminContext).map(status => (
                                  <option key={status.value} value={status.value} style={{ color: '#000' }}>
                                    {status.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  background: getStatusConfig(file.status).color,
                                  color: '#fff',
                                  fontWeight: '600',
                                  opacity: statusChangeLoading[file.id] ? 0.6 : 1,
                                  minWidth: '120px',
                                  display: 'inline-block',
                                  textAlign: 'center'
                                }}
                                title={statusChangeLoading[file.id] ? "Updating status..." : "Status (read-only)"}
                              >
                                {statusChangeLoading[file.id] ? "Updating..." : getStatusConfig(file.status).label}
                              </span>
                            )}
                          </div>
                        )}

                        {/* ✅ NEW: Delete file button */}
                        <button
                          className="iconbtn"
                          title="Delete file (move to trash)"
                          onClick={() => handleDelete('file', file.id, file.title)}
                          style={{
                            color: '#dc2626',
                            borderColor: '#fca5a5'
                          }}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="sf__pager">
        <div className="sf__page-info">
          Showing {Math.min((currentPage - 1) * agreementsPerPage + 1, totalAgreements)}-{Math.min(currentPage * agreementsPerPage, totalAgreements)} of {totalAgreements} agreements
        </div>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Email Composer Modal */}
      <EmailComposer
        isOpen={emailComposerOpen}
        onClose={() => setEmailComposerOpen(false)}
        onSend={async (emailData: EmailData) => {
          if (!currentEmailFile) return;
          await emailApi.sendEmailWithPdfById({
            to: emailData.to,
            from: emailData.from,
            subject: emailData.subject,
            body: emailData.body,
            documentId: currentEmailFile.id,
            fileName: currentEmailFile.title
          });
          setToastMessage({
            message: "Email sent successfully with PDF attachment!",
            type: "success"
          });
          setEmailComposerOpen(false);
          setCurrentEmailFile(null);
        }}
        attachment={currentEmailFile ? {
          id: currentEmailFile.id,
          fileName: currentEmailFile.title,
          downloadUrl: pdfApi.getPdfDownloadUrl(currentEmailFile.id)
        } : undefined}
        defaultSubject={currentEmailFile ? `${currentEmailFile.title} - ${STATUS_LABEL[currentEmailFile.status as FileStatus]}` : ''}
        defaultBody={currentEmailFile ? `Hello,\n\nPlease find the document attached.\n\nDocument: ${currentEmailFile.title}\n\nBest regards` : ''}
        userEmail=""
      />

      {/* Zoho Upload Modal */}
      {zohoUploadOpen && currentZohoFile && (
        <ZohoUpload
          agreementId={currentZohoFile.agreementId || currentZohoFile.id}
          agreementTitle={currentZohoFile.title}
          onClose={() => {
            setZohoUploadOpen(false);
            setCurrentZohoFile(null);
          }}
          onSuccess={() => {
            setZohoUploadOpen(false);
            setCurrentZohoFile(null);
            fetchAgreements(currentPage, query);
            setToastMessage({
              message: "Successfully uploaded to Zoho Bigin!",
              type: "success"
            });
          }}
        />
      )}

      {/* Bulk Zoho Upload Modal - Using Enhanced Existing ZohoUpload Component */}
      {bulkZohoUploadOpen && selectedFilesForBulkUpload.length > 0 && (
        <ZohoUpload
          agreementId={selectedFilesForBulkUpload[0]?.agreementId || selectedFilesForBulkUpload[0]?.id || ''} // Use agreement ID for Zoho upload
          agreementTitle={`Bulk Upload - ${selectedFilesForBulkUpload.length} Documents`}
          bulkFiles={selectedFilesForBulkUpload.map(file => ({
            id: file.id,
            fileName: file.fileName,
            title: file.title,
            fileType: file.fileType  // ✅ FIX: Include fileType for proper routing
          }))}
          onClose={() => {
            setBulkZohoUploadOpen(false);
            setSelectedFilesForBulkUpload([]);
          }}
          onSuccess={() => {
            setBulkZohoUploadOpen(false);
            setSelectedFilesForBulkUpload([]);
            clearAllSelections();
            fetchAgreements(currentPage, query);
            setToastMessage({
              message: `Successfully uploaded ${selectedFilesForBulkUpload.length} files to Zoho Bigin!`,
              type: "success"
            });
          }}
        />
      )}

      {/* ✅ NEW: File Upload Modal */}
      {fileUploadOpen && currentUploadAgreement && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{
              margin: '0 0 16px',
              fontSize: '18px',
              fontWeight: '600',
              color: '#374151'
            }}>
              Add Files to: {currentUploadAgreement.agreementTitle}
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.png"
                onChange={(e) => handleFileUpload(e.target.files)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '8px',
                marginBottom: '0'
              }}>
                Select one or more files to attach to this agreement
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onClick={() => {
                  setFileUploadOpen(false);
                  setCurrentUploadAgreement(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Delete Confirmation Modal */}
      {deleteConfirmOpen && itemToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FontAwesomeIcon
                  icon={faTrash}
                  style={{
                    color: '#dc2626',
                    fontSize: '20px'
                  }}
                />
              </div>
              <div>
                <h3 style={{
                  margin: '0 0 4px',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Delete {itemToDelete.type === 'folder' ? 'Agreement' : 'File'}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#6b7280'
                }}>
                  This action will move the item to trash
                </p>
              </div>
            </div>

            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <p style={{
                margin: '0 0 8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                {itemToDelete.type === 'folder' ? 'Agreement' : 'File'}: {itemToDelete.title}
              </p>
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: '#6b7280'
              }}>
                {itemToDelete.type === 'folder'
                  ? 'This will move the entire agreement and all its files to trash.'
                  : 'This will move only this file to trash.'
                }
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Type "DELETE" to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase'
                }}
                autoFocus
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setItemToDelete(null);
                  setDeleteConfirmText('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  background: deleteConfirmText === 'DELETE' ? '#dc2626' : '#f3f4f6',
                  border: `1px solid ${deleteConfirmText === 'DELETE' ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: deleteConfirmText === 'DELETE' ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: deleteConfirmText === 'DELETE' ? '#fff' : '#9ca3af',
                  opacity: deleteConfirmText === 'DELETE' ? 1 : 0.6
                }}
                onClick={confirmDelete}
                disabled={deleteConfirmText !== 'DELETE'}
              >
                <FontAwesomeIcon icon={faTrash} style={{ marginRight: '6px' }} />
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}