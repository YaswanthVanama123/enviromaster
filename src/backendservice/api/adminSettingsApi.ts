import { apiClient } from "../utils/apiClient";

export interface AdminSettings {
  defaultApprovalTaskOwner: { id: string | null; name: string | null };
  approvalTaskSubject: string;
}

export interface AdminSettingsResponse {
  success: boolean;
  settings: AdminSettings;
}

export const adminSettingsApi = {
  async get(): Promise<AdminSettings> {
    const res = await apiClient.get<AdminSettingsResponse>('/api/admin-settings');
    if (res.error) throw new Error(res.error);
    return res.data!.settings;
  },

  async update(patch: Partial<AdminSettings>): Promise<AdminSettings> {
    const res = await apiClient.patch<AdminSettingsResponse>('/api/admin-settings', patch);
    if (res.error) throw new Error(res.error);
    return res.data!.settings;
  },
};
