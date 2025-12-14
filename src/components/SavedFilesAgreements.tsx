// src/components/SavedFilesAgreements.tsx
// ✅ CORRECTED: Single document per agreement with attachedFiles array
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { pdfApi, emailApi } from "../backendservice/api";
import { versionApi } from "../backendservice/api/versionApi";
import type {
  SavedFileListItem,
  SavedFileGroup,
  AddFileToAgreementRequest
} from "../backendservice/api/pdfApi";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileAlt, faEye, faDownload, faEnvelope, faPencilAlt,
  faUpload, faFolder, faFolderOpen, faChevronDown, faChevronRight,
  faPlus, faCheckSquare, faSquare, faCloudUploadAlt
} from "@fortawesome/free-solid-svg-icons";
import EmailComposer, { type EmailData } from "./EmailComposer";
import { ZohoUpload } from "./ZohoUpload";
import "./SavedFiles.css";

type FileStatus =
  | "saved"
  | "draft"
  | "pending_approval"
  | "approved_salesman"
  | "approved_admin"
  | "attached";

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

  const navigate = useNavigate();
  const location = useLocation();
  const isInAdminContext = location.pathname.includes("/admin-panel");
  const returnPath = isInAdminContext ? "/admin-panel/saved-pdfs" : "/saved-pdfs";

  // ✅ FIXED: Fetch agreements AND draft-only agreements
  const fetchAgreements = async (page = 1, search = "") => {
    setLoading(true);
    setError(null);
    try {
      console.log(`📁 [AGREEMENTS] Fetching page ${page} with search: "${search}"`);

      // 1. Fetch grouped files (agreements with PDFs)
      const groupedResponse = await pdfApi.getSavedFilesGrouped(page, agreementsPerPage, {
        search: search.trim() || undefined
      });

      console.log(`📁 [AGREEMENTS] Loaded ${groupedResponse.groups.length} agreements with PDFs`);

      // 2. ✅ OPTIMIZED: Use lightweight summary API instead of full customer headers
      // This avoids loading heavy payload data for all agreements upfront
      const headersResponse = await pdfApi.getCustomerHeadersSummary();

      // Find draft agreements that don't appear in the grouped response (no PDFs)
      const groupedIds = new Set(groupedResponse.groups.map(g => g.id));
      const draftOnlyHeaders = headersResponse.items.filter(header =>
        !groupedIds.has(header._id) &&
        header.status === 'draft' &&
        // Apply search filter if provided
        (!search.trim() ||
         (header.headerTitle &&
          header.headerTitle.toLowerCase().includes(search.trim().toLowerCase())))
      );

      // 3. ✅ OPTIMIZED: Convert lightweight draft headers to SavedFileGroup format
      const draftGroups: SavedFileGroup[] = draftOnlyHeaders.map(header => ({
        id: header._id,
        agreementTitle: header.headerTitle || `Agreement ${header._id}`,
        fileCount: 0, // No PDFs yet
        latestUpdate: header.updatedAt,
        statuses: [header.status],
        hasUploads: false,
        files: [] // No files yet - this is the key issue we're fixing
      }));

      console.log(`📁 [DRAFT-ONLY] Found ${draftGroups.length} draft-only agreements`);

      // 4. ✅ NEW: Merge grouped files with draft-only agreements
      const allAgreements = [...groupedResponse.groups, ...draftGroups];

      // ✅ DEBUG: Log first few agreements and their files to check fileType
      console.log(`🔍 [FETCH-DEBUG] Sample agreements with fileType data:`);
      allAgreements.slice(0, 2).forEach((agreement, agIndex) => {
        console.log(`   Agreement ${agIndex + 1}: ${agreement.agreementTitle} (${agreement.files.length} files)`);
        agreement.files.slice(0, 3).forEach((file, fileIndex) => {
          console.log(`     File ${fileIndex + 1}: ${file.fileName} (Type: ${file.fileType || 'undefined'}, AgreementID: ${file.agreementId || 'undefined'})`);
        });
      });

      setAgreements(allAgreements);
      setTotalAgreements(groupedResponse.totalGroups + draftGroups.length);
      setTotalFiles(groupedResponse.total);
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
    fetchAgreements(1, query);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAgreements(1, query);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [query]);

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
    const filesWithPdf = selectedFileObjects.filter(file => file.hasPdf);

    // ✅ DEBUG: Log the selected files to check fileType preservation
    console.log(`🔍 [BULK-UPLOAD-DEBUG] Selected ${filesWithPdf.length} files with PDF:`);
    filesWithPdf.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.fileName} (ID: ${file.id}, Type: ${file.fileType || 'undefined'}, AgreementID: ${file.agreementId || 'undefined'})`);
    });

    if (filesWithPdf.length === 0) {
      setToastMessage({
        message: "Please select files with PDFs to upload to Zoho.",
        type: "error"
      });
      return;
    }
    setSelectedFilesForBulkUpload(filesWithPdf);
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
        documentType = 'version'; // ✅ NEW: Handle version PDFs
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
        // ✅ NEW: Download version PDFs using version API
        blob = await versionApi.downloadVersion(file.id);
      } else {
        blob = await pdfApi.downloadAttachedFile(file.id);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (file.fileName || "EnviroMaster_Document").replace(/[^\w\-]+/g, "_") + ".pdf";
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setToastMessage({ message: "Unable to download this PDF. Please try again.", type: "error" });
    }
  };

  const handleEmail = (file: SavedFileListItem) => {
    setCurrentEmailFile(file);
    setEmailComposerOpen(true);
  };

  const handleZohoUpload = (file: SavedFileListItem) => {
    if (!file.hasPdf) {
      setToastMessage({
        message: "This document doesn't have a PDF to upload. Please generate the PDF first.",
        type: "error"
      });
      return;
    }
    setCurrentZohoFile(file);
    setZohoUploadOpen(true);
  };

  // ✅ NEW: Handle Zoho upload for entire agreement (folder-level upload)
  const handleAgreementZohoUpload = (agreement: SavedFileGroup) => {
    const filesWithPdf = agreement.files.filter(file => file.hasPdf);

    if (filesWithPdf.length === 0) {
      setToastMessage({
        message: "This agreement has no PDFs to upload. Please generate PDFs first.",
        type: "error"
      });
      return;
    }

    // For single file agreements, use the single file upload modal
    if (filesWithPdf.length === 1) {
      setCurrentZohoFile(filesWithPdf[0]);
      setZohoUploadOpen(true);
    } else {
      // ✅ FIXED: For multiple files, use original file IDs but handle them properly in backend
      console.log(`🔍 [FOLDER-UPLOAD] Uploading ${filesWithPdf.length} files from agreement folder`);
      setSelectedFilesForBulkUpload(filesWithPdf); // Use original file structure
      setBulkZohoUploadOpen(true);
    }
  };

  const handleEdit = async (file: SavedFileListItem) => {
    try {
      // ✅ UPDATED: Only allow editing the most recent version PDF, not main agreements
      if (file.fileType !== 'version_pdf') {
        setToastMessage({
          message: "Only the most recent version can be edited.",
          type: "error"
        });
        return;
      }

      // For version PDFs, check if it's the most recent version
      // Find the agreement this version belongs to
      const agreement = agreements.find(agreement =>
        agreement.files.some(f => f.id === file.id)
      );

      if (!agreement) {
        setToastMessage({
          message: "Cannot find agreement for this version.",
          type: "error"
        });
        return;
      }

      // Get all version PDFs for this agreement and find the highest version number
      const versionFiles = agreement.files
        .filter(f => f.fileType === 'version_pdf')
        .map(f => ({ ...f, versionNumber: (f as any).versionNumber || 0 }))
        .sort((a, b) => b.versionNumber - a.versionNumber);

      const isLatestVersion = versionFiles.length > 0 && versionFiles[0].id === file.id;

      if (!isLatestVersion) {
        setToastMessage({
          message: "Only the most recent version can be edited. Edit the latest version to make changes.",
          type: "error"
        });
        return;
      }

      console.log(`📝 [EDIT VERSION] Editing agreement: ${agreement.id} (was viewing version: ${file.id})`);

      // ✅ FIXED: Navigate using agreement ID, not version ID
      navigate(`/edit/pdf/${agreement.id}`, {
        state: {
          editing: true,
          id: agreement.id, // ✅ Use agreement ID, not version ID
          returnPath: returnPath,
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
                disabled={selectedFileObjects.filter(f => f.hasPdf).length === 0}
              >
                <FontAwesomeIcon icon={faUpload} style={{ marginRight: '6px' }} />
                Upload to Zoho ({selectedFileObjects.filter(f => f.hasPdf).length})
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
                      opacity: agreement.files.filter(f => f.hasPdf).length > 0 ? 1 : 0.5
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAgreementZohoUpload(agreement);
                    }}
                    disabled={agreement.files.filter(f => f.hasPdf).length === 0}
                    title={`Upload ${agreement.files.filter(f => f.hasPdf).length} PDFs to Zoho Bigin`}
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
                            : '#f0fdf4',
                          color: file.fileType === 'main_pdf'
                            ? '#0e7490'
                            : file.fileType === 'version_pdf'
                            ? '#7c2d12'  // Dark purple for version PDFs
                            : '#166534',
                          fontWeight: '600'
                        }}>
                          {file.fileType === 'main_pdf'
                            ? 'Main Agreement'
                            : file.fileType === 'version_pdf'
                            ? `Version ${(file as any).versionNumber || ''}`  // Show version number
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
                        {/* ✅ UPDATED: Only show edit button for the most recent version PDF, not main agreements */}
                        {file.fileType === 'version_pdf' && (() => {
                          // Check if this is the most recent version for edit button visibility
                          const versionFiles = agreement.files
                            .filter(f => f.fileType === 'version_pdf')
                            .map(f => ({ ...f, versionNumber: (f as any).versionNumber || 0 }))
                            .sort((a, b) => b.versionNumber - a.versionNumber);
                          return versionFiles.length > 0 && versionFiles[0].id === file.id;
                        })() && (
                          <button
                            className="iconbtn"
                            title="Edit Latest Version"
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
                          disabled={!file.hasPdf}
                        >
                          <FontAwesomeIcon icon={faUpload} />
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
    </section>
  );
}