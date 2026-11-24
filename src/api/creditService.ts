import { apiClient } from './client';

export interface CreditDashboardMetrics {
  totalOutstanding: number;
  totalOverdue: number;
  collectedThisMonth: number;
  targetCollection: number;
  totalCustomers: number;
  highRiskCustomers: number;
  aging0to30: number;
  aging31to60: number;
  aging61to90: number;
  aging90Plus: number;
}

export interface CreditCustomer {
  creditProfileID?: number;
  customerId?: number;
  customerName: string;
  companyName: string;
  leadID?: number;
  companyID?: number;
  creditLimit: number;
  utilizedCredit?: number;
  availableCredit?: number;
  outstandingBalance?: number;
  overdueAmount?: number;
  creditDays: number;
  warningDays?: number;
  riskRating?: string;
  accountStatus?: string;
  status?: string;
  mobileNo?: string;
  referencePersonName?: string;
  referenceMobileNumber?: string;
  paymentModePreference?: string;
  collectionAssignedTo?: number;
}

export interface Receipt {
  receiptId: number;
  receiptNo: string;
  customerName: string;
  companyName: string;
  leadID?: number;
  receiptDate: string;
  amount: number;
  paymentMode: string;
  referenceNo: string;
  status: string;
  remarks?: string;
  paymentType?: string;
  objType?: number;
  referenceNumber?: string;
}

export interface OutstandingReportItem {
  id?: number;
  customerName: string;
  companyName?: string;
  totalOutstanding: number;
  currentDue: number;
  overdue1to30: number;
  overdue31to60: number;
  overdue61to90: number;
  overdue90Plus: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  riskRating?: string;
}

export const creditService = {
  // GET ALL CREDIT PROFILES (matches Desktop creditMasterService.getByCompanyId or getAll)
  getCustomers: async (companyId?: number, search?: string): Promise<CreditCustomer[]> => {
    try {
      const url = companyId && companyId > 0 ? `/CreditMaster/company/${companyId}` : '/CreditMaster';
      const response = await apiClient.get(url, { params: { search } });
      if (response && response.data) {
        const raw = Array.isArray(response.data) ? response.data : response.data.data;
        if (Array.isArray(raw)) {
          return raw.map((c: any) => ({
            creditProfileID: c.creditProfileID || c.CreditProfileID || c.customerId || c.id,
            customerId: c.customerId || c.creditProfileID || c.CreditProfileID || c.leadID,
            customerName: c.customerName || c.CustomerName || c.leadName || c.referencePersonName || `Lead #${c.leadID || ''}`,
            companyName: c.companyName || c.CompanyName || 'Customer',
            leadID: c.leadID || c.LeadID,
            companyID: c.companyID || c.CompanyID,
            creditLimit: c.creditLimit ?? c.CreditLimit ?? 0,
            utilizedCredit: c.utilizedCredit ?? c.UtilizedCredit ?? 0,
            availableCredit: (c.creditLimit ?? c.CreditLimit ?? 0) - (c.utilizedCredit ?? c.UtilizedCredit ?? 0),
            outstandingBalance: c.outstandingBalance ?? c.OutstandingBalance ?? 0,
            overdueAmount: c.overdueAmount ?? c.OverdueAmount ?? 0,
            creditDays: c.creditDays ?? c.CreditDays ?? 30,
            warningDays: c.warningDays ?? c.WarningDays ?? 7,
            riskRating: c.riskRating || c.RiskRating || 'Low',
            accountStatus: c.accountStatus || c.AccountStatus || 'Active',
            status: c.accountStatus || c.AccountStatus || 'Active',
            mobileNo: c.referenceMobileNumber || c.ReferenceMobileNumber || c.mobileNo,
            referencePersonName: c.referencePersonName || c.ReferencePersonName,
            referenceMobileNumber: c.referenceMobileNumber || c.ReferenceMobileNumber,
            paymentModePreference: c.paymentModePreference || c.PaymentModePreference,
            collectionAssignedTo: c.collectionAssignedTo || c.CollectionAssignedTo,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching credit customers:', err);
    }
    return [];
  },

  getCreditCustomers: async (companyId?: number, search?: string): Promise<CreditCustomer[]> => {
    return creditService.getCustomers(companyId, search);
  },

  // GET CREDIT PROFILE BY LEAD AND COMPANY
  getByLeadAndCompany: async (leadId: number, companyId: number): Promise<any> => {
    try {
      const response = await apiClient.get(`/CreditMaster/lead/${leadId}/company/${companyId}`);
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      console.error('Error fetching credit profile by lead and company:', err);
      return null;
    }
  },

  // SAVE / UPSERT CREDIT PROFILE (matches Desktop creditMasterService.saveProfile)
  saveCreditProfile: async (data: Partial<CreditCustomer>): Promise<any> => {
    try {
      const response = await apiClient.post('/CreditMaster/save', data);
      return response.data;
    } catch (err) {
      console.error('Error saving credit profile:', err);
      throw err;
    }
  },

  // UPLOAD DOCUMENT ATTACHMENT
uploadTransactionAttachment: async (
  objType: number,
  documentId: number,
  file: any
): Promise<any> => {
  try {
    const formData = new FormData();

    formData.append('file', {
      uri: file.uri,
      name: file.name || 'attachment',
      type: file.mimeType || 'application/octet-stream',
    } as any);

    const response = await apiClient.post(
    `/MobileAttachment/${objType}/${documentId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  } catch (err) {
    console.error('Error uploading transaction attachment:', err);
    throw err;
  }
},

  // GET ALL CREDIT PROFILES
  getAllCreditProfiles: async (companyId?: number, search?: string): Promise<any[]> => {
    try {
      const response = await apiClient.get('/CreditMaster', { params: { companyId, search } });
      if (response && response.data) {
        if (Array.isArray(response.data)) return response.data;
        if (Array.isArray(response.data.data)) return response.data.data;
        if (Array.isArray(response.data.value)) return response.data.value;
      }
    } catch (err) {
      console.warn('Error fetching credit profiles:', err);
    }
    return [];
  },

  // DELETE CREDIT PROFILE
  deleteCreditProfile: async (id: number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/CreditMaster/${id}`);
      return response.data;
    } catch (err) {
      console.error('Error deleting credit profile:', err);
      throw err;
    }
  },

  // GET ALL RECEIPTS (matches Desktop receiptService.getAllReceipts)
  getReceipts: async (
    companyId?: number,
    search?: string,
    page = 1,
    pageSize = 10
  ): Promise<Receipt[]> => {
    try {
      const params: any = { page, pageSize };
      if (companyId) params.companyId = companyId;
      if (search) params.search = search;

      const response = await apiClient.get('/Receipt', { params });
      if (response && response.data) {
        const raw = Array.isArray(response.data) ? response.data : response.data.data;
        if (Array.isArray(raw)) {
          return raw.map((r: any) => {
            const isOut =
              r.paymentType === 'outgoing' ||
              r.paymentType === 'Payment' ||
              r.objType === 4 ||
              (r.referenceNumber || r.referenceNo || '').toUpperCase().startsWith('PAY') ||
              (r.receiptNo || '').toUpperCase().startsWith('PAY');

            const pType = r.paymentType || (isOut ? 'outgoing' : 'incoming');
            const oType = r.objType || (isOut ? 4 : 3);
            const refNumber = r.referenceNumber || r.referenceNo || r.ReferenceNo || '';
            const recNo =
              r.receiptNo ||
              r.ReceiptNo ||
              (refNumber && (refNumber.toUpperCase().startsWith('PAY') || refNumber.toUpperCase().startsWith('REC')) ? refNumber : '') ||
              (isOut ? `PAY-${r.receiptID || r.ReceiptID || r.id}` : `REC-${r.receiptID || r.ReceiptID || r.id}`);

            return {
              receiptId: r.receiptID || r.ReceiptID || r.receiptId || r.id,
              receiptNo: recNo,
              customerName: r.customerName || r.CustomerName || r.leadName || 'Customer',
              companyName: r.companyName || r.CompanyName || '',
              leadID: r.leadID || r.LeadID,
              receiptDate: r.receiptDate || r.ReceiptDate || r.createdDate || new Date().toISOString(),
              amount: r.amount ?? r.Amount ?? r.totalAmount ?? 0,
              paymentMode: r.paymentMode || r.paymentModeName || r.PaymentMode || 'NEFT',
              referenceNo: refNumber || `TXN-${r.receiptID || r.id}`,
              referenceNumber: refNumber,
              status: r.status || r.Status || 'Confirmed',
              remarks: r.remarks || r.remark || r.Remarks,
              paymentType: pType,
              objType: oType,
            };
          });
        }
      }
    } catch (err) {
      console.error('Error fetching receipts:', err);
    }
    return [];
  },

  // GET DOCUMENTS BY LEAD (matches Desktop receiptService.getDocumentsByLead)
  getDocumentsByLead: async (
    companyId: number,
    leadName: string,
    leadId?: number,
    paymentType = 'incoming',
    includeClosed = false
  ): Promise<any[]> => {
    try {
      const response = await apiClient.get('/Receipt/documents/by-lead', {
        params: { companyId, leadName, leadId, paymentType, includeClosed }
      });
      return Array.isArray(response.data) ? response.data : (response.data?.data || []);
    } catch (err) {
      console.error('Error fetching documents by lead:', err);
      return [];
    }
  },

  // GET RECEIPT BY ID
  getReceiptById: async (id: number, paymentType?: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/Receipt/${id}`, { params: { paymentType } });
      return response.data;
    } catch (err) {
      console.error('Error fetching receipt by id:', err);
      throw err;
    }
  },

  // GET RECEIPT DASHBOARD
  getReceiptDashboard: async (companyId?: number): Promise<any> => {
    try {
      const response = await apiClient.get('/Receipt/dashboard', { params: { companyId } });
      return response.data;
    } catch (err) {
      console.error('Error fetching receipt dashboard:', err);
      return { totalOutstanding: 0, dueToday: 0, overdueAmount: 0, collectionThisMonth: 0 };
    }
  },

  // CREATE RECEIPT (matches Desktop receiptService.createReceipt)
  createReceipt: async (receiptData: any): Promise<any> => {
    try {
      const response = await apiClient.post('/Receipt', receiptData);
      return response.data;
    } catch (err) {
      console.error('Error creating receipt:', err);
      throw err;
    }
  },

  // UPDATE RECEIPT (matches Desktop receiptService.updateReceipt)
  updateReceipt: async (receiptId: number, receiptData: any): Promise<any> => {
    try {
      const response = await apiClient.put(`/Receipt/${receiptId}`, receiptData);
      return response.data;
    } catch (err) {
      console.error('Error updating receipt:', err);
      throw err;
    }
  },

  // DELETE RECEIPT (matches Desktop receiptService.deleteReceipt)
  deleteReceipt: async (receiptId: number, paymentType?: string): Promise<any> => {
    try {
      const response = await apiClient.delete(`/Receipt/${receiptId}`, { params: { paymentType } });
      return response.data;
    } catch (err) {
      console.error('Error deleting receipt:', err);
      throw err;
    }
  },

  // CREATE INVOICE DOCUMENT
  createInvoiceDocument: async (data: any): Promise<any> => {
    try {
      const response = await apiClient.post('/InvoiceDocument', data);
      return response.data;
    } catch (err) {
      console.error('Error creating invoice document:', err);
      throw err;
    }
  },

  // CREATE RETURN DOCUMENT
  createReturnDocument: async (data: any): Promise<any> => {
    try {
      const response = await apiClient.post('/ReturnDocument', data);
      return response.data;
    } catch (err) {
      console.error('Error creating return document:', err);
      throw err;
    }
  },

  // CREATE JOURNAL ENTRY DOCUMENT
  createJournalEntryDocument: async (data: any): Promise<any> => {
    try {
      const response = await apiClient.post('/JournalEntryDocument', data);
      return response.data;
    } catch (err) {
      console.error('Error creating journal entry document:', err);
      throw err;
    }
  },

  // CREATE NEW TRANSACTION (Mobile API Unified Endpoint with fallback)
  createNewTransaction: async (data: any): Promise<any> => {
    try {
      const response = await apiClient.post('/NewTransaction', data);
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        console.warn('POST /NewTransaction returned 404, executing legacy fallback');
        if (data.docType?.includes('Invoice')) {
          return await creditService.createInvoiceDocument({
            leadID: data.leadID,
            leadName: data.leadName,
            documentDate: data.documentDate,
            dueDate: data.dueDate,
            documentNumber: data.documentNumber,
            documentAmount: data.documentAmount,
            pendingamt: data.documentAmount,
            status: data.status || 'Open',
            remark: data.remark,
            companyID: data.companyID,
            createdBy: data.createdBy,
          });
        } else if (data.docType?.includes('Return')) {
          return await creditService.createReturnDocument({
            leadID: data.leadID,
            leadName: data.leadName,
            documentDate: data.documentDate,
            dueDate: data.dueDate,
            documentNumber: data.documentNumber,
            documentAmount: data.documentAmount,
            pendingamt: data.documentAmount,
            status: data.status || 'Open',
            remark: data.remark,
            companyID: data.companyID,
            createdBy: data.createdBy,
          });
        } else if (data.docType?.includes('Journal')) {
          return await creditService.createJournalEntryDocument({
            leadID: data.leadID,
            leadName: data.leadName,
            documentDate: data.documentDate,
            dueDate: data.dueDate,
            amountType: data.amountType || 'Credit',
            documentAmount: data.documentAmount,
            status: data.status || 'Open',
            remark: data.remark,
            companyID: data.companyID,
            createdBy: data.createdBy,
          });
        } else if (data.docType?.includes('Receipt') || data.docType?.includes('Payment')) {
          return await creditService.createReceipt({
            companyID: data.companyID,
            leadID: data.leadID,
            leadName: data.leadName,
            customerName: data.leadName,
            companyName: data.leadName,
            amount: data.documentAmount,
            paymentMode: data.paymentMode || 'NEFT',
            referenceNo: data.documentNumber,
            remarks: data.remark,
            status: 'Confirmed',
            paymentType: data.docType.toLowerCase().includes('payment') ? 'outgoing' : 'incoming',
          });
        }
      }
      throw err;
    }
  },

  // GET ALL TRANSACTIONS (Unified Mobile Endpoint)
  getNewTransactions: async (companyId?: number, search?: string): Promise<any[]> => {
    try {
      const params: any = {};
      if (companyId) params.companyId = companyId;
      if (search) params.search = search;
      const res = await apiClient.get('/NewTransaction', { params });
      if (res && res.data) {
        return Array.isArray(res.data) ? res.data : (res.data.data || []);
      }
    } catch (err) {
      console.warn('GET /NewTransaction error:', err);
    }
    return [];
  },

  // UPDATE TRANSACTION
  updateNewTransaction: async (id: number, data: any): Promise<any> => {
    try {
      const res = await apiClient.put(`/NewTransaction/${id}`, data);
      return res.data;
    } catch (err) {
      console.error('Error updating transaction:', err);
      throw err;
    }
  },

  // DELETE TRANSACTION
  deleteNewTransaction: async (id: number, docType?: string): Promise<any> => {
    try {
      const res = await apiClient.delete(`/NewTransaction/${id}`, { params: { docType } });
      return res.data;
    } catch (err) {
      console.error('Error deleting transaction:', err);
      throw err;
    }
  },

  // GET ALL TRANSACTIONS / DOCUMENTS (FALLBACK)
  getAllDocuments: async (companyId?: number): Promise<any[]> => {
    try {
      const params = companyId ? { companyId } : {};
      const [invoicesRes, receiptsRes] = await Promise.allSettled([
        apiClient.get('/InvoiceDocument', { params }),
        apiClient.get('/Receipt', { params }),
      ]);

      const list: any[] = [];

      if (invoicesRes.status === 'fulfilled' && invoicesRes.value?.data) {
        const raw = Array.isArray(invoicesRes.value.data) ? invoicesRes.value.data : (invoicesRes.value.data.data || []);
        raw.forEach((inv: any) => {
          list.push({
            id: inv.invoice_Document_ID || inv.Invoice_Document_ID || inv.id,
            docType: 'Invoice',
            leadID: inv.leadID || inv.LeadID,
            leadName: inv.leadName || inv.LeadName || 'Lead',
            documentDate: inv.documentDate || inv.DocumentDate || '',
            dueDate: inv.dueDate || inv.DueDate || '',
            documentNumber: inv.documentNumber || inv.DocumentNumber || '',
            amount: inv.documentAmount || inv.DocumentAmount || 0,
            status: inv.status || inv.Status || 'Open',
            remark: inv.remark || inv.Remark || '',
          });
        });
      }

      if (receiptsRes.status === 'fulfilled' && receiptsRes.value?.data) {
        const raw = Array.isArray(receiptsRes.value.data) ? receiptsRes.value.data : (receiptsRes.value.data.data || []);
        raw.forEach((r: any) => {
          list.push({
            id: r.receiptId || r.receiptID || r.ReceiptID || r.id,
            docType: r.paymentType === 'outgoing' ? 'Payment' : 'Receipt',
            leadID: r.leadID || r.LeadID,
            leadName: r.leadName || r.LeadName || r.customerName || 'Lead',
            documentDate: r.receiptDate || r.ReceiptDate || '',
            dueDate: r.dueDate || r.DueDate || '',
            documentNumber: r.referenceNumber || r.receiptNo || r.referenceNo || '',
            amount: r.amount || r.receivedAmount || 0,
            status: r.status || 'Confirmed',
            remark: r.description || r.remarks || '',
          });
        });
      }

      return list.sort((a, b) => new Date(b.documentDate).getTime() - new Date(a.documentDate).getTime());
    } catch (err) {
      console.warn('Error fetching all documents:', err);
      return [];
    }
  },

  // GET RECEIPT DASHBOARD METRICS (matches Desktop receiptService.getDashboardMetrics)
  getDashboardMetrics: async (companyId?: number): Promise<any> => {
    try {
      const params = companyId ? { companyId } : {};
      const response = await apiClient.get('/Receipt/dashboard', { params });
      return response.data;
    } catch (err) {
      console.error('Error fetching receipt metrics:', err);
      return {
        totalOutstanding: 0,
        dueToday: 0,
        overdueAmount: 0,
        collectionThisMonth: 0,
      };
    }
  },

  // GET CREDIT METRICS (matches Desktop creditDashboardService)
  getCreditMetrics: async (companyId?: number): Promise<CreditDashboardMetrics> => {
    try {
      const params = companyId ? { companyId } : {};
      let response: any = null;
      try {
        response = await apiClient.get('/CreditAdminDashboard', { params });
      } catch {
        try {
          response = await apiClient.get('/CreditDashboard', { params });
        } catch {
          try {
            response = await apiClient.get('/Credit/metrics', { params }).catch(() => null);
          } catch {
            response = null;
          }
        }
      }

      if (response && response.data) {
        const stats = response.data.stats || response.data;
        const totalOutstanding = Number(stats.totalOutstanding ?? response.data.totalOutstanding ?? 0);
        const totalOverdue = Number(stats.totalOverdue ?? response.data.totalOverdue ?? 0);
        const collectedThisMonth = Number(stats.monthlyCollection ?? stats.collectedThisMonth ?? stats.totalCollection ?? 0);
        const targetCollection = Number(stats.targetCollection ?? stats.target ?? 0);
        const totalCustomers = Number(stats.totalCustomers ?? response.data.topCreditCustomers?.length ?? 0);
        const highRiskCustomers = Number(stats.highRiskCustomers ?? 0);

        if (totalOutstanding > 0 || collectedThisMonth > 0 || totalCustomers > 0 || totalOverdue > 0 || highRiskCustomers > 0) {
          return {
            totalOutstanding,
            totalOverdue,
            collectedThisMonth,
            targetCollection,
            totalCustomers,
            highRiskCustomers,
            aging0to30: Number(stats.aging0to30 ?? stats.days30 ?? 0),
            aging31to60: Number(stats.aging31to60 ?? stats.days60 ?? 0),
            aging61to90: Number(stats.aging61to90 ?? stats.days90 ?? 0),
            aging90Plus: Number(stats.aging90Plus ?? stats.days120 ?? 0),
          };
        }
      }

      // Live Fallback: Calculate metrics dynamically from actual credit customers & invoices in database
      const [customers, invoices] = await Promise.all([
        creditService.getCustomers(companyId).catch(() => []),
        creditService.getInvoiceDocuments({ companyId }).catch(() => []),
      ]);

      let calcOutstanding = 0;
      let calcOverdue = 0;
      let calcCustomers = customers.length;
      let calcHighRisk = 0;

      if (invoices.length > 0) {
        invoices.forEach((inv) => {
          const pending = inv.pendingamt || inv.documentAmount || 0;
          calcOutstanding += pending;
          if (inv.dueDate && new Date(inv.dueDate) < new Date()) {
            calcOverdue += pending;
          }
        });
        const leadSet = new Set(invoices.map((i) => i.leadID || i.leadName).filter(Boolean));
        if (leadSet.size > 0) calcCustomers = Math.max(calcCustomers, leadSet.size);

        const now = new Date();
        const highRiskSet = new Set<string>();
        invoices.forEach((inv) => {
          const pending = inv.pendingamt || inv.documentAmount || 0;
          if (pending > 0 && inv.dueDate) {
            const due = new Date(inv.dueDate);
            const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 90) {
              highRiskSet.add(String(inv.leadID || inv.leadName));
            }
          }
        });
        customers.forEach((c) => {
          if (c.riskRating?.toLowerCase() === 'high' || c.status?.toLowerCase().includes('high')) {
            highRiskSet.add(String(c.leadID || c.customerId || c.customerName));
          }
        });
        calcHighRisk = highRiskSet.size;
      } else if (customers.length > 0) {
        customers.forEach((c) => {
          calcOutstanding += c.outstandingBalance || 0;
          calcOverdue += c.overdueAmount || 0;
          if (c.riskRating?.toLowerCase() === 'high' || c.status?.toLowerCase().includes('high')) {
            calcHighRisk++;
          }
        });
      }

      return {
        totalOutstanding: calcOutstanding,
        totalOverdue: calcOverdue,
        collectedThisMonth: 0,
        targetCollection: 0,
        totalCustomers: calcCustomers,
        highRiskCustomers: calcHighRisk,
        aging0to30: 0,
        aging31to60: 0,
        aging61to90: 0,
        aging90Plus: 0,
      };
    } catch (err) {
      console.warn('Error fetching credit metrics:', err);
      return {
        totalOutstanding: 0,
        totalOverdue: 0,
        collectedThisMonth: 0,
        targetCollection: 0,
        totalCustomers: 0,
        highRiskCustomers: 0,
        aging0to30: 0,
        aging31to60: 0,
        aging61to90: 0,
        aging90Plus: 0,
      };
    }
  },

  // GET OUTSTANDING REPORTS (matches Desktop creditDashboardService / Overdue)
  getOutstandingReports: async (companyId?: number, search?: string): Promise<OutstandingReportItem[]> => {
    try {
      const params: any = {};
      if (companyId) params.companyId = companyId;
      if (search) params.search = search;

      const response = await apiClient.get('/Overdue', { params }).catch(() => apiClient.get('/CreditMaster', { params }));
      if (response && response.data) {
        const raw = Array.isArray(response.data) ? response.data : response.data.data;
        if (Array.isArray(raw)) {
          return raw.map((item: any) => ({
            id: item.id || item.leadID || item.customerID,
            customerName: item.customerName || item.CustomerName || item.leadName || item.name || 'Customer',
            companyName: item.companyName || item.CompanyName || '',
            totalOutstanding: item.totalOutstanding ?? item.TotalOutstanding ?? item.outstandingBalance ?? 0,
            currentDue: item.currentDue ?? item.CurrentDue ?? item.overdueAmount ?? 0,
            overdue1to30: item.overdue1to30 ?? item.aging0to30 ?? 0,
            overdue31to60: item.overdue31to60 ?? item.aging31to60 ?? 0,
            overdue61to90: item.overdue61to90 ?? item.aging61to90 ?? 0,
            overdue90Plus: item.overdue90Plus ?? item.aging90Plus ?? 0,
            lastPaymentDate: item.lastPaymentDate,
            lastPaymentAmount: item.lastPaymentAmount,
            riskRating: item.riskRating || 'Low',
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching outstanding reports:', err);
    }
    return [];
  },

  // GET OUTSTANDING CUSTOMER-WISE (Matches Web CRM reportService.getOutstandingCustomerWise)
  getOutstandingCustomerWise: async (payload?: {
    fromDate?: string | null;
    toDate?: string | null;
    leadID?: number;
    companyID?: number;
  }): Promise<any[]> => {
    try {
      const p = {
        fromDate: payload?.fromDate ?? null,
        toDate: payload?.toDate ?? new Date().toISOString().split('T')[0],
        leadID: payload?.leadID ?? 0,
        companyID: payload?.companyID ?? 0,
      };
      const res = await apiClient.post('/OutstandingReport/customerwise', p);
      if (res && res.data) {
        const raw = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.data) ? res.data.data : []);
        return raw.filter((row: any) => row.SrNo !== 999999);
      }
    } catch (err) {
      console.warn('Error fetching customerwise outstanding report:', err);
    }
    return [];
  },

  // GET INVOICE DOCUMENTS (Matches Web CRM InvoiceDocument API)
  getInvoiceDocuments: async (params?: { companyId?: number; leadId?: number }): Promise<InvoiceDocument[]> => {
    try {
      const res = await apiClient.get('/InvoiceDocument', { params });
      if (res && res.data) {
        const raw = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.data) ? res.data.data : []);
        return raw.map((inv: any) => ({
          invoice_Document_ID: inv.invoice_Document_ID || inv.Invoice_Document_ID || inv.id,
          leadID: inv.leadID || inv.LeadID || 0,
          leadName: inv.leadName || inv.LeadName || 'Customer',
          documentDate: inv.documentDate || inv.DocumentDate || '',
          documentNumber: inv.documentNumber || inv.DocumentNumber || '',
          documentAmount: Number(inv.documentAmount ?? inv.DocumentAmount ?? 0),
          dueDate: inv.dueDate || inv.DueDate || undefined,
          pendingamt: Number(inv.pendingamt ?? inv.Pendingamt ?? 0),
          appliedamt: Number(inv.appliedamt ?? inv.Appliedamt ?? 0),
          status: inv.status || inv.Status || 'Overdue',
          remark: inv.remark || inv.Remark || undefined,
          creditProfileID: inv.creditProfileID || inv.CreditProfileID,
          companyID: inv.companyID || inv.CompanyID,
        }));
      }
    } catch (err) {
      console.warn('Error fetching invoice documents:', err);
    }
    return [];
  },

  // GET CREDIT FOLLOW-UPS
  getCreditFollowUps: async (params?: {
    companyId?: number;
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<CreditFollowUp[]> => {
    try {
      const res = await apiClient.get('/CreditFollowUp', { params });
      if (res && res.data) {
        const raw = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.data)
          ? res.data.data
          : [];
        return raw.map((item: any) => ({
          followUpID: item.followUpID || item.FollowUpID || item.id,
          leadID: item.leadID || item.LeadID,
          leadName: item.leadName || item.LeadName || item.customerName || item.CustomerName || 'Customer',
          customerName: item.customerName || item.CustomerName || item.leadName || item.LeadName || 'Customer',
          companyName: item.companyName || item.CompanyName || '',
          companyID: item.companyID || item.CompanyID || 1,
          mobileNo: item.mobileNo || item.MobileNo || item.phone,
          phone: item.phone || item.mobileNo || item.MobileNo,
          followUpDate: item.followUpDate || item.FollowUpDate || '',
          followUpTime: item.followUpTime || item.FollowUpTime,
          followUpType: item.followUpType || item.FollowUpType || 'Call',
          performedBy: item.performedBy || item.PerformedBy,
          outcome: item.outcome || item.Outcome || 'Connected',
          priority: item.priority || item.Priority || 'Medium',
          promiseToPayDate: item.promiseToPayDate || item.PromiseToPayDate,
          promisedAmount: item.promisedAmount ?? item.PromisedAmount ?? 0,
          paymentMode: item.paymentMode || item.PaymentMode,
          nextFollowUpDate: item.nextFollowUpDate || item.NextFollowUpDate,
          nextFollowUpTime: item.nextFollowUpTime || item.NextFollowUpTime,
          reminderBefore: item.reminderBefore || item.ReminderBefore,
          notes: item.notes || item.Notes || '',
          status: item.status || item.Status || 'Pending',
          outstandingBalance: item.outstandingBalance ?? item.OutstandingBalance ?? 0,
          checkInTime: item.checkInTime || item.CheckInTime,
          checkOutTime: item.checkOutTime || item.CheckOutTime,
          visitLocation: item.visitLocation || item.VisitLocation,
          gpsCoordinates: item.gpsCoordinates || item.GPSCoordinates,
          emailSubject: item.emailSubject || item.EmailSubject,
          emailStatus: item.emailStatus || item.EmailStatus,
          whatsAppTemplate: item.whatsAppTemplate || item.WhatsAppTemplate,
          whatsAppStatus: item.whatsAppStatus || item.WhatsAppStatus,
          receiptDocumentID: item.receiptDocumentID || item.ReceiptDocumentID,
          receiptID: item.receiptID || item.ReceiptID,
          remarks: item.notes || item.Notes || item.remarks,
        }));
      }
    } catch (err) {
      console.warn('Error fetching credit follow-ups:', err);
    }
    return [];
  },

  // CREATE CREDIT FOLLOW-UP
  createCreditFollowUp: async (data: Partial<CreditFollowUp>): Promise<any> => {
    try {
      const res = await apiClient.post('/CreditFollowUp', data);
      return res.data;
    } catch (err) {
      console.error('Error creating credit follow-up:', err);
      throw err;
    }
  },

  // UPDATE CREDIT FOLLOW-UP
  updateCreditFollowUp: async (id: number, data: Partial<CreditFollowUp>): Promise<any> => {
    try {
      const res = await apiClient.put(`/CreditFollowUp/${id}`, data);
      return res.data;
    } catch (err) {
      console.error('Error updating credit follow-up:', err);
      throw err;
    }
  },

  // QUICK STATUS UPDATE (PATCH)
  updateCreditFollowUpStatus: async (id: number, status: string): Promise<any> => {
    try {
      const res = await apiClient.patch(`/CreditFollowUp/${id}/status`, { status });
      return res.data;
    } catch (err) {
      console.error('Error updating credit follow-up status:', err);
      throw err;
    }
  },

  // DELETE CREDIT FOLLOW-UP
  deleteCreditFollowUp: async (id: number): Promise<any> => {
    try {
      const res = await apiClient.delete(`/CreditFollowUp/${id}`);
      return res.data;
    } catch (err) {
      console.error('Error deleting credit follow-up:', err);
      throw err;
    }
  },
};

export interface InvoiceDocument {
  invoice_Document_ID: number;
  leadID: number;
  leadName: string;
  documentDate: string;
  documentNumber: string;
  documentAmount: number;
  dueDate?: string;
  pendingamt: number;
  appliedamt: number;
  status: string;
  remark?: string;
  creditProfileID?: number;
  companyID?: number;
}

export interface CreditFollowUp {
  followUpID: number;
  leadID?: number;
  leadName?: string;
  customerName?: string;
  companyName?: string;
  companyID?: number;
  mobileNo?: string;
  phone?: string;
  followUpDate: string;
  followUpTime?: string;
  followUpType?: string;
  performedBy?: string;
  outcome?: string;
  priority?: string;
  promiseToPayDate?: string;
  promisedAmount?: number;
  paymentMode?: string;
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
  reminderBefore?: string;
  notes?: string;
  status: string;
  outstandingBalance?: number;
  checkInTime?: string;
  checkOutTime?: string;
  visitLocation?: string;
  gpsCoordinates?: string;
  emailSubject?: string;
  emailStatus?: string;
  whatsAppTemplate?: string;
  whatsAppStatus?: string;
  receiptDocumentID?: number;
  receiptID?: number;
  remarks?: string;
}
