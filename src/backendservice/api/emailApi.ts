
import { apiClient } from "../utils/apiClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export interface EmailSendRequest {
  to: string;
  from: string;
  subject: string;
  body: string;
  attachment?: {
    filename: string;
    content: Blob;
  };
}

export interface EmailSendResponse {
  success: boolean;
  message: string;
  messageId?: string;
}

export const emailApi = {
  async sendEmail(emailData: EmailSendRequest): Promise<EmailSendResponse> {
    try {
      const formData = new FormData();

      formData.append('to', emailData.to);
      formData.append('from', emailData.from);
      formData.append('subject', emailData.subject);
      formData.append('body', emailData.body);

      if (emailData.attachment) {
        formData.append('attachment', emailData.attachment.content, emailData.attachment.filename);
      }

      const headers: HeadersInit = {};
      const token = apiClient.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/email/send`,
        {
          method: 'POST',
          headers,
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  },

  async sendEmailWithPdfById(emailData: {
    to: string;
    subject: string;
    body: string;
    documentId: string;
    fileName: string;
    documentType?: 'agreement' | 'version' | 'manual-upload';
    watermark?: boolean;
  }): Promise<EmailSendResponse> {
    const res = await apiClient.post<EmailSendResponse>(
      `/api/email/send`,
      {
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        documentId: emailData.documentId,
        documentType: emailData.documentType,
        watermark: emailData.watermark
      }
    );

    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async verifyConfig(): Promise<any> {
    const res = await apiClient.get(`/api/email/verify-config`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async sendTestEmail(to: string): Promise<EmailSendResponse> {
    const res = await apiClient.post<EmailSendResponse>(
      `/api/email/send-test`,
      { to }
    );

    if (res.error) throw new Error(res.error);
    return res.data!;
  }
};
