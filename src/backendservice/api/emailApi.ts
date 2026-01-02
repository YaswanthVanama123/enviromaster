// src/backendservice/api/emailApi.ts

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

/**
 * Email API Service
 * Handles sending emails with PDF attachments
 */
export const emailApi = {
  /**
   * Send email with optional PDF attachment
   * Uses FormData for multipart uploads - requires direct fetch since apiClient doesn't support FormData
   */
  async sendEmail(emailData: EmailSendRequest): Promise<EmailSendResponse> {
    try {
      const formData = new FormData();

      // Add email fields
      formData.append('to', emailData.to);
      formData.append('from', emailData.from);
      formData.append('subject', emailData.subject);
      formData.append('body', emailData.body);

      // Add attachment if provided
      if (emailData.attachment) {
        formData.append('attachment', emailData.attachment.content, emailData.attachment.filename);
      }

      // Use fetch directly for FormData (apiClient doesn't support it yet)
      const headers: HeadersInit = {};
      const token = apiClient.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // Note: Do NOT set Content-Type for FormData - browser sets it with boundary

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

  /**
   * Send email with PDF attachment using document ID
   * Backend will load and attach the PDF automatically
   */
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

  /**
   * Verify email configuration
   */
  async verifyConfig(): Promise<any> {
    const res = await apiClient.get(`/api/email/verify-config`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  /**
   * Send test email
   */
  async sendTestEmail(to: string): Promise<EmailSendResponse> {
    const res = await apiClient.post<EmailSendResponse>(
      `/api/email/send-test`,
      { to }
    );

    if (res.error) throw new Error(res.error);
    return res.data!;
  }
};
