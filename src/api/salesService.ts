import { apiClient } from './client';

export interface SalesDashboardMetrics {
  totalLeads: number;
  activeLeads: number;
  convertedLeads: number;
  lostLeads: number;
  conversionRate: number;
  totalPipelineValue: number;
  wonValue: number;
  todayFollowUps: number;
  pendingTasks: number;
  totalQuotations?: number;
  quotationsValue?: number;
  quotationsSent?: number;
}

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
}

export interface SalesFollowUp {
  followUpID: number;
  leadID?: number;
  leadName?: string;
  customerName?: string;
  companyName?: string;
  companyID?: number;
  mobileNo?: string;
  phone?: string;
  city?: string;
  followUpDate: string;
  followUpTime?: string;
  followUpType?: string;
  callPurpose?: string;
  callPurposeID?: number;
  outcome?: string;
  outcomeID?: number;
  priority?: string;
  status: string;
  remarks?: string;
  assignedTo?: number;
  assignedToName?: string;
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
  reminderBefore?: string;
  performedBy?: string;
  checkInTime?: string;
  checkOutTime?: string;
  visitLocation?: string;
  gpsCoordinates?: string;
  emailSubject?: string;
  emailStatus?: string;
  whatsAppTemplate?: string;
  whatsAppStatus?: string;
  leadSourceID?: number | null;
  leadSourceName?: string;
  source?: string;
}

export const salesService = {
  // GET ALL QUOTATIONS (matches Desktop quotationService.getAllQuotations)
  getQuotations: async (params?: {
    companyId?: number;
    search?: string;
    page?: number;
    pageSize?: number;
    status?: string;
  }): Promise<Quotation[]> => {
    try {
      const response = await apiClient.get('/Quotation', { params });
      if (response && response.data) {
        const raw = Array.isArray(response.data)
          ? response.data
          : response.data.data || response.data.quotations;
        if (Array.isArray(raw)) {
          return raw.map((q: any) => ({
            quotationId: q.quotationID || q.QuotationID || q.quotationId || q.id,
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
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching quotations:', err);
    }
    return [];
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

  // CREATE QUOTATION (matches Desktop quotationService.createQuotation)
  createQuotation: async (quotationData: any): Promise<any> => {
    try {
      const response = await apiClient.post('/Quotation', quotationData);
      return response.data;
    } catch (err) {
      console.error('Error creating quotation:', err);
      throw err;
    }
  },

  // UPDATE QUOTATION (matches Desktop quotationService.updateQuotation)
  updateQuotation: async (quotationId: number, quotationData: any): Promise<any> => {
    try {
      const response = await apiClient.put(`/Quotation/${quotationId}`, quotationData);
      return response.data;
    } catch (err) {
      console.error('Error updating quotation:', err);
      throw err;
    }
  },

  // DELETE QUOTATION (matches Desktop quotationService.deleteQuotation)
  deleteQuotation: async (quotationId: number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/Quotation/${quotationId}`);
      return response.data;
    } catch (err) {
      console.error('Error deleting quotation:', err);
      throw err;
    }
  },

  // GET SALES FOLLOW-UPS (matches Web followUpService.getActiveQueue with assignedTo & isAdmin user filtering)
  getSalesFollowUps: async (companyId?: number, assignedTo?: number, isAdmin?: boolean): Promise<SalesFollowUp[]> => {
    try {
      const params: any = {};
      if (companyId) params.companyId = companyId;
      if (assignedTo) params.assignedTo = assignedTo;
      if (isAdmin !== undefined) params.isAdmin = isAdmin;
      
      // Try active-queue first (matches Web CRM)
      let response: any = null;
      try {
        response = await apiClient.get('/SalesFollowUp/active-queue', { params });
      } catch {
        response = await apiClient.get('/SalesFollowUp', { params });
      }

      if (response && response.data) {
        const raw = Array.isArray(response.data) ? response.data : (response.data.data || []);
        if (Array.isArray(raw)) {
          return raw
            // Strictly exclude quotations so only true customer/lead follow-ups show (same as web)
            .filter((f: any) => {
              const purpose = String(f.callPurpose || f.CallPurpose || f.followUpType || f.FollowUpType || '').toLowerCase();
              const notes = String(f.remarks || f.Remarks || f.notes || f.Notes || '').toLowerCase();
              const hasQuoteId = f.quotationID || f.QuotationID;
              if (hasQuoteId || purpose.includes('quotation') || notes.includes('quotation')) return false;

              // Web Parity: If user is not admin, only show follow-ups assigned to or created by this user
              if (isAdmin === false && assignedTo) {
                const itemAssigned = f.assignedTo || f.AssignedTo || f.leadAssignedTo || f.LeadAssignedTo;
                const itemCreated = f.createdBy || f.CreatedBy || f.leadCreatedBy || f.LeadCreatedBy;
                const matchAssigned = itemAssigned ? Number(itemAssigned) === Number(assignedTo) : false;
                const matchCreated = itemCreated ? Number(itemCreated) === Number(assignedTo) : false;
                return matchAssigned || matchCreated;
              }

              return true;
            })
            .map((f: any) => ({
              followUpID: f.lastFollowUpID || f.LastFollowUpID || f.followUpID || f.FollowUpID || f.leadID || f.LeadID || f.id,
              leadID: f.leadID || f.LeadID,
              leadName: f.leadName || f.LeadName || f.customerName || 'Lead',
              customerName: f.customerName || f.CustomerName || f.leadName || f.LeadName || 'Customer',
              companyName: f.companyName || f.CompanyName || '',
              companyID: f.companyID || f.CompanyID,
              city: f.city || f.City || '',
              phone: f.mobileNo || f.phone || f.Phone,
              mobileNo: f.mobileNo || f.phone || f.Phone,
              followUpDate: f.followUpDate || f.FollowUpDate || f.dueDate || f.DueDate || '',
              followUpTime: f.followUpTime || f.FollowUpTime || '10:00 AM',
              followUpType: f.followUpType || f.FollowUpType || 'Call',
              callPurpose: f.callPurpose || f.CallPurpose || f.purpose || f.lastOutcome || 'Follow-up',
              outcome: f.outcome || f.Outcome || f.lastOutcome || f.status || 'Pending',
              priority: f.priority || f.Priority || 'Medium',
              status: f.status || f.Status || 'Pending',
              remarks: f.lastNotes || f.LastNotes || f.remarks || f.Remarks || f.notes,
              assignedTo: f.assignedTo || f.AssignedTo || f.leadAssignedTo || f.LeadAssignedTo,
              createdBy: f.createdBy || f.CreatedBy || f.leadCreatedBy || f.LeadCreatedBy,
              assignedToName: f.assignedToName || f.AssignedToName,
              nextFollowUpDate: f.nextFollowUpDate || f.NextFollowUpDate,
              nextFollowUpTime: f.nextFollowUpTime || f.NextFollowUpTime,
              reminderBefore: f.reminderBefore || f.ReminderBefore || '30 Minutes',
              performedBy: f.performedBy || f.PerformedBy,
              checkInTime: f.checkInTime || f.CheckInTime,
              checkOutTime: f.checkOutTime || f.CheckOutTime,
              visitLocation: f.visitLocation || f.VisitLocation,
              gpsCoordinates: f.gpsCoordinates || f.GPSCoordinates,
              emailSubject: f.emailSubject || f.EmailSubject,
              emailStatus: f.emailStatus || f.EmailStatus,
              whatsAppTemplate: f.whatsAppTemplate || f.WhatsAppTemplate,
              whatsAppStatus: f.whatsAppStatus || f.WhatsAppStatus,
              leadSourceID: f.leadSourceID || f.LeadSourceID || null,
              leadSourceName: f.leadSourceName || f.LeadSourceName || '',
              source: f.leadSourceName || f.LeadSourceName || '',
            }));
        }
      }
    } catch (err) {
      console.error('Error fetching sales follow-ups:', err);
    }
    return [];
  },

  // CREATE SALES FOLLOW-UP (matches Desktop followUpService.createFollowUp)
  createSalesFollowUp: async (followUpData: any): Promise<any> => {
    try {
      const response = await apiClient.post('/SalesFollowUp', followUpData);
      return response.data;
    } catch (err) {
      console.error('Error creating sales follow-up:', err);
      throw err;
    }
  },

  // UPDATE SALES FOLLOW-UP
  updateSalesFollowUp: async (id: number, followUpData: any): Promise<any> => {
    try {
      const response = await apiClient.put(`/SalesFollowUp/${id}`, followUpData);
      return response.data;
    } catch (err) {
      console.error('Error updating sales follow-up:', err);
      throw err;
    }
  },

  // UPDATE SALES FOLLOW-UP STATUS (PATCH)
  updateFollowUpStatus: async (id: number, status: string): Promise<any> => {
    try {
      const response = await apiClient.patch(`/SalesFollowUp/${id}/status`, { status });
      return response.data;
    } catch (err) {
      console.error('Error updating follow-up status:', err);
      throw err;
    }
  },

  // UPDATE LEAD STATUS FROM FOLLOW-UP (PATCH)
  updateLeadFollowUpStatus: async (leadId: number, status: string): Promise<any> => {
    try {
      const response = await apiClient.patch(`/SalesFollowUp/lead-status/${leadId}`, { status });
      return response.data;
    } catch (err) {
      console.error('Error updating lead follow-up status:', err);
      throw err;
    }
  },

  // DELETE SALES FOLLOW-UP
  deleteSalesFollowUp: async (id: number): Promise<any> => {
    try {
      const response = await apiClient.delete(`/SalesFollowUp/${id}`);
      return response.data;
    } catch (err) {
      console.error('Error deleting sales follow-up:', err);
      throw err;
    }
  },

  // GET CUSTOMER FOLLOW-UP HISTORY BY LEAD ID (matches Desktop / Web getCustomerFollowUps)
  getCustomerFollowUps: async (leadId: number): Promise<SalesFollowUp[]> => {
    try {
      let response: any = null;
      try {
        response = await apiClient.get(`/SalesFollowUp/bylead/${leadId}`);
      } catch {
        response = await apiClient.get('/SalesFollowUp', { params: { leadId } });
      }

      if (response && response.data) {
        const raw = Array.isArray(response.data) ? response.data : (response.data.data || []);
        if (Array.isArray(raw)) {
          return raw.map((f: any) => ({
            followUpID: f.followUpID || f.FollowUpID || f.id,
            leadID: f.leadID || f.LeadID || leadId,
            leadName: f.leadName || f.LeadName || 'Lead',
            customerName: f.customerName || f.CustomerName || f.leadName || 'Customer',
            companyName: f.companyName || f.CompanyName || '',
            companyID: f.companyID || f.CompanyID,
            city: f.city || f.City || '',
            leadSourceID: f.leadSourceID || f.LeadSourceID || null,
            leadSourceName: f.leadSourceName || f.LeadSourceName || '',
            source: f.leadSourceName || f.LeadSourceName || '',
            phone: f.mobileNo || f.phone || f.Phone,
            mobileNo: f.mobileNo || f.phone || f.Phone,
            followUpDate: f.followUpDate || f.FollowUpDate || new Date().toISOString(),
            followUpTime: f.followUpTime || f.FollowUpTime || '10:00 AM',
            followUpType: f.followUpType || f.FollowUpType || 'Call',
            callPurpose: f.callPurpose || f.CallPurpose || f.outcome || 'Follow-up',
            outcome: f.outcome || f.Outcome || f.status || 'Connected',
            priority: f.priority || f.Priority || 'Medium',
            status: f.status || f.Status || 'Pending',
            remarks: f.notes || f.Notes || f.remarks || f.Remarks,
            assignedTo: f.assignedTo || f.AssignedTo,
            assignedToName: f.performedBy || f.PerformedBy || f.assignedToName,
            performedBy: f.performedBy || f.PerformedBy,
            nextFollowUpDate: f.nextFollowUpDate || f.NextFollowUpDate,
            nextFollowUpTime: f.nextFollowUpTime || f.NextFollowUpTime,
            reminderBefore: f.reminderBefore || f.ReminderBefore || '30 Minutes',
            checkInTime: f.checkInTime || f.CheckInTime,
            checkOutTime: f.checkOutTime || f.CheckOutTime,
            visitLocation: f.visitLocation || f.VisitLocation,
            gpsCoordinates: f.gpsCoordinates || f.GPSCoordinates,
            emailSubject: f.emailSubject || f.EmailSubject,
            emailStatus: f.emailStatus || f.EmailStatus,
            whatsAppTemplate: f.whatsAppTemplate || f.WhatsAppTemplate,
            whatsAppStatus: f.whatsAppStatus || f.WhatsAppStatus,
            attachment: f.attachment || f.Attachment,
          }));
        }
      }
    } catch (err) {
      console.warn('Error fetching customer follow-ups:', err);
    }
    return [];
  },

  // GET SALES METRICS (matches Web salesDashboardService with user-metrics support)
  getSalesMetrics: async (companyId?: number, userId?: number): Promise<SalesDashboardMetrics> => {
    try {
      const params: any = {};
      if (companyId) params.companyId = companyId;
      if (userId) params.userId = userId;

      let response;
      try {
        if (userId) {
          response = await apiClient.get('/SalesDashboard/user-metrics', { params });
        } else {
          response = await apiClient.get('/SalesDashboard', { params });
        }
      } catch {
        try {
          response = await apiClient.get('/SalesAdminDashboard', { params });
        } catch {
          response = await apiClient.get('/Dashboard/summary');
        }
      }

      if (response && response.data) {
        const d = response.data;
        const s = d.salesMetrics || d.stats || d;
        return {
          totalLeads: s.totalLeads ?? s.TotalLeads ?? d.totalLeads ?? 0,
          activeLeads: s.activeLeads ?? s.ActiveLeads ?? d.activeLeads ?? 0,
          convertedLeads: s.convertedLeads ?? s.ConvertedLeads ?? s.ordersWon ?? d.convertedLeads ?? d.wonLeads ?? 0,
          lostLeads: s.lostLeads ?? s.LostLeads ?? d.lostLeads ?? 0,
          conversionRate: s.conversionRate ?? s.ConversionRate ?? d.conversionRate ?? 0,
          totalPipelineValue: s.totalPipelineValue ?? s.TotalPipelineValue ?? s.salesValue ?? d.totalPipelineValue ?? 0,
          wonValue: s.wonValue ?? s.WonValue ?? d.wonValue ?? 0,
          todayFollowUps: s.todayFollowUps ?? s.TodayFollowUps ?? d.todayFollowUps ?? d.followUpSummary?.todaysFollowups ?? 0,
          pendingTasks: s.pendingTasks ?? s.PendingTasks ?? d.pendingTasks ?? 0,
          totalQuotations: d.totalQuotations ?? s.quotationsSent ?? s.totalQuotations ?? d.stats?.quotationsSent ?? 0,
          quotationsValue: d.quotationsValue ?? s.totalPipelineValue ?? s.salesValue ?? d.totalPipelineValue ?? 0,
          quotationsSent: s.quotationsSent ?? d.quotationsSent ?? d.stats?.quotationsSent ?? 0,
        };
      }
    } catch (err) {
      console.warn('Error fetching sales metrics:', err);
    }
    return {
      totalLeads: 0,
      activeLeads: 0,
      convertedLeads: 0,
      lostLeads: 0,
      conversionRate: 0,
      totalPipelineValue: 0,
      wonValue: 0,
      todayFollowUps: 0,
      pendingTasks: 0,
      totalQuotations: 0,
      quotationsValue: 0,
      quotationsSent: 0,
    };
  },
};
