import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { pdfApi } from "../backendservice/api";
import { manualUploadApi } from "../backendservice/api/manualUploadApi";
import { versionApi } from "../backendservice/api/versionApi";
import "./PDFViewer.css";

type DocumentType = 'agreement' | 'manual-upload' | 'attached-file' | 'version';

type LocationState = {
  documentId?: string;
  fileName?: string;
  documentType?: DocumentType; // ✅ NEW: Specify document type for correct API selection
  watermark?: boolean; // ✅ NEW: Initial watermark preference from file list
  fromEdit?: boolean; // Added to track if coming from edit
  originalReturnPath?: string; // Added to track original source
  originalReturnState?: any; // Added to track original state
};

export default function PDFViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    documentId,
    fileName,
    documentType, // ✅ NEW: Get document type from navigation state
    watermark: initialWatermark = false, // ✅ NEW: Get initial watermark preference
    fromEdit = false,
    originalReturnPath,
    originalReturnState
  } = (location.state || {}) as LocationState;

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null); // ✅ NEW: Store detailed error info
  const [downloading, setDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);
  // ✅ NEW: Watermark toggle state (only for version PDFs) - initialize with value from file list
  const [showWatermark, setShowWatermark] = useState(initialWatermark);

  useEffect(() => {
    if (!documentId) {
      setError("No document ID provided");
      setLoading(false);
      return;
    }

    const fetchPDF = async () => {
      try {
        setLoading(true);
        console.log(`📄 [PDF-VIEWER] Fetching PDF for document: ${documentId}, type: ${documentType || 'auto-detect'}`);

        // 🎯 SMART API SELECTION: Use correct endpoint based on document type
        let blob: Blob;
        let detectedType = documentType;

        if (documentType === 'manual-upload') {
          // Use manual upload API
          console.log(`📁 [PDF-VIEWER] Using manual upload API for document ${documentId}`);
          blob = await manualUploadApi.downloadFile(documentId);
          detectedType = 'manual-upload';
        } else if (documentType === 'attached-file') {
          // Use attached file API
          console.log(`📎 [PDF-VIEWER] Using attached file API for document ${documentId}`);
          blob = await pdfApi.downloadAttachedFile(documentId);
          detectedType = 'attached-file';
        } else if (documentType === 'agreement') {
          // Use agreement API
          console.log(`📋 [PDF-VIEWER] Using agreement API for document ${documentId}`);
          blob = await pdfApi.downloadPdf(documentId);
          detectedType = 'agreement';
        } else if (documentType === 'version') {
          // Use version API with watermark parameter
          console.log(`📝 [PDF-VIEWER] Using version API for document ${documentId} with watermark=${showWatermark}`);
          blob = await pdfApi.downloadVersionPdf(documentId, showWatermark); // ✅ NEW: Pass watermark flag
          detectedType = 'version';
        } else {
          // 🔍 AUTO-DETECTION: Try different APIs until one works
          console.log(`🔍 [PDF-VIEWER] Auto-detecting document type for ${documentId}`);

          try {
            // Try agreement API first (most common)
            console.log(`🔍 [PDF-VIEWER] Trying agreement API...`);
            blob = await pdfApi.downloadPdf(documentId);
            detectedType = 'agreement';
            console.log(`✅ [PDF-VIEWER] Auto-detected as agreement document`);
          } catch (agreementErr: any) {
            if (agreementErr.response?.status === 404) {
              try {
                // Try version API with watermark parameter
                console.log(`🔍 [PDF-VIEWER] Trying version API with watermark=${showWatermark}...`);
                blob = await pdfApi.downloadVersionPdf(documentId, showWatermark); // ✅ NEW: Pass watermark flag
                detectedType = 'version';
                console.log(`✅ [PDF-VIEWER] Auto-detected as version document`);
              } catch (versionErr: any) {
                if (versionErr.response?.status === 404) {
                  try {
                    // Try manual upload API
                    console.log(`🔍 [PDF-VIEWER] Trying manual upload API...`);
                    blob = await manualUploadApi.downloadFile(documentId);
                    detectedType = 'manual-upload';
                    console.log(`✅ [PDF-VIEWER] Auto-detected as manual upload document`);
                  } catch (manualErr: any) {
                    if (manualErr.response?.status === 404) {
                      try {
                        // Try attached file API
                        console.log(`🔍 [PDF-VIEWER] Trying attached file API...`);
                        blob = await pdfApi.downloadAttachedFile(documentId);
                        detectedType = 'attached-file';
                        console.log(`✅ [PDF-VIEWER] Auto-detected as attached file document`);
                      } catch (attachedErr: any) {
                        // All APIs failed, throw the original agreement error
                        console.error(`❌ [PDF-VIEWER] All APIs failed for document ${documentId}`);
                        throw agreementErr;
                      }
                    } else {
                      throw manualErr;
                    }
                  }
                } else {
                  throw versionErr;
                }
              }
            } else {
              throw agreementErr;
            }
          }
        }

        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url);

        console.log(`✅ [PDF-VIEWER] PDF loaded successfully (type: ${detectedType})`);
      } catch (err: any) {
        console.error("❌ [PDF-VIEWER] Error fetching PDF:", err);

        // ✅ NEW: Extract detailed error information from API response
        if (err.response?.data) {
          const errorData = err.response.data;
          setErrorDetails(errorData);

          if (errorData.error === "no_pdf") {
            setError(`PDF Not Available: ${errorData.detail}`);
          } else {
            setError(errorData.detail || "Unable to load PDF. Please try again.");
          }
        } else {
          setError("Unable to load PDF. Please check your connection and try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPDF();

    return () => {
      if (pdfUrl) {
        window.URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [documentId, showWatermark]); // ✅ NEW: Refetch when watermark toggles

  const handleEdit = async () => {
    // Pass original navigation context to edit form
    const editReturnPath = originalReturnPath || "/pdf-viewer";
    const editReturnState = originalReturnState || { documentId, fileName };

    let agreementId = documentId;

    // ✅ FIXED: If viewing a version PDF, get the parent agreement ID
    if (documentType === 'version') {
      try {
        console.log(`📝 [PDF-VIEWER] Getting agreement ID for version: ${documentId}`);
        const versionData = await versionApi.getVersionForEdit(documentId);
        agreementId = versionData.versionInfo?.originalAgreementId || documentId;
        console.log(`📝 [PDF-VIEWER] Found agreement ID: ${agreementId}`);
      } catch (err) {
        console.error(`❌ [PDF-VIEWER] Failed to get agreement ID for version:`, err);
        // Fallback to original ID if version lookup fails
      }
    }

    navigate(`/edit/pdf/${agreementId}`, {
      state: {
        editing: true,
        id: agreementId, // ✅ Use agreement ID, not version ID
        returnPath: editReturnPath,
        returnState: editReturnState,
        // Mark that we're coming from PDF viewer to avoid loops
        fromPdfViewer: true,
      },
    });
  };

  const handleDownload = async () => {
    if (!documentId) return;

    try {
      setDownloading(true);

      // ✅ FIXED: Use correct API based on document type for downloading
      let blob: Blob;

      if (documentType === 'version') {
        // Use version API for version PDFs with watermark parameter
        blob = await pdfApi.downloadVersionPdf(documentId, showWatermark); // ✅ NEW: Pass watermark flag
      } else if (documentType === 'manual-upload') {
        // Use manual upload API
        blob = await manualUploadApi.downloadFile(documentId);
      } else if (documentType === 'attached-file') {
        // Use attached file API
        blob = await pdfApi.downloadAttachedFile(documentId);
      } else {
        // Default to agreement API for main PDFs and fallback
        blob = await pdfApi.downloadPdf(documentId);
      }

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      const safeName =
        (fileName || "EnviroMaster_Document").replace(/[^\w\-]+/g, "_") + ".pdf";
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
      setToastMessage({ message: "PDF downloaded successfully!", type: "success" });
    } catch (err) {
      console.error("Error downloading PDF:", err);
      setToastMessage({ message: "Failed to download PDF. Please try again.", type: "error" });
    } finally {
      setDownloading(false);
    }
  };

  const handleBack = () => {
    // Smart navigation logic to break loops

    // If we came from edit form and have original return info, use it
    if (fromEdit && originalReturnPath && originalReturnState) {
      console.log('📍 PDF Viewer: Returning to original source after edit');
      navigate(originalReturnPath, { state: originalReturnState });
      return;
    }

    // If we came from edit form but no original info, try intelligent defaults
    if (fromEdit) {
      console.log('📍 PDF Viewer: Returning after edit, using intelligent fallback');
      // Try to determine source based on current URL or default to saved files
      if (window.location.href.includes('admin')) {
        navigate('/admin-panel');
      } else {
        navigate('/saved-files');
      }
      return;
    }

    // If we have original return path (came from somewhere specific), use it
    if (originalReturnPath && originalReturnState) {
      console.log('📍 PDF Viewer: Returning to original source:', originalReturnPath);
      navigate(originalReturnPath, { state: originalReturnState });
      return;
    }

    // If we have original return path without state
    if (originalReturnPath) {
      console.log('📍 PDF Viewer: Returning to original source:', originalReturnPath);
      navigate(originalReturnPath);
      return;
    }

    // Intelligent fallback based on current context
    console.log('📍 PDF Viewer: Using intelligent fallback navigation');
    const currentUrl = window.location.href;

    if (currentUrl.includes('admin')) {
      // If accessed from admin context, go to admin panel
      navigate('/admin-panel');
    } else {
      // Default to saved files for regular users
      navigate('/saved-files');
    }
  };

  if (loading) {
    return (
      <div className="pdf-viewer">
        <div className="pdf-viewer__loading">
          <div className="spinner"></div>
          <p>Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="pdf-viewer">
        <div className="pdf-viewer__error">
          <h2>⚠️ PDF Viewing Error</h2>
          <p className="error-message">{error || "Unable to load PDF"}</p>

          {/* ✅ NEW: Show detailed suggestions if available */}
          {errorDetails?.suggestions && (
            <div className="error-suggestions">
              <h3>💡 Suggested Solutions:</h3>
              <ul>
                {errorDetails.suggestions.map((suggestion: string, index: number) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ✅ NEW: Show document info if available */}
          {errorDetails?.documentInfo && (
            <div className="document-info">
              <h3>📄 Document Information:</h3>
              <ul>
                <li><strong>Title:</strong> {errorDetails.documentInfo.title}</li>
                <li><strong>Status:</strong> {errorDetails.documentInfo.status}</li>
                <li><strong>Created:</strong> {new Date(errorDetails.documentInfo.createdAt).toLocaleString()}</li>
              </ul>
            </div>
          )}

          <div className="error-actions">
            <button onClick={handleBack} className="pdf-viewer__btn pdf-viewer__btn--secondary">
              ← Back to Files
            </button>

            {/* ✅ NEW: Show Edit button if document exists but PDF failed */}
            {errorDetails?.error === "no_pdf" && documentId && (
              <button
                onClick={handleEdit}
                className="pdf-viewer__btn pdf-viewer__btn--primary"
                title="Try regenerating the PDF by editing and saving again"
              >
                ✏️ Edit & Regenerate PDF
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-viewer">
      <div className="pdf-viewer__toolbar">
        <div className="pdf-viewer__toolbar-left">
          <button onClick={handleBack} className="pdf-viewer__btn pdf-viewer__btn--secondary">
            ← Back
          </button>
          <h2 className="pdf-viewer__title">{fileName || "Document"}</h2>
        </div>
        <div className="pdf-viewer__toolbar-right">
          {/* ✅ NEW: Watermark toggle (only for version PDFs) */}
          {documentType === 'version' && (
            <div className="pdf-viewer__watermark-toggle">
              <label htmlFor="watermark-checkbox" className="watermark-toggle-label">
                <input
                  id="watermark-checkbox"
                  type="checkbox"
                  checked={showWatermark}
                  onChange={(e) => setShowWatermark(e.target.checked)}
                  className="watermark-checkbox"
                />
                <span className="watermark-label-text">
                  {showWatermark ? "💧 Draft Watermark" : "✨ Normal View"}
                </span>
              </label>
            </div>
          )}
          <button
            onClick={handleEdit}
            className="pdf-viewer__btn pdf-viewer__btn--edit"
            title="Edit Document"
          >
            ✏️ Edit
          </button>
          <button
            onClick={handleDownload}
            className="pdf-viewer__btn pdf-viewer__btn--download"
            disabled={downloading}
            title="Download PDF"
          >
            {downloading ? "⏳ Downloading..." : "⬇️ Download"}
          </button>
        </div>
      </div>

      <div className="pdf-viewer__container">
        <iframe
          src={pdfUrl}
          className="pdf-viewer__iframe"
          title="PDF Viewer"
        />
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
