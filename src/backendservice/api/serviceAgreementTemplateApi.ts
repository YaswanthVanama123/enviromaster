// src/backendservice/api/serviceAgreementTemplateApi.ts

import { apiClient } from "../utils/apiClient";

export interface ServiceAgreementTemplate {
  id: string;
  name: string;
  // Terms
  term1: string;
  term2: string;
  term3: string;
  term4: string;
  term5: string;
  term6: string;
  term7: string;
  noteText: string;
  // Labels
  titleText: string;
  subtitleText: string;
  retainDispensersLabel: string;
  disposeDispensersLabel: string;
  emSalesRepLabel: string;
  insideSalesRepLabel: string;
  authorityText: string;
  customerContactLabel: string;
  customerSignatureLabel: string;
  customerDateLabel: string;
  emFranchiseeLabel: string;
  emSignatureLabel: string;
  emDateLabel: string;
  pageNumberText: string;
  isActive: boolean;
  updatedAt: string;
}

export interface ServiceAgreementTemplateResponse {
  success: boolean;
  template: ServiceAgreementTemplate;
  message?: string;
}

/**
 * Service Agreement Template API Service
 * Handles service agreement template management
 */
export const serviceAgreementTemplateApi = {
  /**
   * Get active service agreement template
   */
  async getActiveTemplate(): Promise<ServiceAgreementTemplate> {
    const res = await apiClient.get<{ template: ServiceAgreementTemplate }>(`/api/service-agreement-template/active`);
    if (res.error) throw new Error(res.error);
    return res.data!.template;
  },

  /**
   * Update service agreement template
   */
  async updateTemplate(templateData: Partial<ServiceAgreementTemplate>): Promise<ServiceAgreementTemplateResponse> {
    const res = await apiClient.put<ServiceAgreementTemplateResponse>(
      `/api/service-agreement-template`,
      templateData
    );
    if (res.error) throw new Error(res.error);
    return res.data!;
  }
};
