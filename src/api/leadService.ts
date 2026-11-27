import { apiClient } from './client';
import { SafeStorage } from '../utils/storage';

export interface Lead {
  leadID: number;
  companyID?: number;
  leadName: string;
  mobileNo: string;
  email?: string;
  companyName: string;
  city?: string;
  assignedTo?: number | null;
  assignedToName?: string;
  leadSourceID?: number | null;
  leadSource?: number | string;
  leadSourceName?: string;
  productInterestedIn?: string;
  remarks?: string;
  status?: boolean | string;
  leadStatus?: string;
  followUpDate?: string | null;
  followUpTime?: string | null;
  combinedFollowUpDateTime?: string | null;
  nextFollowUpDate?: string | null;
  createdBy?: number;
  createdDate?: string;
  updatedBy?: number;
  updatedDate?: string;
  priority?: 'High' | 'Medium' | 'Low';
  estimatedValue?: number;
}

export interface LeadFilterParams {
  companyId: number;
  search?: string;
  page?: number;
  pageSize?: number;
  status?: string;
  sourceId?: number;
  assignedTo?: number;
}

export interface LeadPaginatedResponse {
  data: Lead[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export const leadService = {
  
 
async getLeads(
  params: LeadFilterParams
): Promise<{
  data: Lead[];
  total: number;
  totalPages: number;
}> {
  const companyId = Number(params?.companyId);

  // 0 = All Companies
  if (!Number.isInteger(companyId) || companyId < 0) {
    throw new Error('Invalid company selection.');
  }

  // All Companies: companyId = 0
  // Specific Company: companyId = selected company ID
  const requestParams = {
    ...params,
    companyId,
  };

  try {
    console.log('Fetching leads with params:', requestParams);

    const response = await apiClient.get('/Lead', {
      params: requestParams,
    });

    const raw = response.data;

    let leadsData: any = raw?.data ?? raw;

    if (leadsData && Array.isArray(leadsData.$values)) {
      leadsData = leadsData.$values;
    }

    if (!Array.isArray(leadsData)) {
      if (Array.isArray(raw?.$values)) {
        leadsData = raw.$values;
      } else {
        leadsData = [];
      }
    }

    const total = Number(
      raw?.total ?? raw?.totalCount ?? leadsData.length
    );

    const totalPages = Number(raw?.totalPages ?? 1);

    return {
      data: leadsData,
      total,
      totalPages,
    };
  } catch (error: any) {
    console.error('Error fetching leads:', {
      url: '/Lead',
      params: requestParams,
      status: error?.response?.status,
      response: error?.response?.data,
      message: error?.message,
    });

    throw error;
  }
},


  // GET LEAD BY ID (matches Desktop LeadService.getLeadById)
  getLeadById: async (leadId: number | string, companyId?: number | null): Promise<Lead | null> => {
    try {
      const numId = Number(leadId);
      if (!leadId || isNaN(numId) || numId <= 0) {
        console.warn('getLeadById called with invalid leadId:', leadId);
        return null;
      }
      const params: any = {};
      let comp = companyId ? Number(companyId) : 0;
      if (!comp || comp <= 0) {
        const storedComp = await SafeStorage.getItem('crm_selected_company_id');
        if (storedComp && Number(storedComp) > 0) {
          comp = Number(storedComp);
        }
      }
      if (comp > 0) {
        params.companyId = comp;
      }
      const response = await apiClient.get(`/Lead/${numId}`, { params });
      return response.data;
    } catch (err: any) {
      console.warn('Error fetching lead by id:', err?.response?.data || err?.message || err);
      return null;
    }
  },

  // CREATE LEAD (matches Desktop LeadService.createLead)
  createLead: async (leadData: Partial<Lead>): Promise<any> => {
    try {
      const response = await apiClient.post('/Lead', leadData);
      return response.data;
    } catch (err) {
      console.error('Error creating lead:', err);
      throw err;
    }
  },

  // UPDATE LEAD (matches Desktop LeadService.updateLead)
  updateLead: async (leadId: number, leadData: Partial<Lead>): Promise<any> => {
    try {
      const response = await apiClient.put(`/Lead/${leadId}`, leadData);
      return response.data;
    } catch (err) {
      console.error('Error updating lead:', err);
      throw err;
    }
  },

  // DELETE LEAD (matches Desktop LeadService.deleteLead)
  deleteLead: async (leadId: number | string, companyId?: number | null): Promise<any> => {
    try {
      const numId = Number(leadId);
      const params: any = {};
      let comp = companyId ? Number(companyId) : 0;
      if (!comp || comp <= 0) {
        const storedComp = await SafeStorage.getItem('crm_selected_company_id');
        if (storedComp && Number(storedComp) > 0) {
          comp = Number(storedComp);
        }
      }
      if (comp > 0) {
        params.companyId = comp;
      }
      const response = await apiClient.delete(`/Lead/${numId}`, { params });
      return response.data;
    } catch (err) {
      console.error('Error deleting lead:', err);
      throw err;
    }
  },

  // UPDATE FOLLOW UP (matches Desktop LeadService.updateFollowUp)
  updateFollowUp: async (leadId: number, followUpDate: string, followUpTime?: string): Promise<any> => {
    try {
      const payload: any = {
        followUpDate,
        followUpTime: followUpTime || '10:00:00',
        combinedFollowUpDateTime: `${followUpDate}T${followUpTime || '10:00'}:00`,
      };
      const response = await apiClient.put(`/Lead/${leadId}`, payload);
      return response.data;
    } catch (err) {
      console.error('Error updating follow up:', err);
      throw err;
    }
  },

  // GET LEADS FOR DROPDOWN (matches Desktop LeadService.getLeadsForDropdown)
  getLeadsForDropdown: async (companyId?: number): Promise<Lead[]> => {
  try {
    const params = companyId ? { companyId, page: 1, pageSize: 500 } : { page: 1, pageSize: 500 };

    const response = await apiClient.get('/Lead', { params });

    if (response?.data?.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }

    if (Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  } catch (err: any) {
    console.error('Error fetching leads:', err?.response?.data);
    console.error('Status:', err?.response?.status);
    throw err;
  }
},
};
