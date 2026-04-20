import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle, faLightbulb, faFileAlt, faPencilAlt, faDownload, faSpinner, faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { pdfApi } from "../backendservice/api";
import { manualUploadApi } from "../backendservice/api/manualUploadApi";
import { versionApi } from "../backendservice/api/versionApi";
import "./PDFViewer.css";

type DocumentType = 'agreement' | 'manual-upload' | 'attached-file' | 'version' | 'version-log';

type LocationState = {
  documentId?: string;
  fileName?: string;
  documentType?: DocumentType;
  watermark?: boolean;
  fromEdit?: boolean;
  originalReturnPath?: string;
  originalReturnState?: any;
  includeDeleted?: boolean;
};

const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const isMobileOrMediumDevice = () => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isMediumScreen = window.innerWidth <= 1024;
  return isMobile || isMediumScreen;
};

export default function PDFViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    documentId,
    fileName,
    documentType,
    watermark: initialWatermark = false,
    fromEdit = false,
    originalReturnPath,
    originalReturnState,
    includeDeleted = false
  } = (location.state || {}) as LocationState;

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);
  const [showWatermark, setShowWatermark] = useState(initialWatermark);
  const [textContent, setTextContent] = useState<string | null>(null);
  const isLogFile = documentType === 'version-log';

  useEffect(() => {
    if (!documentId) {
      setError("No document ID provided");
      setLoading(false);
      return;
    }

    const fetchPDF = async () => {
      try {
        setLoading(true);

        if (documentType === 'version-log') {
          const blob = await pdfApi.downloadVersionLog(documentId, includeDeleted);
          const text = await blob.text();
          setTextContent(text);
          return;
        }

        let blob: Blob;
        let detectedType = documentType;

        if (documentType === 'manual-upload') {
          blob = await manualUploadApi.downloadFile(documentId);
          detectedType = 'manual-upload';
        } else if (documentType === 'attached-file') {
          blob = await pdfApi.downloadAttachedFile(documentId);
          detectedType = 'attached-file';
        } else if (documentType === 'agreement') {
          blob = await pdfApi.downloadPdf(documentId);
          detectedType = 'agreement';
        } else if (documentType === 'version') {
          blob = await pdfApi.downloadVersionPdf(documentId, showWatermark);
          detectedType = 'version';
        } else {
          try {
            blob = await pdfApi.downloadPdf(documentId);
            detectedType = 'agreement';
          } catch (agreementErr: any) {
            if (agreementErr.response?.status === 404) {
              try {
                blob = await pdfApi.downloadVersionPdf(documentId, showWatermark);
                detectedType = 'version';
              } catch (versionErr: any) {
                if (versionErr.response?.status === 404) {
                  try {
                    blob = await manualUploadApi.downloadFile(documentId);
                    detectedType = 'manual-upload';
                  } catch (manualErr: any) {
                    if (manualErr.response?.status === 404) {
                      try {
                        blob = await pdfApi.downloadAttachedFile(documentId);
                        detectedType = 'attached-file';
                      } catch (attachedErr: any) {
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
      } catch (err: any) {
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
  }, [documentId, showWatermark]);

  const handleEdit = async () => {
    const editReturnPath = originalReturnPath || "/pdf-viewer";
    const editReturnState = originalReturnState || { documentId, fileName };

    let agreementId = documentId;

    if (documentType === 'version') {
      try {
        const versionData = await versionApi.getVersionForEdit(documentId);
        agreementId = versionData.versionInfo?.originalAgreementId || documentId;
      } catch (err) {
        console.error(`❌ [PDF-VIEWER] Failed to get agreement ID for version:`, err);
      }
    }

    navigate(`/edit/pdf/${agreementId}`, {
      state: {
        editing: true,
        id: agreementId,
        returnPath: editReturnPath,
        returnState: editReturnState,
        fromPdfViewer: true,
      },
    });
  };

  const handleDownload = async () => {
    if (!documentId) return;

    try {
      setDownloading(true);

      if (documentType === 'version-log') {
        const blob = await pdfApi.downloadVersionLog(documentId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const safeName = (fileName || "Version_Changes").replace(/[^\w\-]+/g, "_") + ".txt";
        a.download = safeName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setToastMessage({ message: "Log file downloaded successfully!", type: "success" });
        return;
      }

      let blob: Blob;

      if (documentType === 'version') {
        blob = await pdfApi.downloadVersionPdf(documentId, showWatermark);
      } else if (documentType === 'manual-upload') {
        blob = await manualUploadApi.downloadFile(documentId);
      } else if (documentType === 'attached-file') {
        blob = await pdfApi.downloadAttachedFile(documentId);
      } else {
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
      console.error("Error downloading file:", err);
      setToastMessage({ message: "Failed to download file. Please try again.", type: "error" });
    } finally {
      setDownloading(false);
    }
  };

  const handleBack = () => {
    if (fromEdit && originalReturnPath && originalReturnState) {
      navigate(originalReturnPath, { state: originalReturnState });
      return;
    }

    if (fromEdit) {
      if (window.location.href.includes('admin')) {
        navigate('/admin-panel');
      } else {
        navigate('/saved-pdfs');
      }
      return;
    }

    if (originalReturnPath && originalReturnState) {
      navigate(originalReturnPath, { state: originalReturnState });
      return;
    }

    if (originalReturnPath) {
      navigate(originalReturnPath);
      return;
    }

    const currentUrl = window.location.href;

    if (currentUrl.includes('admin')) {
      navigate('/admin-panel');
    } else {
      navigate('/saved-pdfs');
    }
  };

  const handleOpenPdfInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const handleOpenLogFileInNewTab = () => {
    if (textContent) {
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
    }
  };

  if (loading) {
    return (
      <div className="pdf-viewer">
        <div className="pdf-viewer__loading">
          <div className="spinner"></div>
          <p>Loading {isLogFile ? 'log file' : 'PDF'}...</p>
        </div>
      </div>
    );
  }

  if (error || (!pdfUrl && !textContent)) {
    return (
      <div className="pdf-viewer">
        <div className="pdf-viewer__error">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
            <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#f59e0b' }} />
            {isLogFile ? 'Log File' : 'PDF'} Viewing Error
          </h2>
          <p className="error-message">{error || `Unable to load ${isLogFile ? 'log file' : 'PDF'}`}</p>

          {errorDetails?.suggestions && (
            <div className="error-suggestions">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FontAwesomeIcon icon={faLightbulb} style={{ color: '#f59e0b' }} />
                Suggested Solutions:
              </h3>
              <ul>
                {errorDetails.suggestions.map((suggestion: string, index: number) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {errorDetails?.documentInfo && (
            <div className="document-info">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FontAwesomeIcon icon={faFileAlt} style={{ color: '#3b82f6' }} />
                Document Information:
              </h3>
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
            {errorDetails?.error === "no_pdf" && documentId && (
              <button
                onClick={handleEdit}
                className="pdf-viewer__btn pdf-viewer__btn--primary"
                title="Try regenerating the PDF by editing and saving again"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FontAwesomeIcon icon={faPencilAlt} />
                Edit & Regenerate PDF
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
            onClick={handleDownload}
            className="pdf-viewer__btn pdf-viewer__btn--download"
            disabled={downloading}
            title={isLogFile ? "Download Log File" : "Download PDF"}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {downloading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                Downloading...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faDownload} />
                Download
              </>
            )}
          </button>
        </div>
      </div>

      <div className="pdf-viewer__container">
        {isMobileOrMediumDevice() ? (
          isLogFile && textContent ? (
            <div className="pdf-viewer__mobile-message">
              <div className="mobile-pdf-icon">
                <FontAwesomeIcon icon={faFileAlt} size="3x" style={{ color: '#10b981' }} />
              </div>
              <h3>Log File Ready to View</h3>
              <p>
                For the best viewing experience on mobile and tablet devices,
                open the log file in your browser's native text viewer.
              </p>
              <button
                onClick={handleOpenLogFileInNewTab}
                className="pdf-viewer__btn pdf-viewer__btn--primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '16px',
                  padding: '14px 24px',
                  margin: '20px auto 10px',
                }}
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} />
                Open Log File in Browser
              </button>
              <p className="mobile-pdf-note">
                This will open the log file as text in a new tab.
              </p>
            </div>
          ) : pdfUrl ? (
            <div className="pdf-viewer__mobile-message">
              <div className="mobile-pdf-icon">
                <FontAwesomeIcon
                  icon={faFileAlt}
                  size="3x"
                  style={{
                    color: documentType === 'manual-upload' || documentType === 'attached-file'
                      ? '#f59e0b'
                      : '#3b82f6'
                  }}
                />
              </div>
              <h3>
                {documentType === 'manual-upload' || documentType === 'attached-file'
                  ? 'Uploaded File Ready to View'
                  : 'PDF Ready to View'}
              </h3>
              <p>
                For the best viewing experience on mobile and tablet devices,
                open the {documentType === 'manual-upload' || documentType === 'attached-file' ? 'file' : 'PDF'} in your browser's native viewer.
              </p>
              <button
                onClick={handleOpenPdfInNewTab}
                className="pdf-viewer__btn pdf-viewer__btn--primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '16px',
                  padding: '14px 24px',
                  margin: '20px auto 10px',
                }}
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} />
                {documentType === 'manual-upload' || documentType === 'attached-file'
                  ? 'Open File in Browser'
                  : 'Open PDF in Browser'}
              </button>
              <p className="mobile-pdf-note">
                This will open the full {documentType === 'manual-upload' || documentType === 'attached-file' ? 'file' : 'PDF'} with all pages in a new tab.
              </p>
            </div>
          ) : null
        ) : (
          isLogFile && textContent ? (
            <pre className="pdf-viewer__text-content" style={{
              padding: '20px',
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
              fontSize: '13px',
              lineHeight: '1.5',
              overflow: 'auto',
              height: '100%',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}>
              {textContent}
            </pre>
          ) : pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              className="pdf-viewer__iframe"
              title="PDF Viewer"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          ) : null
        )}
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
