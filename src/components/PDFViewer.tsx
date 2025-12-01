import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Toast } from "./admin/Toast";
import type { ToastType } from "./admin/Toast";
import { pdfApi } from "../backendservice/api";
import "./PDFViewer.css";

type LocationState = {
  documentId?: string;
  fileName?: string;
};

export default function PDFViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { documentId, fileName } = (location.state || {}) as LocationState;

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (!documentId) {
      setError("No document ID provided");
      setLoading(false);
      return;
    }

    const fetchPDF = async () => {
      try {
        setLoading(true);
        const blob = await pdfApi.downloadPdf(documentId);
        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err) {
        console.error("Error fetching PDF:", err);
        setError("Unable to load PDF. Please try again.");
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
  }, [documentId]);

  const handleEdit = () => {
    navigate("/form-filling", {
      state: {
        editing: true,
        id: documentId,
      },
    });
  };

  const handleDownload = async () => {
    if (!documentId) return;

    try {
      setDownloading(true);

      const blob = await pdfApi.downloadPdf(documentId);
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
    navigate(-1); // Go back to previous page
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
          <h2>⚠️ Error</h2>
          <p>{error || "Unable to load PDF"}</p>
          <button onClick={handleBack} className="pdf-viewer__btn pdf-viewer__btn--primary">
            Back to Saved Files
          </button>
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
