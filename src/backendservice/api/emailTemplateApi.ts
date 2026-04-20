
import { apiClient } from "../utils/apiClient";

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

export const emailTemplateApi = {
  async getActiveTemplate(): Promise<EmailTemplate> {
    const res = await apiClient.get<{ template: EmailTemplate }>(`/api/email-template/active`);
    if (res.error) throw new Error(res.error);
    return res.data!.template;
  },

  async updateTemplate(subject: string, body: string): Promise<EmailTemplateResponse> {
    const res = await apiClient.put<EmailTemplateResponse>(
      `/api/email-template`,
      { subject, body }
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  },

  async testTemplate(): Promise<any> {
    const res = await apiClient.get(`/api/email-template/test`);
    if (res.error) throw new Error(res.error);
    return res.data!;
  }
};
