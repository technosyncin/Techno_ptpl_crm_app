import { apiClient } from './client';

export interface OutstandingRequestPayload {
  fromDate?: string | null;
  toDate?: string | null;
  leadID?: number | null;
  companyID?: number | null;
}

export interface OutstandingSummaryMetrics {
  totalOutstanding: number;
  totalOverdue: number;
  totalCurrent: number;
  totalCustomers: number;
  avgAgingDays: number;
  currentPct?: number;
  days30Pct?: number;
  days60Pct?: number;
  days90Pct?: number;
  days91_120Pct?: number;
  days120Pct?: number;
}

export interface OutstandingAgingBuckets {
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days91_120?: number;
  days120: number;
}

export interface CustomerWiseItem {
  srNo: number;
  id: number;
  leadId: number;
  name: string;
  totalOutstanding: number;
  totalOverdue: number;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days91_120?: number;
  days120: number;
}

export interface DetailedViewItem {
  id: number;
  documentReference: string;
  documentType: string;
  documentDate: string;
  dueDate?: string | null;
  customerName: string;
  documentAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  overdueDays: number;
  agingBucket: string;
  leadId?: number;
}

export interface FollowUpReportItem {
  followUpID?: number;
  leadID?: number;
  leadName?: string;
  followUpDate?: string;
  followUpType?: string;
  performedBy?: string;
  outcome?: string;
  notes?: string;
  nextFollowUpDate?: string;
  status?: string;
  promiseToPayDate?: string;
  visitLocation?: string;
}

class ReportService {
  async getOutstandingSummary(payload: OutstandingRequestPayload) {
    const res = await apiClient.post('/OutstandingReport/summary', payload);
    return res.data;
  }

  async getOutstandingCustomerWise(payload: OutstandingRequestPayload) {
    const res = await apiClient.post('/OutstandingReport/customerwise', payload);
    return res.data;
  }

  async getOutstandingDetails(payload: OutstandingRequestPayload) {
    const res = await apiClient.post('/OutstandingReport/details', payload);
    return res.data;
  }

  async getOutstandingFollowUp(payload: OutstandingRequestPayload) {
    const res = await apiClient.post('/OutstandingReport/followup', payload);
    return res.data;
  }
}

export const reportService = new ReportService();
export default reportService;
