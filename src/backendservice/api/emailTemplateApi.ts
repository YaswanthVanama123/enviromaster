// src/backendservice/api/emailTemplateApi.ts

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  isActive: boolean;
  updatedAt: string;
}

export interface EmailTemplateResponse {
  success: boolean;
  template: EmailTemplate;
  message?: string;
}

/**
 * Email Template API Service
 * Handles email template management
 */
export const emailTemplateApi = {
  /**
   * Get active email template
   */
  async getActiveTemplate(): Promise<EmailTemplate> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/email-template/active`);
      return response.data.template;
    } catch (error) {
      console.error('Error fetching email template:', error);
      throw error;
    }
  },

  /**
   * Update email template
   */
  async updateTemplate(subject: string, body: string): Promise<EmailTemplateResponse> {
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/email-template`,
        { subject, body },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating email template:', error);
      throw error;
    }
  },

  /**
   * Test template system
   */
  async testTemplate(): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/email-template/test`);
      return response.data;
    } catch (error) {
      console.error('Error testing template:', error);
      throw error;
    }
  }
};
