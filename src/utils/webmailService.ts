/**
 * Email Service for PDF Sharing
 * Simple mailto integration with automatic PDF download
 */

export interface EmailData {
  subject: string;
  body: string;
  to?: string;
}

export interface PdfAttachment {
  fileName: string;
  downloadUrl: string;
  blob?: Blob;
}

/**
 * Generate mailto URL
 */
function generateMailtoUrl(emailData: EmailData): string {
  const { subject, body, to = '' } = emailData;
  const encodedTo = encodeURIComponent(to);
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);

  return `mailto:${encodedTo}?subject=${encodedSubject}&body=${encodedBody}`;
}

/**
 * Download PDF file automatically
 */
async function downloadPdfAttachment(attachment: PdfAttachment): Promise<void> {
  try {
    let blob: Blob;

    if (attachment.blob) {
      // Use provided blob
      blob = attachment.blob;
    } else {
      // Download from URL
      const response = await fetch(attachment.downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.statusText}`);
      }
      blob = await response.blob();
    }

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.fileName.endsWith('.pdf') ? attachment.fileName : `${attachment.fileName}.pdf`;

    // Trigger download
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    window.URL.revokeObjectURL(url);

    console.log('✅ PDF download completed');
  } catch (error) {
    console.error('❌ PDF download failed:', error);
    throw error;
  }
}

/**
 * Share PDF via email - Opens mailto and downloads PDF for attachment
 */
export function shareViaPdf(emailData: EmailData, attachment?: PdfAttachment): void {
  try {
    // Generate mailto URL
    const mailtoUrl = generateMailtoUrl(emailData);

    // Open default email client
    window.location.href = mailtoUrl;

    // Automatically download PDF if provided
    if (attachment) {
      // Small delay to ensure mailto opens first
      setTimeout(() => {
        downloadPdfAttachment(attachment).catch(error => {
          console.error('Failed to download PDF attachment:', error);
        });
      }, 500);
    }

    console.log('✅ Email client opened and PDF download initiated');

  } catch (error) {
    console.error('❌ Failed to open email client:', error);
    throw new Error(`Failed to open email: ${error}`);
  }
}

/**
 * Create email data for PDF document sharing with mailto
 */
export function createPdfEmailData(options: {
  fileName?: string;
  status?: string;
  downloadUrl: string;
  isApprovalRequest?: boolean;
  updatedAt?: string;
}): { emailData: EmailData; attachment: PdfAttachment } {
  const { fileName, status, downloadUrl, isApprovalRequest, updatedAt } = options;

  const docName = fileName || "Customer Header Document";
  const subjectSuffix = isApprovalRequest ? " - Approval Request" : "";
  const subject = `${docName}${subjectSuffix}`;

  let body = `Hello,\n\n`;

  if (isApprovalRequest) {
    body += `Please review the following customer header document for approval.\n\n`;
  } else {
    body += `Please find the customer header document attached.\n\n`;
  }

  body += `Document: ${docName}\n`;

  if (status) {
    body += `Status: ${status}\n`;
  }

  if (updatedAt) {
    body += `Updated: ${updatedAt}\n`;
  }

  body += `\nThe PDF file will download automatically for you to attach to this email.\n\nBest regards`;

  const emailData: EmailData = {
    subject,
    body,
    to: '' // User will enter recipient
  };

  const attachment: PdfAttachment = {
    fileName: docName,
    downloadUrl
  };

  return { emailData, attachment };
}

export default {
  shareViaPdf,
  createPdfEmailData
};