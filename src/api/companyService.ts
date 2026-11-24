import { apiClient } from './client';
import { CompanyMaster } from './mastersService';

export interface CreateCompanyPayload {
  companyName: string;
  companyCode?: string;
  email?: string;
  mobileNo?: string;
  alternateNo?: string;
  website?: string;
  gstNo?: string;
  panNo?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  status?: string;
  isChecked?: boolean;
}

export interface UpdateCompanyPayload extends CreateCompanyPayload {
  companyId?: number;
}

export const companyService = {
  // Get all companies from DB table Companies
  getCompanies: async (params?: { search?: string; status?: string }): Promise<CompanyMaster[]> => {
    try {
      const res = await apiClient.get('/Company', { params });
      if (res && res.data) {
        const raw = Array.isArray(res.data)
          ? res.data
          : res.data.data || res.data.companies || [];
        if (Array.isArray(raw)) {
          return raw.map((c: any) => ({
            companyID: c.companyID || c.CompanyID || c.id,
            companyName: c.companyName || c.CompanyName || 'Company',
            code: c.companyCode || c.CompanyCode || '',
            city: c.city || c.City || '',
            state: c.state || c.State || '',
            address: c.addressLine1 || c.AddressLine1 || c.address || '',
            gstNo: c.gstNo || c.GSTNo,
            panNo: c.panNo || c.PANNo,
            email: c.email || c.Email,
            phone: c.mobileNo || c.MobileNo || c.phone,
            status: c.status || c.Status || 'active',
            alternateNo: c.alternateNo || c.AlternateNo,
            website: c.website || c.Website,
            addressLine1: c.addressLine1 || c.AddressLine1,
            addressLine2: c.addressLine2 || c.AddressLine2,
            pincode: c.pincode || c.Pincode,
            country: c.country || c.Country || 'India',
          }));
        }
      }
    } catch (err) {
      console.warn('Error fetching companies in companyService:', err);
    }
    return [];
  },

  // Create new company in DB table Companies
  createCompany: async (payload: CreateCompanyPayload): Promise<{ success: boolean; companyId?: number; message?: string }> => {
    const res = await apiClient.post('/Company', payload);
    return res.data;
  },

  // Update existing company in DB table Companies
  updateCompany: async (id: number, payload: UpdateCompanyPayload): Promise<{ success: boolean; companyId?: number; message?: string }> => {
    const res = await apiClient.put(`/Company/${id}`, payload);
    return res.data;
  },

  // Delete company
  deleteCompany: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const res = await apiClient.delete(`/Company/${id}`);
    if (res.data && res.data.success === false) {
      throw new Error(res.data.message || 'Failed to delete company');
    }
    return res.data;
  },

  // Get company by ID
  getCompanyById: async (id: number): Promise<any> => {
    const res = await apiClient.get(`/Company/${id}`);
    return res.data;
  },
};
