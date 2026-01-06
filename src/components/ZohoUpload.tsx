// src/components/ZohoUpload.tsx
import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faBuilding,
  faPlus,
  faUpload,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle,
  faHistory,
  faSearch,
  faFileAlt
} from "@fortawesome/free-solid-svg-icons";
import { zohoApi } from "../backendservice/api";
import type { ZohoCompany, ZohoUploadStatus, ZohoPipelineOptions } from "../backendservice/api";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { matchCompanyName, getMatchTypeLabel, getMatchTypeColor } from "../utils/fuzzyMatch";
import type { MatchType } from "../utils/fuzzyMatch";
import "./ZohoUpload.css";

interface ZohoUploadProps {
  agreementId: string;
  agreementTitle: string;
  onClose: () => void;
  onSuccess: () => void;
  // ✅ NEW: Optional bulk upload support using existing UI
  bulkFiles?: Array<{ id: string; fileName: string; title: string; fileType?: string }>;
}

type UploadStep = 'loading' | 'first-time' | 'update' | 'uploading' | 'success' | 'error';

// ✅ NEW: Company with match information for enhanced search
interface CompanyWithMatch extends ZohoCompany {
  matchType?: MatchType;
  matchScore?: number;
}

export const ZohoUpload: React.FC<ZohoUploadProps> = ({
  agreementId,
  agreementTitle,
  onClose,
  onSuccess,
  bulkFiles  // ✅ NEW: Optional bulk files array
}) => {
  // State management
  const [step, setStep] = useState<UploadStep>('loading');
  const [uploadStatus, setUploadStatus] = useState<ZohoUploadStatus | null>(null);
  const [allCompanies, setAllCompanies] = useState<ZohoCompany[]>([]); // ✅ NEW: Store all companies fetched from backend
  const [companies, setCompanies] = useState<CompanyWithMatch[]>([]); // ✅ Filtered/sorted companies to display
  const [pipelineOptions, setPipelineOptions] = useState<ZohoPipelineOptions | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  // Form data
  const [selectedCompany, setSelectedCompany] = useState<ZohoCompany | null>(null);
  const [dealName, setDealName] = useState('');
  const [pipelineName, setPipelineName] = useState('Sales Pipeline');
  const [stage, setStage] = useState('Proposal');
  const [noteText, setNoteText] = useState('');
  const [newCompany, setNewCompany] = useState({
    name: '',
    phone: '',
    email: '',
    website: '',
    address: ''
  });

  // ✅ NEW: File selection state for checkbox functionality
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [uploadMode, setUploadMode] = useState<"files" | "notes">("files");

  // Initialize component
  useEffect(() => {
    initializeUpload();
  }, [agreementId, bulkFiles]);  // ✅ Also watch bulkFiles changes

  // ✅ NEW: Initialize selected files when bulkFiles changes
  useEffect(() => {
    if (bulkFiles && bulkFiles.length > 0) {
      // ✅ DEBUG: Log bulk files to check fileType
      console.log(`🔍 [BULK-FILES-DEBUG] Received ${bulkFiles.length} bulk files:`);
      bulkFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.fileName} (ID: ${file.id}, Type: ${file.fileType || 'undefined'})`);
      });

      // Default: select all files initially
      const allFileIds = new Set(bulkFiles.map(file => file.id));
      setSelectedFiles(allFileIds);
    } else {
      // Single file mode: always selected
      setSelectedFiles(new Set([agreementId]));
    }
  }, [bulkFiles, agreementId]);

  // ✅ NEW: Helper functions for file selection
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const selectAllFiles = () => {
    if (bulkFiles && bulkFiles.length > 0) {
      setSelectedFiles(new Set(bulkFiles.map(file => file.id)));
    }
  };

  const deselectAllFiles = () => {
    setSelectedFiles(new Set());
  };

  // ✅ NEW: Get only selected files for upload
  const getSelectedBulkFiles = () => {
    if (!bulkFiles) return null;
    return bulkFiles.filter(file => selectedFiles.has(file.id));
  };

  // ✅ FIXED: Proper file type detection for correct API routing
  const getFileUploadStrategy = (file: any) => {
    // Version PDFs and main agreement files use the main agreement API
  if (file.fileType === 'main_pdf' || file.fileType === 'version_pdf') {
    return {
      type: 'agreement',
      route: 'updateUpload',
      useAgreementId: true,
      description: file.fileType === 'version_pdf' ? 'Version PDF' : 'Main Agreement'
    };
  }

  // Manual uploads (attached files) use the attached file API
  if (file.fileType === 'attached_pdf') {
    return {
      type: 'attached',
      route: 'uploadAttachedFile',
      useAgreementId: false,
      description: 'Manual Upload'
    };
  }

  if (file.fileType === 'version_log') {
    return {
      type: 'attached',
      route: 'uploadAttachedFile',
      useAgreementId: false,
      description: 'Version Log'
    };
  }

  // Fallback: filename-based detection for files without clear type
  const fileName = file.fileName?.toLowerCase() || '';
  if (fileName.includes('agreement') || fileName.includes('main')) {
      return {
        type: 'agreement',
        route: 'updateUpload',
        useAgreementId: true,
        description: 'Agreement (by filename)'
      };
    }

    // Default to agreement route for unknown types
    return {
      type: 'agreement',
      route: 'updateUpload',
      useAgreementId: true,
      description: 'Unknown (default to agreement)'
    };
  };

  // ✅ Calculate actual Zoho file names (with version numbers)
  const calculateZohoFileName = (file: any, dealName: string, version: number = 1) => {
    const strategy = getFileUploadStrategy(file);

    if (strategy.type === 'agreement') {
      // Agreement files (main PDF, version PDF) get versioned names
      return `${dealName.replace(/[^a-zA-Z0-9-_]/g, '_')}_v${version}.pdf`;
    } else {
      // Manual uploads get _attached suffix
      const cleanFileName = file.fileName.replace(/[^a-zA-Z0-9\-_.]/g, '_');
      if (file.fileType === 'version_log') {
        return `${cleanFileName.replace('.pdf', '')}_log.pdf`;
      }
      return `${cleanFileName.replace('.pdf', '')}_attached.pdf`;
    }
  };

  const initializeUpload = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ BULK UPLOAD MODE: Check folder-level mapping status
      if (bulkFiles && bulkFiles.length > 0) {
        console.log(`🔍 [BULK] Checking folder mapping status for ${bulkFiles.length} files`);

        // ✅ FIX: Check multiple files to determine folder mapping state
        let existingMappingFound = false;
        let folderMapping = null;
        let checkedFiles = 0;
        const maxFilesToCheck = Math.min(3, bulkFiles.length); // Check up to 3 files for efficiency

        for (const file of bulkFiles.slice(0, maxFilesToCheck)) {
          try {
            // ✅ FIX: Use main agreementId for status check, not file.id
            const statusResult = await zohoApi.getUploadStatus(agreementId);
            checkedFiles++;

            console.log(`🔍 [BULK] File ${file.fileName} status:`, {
              isFirstTime: statusResult.isFirstTime,
              hasMapping: !!statusResult.mapping
            });

            if (!statusResult.isFirstTime && statusResult.mapping) {
              existingMappingFound = true;
              folderMapping = statusResult.mapping;
              console.log(`♻️ [BULK] Found existing mapping in folder:`, folderMapping);
              break; // Found a mapping, no need to check more files
            }
          } catch (err) {
            console.warn(`⚠️ [BULK] Could not check status for ${file.fileName}:`, err);
            // Continue checking other files even if one fails
          }
        }

        if (existingMappingFound && folderMapping) {
          // ✅ EXISTING MAPPING: Go to update mode for folder
          console.log(`♻️ [BULK] Using existing folder mapping - Update mode for ${bulkFiles.length} files`);
          setUploadStatus({ isFirstTime: false, mapping: folderMapping });

          // Set default notes for bulk update using actual Zoho file names
          const nextVersion = folderMapping.nextVersion || 2;
          const actualFileNames = bulkFiles.map(file =>
            calculateZohoFileName(file, folderMapping.dealName || 'Deal', nextVersion)
          );
          // setNoteText(`Bulk update - Adding ${bulkFiles.length} documents:\n${actualFileNames.map(fileName => `• ${fileName}`).join('\n')}`);
          setStep('update');
          return;
        }

        // ✅ NEW FOLDER: Load companies for first-time bulk upload
        console.log(`🆕 [BULK] New folder - Loading companies for ${bulkFiles.length} files`);
        const companiesResult = await zohoApi.getCompanies(1);

        if (!companiesResult.success) {
          throw new Error(companiesResult.error || 'Failed to load companies');
        }

        // ✅ NEW: Store ALL companies from backend for client-side filtering
        const allCompaniesData = companiesResult.companies || [];
        setAllCompanies(allCompaniesData);

        // ✅ Initially show all companies (no search term yet)
        setCompanies(allCompaniesData);

        console.log(`✅ Loaded ${allCompaniesData.length} companies for client-side search`);

        // Set default deal name for bulk upload
        const defaultDealName = bulkFiles.length === 1
          ? bulkFiles[0].title
          : `Bulk Upload - ${bulkFiles.length} Documents`;
        setDealName(defaultDealName);

        // Set default notes for bulk first-time upload using actual Zoho file names
        const actualFileNames = bulkFiles.map(file =>
          file.fileName || calculateZohoFileName(file, defaultDealName, 1)
        );
        // setNoteText(`Bulk upload of ${bulkFiles.length} documents to Zoho Bigin:\n${actualFileNames.map(fileName => `• ${fileName}`).join('\n')}`);

        setStep('first-time');
        return;
      }

      // ✅ SINGLE UPLOAD MODE: Original logic
      // Check upload status
      const statusResult = await zohoApi.getUploadStatus(agreementId);
      setUploadStatus(statusResult);

      if (statusResult.isFirstTime) {
        // Load companies for first-time upload
        const companiesResult = await zohoApi.getCompanies(1);

        if (!companiesResult.success) {
          throw new Error(companiesResult.error || 'Failed to load companies');
        }

        // ✅ NEW: Store ALL companies from backend for client-side filtering
        const allCompaniesData = companiesResult.companies || [];
        setAllCompanies(allCompaniesData);

        // ✅ Initially show all companies (no search term yet)
        setCompanies(allCompaniesData);

        console.log(`✅ Loaded ${allCompaniesData.length} companies for client-side search`);

        // ✅ FIX: Don't load pipeline options here - wait for company selection

        // Generate default deal name
        const defaultDealName = generateDealName(statusResult.agreement?.headerTitle || agreementTitle);
        setDealName(defaultDealName);

        setStep('first-time');
      } else {
        // Update mode
        setStep('update');
      }
    } catch (err) {
      console.error('Failed to initialize upload:', err);

      // ✅ NEW: Show helpful error for OAuth issues
      if (err.message?.includes('authorization') || err.message?.includes('auth')) {
        setError('Zoho integration not set up. Please contact your administrator to configure Zoho Bigin access.');
      } else {
        setError('Failed to load upload options. Please try again.');
      }

      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Load pipeline options when company is selected
  useEffect(() => {
    const loadPipelineOptions = async () => {
      if (!selectedCompany) {
        // Clear pipeline options when no company selected
        setPipelineOptions({ success: false, pipelines: [], stages: [] });
        return;
      }

      try {
        console.log(`🔍 Loading pipeline options for company: ${selectedCompany.name} (${selectedCompany.id})`);
        const pipelineResult = await zohoApi.getCompanyPipelineOptions(selectedCompany.id);

        if (pipelineResult.success) {
          setPipelineOptions(pipelineResult);
          console.log(`✅ Loaded pipeline options:`, pipelineResult.pipelines?.length || 0, 'pipelines');

          // Set default values from the loaded options
          if (pipelineResult.pipelines?.length > 0) {
            setPipelineName(pipelineResult.pipelines[0].value);
          }
          if (pipelineResult.stages?.length > 0) {
            setStage(pipelineResult.stages[0].value);
          }
        } else {
          console.error('Failed to load pipeline options:', pipelineResult.error);
          // Keep existing fallback values
        }
      } catch (error) {
        console.error('Error loading pipeline options:', error);
        // Keep existing fallback values
      }
    };

    loadPipelineOptions();
  }, [selectedCompany]); // Trigger when company selection changes

  const generateDealName = (title: string) => {
    const cleanTitle = title?.trim() || 'Service Proposal';
    return `${cleanTitle} - EnviroMaster Services`;
  };

  // ✅ NEW: Client-side search filtering using fuzzy matching
  const filterCompanies = useCallback((search: string) => {
    if (!search.trim()) {
      // No search term - show all companies without match information
      setCompanies(allCompanies);
      return;
    }

    console.log(`🔍 [CLIENT-SEARCH] Filtering ${allCompanies.length} companies for: "${search}"`);

    // Apply fuzzy matching to all companies
    const companiesWithMatch: CompanyWithMatch[] = allCompanies.map(company => {
      const matchResult = matchCompanyName(company.name, search);
      return {
        ...company,
        matchType: matchResult.matchType,
        matchScore: matchResult.score
      };
    });

    // Filter out companies with no match (below fuzzy threshold)
    const matchedCompanies = companiesWithMatch.filter(c => c.matchType !== 'none');

    // Sort by match quality (exact > partial > fuzzy, then by score)
    const sortedCompanies = matchedCompanies.sort((a, b) => {
      const matchTypePriority: Record<MatchType, number> = {
        exact: 4,
        partial: 3,
        fuzzy: 2,
        none: 1
      };

      const priorityA = matchTypePriority[a.matchType || 'none'];
      const priorityB = matchTypePriority[b.matchType || 'none'];

      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }

      // Within same match type, sort by score (higher score first)
      return (b.matchScore || 0) - (a.matchScore || 0);
    });

    console.log(`✅ [CLIENT-SEARCH] Found ${sortedCompanies.length} matches:`, {
      exact: sortedCompanies.filter(c => c.matchType === 'exact').length,
      partial: sortedCompanies.filter(c => c.matchType === 'partial').length,
      fuzzy: sortedCompanies.filter(c => c.matchType === 'fuzzy').length,
      total: sortedCompanies.length
    });

    setCompanies(sortedCompanies);
  }, [allCompanies]);

  // ✅ NEW: Instant client-side filtering (no debounce needed - it's fast!)
  useEffect(() => {
    if (step === 'first-time') {
      filterCompanies(searchTerm);
    }
  }, [searchTerm, filterCompanies, step]);

  const handleCreateCompany = async () => {
    if (!newCompany.name.trim()) {
      setToastMessage({ message: 'Company name is required', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      const result = await zohoApi.createCompany(newCompany);

      if (result.success && result.company) {
        setSelectedCompany(result.company);

        // ✅ NEW: Add to both allCompanies (for search) and companies (for display)
        setAllCompanies(prev => [result.company!, ...prev]);
        setCompanies(prev => [result.company!, ...prev]);

        setShowCreateCompany(false);
        setNewCompany({ name: '', phone: '', email: '', website: '', address: '' });
        setToastMessage({ message: 'Company created successfully', type: 'success' });
      } else {
        setToastMessage({ message: result.error || 'Failed to create company', type: 'error' });
      }
    } catch (err) {
      console.error('Failed to create company:', err);
      setToastMessage({ message: 'Failed to create company', type: 'error' });
    } finally {
      setLoading(false);
    }
  };


  const handleFirstTimeUpload = async () => {
    if (!selectedCompany) {
      setToastMessage({ message: 'Please select a company', type: 'error' });
      return;
    }
    if (!dealName.trim()) {
      setToastMessage({ message: 'Deal name is required', type: 'error' });
      return;
    }

    try {
      const trimmedNote = noteText.trim();
      const selectedBulkFiles = bulkFiles ? getSelectedBulkFiles() || [] : [];
      const hasSelectedBulkFiles = selectedBulkFiles.length > 0;
      const hasSingleSelection = (!bulkFiles || bulkFiles.length === 0) && selectedFiles.has(agreementId);
      const hasAnyFile = bulkFiles && bulkFiles.length > 0 ? hasSelectedBulkFiles : hasSingleSelection;
      const hasNotes = trimmedNote.length > 0;

      if (!hasAnyFile && !hasNotes) {
        setToastMessage({ message: "Please add a note or select at least one file to upload to Bigin.", type: "error" });
        return;
      }

      setUploadMode(hasAnyFile ? "files" : "notes");
      setStep('uploading');

      // ?o. BULK UPLOAD MODE: Create ONE deal and add only selected files to it
      if (bulkFiles && bulkFiles.length > 0) {
        if (!hasSelectedBulkFiles) {
          const result = await zohoApi.firstTimeUpload(agreementId, {
            companyId: selectedCompany.id,
            companyName: selectedCompany.name,
            dealName: dealName.trim(),
            pipelineName,
            stage,
            noteText: trimmedNote,
            skipFileUpload: true
          });

          if (result.success) {
            setStep('success');
            setToastMessage({ message: 'Deal created with note only!', type: 'success' });
            onSuccess();
          } else {
            setError(result.error || 'Upload failed');
            setStep('error');
          }
          return;
        }

        console.log(`?Y? [BULK-FIRST-TIME] Creating single deal for ${selectedBulkFiles.length} selected files (out of ${bulkFiles.length} total)`);
        let dealId: string | null = null;
        let successCount = 0;
        let failCount = 0;

        const actualFileNames = selectedBulkFiles.map(file =>
          file.fileName || calculateZohoFileName(file, dealName.trim(), 1)
        );
        const bulkNoteText = `${trimmedNote}

Bulk upload of ${selectedBulkFiles.length} selected documents:
${actualFileNames.map(fileName => `• ${fileName}`).join('\n')}`;

        const hasVersionPdf = selectedBulkFiles.some(file => {
          const strategy = getFileUploadStrategy(file);
          return strategy.type === 'agreement';
        });
        const areAllAttachments = selectedBulkFiles.length > 0 && selectedBulkFiles.every(file => {
          const strategy = getFileUploadStrategy(file);
          return strategy.type === 'attached';
        });

        console.log(`?Y"? [BULK-FIRST-TIME] Analysis: ${selectedBulkFiles.length} files, hasVersionPdf: ${hasVersionPdf}`);

        for (const [index, file] of selectedBulkFiles.entries()) {
          try {
            const strategy = getFileUploadStrategy(file);
            console.log(`?Y" [BULK-FIRST-TIME] Processing file ${index + 1}/${selectedBulkFiles.length}: ${file.fileName} (${strategy.description})`);
            console.log(`?Y"? [BULK-FIRST-TIME] File details:`, {
              id: file.id,
              fileName: file.fileName,
              fileType: file.fileType,
              strategy: strategy
            });

            if (index === 0) {
              console.log(`?Y"? [BULK-FIRST-TIME] Creating deal ${hasVersionPdf ? 'without auto PDF upload' : 'with agreement PDF'}`);

              const result = await zohoApi.firstTimeUpload(agreementId, {
                companyId: selectedCompany.id,
                companyName: selectedCompany.name,
                dealName: dealName.trim(),
                pipelineName,
                stage,
                noteText: bulkNoteText,
                skipFileUpload: hasVersionPdf || areAllAttachments
              });

              if (result.success) {
                dealId = result.data?.deal?.id;
                console.log(`?o. [BULK-FIRST-TIME] Deal created with ID: ${dealId}`);

                if (!dealId) {
                  failCount++;
                  console.error(`??O [BULK-FIRST-TIME] Could not extract dealId from response:`, result.data);
                  break;
                }

                if (strategy.type === 'attached') {
                  console.log(`?Y"Z [BULK-FIRST-TIME] Adding first file as attached: ${file.fileName}`);

                  const attachedResult = await zohoApi.uploadAttachedFile(file.id, {
                    dealId: dealId,
                    noteText: `Bulk upload attached file: ${file.fileName}`,
                    dealName: dealName.trim(),
                    skipNoteCreation: true,
                    fileType: file.fileType
                  });

                  if (attachedResult.success) {
                    successCount++;
                    console.log(`?o. [BULK-FIRST-TIME] Added attached file to deal: ${file.fileName}`);
                  } else {
                    failCount++;
                    console.error(`??O [BULK-FIRST-TIME] Failed to add attached file ${file.fileName}:`, attachedResult.error);
                  }
                } else if (strategy.type === 'agreement') {
                  console.log(`?Y"? [BULK-FIRST-TIME] Adding first file as version PDF: ${file.fileName}`);

                  const versionResult = await zohoApi.updateUpload(agreementId, {
                    noteText: `First file in bulk upload: ${file.fileName}`,
                    dealId: dealId,
                    skipNoteCreation: true,
                    versionId: file.id
                  });

                  if (versionResult.success) {
                    successCount++;
                    console.log(`?o. [BULK-FIRST-TIME] Added version PDF to deal: ${file.fileName}`);
                  } else {
                    failCount++;
                    console.error(`??O [BULK-FIRST-TIME] Failed to add version PDF ${file.fileName}:`, versionResult.error);
                  }
                } else {
                  successCount++;
                  console.log(`?o. [BULK-FIRST-TIME] Agreement PDF auto-uploaded during deal creation`);
                }
              } else {
                failCount++;
                console.error(`??O [BULK-FIRST-TIME] Failed to create deal:`, result.error);
                break;
              }
            } else {
              if (!dealId) {
                failCount++;
                console.error(`??O [BULK-FIRST-TIME] No dealId available for file: ${file.fileName}`);
                continue;
              }

              const strategy = getFileUploadStrategy(file);
              console.log(`?Y"? [BULK-FIRST-TIME] Processing file: ${file.fileName} (${strategy.description})`);
              console.log(`?Y"? [BULK-FIRST-TIME] File details:`, {
                id: file.id,
                fileName: file.fileName,
                fileType: file.fileType,
                strategy: strategy
              });

              let result;

              if (strategy.type === 'agreement') {
                const targetId = strategy.useAgreementId ? agreementId : file.id;
                console.log(`?Y"? [BULK-FIRST-TIME] Using agreement route for: ${file.fileName} (targetId: ${targetId})`);

                result = await zohoApi.updateUpload(targetId, {
                  noteText: `Additional file in bulk upload: ${file.fileName}`,
                  skipNoteCreation: true,
                  versionId: file.id
                });
              } else if (strategy.type === 'attached') {
                console.log(`?Y"Z [BULK-FIRST-TIME] Using attached file route for: ${file.fileName} (fileId: ${file.id})`);

                result = await zohoApi.uploadAttachedFile(file.id, {
                  dealId: dealId,
                  noteText: `Additional file in bulk upload: ${file.fileName}`,
                  dealName: dealName.trim(),
                  skipNoteCreation: true,
                  fileType: file.fileType
                });
              } else {
                console.warn(`?s???? [BULK-FIRST-TIME] Unknown strategy type for ${file.fileName}, using agreement route`);
                result = await zohoApi.updateUpload(agreementId, {
                  noteText: `Additional file in bulk upload: ${file.fileName}`,
                  skipNoteCreation: true,
                  versionId: file.id
                });
              }

              if (result.success) {
                successCount++;
                console.log(`?o. [BULK-FIRST-TIME] Added file to deal: ${file.fileName}`);
              } else {
                failCount++;
                console.error(`??O [BULK-FIRST-TIME] Failed to add ${file.fileName} to deal:`, result.error);
              }
            }
          } catch (err) {
            failCount++;
            console.error(`?Y'? [BULK-FIRST-TIME] Error processing ${file.fileName}:`, err);
          }
        }

        if (successCount > 0) {
          setStep('success');
          const message = failCount > 0
            ? `Created deal and added ${successCount} files, ${failCount} failed`
            : `Successfully created deal with all ${successCount} selected files!`;
          setToastMessage({ message, type: successCount === selectedBulkFiles.length ? 'success' : 'warning' });
          onSuccess();
        } else {
          setError('Failed to create deal and upload selected files. Please check your connection and try again.');
          setStep('error');
        }
        return;
      }

      const shouldSkipSingleFileUpload = !selectedFiles.has(agreementId);
      const result = await zohoApi.firstTimeUpload(agreementId, {
        companyId: selectedCompany.id,
        companyName: selectedCompany.name,
        dealName: dealName.trim(),
        pipelineName,
        stage,
        noteText: trimmedNote,
        skipFileUpload: shouldSkipSingleFileUpload
      });

      if (result.success) {
        setStep('success');
        setToastMessage({ message: 'Successfully uploaded to Zoho Bigin!', type: 'success' });
        onSuccess();
      } else {
        setError(result.error || 'Upload failed');
        setStep('error');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Upload failed. Please try again.');
      setStep('error');
    }
  };
  const sendUpdateNoteOnly = async () => {
    if (!uploadStatus?.mapping?.dealId) {
      setError("No existing Zoho deal mapping found. Upload the agreement at least once before sending notes.");
      setStep("error");
      return;
    }

    const updateResult = await zohoApi.updateUpload(agreementId, {
      dealId: uploadStatus.mapping.dealId,
      noteText: noteText.trim(),
      skipFileUpload: true
    });

    if (updateResult.success) {
      setStep("success");
      setToastMessage({ message: `Successfully added note to deal ${uploadStatus.mapping.dealName}!`, type: "success" });
      onSuccess();
    } else {
      setError(updateResult.error || "Update failed");
      setStep("error");
    }
  };

  const handleUpdateUpload = async () => {
    if (!noteText.trim()) {
      setToastMessage({ message: 'Please add notes about what changed in this version', type: 'error' });
      return;
    }

    try {
      const selectedBulkFiles = bulkFiles ? getSelectedBulkFiles() || [] : [];
      const hasSelectedBulkFiles = selectedBulkFiles.length > 0;
      const hasSingleSelection = (!bulkFiles || bulkFiles.length === 0) && selectedFiles.has(agreementId);
      const hasAnyFile = bulkFiles && bulkFiles.length > 0 ? hasSelectedBulkFiles : hasSingleSelection;
      setUploadMode(hasAnyFile ? "files" : "notes");
      setStep('uploading');

      // ✅ BULK UPDATE MODE: Process only selected files for existing folder
      if (bulkFiles && bulkFiles.length > 0) {
        if (selectedBulkFiles.length === 0) {
          await sendUpdateNoteOnly();
          return;
        }

        console.log(`♻️ [BULK-UPDATE] Processing ${selectedBulkFiles.length} selected files (out of ${bulkFiles.length} total) for existing folder`);
        let successCount = 0;
        let failCount = 0;
        let isFirstFileUpload = true;

        // ✅ Prepare comprehensive note text for first file upload using actual Zoho file names
        const nextVersion = uploadStatus?.mapping?.nextVersion || 2;
        const actualFileNames = selectedBulkFiles.map(file =>
          file.fileName || calculateZohoFileName(file, uploadStatus?.mapping?.dealName || 'Deal', nextVersion)
        );
        const bulkUpdateNoteText = `${noteText.trim()}\n\nUpdate with ${selectedBulkFiles.length} selected documents:\n${actualFileNames.map(fileName => `• ${fileName}`).join('\n')}`;

        for (const file of selectedBulkFiles) {
          try {
            // ✅ FIXED: Use strategy to determine correct upload method
            const strategy = getFileUploadStrategy(file);
            console.log(`📤 [BULK-UPDATE] Processing file: ${file.fileName} (${strategy.description})`);
            console.log(`🔍 [BULK-UPDATE] File details:`, {
              id: file.id,
              fileName: file.fileName,
              fileType: file.fileType,
              strategy: strategy
            });

            let result;

            if (strategy.type === 'agreement') {
              // Version PDFs and main agreement files - use main agreement API
              const targetId = strategy.useAgreementId ? agreementId : file.id;
              console.log(`📝 [BULK-UPDATE] Using agreement route for: ${file.fileName} (targetId: ${targetId})`);

              result = await zohoApi.updateUpload(targetId, {
                noteText: isFirstFileUpload ? bulkUpdateNoteText : `Additional file in bulk update: ${file.fileName}`,
                skipNoteCreation: !isFirstFileUpload,  // ✅ Skip note creation for subsequent files
                versionId: file.id,
                versionFileName: file.fileName
              });
            } else if (strategy.type === 'attached') {
              // Manual uploads - use attached file API
              console.log(`📎 [BULK-UPDATE] Using attached file route for: ${file.fileName} (fileId: ${file.id})`);
              const dealId = uploadStatus?.mapping?.dealId;

              if (!dealId) {
                throw new Error('Could not find existing deal ID - mapping information missing');
              }

              result = await zohoApi.uploadAttachedFile(file.id, {
                dealId: dealId,
                noteText: isFirstFileUpload ? bulkUpdateNoteText : `Additional file in bulk update: ${file.fileName}`,
                dealName: uploadStatus?.mapping?.dealName || 'Unknown Deal',
                skipNoteCreation: !isFirstFileUpload,  // ✅ Skip note creation for subsequent files
                fileType: file.fileType
              });
            } else {
              // Fallback - shouldn't happen with current logic
              console.warn(`⚠️ [BULK-UPDATE] Unknown strategy type for ${file.fileName}, using agreement route`);
              result = await zohoApi.updateUpload(agreementId, {
                noteText: isFirstFileUpload ? bulkUpdateNoteText : `Additional file in bulk update: ${file.fileName}`,
                skipNoteCreation: !isFirstFileUpload,
                versionId: file.id,
                versionFileName: file.fileName
              });
            }

            if (result.success) {
              successCount++;
              console.log(`✅ [BULK-UPDATE] Success: ${file.fileName}`);
              isFirstFileUpload = false; // Only first file gets comprehensive note
            } else {
              failCount++;
              console.error(`❌ [BULK-UPDATE] Failed: ${file.fileName}:`, result.error);
            }
          } catch (err) {
            failCount++;
            console.error(`💥 [BULK-UPDATE] Error uploading ${file.fileName}:`, err);
          }
        }

        if (successCount > 0) {
          setStep('success');
          const message = failCount > 0
            ? `Added ${successCount} files to existing deal, ${failCount} failed`
            : `Successfully added all ${successCount} selected files to existing deal!`;
          setToastMessage({ message, type: successCount === selectedBulkFiles.length ? 'success' : 'warning' });
          onSuccess();
        } else {
          setError('All selected file additions failed. Please check your connection and try again.');
          setStep('error');
        }
        return;
      }

      // ✅ SINGLE UPDATE MODE: Check if file is selected
      if (!selectedFiles.has(agreementId)) {
        await sendUpdateNoteOnly();
        return;
      }

      console.log(`📝 [SINGLE-UPDATE] Processing single file: ${agreementId}`);
      const result = await zohoApi.updateUpload(agreementId, {
        noteText: noteText.trim()
      });

      if (result.success) {
        setStep('success');
        setToastMessage({ message: `Successfully uploaded version ${uploadStatus?.mapping?.nextVersion || 'new'}!`, type: 'success' });
        onSuccess();
      } else {
        setError(result.error || 'Upload failed');
        setStep('error');
      }
    } catch (err) {
      console.error('Update upload failed:', err);
      setError('Upload failed. Please try again.');
      setStep('error');
    }
  };

  const renderLoadingStep = () => (
    <div className="zoho-upload__step zoho-upload__step--loading">
      <div className="zoho-upload__loading">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>Loading upload options...</p>
      </div>
    </div>
  );

  const renderFirstTimeStep = () => {
    const hasNotes = noteText.trim().length > 0;
    const warningColor = hasNotes ? '#f59e0b' : '#f44336';
    const noteOnlyMessage = bulkFiles && bulkFiles.length > 0
      ? 'No files selected. Notes-only upload will create the deal without uploading documents.'
      : 'No file selected. This action will send only notes to Zoho Bigin.';
    const warningMessage = hasNotes
      ? noteOnlyMessage
      : 'Please add a note or select at least one file to upload to Bigin.';

    return (
      <div className="zoho-upload__step zoho-upload__step--first-time">
        <div className="zoho-upload__header">
        <h3>
          <FontAwesomeIcon icon={faUpload} />
          {bulkFiles && bulkFiles.length > 0
            ? `Upload ${bulkFiles.length} Files to Bigin`
            : 'First-time Upload to Bigin'
          }
        </h3>
        <p>
          {bulkFiles && bulkFiles.length > 0
            ? `Upload ${bulkFiles.length} documents to your Zoho Bigin CRM.`
            : "This agreement hasn't been uploaded to Bigin yet. Let's set it up!"
          }
        </p>
      </div>

      {/* ✅ UPDATED: Show file selection for BOTH single and bulk uploads */}
      <div className="zoho-upload__section">
        <label className="zoho-upload__label">
          <FontAwesomeIcon icon={faFileAlt} />
          {bulkFiles && bulkFiles.length > 0
            ? `Select Documents to Upload (${selectedFiles.size} of ${bulkFiles.length} selected)`
            : `Document to Upload (${selectedFiles.has(agreementId) ? '1 selected' : '0 selected'})`
          }
        </label>

        {/* Selection controls - only show for bulk uploads */}
        {bulkFiles && bulkFiles.length > 1 && (
          <div className="zoho-upload__selection-controls" style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="zoho-upload__btn zoho-upload__btn--secondary"
              onClick={selectAllFiles}
              style={{ padding: '5px 10px', fontSize: '12px' }}
            >
              Select All
            </button>
            <button
              type="button"
              className="zoho-upload__btn zoho-upload__btn--secondary"
              onClick={deselectAllFiles}
              style={{ padding: '5px 10px', fontSize: '12px' }}
            >
              Deselect All
            </button>
          </div>
        )}

        <div className="zoho-upload__files-preview">
          {/* Show bulk files if available */}
          {bulkFiles && bulkFiles.length > 0 ? (
            bulkFiles.map((file, index) => (
              <div key={file.id} className="zoho-upload__file-preview" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px' }}>
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={() => toggleFileSelection(file.id)}
                  style={{ marginRight: '8px' }}
                />
                <FontAwesomeIcon icon={faFileAlt} className="file-icon" />
                <span className="file-name" style={{ flex: 1 }}>{file.fileName}</span>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {(() => {
                    const strategy = getFileUploadStrategy(file);
                    return `(${strategy.description})`;
                  })()}
                </span>
              </div>
            ))
          ) : (
            /* Show single file selection */
            <div className="zoho-upload__file-preview" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px' }}>
              <input
                type="checkbox"
                checked={selectedFiles.has(agreementId)}
                onChange={() => toggleFileSelection(agreementId)}
                style={{ marginRight: '8px' }}
              />
              <FontAwesomeIcon icon={faFileAlt} className="file-icon" />
              <span className="file-name" style={{ flex: 1 }}>{agreementTitle}</span>
              <span style={{ fontSize: '12px', color: '#666' }}>
                (PDF Document)
              </span>
            </div>
          )}
        </div>

        {selectedFiles.size === 0 && (
          <div style={{ color: warningColor, fontSize: '14px', marginTop: '8px' }}>
            {warningMessage}
          </div>
        )}
      </div>

      <div className="zoho-upload__form">
        {/* Company Selection */}
        <div className="zoho-upload__section">
          <label className="zoho-upload__label">
            <FontAwesomeIcon icon={faBuilding} />
            Select Company
          </label>

          {!showCreateCompany ? (
            <>
              <div className="zoho-upload__search">
                <FontAwesomeIcon icon={faSearch} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="zoho-upload__search-input"
                />
              </div>

              <div className="zoho-upload__companies">
                {companies.length > 0 ? (
                  companies.map((company) => (
                    <div
                      key={company.id}
                      className={`zoho-upload__company ${selectedCompany?.id === company.id ? 'selected' : ''}`}
                      onClick={() => setSelectedCompany(company)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div className="company-name">{company.name}</div>
                        {/* ✅ NEW: Show match type indicator when searching */}
                        {searchTerm && company.matchType && company.matchType !== 'none' && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: getMatchTypeColor(company.matchType),
                              color: '#ffffff',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                            title={`Match score: ${(company.matchScore || 0).toFixed(2)}`}
                          >
                            {getMatchTypeLabel(company.matchType)}
                          </span>
                        )}
                      </div>
                      {company.phone && <div className="company-info">{company.phone}</div>}
                      {company.email && <div className="company-info">{company.email}</div>}
                    </div>
                  ))
                ) : (
                  <div className="zoho-upload__no-results">
                    {searchTerm ? `No companies found for "${searchTerm}"` : 'No companies found'}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="zoho-upload__btn zoho-upload__btn--secondary"
                onClick={() => setShowCreateCompany(true)}
              >
                <FontAwesomeIcon icon={faPlus} />
                Create New Company
              </button>
            </>
          ) : (
            <div className="zoho-upload__create-company">
              <h4>Create New Company</h4>
              <input
                type="text"
                placeholder="Company Name *"
                value={newCompany.name}
                onChange={(e) => setNewCompany(prev => ({ ...prev, name: e.target.value }))}
                className="zoho-upload__input"
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                value={newCompany.phone}
                onChange={(e) => setNewCompany(prev => ({ ...prev, phone: e.target.value }))}
                className="zoho-upload__input"
              />
              <input
                type="email"
                placeholder="Email"
                value={newCompany.email}
                onChange={(e) => setNewCompany(prev => ({ ...prev, email: e.target.value }))}
                className="zoho-upload__input"
              />
              <input
                type="url"
                placeholder="Website"
                value={newCompany.website}
                onChange={(e) => setNewCompany(prev => ({ ...prev, website: e.target.value }))}
                className="zoho-upload__input"
              />
              <input
                type="text"
                placeholder="Address"
                value={newCompany.address}
                onChange={(e) => setNewCompany(prev => ({ ...prev, address: e.target.value }))}
                className="zoho-upload__input"
              />

              <div className="zoho-upload__button-group">
                <button
                  type="button"
                  className="zoho-upload__btn zoho-upload__btn--primary"
                  onClick={handleCreateCompany}
                  disabled={loading || !newCompany.name.trim()}
                >
                  {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Create Company'}
                </button>
                <button
                  type="button"
                  className="zoho-upload__btn zoho-upload__btn--secondary"
                  onClick={() => setShowCreateCompany(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Deal Information */}
        {selectedCompany && !showCreateCompany && (
          <>
            <div className="zoho-upload__section">
              <label className="zoho-upload__label">Deal Name</label>
              <input
                type="text"
                value={dealName}
                onChange={(e) => setDealName(e.target.value)}
                className="zoho-upload__input"
                placeholder="Enter deal name"
                required
              />
            </div>

            <div className="zoho-upload__row">
              <div className="zoho-upload__col">
                <label className="zoho-upload__label">Pipeline</label>
                <select
                  value={pipelineName}
                  onChange={(e) => setPipelineName(e.target.value)}
                  className="zoho-upload__select"
                >
                  {pipelineOptions?.pipelines?.map((pipeline) => (
                    <option key={pipeline.value} value={pipeline.value}>
                      {pipeline.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="zoho-upload__col">
                <label className="zoho-upload__label">Stage</label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="zoho-upload__select"
                >
                  {pipelineOptions?.stages?.map((stageOption) => (
                    <option key={stageOption.value} value={stageOption.value}>
                      {stageOption.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="zoho-upload__section">
              <label className="zoho-upload__label">Notes *</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="zoho-upload__textarea"
                placeholder="Describe this proposal (e.g., services included, pricing details, special requirements...)"
                rows={4}
                required
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
  };

  const renderUpdateStep = () => {
    const hasNotes = noteText.trim().length > 0;
    const warningColor = hasNotes ? '#f59e0b' : '#f44336';
    const noteOnlyMessage = bulkFiles && bulkFiles.length > 0
      ? 'No files selected. Notes-only update will add the note to the deal without uploading documents.'
      : 'No file selected. This action will send only notes to Zoho Bigin.';
    const warningMessage = hasNotes
      ? noteOnlyMessage
      : 'Please add a note or select at least one file to upload to Bigin.';

    return (
      <div className="zoho-upload__step zoho-upload__step--update">
      <div className="zoho-upload__header">
        <h3>
          <FontAwesomeIcon icon={faHistory} />
          Upload Updated Version
          {bulkFiles && bulkFiles.length > 1 && (
            <span style={{
              fontSize: '14px',
              fontWeight: 'normal',
              color: '#059669',
              marginLeft: '8px'
            }}>
              (Bulk - {selectedFiles.size} files)
            </span>
          )}
        </h3>
        <p>This agreement has been uploaded before. Adding version {uploadStatus?.mapping?.nextVersion}.</p>

        {/* ✅ NEW: Show existing deal context prominently */}
        {uploadStatus?.mapping && (
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '12px',
            margin: '12px 0',
            fontSize: '14px'
          }}>
            <div style={{
              fontWeight: '600',
              color: '#0369a1',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <FontAwesomeIcon icon={faBuilding} style={{ fontSize: '12px' }} />
              {bulkFiles && bulkFiles.length > 1 ? 'Adding to Existing Deal (Bulk Upload)' : 'Uploading to Existing Deal'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 12px', fontSize: '13px' }}>
              <span style={{ fontWeight: '500', color: '#6b7280' }}>Company:</span>
              <span style={{ color: '#374151' }}>{uploadStatus.mapping.companyName}</span>

              <span style={{ fontWeight: '500', color: '#6b7280' }}>Deal:</span>
              <span style={{ color: '#374151' }}>{uploadStatus.mapping.dealName}</span>

              <span style={{ fontWeight: '500', color: '#6b7280' }}>Current Version:</span>
              <span style={{ color: '#374151' }}>v{uploadStatus.mapping.currentVersion}</span>

              <span style={{ fontWeight: '500', color: '#6b7280' }}>Last Updated:</span>
              <span style={{ color: '#374151' }}>{new Date(uploadStatus.mapping.lastUploadedAt).toLocaleDateString()}</span>

              {bulkFiles && bulkFiles.length > 1 && (
                <>
                  <span style={{ fontWeight: '500', color: '#6b7280' }}>Upload Mode:</span>
                  <span style={{ color: '#059669', fontWeight: '500' }}>
                    Bulk Update ({selectedFiles.size} of {bulkFiles.length} selected)
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ✅ NEW: Show file selection for update uploads too */}
      <div className="zoho-upload__section">
        <label className="zoho-upload__label">
          <FontAwesomeIcon icon={faFileAlt} />
          {bulkFiles && bulkFiles.length > 0
            ? `Select Documents to Upload (${selectedFiles.size} of ${bulkFiles.length} selected)`
            : `Document to Upload (${selectedFiles.has(agreementId) ? '1 selected' : '0 selected'})`
          }
        </label>

        {/* Selection controls - only show for bulk uploads */}
        {bulkFiles && bulkFiles.length > 1 && (
          <div className="zoho-upload__selection-controls" style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="zoho-upload__btn zoho-upload__btn--secondary"
              onClick={selectAllFiles}
              style={{ padding: '5px 10px', fontSize: '12px' }}
            >
              Select All
            </button>
            <button
              type="button"
              className="zoho-upload__btn zoho-upload__btn--secondary"
              onClick={deselectAllFiles}
              style={{ padding: '5px 10px', fontSize: '12px' }}
            >
              Deselect All
            </button>
          </div>
        )}

        <div className="zoho-upload__files-preview">
          {/* Show bulk files if available */}
          {bulkFiles && bulkFiles.length > 0 ? (
            bulkFiles.map((file, index) => (
              <div key={file.id} className="zoho-upload__file-preview" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px' }}>
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={() => toggleFileSelection(file.id)}
                  style={{ marginRight: '8px' }}
                />
                <FontAwesomeIcon icon={faFileAlt} className="file-icon" />
                <span className="file-name" style={{ flex: 1 }}>{file.fileName}</span>
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {(() => {
                    const strategy = getFileUploadStrategy(file);
                    return `(${strategy.description})`;
                  })()}
                </span>
              </div>
            ))
          ) : (
            /* Show single file selection */
            <div className="zoho-upload__file-preview" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px' }}>
              <input
                type="checkbox"
                checked={selectedFiles.has(agreementId)}
                onChange={() => toggleFileSelection(agreementId)}
                style={{ marginRight: '8px' }}
              />
              <FontAwesomeIcon icon={faFileAlt} className="file-icon" />
              <span className="file-name" style={{ flex: 1 }}>{agreementTitle}</span>
              <span style={{ fontSize: '12px', color: '#666' }}>
                (Updated PDF Document)
              </span>
            </div>
          )}
        </div>

        {selectedFiles.size === 0 && (
          <div style={{ color: warningColor, fontSize: '14px', marginTop: '8px' }}>
            {warningMessage}
          </div>
        )}
      </div>

      <div className="zoho-upload__form">
        <div className="zoho-upload__section">
          <label className="zoho-upload__label">
            What changed in this version? *
          </label>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="zoho-upload__textarea"
            placeholder="Describe what changed (e.g., updated pricing, added services, removed items, adjusted schedule...)"
            rows={4}
            required
          />
        </div>
      </div>
    </div>
    );
  };

  const renderUploadingStep = () => {
    const uploadingLabel = uploadMode === 'notes'
      ? "Creating deal and adding note..."
      : "Creating deal, adding note, and uploading files...";
    const uploadingSubtext = uploadMode === 'notes'
      ? "Adding the note to the new Bigin deal."
      : "Creating deal, adding note, and uploading files to Bigin.";

    return (
      <div className="zoho-upload__step zoho-upload__step--uploading">
        <div className="zoho-upload__loading">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>{uploadingLabel}</p>
        <small>{uploadingSubtext}</small>
      </div>
      </div>
    );
  };

  const renderSuccessStep = () => (
    <div className="zoho-upload__step zoho-upload__step--success">
      <div className="zoho-upload__result zoho-upload__result--success">
        <FontAwesomeIcon icon={faCheckCircle} size="3x" />
        <h3>Upload Successful!</h3>
        <p>
          Your document has been successfully uploaded to Zoho Bigin.
          {uploadStatus?.isFirstTime
            ? ' The deal has been created and the PDF is now available in Zoho.'
            : ` Version ${uploadStatus?.mapping?.nextVersion} has been added to the existing deal.`
          }
        </p>
      </div>
    </div>
  );

  const renderErrorStep = () => (
    <div className="zoho-upload__step zoho-upload__step--error">
      <div className="zoho-upload__result zoho-upload__result--error">
        <FontAwesomeIcon icon={faExclamationTriangle} size="3x" />
        <h3>Upload Failed</h3>
        <p>{error}</p>
        <button
          className="zoho-upload__btn zoho-upload__btn--primary"
          onClick={() => {
            setError(null);
            setStep(uploadStatus?.isFirstTime ? 'first-time' : 'update');
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );

  const renderActions = () => {
    if (step === 'loading' || step === 'uploading' || step === 'success') {
      return null;
    }

    if (step === 'error') {
      return (
        <div className="zoho-upload__actions">
          <button
            className="zoho-upload__btn zoho-upload__btn--secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      );
    }

    if (step === 'first-time') {
      return (
        <div className="zoho-upload__actions">
          <button
            className="zoho-upload__btn zoho-upload__btn--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="zoho-upload__btn zoho-upload__btn--primary"
            onClick={handleFirstTimeUpload}
            disabled={
              !selectedCompany ||
              !dealName.trim() ||
              !noteText.trim() ||
              showCreateCompany
            }
          >
            <FontAwesomeIcon icon={faUpload} />
            {selectedFiles.size > 0
              ? `Upload ${selectedFiles.size} Selected File${selectedFiles.size !== 1 ? 's' : ''} to Bigin`
              : 'Send Notes to Bigin'
            }
          </button>
        </div>
      );
    }

    if (step === 'update') {
      return (
        <div className="zoho-upload__actions">
          <button
            className="zoho-upload__btn zoho-upload__btn--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="zoho-upload__btn zoho-upload__btn--primary"
            onClick={handleUpdateUpload}
            disabled={
              !noteText.trim()
            }
          >
            <FontAwesomeIcon icon={faUpload} />
            {selectedFiles.size > 0
              ? `Upload ${selectedFiles.size} Selected Files (Version ${uploadStatus?.mapping?.nextVersion})`
              : `Send Notes to Bigin (Version ${uploadStatus?.mapping?.nextVersion})`
            }
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="zoho-upload">
      <div className="zoho-upload__overlay" onClick={onClose} />
      <div className="zoho-upload__modal">
        <div className="zoho-upload__modal-header">
          <h2>Upload to Bigin</h2>
          <button className="zoho-upload__close" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="zoho-upload__modal-body">
          {step === 'loading' && renderLoadingStep()}
          {step === 'first-time' && renderFirstTimeStep()}
          {step === 'update' && renderUpdateStep()}
          {step === 'uploading' && renderUploadingStep()}
          {step === 'success' && renderSuccessStep()}
          {step === 'error' && renderErrorStep()}
        </div>

        <div className="zoho-upload__modal-footer">
          {renderActions()}
        </div>

        {toastMessage && (
          <Toast
            message={toastMessage.message}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        )}
      </div>
    </div>
  );
};
