import { apiClient } from './client';

export interface QuotationItem {
  id?: number;
  header_id?: number;
  item_name: string;
  item_remark?: string;
  qty: number;
  rate: number;
  discount?: number;
  discount_amount?: number;
  amount: number;
}

export interface Quotation {
  quotationId: number;
  docTypeID?: number;
  quotationNo: string;
  customerName: string;
  companyName: string;
  leadID?: number;
  quotationDate: string;
  validUntil?: string;
  totalAmount: number;
  taxAmount?: number;
  netAmount?: number;
  status: string;
  items?: QuotationItem[];
  remarks?: string;
  cancelReason?: string;
  subTotal?: number;
  discount?: number;
  billDiscount?: number;
  billDiscountPercent?: number;
  roundOff?: number;
  createdByID?: number;
  companyID?: number;
}

export interface QuotationPaginatedResponse {
  data: Quotation[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export const quotationService = {
  // GET ALL QUOTATIONS
  getQuotations: async (params?: {
    companyId?: number;
    search?: string;
    page?: number;
    pageSize?: number;
    status?: string;
    leadId?: number;
  }): Promise<QuotationPaginatedResponse> => {
    try {
      const queryParams: any = {
        companyId: params?.companyId,
        leadId: params?.leadId,
        search: params?.search,
        status: params?.status,
        page: params?.page || 1,
        limit: params?.pageSize || 15,
      };

      const response = await apiClient.get('/Quotation', { params: queryParams });
      if (response && response.data) {
        const raw = response.data;
        const list = Array.isArray(raw)
          ? raw
          : raw.data || raw.quotations || [];
        const pagination = raw.pagination || {};

        const mappedList: Quotation[] = Array.isArray(list)
          ? list.map((q: any) => ({
              quotationId: q.quotationID || q.QuotationID || q.quotationId || q.id,
              docTypeID: q.docTypeID || q.DocTypeID || (Array.isArray(q.items || q.Items) && (q.items || q.Items).length > 0 ? 2 : 1),
              quotationNo: q.documentReferenceNo || q.qtn_no || q.quotationNo || `QT-${q.quotationID || q.id || ''}`,
              customerName: q.leadName || q.LeadName || q.customer || q.customerName || 'Customer',
              companyName: q.companyName || q.CompanyName || '',
              leadID: q.leadID || q.LeadID,
              quotationDate: q.documentDate || q.qtn_date || q.quotation_date || q.createdDate || new Date().toISOString(),
              validUntil: q.valid_till || q.validUntil,
              totalAmount: q.documentAmount ?? q.total_amount ?? q.qtn_amt ?? q.totalAmount ?? 0,
              taxAmount: q.taxAmount ?? 0,
              netAmount: q.documentAmount ?? q.total_amount ?? q.qtn_amt ?? 0,
              status: q.status || q.Status || 'open',
              items: q.items || q.Items || [],
              remarks: q.remark || q.Remark || q.remarks,
              cancelReason: q.cancellationReason || q.CancellationReason,
              subTotal: q.sub_total,
              discount: q.discount,
              billDiscount: q.bill_discount,
              billDiscountPercent: q.bill_discount_percent,
              createdByID: q.createdByID || q.CreatedByID,
              companyID: q.companyID || q.CompanyID,
            }))
          : [];

        return {
          data: mappedList,
          total: pagination.totalItems ?? mappedList.length,
          totalPages: pagination.totalPages ?? 1,
          currentPage: pagination.currentPage ?? (params?.page || 1),
        };
      }
    } catch (err) {
      console.error('Error fetching quotations:', err);
    }
    return { data: [], total: 0, totalPages: 1, currentPage: 1 };
  },

  // GET QUOTATION BY ID
  getQuotationById: async (quotationId: number): Promise<any> => {
    try {
      const response = await apiClient.get(`/Quotation/${quotationId}`);
      return response.data;
    } catch (err) {
      console.error('Error fetching quotation by id:', err);
      throw err;
    }
  },

  // CREATE QUOTATION
  createQuotation: async (quotationData: any): Promise<any> => {
    try {
      const response = await apiClient.post('/Quotation', quotationData);
      return response.data;
    } catch (err) {
      console.error('Error creating quotation:', err);
      throw err;
    }
  },

  // UPDATE QUOTATION
  updateQuotation: async (quotationId: number, quotationData: any): Promise<any> => {
    try {
      const response = await apiClient.put(`/Quotation/${quotationId}`, quotationData);
      return response.data;
    } catch (err) {
      console.error('Error updating quotation:', err);
      throw err;
    }
  },

  // DELETE QUOTATION
  deleteQuotation: async (quotationId: number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/Quotation/${quotationId}`);
      return response.data;
    } catch (err) {
      console.error('Error deleting quotation:', err);
      throw err;
    }
  },
};
