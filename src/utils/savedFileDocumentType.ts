import type { SavedFileListItem } from "../backendservice/api/pdfApi";

export type EmailDocumentType = "agreement" | "version" | "manual-upload" | "version-log";

export function getDocumentTypeForSavedFile(file?: SavedFileListItem): EmailDocumentType {
  if (!file) return "agreement";
  switch (file.fileType) {
    case "version_log":
      return "version-log";
    case "version_pdf":
      return "version";
    case "attached_pdf":
      return "manual-upload";
    default:
      return "agreement";
  }
}
