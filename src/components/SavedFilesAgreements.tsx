import { useEffect, useState, useMemo, useRef, useCallback, ChangeEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { pdfApi, emailApi, manualUploadApi } from "../backendservice/api";
import { emailTemplateApi } from "../backendservice/api/emailTemplateApi";
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
  faCheckSquare, faTrash, faFileAlt, faUpload
} from "@fortawesome/free-solid-svg-icons";
import EmailComposer, { type EmailData, type EmailAttachment } from "./EmailComposer";
import { ZohoUpload } from "./ZohoUpload";
import { BiginTaskModal } from "./BiginTaskModal";
import "./SavedFiles.css";
import { getDocumentTypeForSavedFile } from "../utils/savedFileDocumentType";
import { AgreementRow } from "./SavedFiles/AgreementRow";

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

const getStatusConfig = (status: string) => {
  const EXISTING_STATUSES = [
    { value: 'draft', label: 'Draft', color: '#6b7280', canManuallySelect: false },
    { value: 'saved', label: 'Saved', color: '#059669', canManuallySelect: false },
    { value: 'uploaded', label: 'Uploaded', color: '#3b82f6', canManuallySelect: false },
    { value: 'processing', label: 'Processing', color: '#f59e0b', canManuallySelect: false },
    { value: 'completed', label: 'Completed', color: '#10b981', canManuallySelect: false },
    { value: 'failed', label: 'Failed', color: '#ef4444', canManuallySelect: false },
    { value: 'pending_approval', label: 'Pending Approval', color: '#f59e0b', canManuallySelect: true },
    { value: 'approved_salesman', label: 'Approved by Salesman', color: '#3b82f6', canManuallySelect: true },
    { value: 'approved_admin', label: 'Approved by Admin', color: '#10b981', canManuallySelect: true },
    { value: 'attached', label: 'Attached File', color: '#8b5cf6', canManuallySelect: false },
  ];

  const config = EXISTING_STATUSES.find(s => s.value === status);
  return config || { value: status, label: status, color: '#6b7280', canManuallySelect: false };
};

let hasInitiallyLoaded = false;

let cachedEmailTemplate: { subject: string; body: string } | null = null;
let isLoadingEmailTemplate = false;

export default function SavedFilesAgreements() {
  const [agreements, setAgreements] = useState<SavedFileGroup[]>([]);
  const [expandedAgreements, setExpandedAgreements] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalAgreements, setTotalAgreements] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [agreementsPerPage] = useState(20);
  const [query, setQuery] = useState("");
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'yet-to-start' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(false);
  const [emailTemplateLoading, setEmailTemplateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  const isFetchingRef = useRef(false);

  const isFirstSearchRender = useRef(true);

  const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});

  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [currentEmailFile, setCurrentEmailFile] = useState<SavedFileListItem | null>(null);
  const [defaultEmailTemplate, setDefaultEmailTemplate] = useState<{ subject: string; body: string } | null>(null);

  const [zohoUploadOpen, setZohoUploadOpen] = useState(false);
  const [currentZohoFile, setCurrentZohoFile] = useState<SavedFileListItem | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [currentTaskAgreement, setCurrentTaskAgreement] = useState<{ id: string; title: string } | null>(null);

  const [bulkZohoUploadOpen, setBulkZohoUploadOpen] = useState(false);
  const [selectedFilesForBulkUpload, setSelectedFilesForBulkUpload] = useState<SavedFileListItem[]>([]);

  const [fileUploadOpen, setFileUploadOpen] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [currentUploadAgreement, setCurrentUploadAgreement] = useState<SavedFileGroup | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: 'file' | 'folder', id: string, title: string, fileType?: string} | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const normalizedDeleteConfirmText = deleteConfirmText.trim().toUpperCase();
  const isDeleteConfirmed = normalizedDeleteConfirmText === 'DELETE';

  const [statusChangeLoading, setStatusChangeLoading] = useState<Record<string, boolean>>({});

  const [fileWatermarkStates, setFileWatermarkStates] = useState<Map<string, boolean>>(new Map());

  const navigate = useNavigate();
  const location = useLocation();
  const isInAdminContext = location.pathname.includes("/admin-panel");
  const returnPath = isInAdminContext ? "/admin-panel/saved-pdfs" : "/saved-pdfs";

  const handleWatermarkToggle = useCallback((fileId: string, checked: boolean) => {
    setFileWatermarkStates(prev => {
      const newMap = new Map(prev);
      newMap.set(fileId, checked);
      return newMap;
    });
    console.log(`💧 [WATERMARK] Toggled watermark for file ${fileId}: ${checked}`);
  }, []);

  const handleStatusChange = useCallback(async (file: SavedFileListItem, newStatus: string) => {
    if (statusChangeLoading[file.id]) return;

    console.log(`📊 [STATUS-CHANGE] Updating ${file.fileName} (${file.fileType}) from ${file.status} to ${newStatus}`);

    setStatusChangeLoading(prev => ({ ...prev, [file.id]: true }));

    try {
      if (file.fileType === 'version_pdf') {
        console.log(`📊 [STATUS-CHANGE-DEBUG] Using file.id as version ID: ${file.id}`);
        await pdfApi.updateVersionStatus(file.id, newStatus);
      } else if (file.fileType === 'main_pdf' && file.agreementId) {
        await pdfApi.updateDocumentStatus(file.agreementId, newStatus);
      } else if (file.fileType === 'attached_pdf') {
        console.log(`📊 [MANUAL-UPLOAD-STATUS] Updating manual upload ${file.id} to ${newStatus}`);
        await manualUploadApi.updateStatus(file.id, newStatus);
      } else {
        throw new Error(`Cannot update status for file type: ${file.fileType}`);
      }

      console.log(`✅ [STATUS-CHANGE] Status update API call succeeded for ${file.id}`);

      setAgreements(prev => prev.map(agreement => ({
        ...agreement,
        files: agreement.files.map(f =>
          f.id === file.id ? { ...f, status: newStatus } : f
        )
      })));

      setToastMessage({
        message: `Status updated to "${getStatusConfig(newStatus).label}" successfully!`,
        type: "success"
      });

      console.log(`✅ [STATUS-CHANGE] Local state updated successfully`);

      setTimeout(() => {
        fetchAgreements(currentPage, query).catch(err => {
          console.warn('⚠️ [STATUS-CHANGE] Background refresh failed (non-critical):', err);
        });
      }, 100);

    } catch (error) {
      console.error("❌ [STATUS-CHANGE] Error during status change flow:", error);
      console.error("❌ [STATUS-CHANGE] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        fileId: file.id,
        fileType: file.fileType,
        newStatus
      });
      setToastMessage({
        message: "Failed to update status. Please try again.",
        type: "error"
      });
    } finally {
      setStatusChangeLoading(prev => ({ ...prev, [file.id]: false }));
    }
  }, [statusChangeLoading, currentPage, query]);

  const fetchAgreements = async (page = 1, search = "") => {
    if (isFetchingRef.current || loading) {
      console.log('⏭️ [SAVED-FILES] Skipping duplicate call - already fetching or loading');
      return;
    }

    isFetchingRef.current = true;

    setLoading(true);
    setError(null);

    try {
      console.log(`📡 [API-CALL] Fetching agreements: page=${page}, search="${search}"`);

      const groupedResponse = await pdfApi.getSavedFilesGrouped(page, agreementsPerPage, {
        search: search.trim() || undefined,
        includeLogs: true,
        includeDrafts: true,
        isDeleted: false
      });

      const allAgreements = groupedResponse.groups;

      allAgreements.forEach(agreement => {
        if (agreement.files.some(file => file.isLatestVersion === undefined)) {
          const versionFiles = agreement.files.filter(file => file.fileType === 'version_pdf' || file.fileType === 'main_pdf');
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

          const latestVersionFiles = versionMap.get(highestVersionNumber) || [];
          latestVersionFiles.forEach(file => {
            file.isLatestVersion = true;
          });

          versionFiles.forEach(file => {
            if (file.isLatestVersion === undefined) {
              file.isLatestVersion = false;
            }
          });
        }

        agreement.files.forEach(file => {
          if (file.fileType === 'attached_pdf' && file.fileSize && file.fileSize > 0) {
            file.hasPdf = true;
          }

          if (file.fileType === 'version_pdf' || file.fileType === 'main_pdf') {
            file.canChangeStatus = file.isLatestVersion === true;
          } else if (file.fileType === 'attached_pdf') {
            const systemControlledStatuses = ['processing', 'completed', 'failed'];
            file.canChangeStatus = !systemControlledStatuses.includes(file.status);
          } else {
            file.canChangeStatus = false;
          }
        });
      });

      const parseTimestamp = (value?: string | null) => {
        const parsed = value ? Date.parse(value) : NaN;
        return Number.isFinite(parsed) ? parsed : 0;
      };

      const sortedAgreements = [...allAgreements].sort((a, b) => {
        const aTime = parseTimestamp(a.latestUpdate);
        const bTime = parseTimestamp(b.latestUpdate);
        if (aTime !== bTime) return bTime - aTime;
        return (a.agreementTitle || "").localeCompare(b.agreementTitle || "");
      });

      const filteredAgreements = timelineFilter === 'all' ? sortedAgreements : sortedAgreements.filter(agreement => {
        if (!agreement.startDate || !agreement.contractMonths) {
          return false;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startDate = new Date(agreement.startDate);
        startDate.setHours(0, 0, 0, 0);

        const expiryDate = new Date(startDate);
        expiryDate.setMonth(expiryDate.getMonth() + agreement.contractMonths);

        const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let status: 'yet-to-start' | 'active' | 'inactive';
        if (daysUntilStart > 0) {
          status = 'yet-to-start';
        } else if (daysRemaining <= 0) {
          status = 'inactive';
        } else {
          status = 'active';
        }

        return status === timelineFilter;
      });

      setAgreements(filteredAgreements);
      setTotalAgreements(groupedResponse.totalGroups);
      setTotalFiles(filteredAgreements.reduce((sum, agreement) => sum + agreement.files.length, 0));
      setCurrentPage(page);

      const agreementsWithTimeline = allAgreements.filter(a => a.startDate && a.contractMonths);
      const agreementsWithoutTimeline = allAgreements.filter(a => !a.startDate || !a.contractMonths);
      console.log(`📅 [TIMELINE-DEBUG] Timeline data summary:`, {
        totalAgreements: allAgreements.length,
        withTimeline: agreementsWithTimeline.length,
        withoutTimeline: agreementsWithoutTimeline.length,
        sampleWithTimeline: agreementsWithTimeline.slice(0, 2).map(a => ({
          title: a.agreementTitle,
          startDate: a.startDate,
          contractMonths: a.contractMonths
        })),
        sampleWithoutTimeline: agreementsWithoutTimeline.slice(0, 2).map(a => ({
          title: a.agreementTitle,
          startDate: a.startDate,
          contractMonths: a.contractMonths
        }))
      });

      console.log(`✅ [API-CALL] Loaded ${filteredAgreements.length}/${allAgreements.length} agreements (timeline filter: ${timelineFilter}), ${groupedResponse.totalGroups} total`);
    } catch (err) {
      console.error("❌ [API-CALL] Error fetching agreements:", err);
      setError("Unable to load agreements. Please try again.");
      setAgreements([]);
      setTotalAgreements(0);
      setTotalFiles(0);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (!hasInitiallyLoaded) {
      hasInitiallyLoaded = true;
      console.log(`📁 [SAVED-FILES-AGREEMENTS] Initial load (context: ${isInAdminContext ? 'admin' : 'normal'})`);
      fetchAgreements(1, query);
    } else {
      console.log('⏭️ [SAVED-FILES-AGREEMENTS] Skipping duplicate initial load (React Strict Mode remount)');
    }

    return () => {
      setTimeout(() => {
        hasInitiallyLoaded = false;
        isFirstSearchRender.current = true;
        console.log('🔄 [SAVED-FILES-AGREEMENTS] Flags reset after unmount (navigating away)');
      }, 50);
    };
  }, []);

  useEffect(() => {
    if (!hasInitiallyLoaded) return;

    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      console.log('⏭️ [SAVED-FILES-AGREEMENTS] Skipping search effect on first render');
      return;
    }

    console.log(`🔍 [SAVED-FILES-AGREEMENTS] Search query changed to: "${query}" or timeline filter changed to: "${timelineFilter}"`);

    const timeoutId = setTimeout(() => {
      fetchAgreements(1, query);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [query, timelineFilter]);

  useEffect(() => {
    const loadEmailTemplate = async () => {
      if (cachedEmailTemplate) {
        console.log('📧 [EMAIL-TEMPLATE] Using cached email template');
        setDefaultEmailTemplate(cachedEmailTemplate);
        return;
      }

      if (isLoadingEmailTemplate) {
        console.log('📧 [EMAIL-TEMPLATE] Already loading template, skipping...');
        return;
      }

      try {
        isLoadingEmailTemplate = true;
        setEmailTemplateLoading(true);
        console.log('📧 [EMAIL-TEMPLATE] Loading email template from API...');

        const template = await emailTemplateApi.getActiveTemplate();

        cachedEmailTemplate = {
          subject: template.subject,
          body: template.body
        };

        setDefaultEmailTemplate(cachedEmailTemplate);
        console.log('📧 [EMAIL-TEMPLATE] Loaded and cached default email template');
      } catch (error) {
        console.error('❌ [EMAIL-TEMPLATE] Failed to load template:', error);

        const fallbackTemplate = {
          subject: 'Document from EnviroMaster NVA',
          body: `Hello,\n\nPlease find the attached document.\n\nBest regards,\nEnviroMaster NVA Team`
        };

        cachedEmailTemplate = fallbackTemplate;
        setDefaultEmailTemplate(fallbackTemplate);
      } finally {
        isLoadingEmailTemplate = false;
        setEmailTemplateLoading(false);
      }
    };

    loadEmailTemplate();
  }, []);

  const selectedFileIds = useMemo(() =>
    Object.entries(selectedFiles)
      .filter(([, selected]) => selected)
      .map(([id]) => id),
    [selectedFiles]
  );

  const selectedFileObjects = useMemo(() => {
    const allFiles: SavedFileListItem[] = [];
    agreements.forEach(agreement => allFiles.push(...agreement.files));
    return allFiles.filter(file => selectedFiles[file.id]);
  }, [agreements, selectedFiles]);

  const hasSelectedFiles = selectedFileIds.length > 0;

  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles(prev => ({ ...prev, [fileId]: !prev[fileId] }));
  }, []);

  const toggleAgreementSelection = useCallback((agreementId: string) => {
    const agreement = agreements.find(a => a.id === agreementId);
    if (!agreement) return;

    const isAgreementSelected = agreement.files.every(file => selectedFiles[file.id]);
    const newSelectedFiles = { ...selectedFiles };

    agreement.files.forEach(file => {
      newSelectedFiles[file.id] = !isAgreementSelected;
    });

    setSelectedFiles(newSelectedFiles);
  }, [agreements, selectedFiles]);

  const selectAllFiles = useCallback(() => {
    const newSelectedFiles: Record<string, boolean> = {};
    agreements.forEach(agreement => {
      agreement.files.forEach(file => {
        newSelectedFiles[file.id] = true;
      });
    });
    setSelectedFiles(newSelectedFiles);
  }, [agreements]);

  const clearAllSelections = useCallback(() => {
    setSelectedFiles({});
  }, []);

  const getAgreementSelectionState = useCallback((agreement: SavedFileGroup) => {
    const selectedCount = agreement.files.filter(file => selectedFiles[file.id]).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === agreement.files.length) return 'all';
    return 'partial';
  }, [selectedFiles]);

  const handleBulkZohoUpload = useCallback(() => {
    const uploadableFiles = selectedFileObjects.filter(file => file.hasPdf || file.fileType === 'version_log');

    if (uploadableFiles.length === 0) {
      setToastMessage({
        message: "Please select files (PDFs or TXT logs) to upload to bigin.",
        type: "error"
      });
      return;
    }
    setSelectedFilesForBulkUpload(uploadableFiles);
    setBulkZohoUploadOpen(true);
  }, [selectedFileObjects]);

  const toggleAgreement = useCallback((agreementId: string) => {
    setExpandedAgreements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(agreementId)) {
        newSet.delete(agreementId);
      } else {
        newSet.add(agreementId);
      }
      return newSet;
    });
  }, []);

  const isAgreementExpanded = useCallback((agreementId: string) => expandedAgreements.has(agreementId), [expandedAgreements]);

  const handleView = useCallback(async (file: SavedFileListItem, watermark: boolean) => {
    try {
      if (file.fileType === 'main_pdf') {
        await pdfApi.getSavedFileDetails(file.id);
      }

      let documentType: string;
      if (file.fileType === 'main_pdf') {
        documentType = 'agreement';
      } else if (file.fileType === 'version_pdf') {
        documentType = 'version';
      } else if (file.fileType === 'version_log') {
        documentType = 'version-log';
      } else if (file.fileType === 'attached_pdf') {
        documentType = 'manual-upload';
      } else {
        documentType = 'attached-file';
      }

      console.log(`📄 [VIEW] Navigating to PDF viewer: ${file.id} (type: ${documentType}, watermark: ${watermark})`);

      navigate("/pdf-viewer", {
        state: {
          documentId: file.id,
          fileName: file.title,
          documentType: documentType,
          watermark: watermark,
          originalReturnPath: returnPath,
        },
      });
    } catch (err) {
      setToastMessage({
        message: "Unable to load this document. Please try again.",
        type: "error"
      });
    }
  }, [navigate, returnPath]);

  const handleDownload = useCallback(async (file: SavedFileListItem, watermark: boolean) => {
    try {
      let blob: Blob;

      if (file.fileType === 'main_pdf') {
        blob = await pdfApi.downloadPdf(file.id);
      } else if (file.fileType === 'version_pdf') {
        console.log(`📥 [DOWNLOAD] Downloading version PDF ${file.id} with watermark: ${watermark}`);
        blob = await pdfApi.downloadVersionPdf(file.id, watermark);
      } else if (file.fileType === 'version_log') {
        blob = await pdfApi.downloadVersionLog(file.id);
      } else if (file.fileType === 'attached_pdf') {
        blob = await manualUploadApi.downloadFile(file.id);
      } else {
        blob = await pdfApi.downloadAttachedFile(file.id);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let safeName: string;
      if (file.fileType === 'version_log') {
        safeName = file.fileName || "EnviroMaster_Version_Log.txt";
      } else {
        const extension = '.pdf';
        const baseFileName = file.fileName || "EnviroMaster_Document";
        if (file.fileType === 'version_pdf' && watermark) {
          const nameWithoutExt = baseFileName.replace('.pdf', '');
          safeName = nameWithoutExt + '_DRAFT' + extension;
        } else {
          safeName = baseFileName.endsWith('.pdf') ? baseFileName : baseFileName.replace(/[^\w\-]+/g, "_") + extension;
        }
      }
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setToastMessage({ message: "Unable to download this file. Please try again.", type: "error" });
    }
  }, []);

  const handleEmail = useCallback((file: SavedFileListItem) => {
    setCurrentEmailFile(file);
    setEmailComposerOpen(true);
  }, []);

  const handleZohoUpload = useCallback((file: SavedFileListItem) => {
    const isUploadableFile = file.hasPdf || file.fileType === 'version_log' || file.fileType === 'attached_pdf';
    if (!isUploadableFile) {
      setToastMessage({
        message: "This document doesn't have a file to upload. Please generate a PDF or ensure the file exists.",
        type: "error"
      });
      return;
    }
    setCurrentZohoFile(file);
    setZohoUploadOpen(true);
  }, []);

  const getAgreementUploadableFiles = (agreement: SavedFileGroup) => {
    return agreement.files.filter(file =>
      file.hasPdf ||
      file.fileType === 'version_log' ||
      file.fileType === 'attached_pdf'
    );
  };

  const handleAgreementZohoUpload = (agreement: SavedFileGroup) => {    const uploadableFiles = getAgreementUploadableFiles(agreement);

    if (uploadableFiles.length === 0) {
      setToastMessage({
        message: "This agreement has no uploadable files. Please generate PDFs first or ensure log files exist.",
        type: "error"
      });
      return;
    }

    if (uploadableFiles.length === 1) {
      setCurrentZohoFile(uploadableFiles[0]);
      setZohoUploadOpen(true);
    } else {
      console.log(`🔍 [FOLDER-UPLOAD] Uploading ${uploadableFiles.length} files (PDFs + TXT logs) from agreement folder`);
      setSelectedFilesForBulkUpload(uploadableFiles);
      setBulkZohoUploadOpen(true);
    }
  };

  const handleAgreementTaskCreate = useCallback((agreement: SavedFileGroup) => {
    setCurrentTaskAgreement({ id: agreement.id, title: agreement.agreementTitle });
    setTaskModalOpen(true);
  }, []);

  const handleEdit = async (file: SavedFileListItem) => {
    try {
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

      navigate(`/edit/pdf/${file.agreementId || file.id}`, {
        state: {
          editing: true,
          id: file.agreementId || file.id,
          returnPath: returnPath,
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

  const handleAddFileToAgreement = (agreement: SavedFileGroup) => {
    setCurrentUploadAgreement(agreement);
    setFileUploadOpen(true);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !currentUploadAgreement) return;

    setIsUploadingFiles(true);

    try {
      setToastMessage({
        message: "Uploading files...",
        type: "success"
      });

      const fileArray = Array.from(files);
      const processedFiles = [];

      for (const file of fileArray) {
        const fileBuffer = await readFileAsArrayBuffer(file);

        processedFiles.push({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          description: `Uploaded ${file.name}`,
          pdfBuffer: Array.from(new Uint8Array(fileBuffer)), 
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

      fetchAgreements(currentPage, query);

      setFileUploadOpen(false);
      setCurrentUploadAgreement(null);
    } catch (error) {
      console.error('File upload error:', error);
      setToastMessage({
        message: "Failed to add files to agreement. Please try again.",
        type: "error"
      });
    } finally {
      setIsUploadingFiles(false);
    }
  };

  const handleDelete = (type: 'file' | 'folder', id: string, title: string, fileType?: string) => {
    setItemToDelete({ type, id, title, fileType });
    setDeleteConfirmText('');
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !isDeleteConfirmed) {
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
        result = await pdfApi.deleteFile(itemToDelete.id, {
          fileType: itemToDelete.fileType
        });
      }

      if (result.success) {
        setDeleteConfirmOpen(false);
        setItemToDelete(null);
        setDeleteConfirmText('');

        setToastMessage({
          message: `${itemToDelete.type === 'folder' ? 'Agreement' : 'File'} moved to trash successfully!`,
          type: "success"
        });

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

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const totalPages = Math.ceil(totalAgreements / agreementsPerPage);
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePrevPage = () => {
    if (canGoPrev) {
      fetchAgreements(currentPage - 1, query);
    }
  };

  const handleNextPage = () => {
    if (canGoNext) {
      fetchAgreements(currentPage + 1, query);
    }
  };

  const handlePageClick = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      fetchAgreements(page, query);
    }
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

        <div style={{ marginLeft: '12px' }}>
          <select
            value={timelineFilter}
            onChange={(e) => {
              const newFilter = e.target.value as 'all' | 'yet-to-start' | 'active' | 'inactive';
              setTimelineFilter(newFilter);
              console.log(`🔍 [TIMELINE-FILTER] Changed to: ${newFilter}`);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '14px',
              backgroundColor: '#fff',
              cursor: 'pointer',
              minWidth: '160px'
            }}
          >
            <option value="all">All Agreements</option>
            <option value="yet-to-start">Yet to Start</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="sf__actions">
          {hasSelectedFiles && (
            <>
              <div style={{
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
          <>
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                style={{
                  background: '#fff',
                  border: '1px solid #e6e6e6',
                  borderRadius: '10px',
                  marginBottom: '8px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                  padding: '16px',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    background: '#e5e7eb',
                    borderRadius: '4px'
                  }} />

                  <div style={{
                    width: '14px',
                    height: '14px',
                    background: '#e5e7eb',
                    borderRadius: '4px'
                  }} />

                  <div style={{
                    width: '18px',
                    height: '18px',
                    background: '#fef3c7',
                    borderRadius: '4px'
                  }} />

                  <div style={{ flex: 1 }}>
                    <div style={{
                      height: '16px',
                      background: '#e5e7eb',
                      borderRadius: '4px',
                      width: '60%',
                      marginBottom: '8px'
                    }} />
                    <div style={{
                      height: '12px',
                      background: '#f3f4f6',
                      borderRadius: '4px',
                      width: '40%'
                    }} />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{
                      width: '60px',
                      height: '28px',
                      background: '#fef2f2',
                      borderRadius: '6px'
                    }} />
                    <div style={{
                      width: '50px',
                      height: '28px',
                      background: '#f3f4f6',
                      borderRadius: '6px'
                    }} />
                    <div style={{
                      width: '60px',
                      height: '28px',
                      background: '#fef2f2',
                      borderRadius: '6px'
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </>
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
          const isExpanded = expandedAgreements.has(agreement.id);
          const selectionState = getAgreementSelectionState(agreement);

          return (
            <AgreementRow
              key={agreement.id}
              agreement={agreement}
              isExpanded={isExpanded}
              selectionState={selectionState}
              selectedFiles={selectedFiles}
              statusChangeLoading={statusChangeLoading}
              fileWatermarkStates={fileWatermarkStates}
              isInAdminContext={isInAdminContext}
              isTrashView={false}
              onToggleExpand={toggleAgreement}
              onToggleSelection={toggleAgreementSelection}
              onFileToggleSelection={toggleFileSelection}
              onAddFile={handleAddFileToAgreement}
              onEditAgreement={handleEditAgreement}
              onDelete={handleDelete}
              onAgreementZohoUpload={handleAgreementZohoUpload}
              onAgreementTaskCreate={handleAgreementTaskCreate}
              onDateChange={async (agreementId: string, newDate: string) => {
                console.log(`📅 [SAVED-FILES-AGREEMENTS] Updating start date for agreement ${agreementId}: ${newDate}`);
                try {
                  await pdfApi.updateCustomerHeader(agreementId, {
                    agreement: { startDate: newDate }
                  } as any);
                  setToastMessage({
                    message: "Agreement start date updated successfully!",
                    type: "success"
                  });
                  fetchAgreements(currentPage, query);
                } catch (error) {
                  console.error("Failed to update start date:", error);
                  setToastMessage({
                    message: "Failed to update start date. Please try again.",
                    type: "error"
                  });
                }
              }}
              onView={handleView}
              onDownload={handleDownload}
              onEmail={handleEmail}
              onZohoUpload={handleZohoUpload}
              onEdit={handleEdit}
              onStatusChange={handleStatusChange}
              onWatermarkToggle={handleWatermarkToggle}
              onRestore={(type, id, title, fileType) => {
                console.log('Restore not available in saved files view');
              }}
            />
          );
        })}
      </div>

      <div className="sf__pager">
        <div className="sf__page-info">
          Showing {Math.min((currentPage - 1) * agreementsPerPage + 1, totalAgreements)}-{Math.min(currentPage * agreementsPerPage, totalAgreements)} of {totalAgreements} agreements
        </div>

        <div className="sf__page-controls">
          <button
            type="button"
            className="sf__link"
            disabled={!canGoPrev || loading}
            onClick={handlePrevPage}
          >
            Previous
          </button>

          <div style={{ display: 'flex', gap: '4px' }}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else {
                const start = Math.max(1, currentPage - 2);
                const end = Math.min(totalPages, start + 4);
                pageNum = start + i;
                if (pageNum > end) return null;
              }

              return (
                <button
                  key={pageNum}
                  type="button"
                  className={`sf__page ${currentPage === pageNum ? 'sf__page--active' : ''}`}
                  onClick={() => handlePageClick(pageNum)}
                  disabled={loading}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="sf__link"
            disabled={!canGoNext || loading}
            onClick={handleNextPage}
          >
            Next
          </button>
        </div>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      <EmailComposer
          isOpen={emailComposerOpen}
          onClose={() => setEmailComposerOpen(false)}
          onSend={async (emailData: EmailData) => {
            if (!currentEmailFile) return;

            const documentType = getDocumentTypeForSavedFile(currentEmailFile);

            await emailApi.sendEmailWithPdfById({
              to: emailData.to,
              subject: emailData.subject,
              body: emailData.body,
              documentId: currentEmailFile.id,
              fileName: currentEmailFile.title,
              documentType,
              watermark: emailData.attachment?.watermark || false
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
            documentType: getDocumentTypeForSavedFile(currentEmailFile),
            watermark: currentEmailFile.fileType === 'version_pdf' ? (fileWatermarkStates.get(currentEmailFile.id) || false) : false
          } : undefined}
        defaultSubject={defaultEmailTemplate?.subject || (currentEmailFile ? `${currentEmailFile.title} - ${STATUS_LABEL[currentEmailFile.status as FileStatus]}` : '')}
        defaultBody={defaultEmailTemplate?.body || (currentEmailFile ? `Hello,\n\nPlease find the document attached.\n\nDocument: ${currentEmailFile.title}\n\nBest regards` : '')}
      />

      {zohoUploadOpen && currentZohoFile && (
        <ZohoUpload
          agreementId={currentZohoFile.agreementId || currentZohoFile.id}
          agreementTitle={currentZohoFile.title}
          bulkFiles={[{
            id: currentZohoFile.id,
            fileName: currentZohoFile.fileName,
            title: currentZohoFile.title,
            fileType: currentZohoFile.fileType
          }]}
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

      {taskModalOpen && currentTaskAgreement && (
        <BiginTaskModal
          agreementId={currentTaskAgreement.id}
          agreementTitle={currentTaskAgreement.title}
          onClose={() => { setTaskModalOpen(false); setCurrentTaskAgreement(null); }}
          onSuccess={() => {
            setToastMessage({ message: "Task created in Bigin!", type: "success" });
          }}
        />
      )}

      {bulkZohoUploadOpen && selectedFilesForBulkUpload.length > 0 && (
        <ZohoUpload
          agreementId={selectedFilesForBulkUpload[0]?.agreementId || selectedFilesForBulkUpload[0]?.id || ''}
          agreementTitle={`Bulk Upload - ${selectedFilesForBulkUpload.length} Documents`}
          bulkFiles={selectedFilesForBulkUpload.map(file => ({
            id: file.id,
            fileName: file.fileName,
            title: file.title,
            fileType: file.fileType
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
              message: `Successfully uploaded ${selectedFilesForBulkUpload.length} files to Bigin!`,
              type: "success"
            });
          }}
        />
      )}

      {fileUploadOpen && currentUploadAgreement && (
        <div className="file-upload-modal">
          <div className="file-upload-modal__overlay" onClick={() => {
            setFileUploadOpen(false);
            setCurrentUploadAgreement(null);
          }} />
          <div className="file-upload-modal__content">
            <h3 className="file-upload-modal__title">
              <FontAwesomeIcon icon={faFileAlt} className="file-upload-modal__icon" />
              Add Files to: <span className="file-upload-modal__agreement-name">{currentUploadAgreement.agreementTitle}</span>
            </h3>

            <div className="file-upload-modal__section">
              <div className="file-upload-modal__file-input-wrapper">
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="file-upload-modal__file-input"
                  id="file-upload-input"
                />
                <label
                  htmlFor="file-upload-input"
                  className="file-upload-modal__file-label"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.add('file-upload-modal__file-label--dragging');
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.add('file-upload-modal__file-label--dragging');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('file-upload-modal__file-label--dragging');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('file-upload-modal__file-label--dragging');

                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      handleFileUpload(files);
                    }
                  }}
                >
                  <FontAwesomeIcon icon={faFileAlt} className="file-upload-modal__file-icon" />
                  <span className="file-upload-modal__file-text">
                    Choose PDF Files or Drag & Drop
                  </span>
                </label>
              </div>
              <p className="file-upload-modal__hint">
                Select one or more PDF files to attach to this agreement
              </p>
            </div>

            <div className="file-upload-modal__actions">
              <button
                type="button"
                className="file-upload-modal__btn file-upload-modal__btn--cancel"
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
                background: isDeleteConfirmed ? '#dc2626' : '#f3f4f6',
                border: `1px solid ${isDeleteConfirmed ? '#dc2626' : '#d1d5db'}`,
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: isDeleteConfirmed ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: isDeleteConfirmed ? '#fff' : '#9ca3af',
                  opacity: isDeleteConfirmed ? 1 : 0.6
                }}
                onClick={confirmDelete}
                disabled={!isDeleteConfirmed}
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
