// src/backendservice/api/emailApi.ts

import axios from "axios";

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

      const response = await axios.post(
        `${API_BASE_URL}/api/email/send`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  },

  /**
   * Send email with PDF attachment using document ID
   */
  async sendEmailWithPdfById(emailData: {
    to: string;
    from: string;
    subject: string;
    body: string;
    documentId: string;
    fileName: string;
  }): Promise<EmailSendResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/email/send-with-pdf/${emailData.documentId}`,
        {
          to: emailData.to,
          from: emailData.from,
          subject: emailData.subject,
          body: emailData.body,
          fileName: emailData.fileName,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending email with PDF:', error);
      throw error;
    }
  }
};