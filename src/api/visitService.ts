import { apiClient } from './client';

export interface VisitRecord {
  id: number;
  sourceType?: 'Sales' | 'Credit' | string;
  leadId?: number;
  leadName?: string;
  companyId?: number;
  visitDate: string;
  purpose?: string;
  executiveName?: string;
  outcome?: string;
  notes?: string;
  location?: string;
  nextFollowUp?: string;
}

export interface CreateVisitPayload {
  companyID: number;
  leadName?: string;
  executiveName?: string;
  visitDate?: string;
  location?: string;
  purpose?: string;
  outcome?: string;
  notes?: string;
  nextFollowUp?: string;
  sourceType?: string;
}

export const visitService = {
  getVisits: async (companyId: number): Promise<{ success: boolean; visits: VisitRecord[] }> => {
    const res = await apiClient.get('/Visit', {
      params: { companyId: companyId <= 0 ? 0 : companyId },
    });
    return res.data;
  },

  createVisit: async (data: CreateVisitPayload): Promise<any> => {
    const res = await apiClient.post('/Visit', data);
    return res.data;
  },

  updateVisit: async (id: number, data: Partial<CreateVisitPayload>): Promise<any> => {
    const res = await apiClient.put(`/Visit/${id}`, data);
    return res.data;
  },

  deleteVisit: async (id: number, sourceType: string = 'Sales'): Promise<any> => {
    const res = await apiClient.delete(`/Visit/${id}`, {
      params: { sourceType },
    });
    return res.data;
  },
};

export default visitService;
