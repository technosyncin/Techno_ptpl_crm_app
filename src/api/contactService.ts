import { apiClient } from './client';

// ============================================================
// CONTACT MODEL
// ============================================================

export interface Contact {
  contactID: number;
  id?: number;
  establishmentID?: number;

  leadID: number;
  leadId?: number;
  leadName?: string;

  companyID?: number;
  companyId?: number;
  companyName?: string;
  establishmentName?: string;

  firstName?: string;
  lastName?: string;
  fullName?: string;
  contactName?: string;
  contactPerson?: string;

  contactNumber?: string;
  mobileNo?: string;
  phone?: string;

  email?: string;

  position?: string;
  designation?: string;

  city?: string;
  state?: string;
  pincode?: string;
  postalCode?: string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  streetName?: string;
  country?: string;

  gstNo?: string;
  panNo?: string;
  cinNo?: string;
  aadharNo?: string;
  adharNo?: string;

  status?: boolean | string;

  isDefault?: boolean;
  isPrimary?: boolean;

  followUpDate?: string;
  followUpTime?: string;
  combinedFollowUpDateTime?: string;

  createdBy?: number;
  createdDate?: string;

  updatedBy?: number;
  updatedDate?: string;
}

// ============================================================
// FILTER PARAMS
// ============================================================

export interface ContactFilterParams {
  leadID?: number;
  companyID?: number;

  search?: string;

  page?: number;
  pageSize?: number;

  status?: string;
}

// ============================================================
// PAGINATED RESPONSE
// ============================================================

export interface ContactPaginatedResponse {
  data: Contact[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

// ============================================================
// CONTACT SERVICE
// ============================================================

const normalizeContact = (c: any): Contact => {
  const contactName = c.contactName || c.fullName || c.contactPerson || c.leadName || '';
  const fullName = c.fullName || c.contactName || c.contactPerson || c.leadName || '';
  const contactNumber = c.contactNumber || c.mobileNo || c.phone || '';
  const mobileNo = c.mobileNo || c.contactNumber || c.phone || '';
  const position = c.position || c.designation || '';
  const designation = c.designation || c.position || '';
  const address = c.address || c.addressLine1 || c.streetName || '';
  const streetName = c.streetName || c.addressLine1 || c.address || '';
  const aadharNo = c.aadharNo || c.adharNo || '';
  const adharNo = c.adharNo || c.aadharNo || '';
  const companyName = c.companyName || c.establishmentName || '';
  const leadName = c.leadName || fullName || '';
  const status =
    c.status === true ||
    c.status === 1 ||
    String(c.status).toLowerCase() === 'active' ||
    String(c.status).toLowerCase() === 'true'
      ? 'active'
      : String(c.status).toLowerCase() === 'inactive'
      ? 'inactive'
      : c.status || 'active';

  return {
    ...c,
    contactID: Number(c.contactID || c.id || c.establishmentID || 0),
    leadID: Number(c.leadID || c.leadId || 0),
    companyID: c.companyID || c.companyId,
    leadName,
    companyName,
    fullName,
    contactName,
    contactPerson: fullName,
    contactNumber,
    mobileNo,
    phone: contactNumber,
    position,
    designation,
    address,
    streetName,
    addressLine1: streetName,
    city: c.city || '',
    state: c.state || '',
    pincode: c.pincode || c.postalCode || '',
    postalCode: c.postalCode || c.pincode || '',
    gstNo: c.gstNo || '',
    panNo: c.panNo || '',
    cinNo: c.cinNo || '',
    aadharNo,
    adharNo,
    status,
    followUpDate: c.followUpDate || '',
    followUpTime: c.followUpTime || '',
    combinedFollowUpDateTime: c.combinedFollowUpDateTime || '',
  };
};

export const contactService = {

  // ==========================================================
  // GET ALL CONTACTS
  // ==========================================================

  getContacts: async (
    params?: ContactFilterParams
  ): Promise<{
    data: Contact[];
    total: number;
    totalPages: number;
  }> => {

    try {

      const requestParams = {
        leadID: params?.leadID,
        companyID: params?.companyID,
        search: params?.search || undefined,
        page: params?.page || 1,
        pageSize: params?.pageSize || 20,
        status: params?.status || undefined,
      };

      console.log(
        'CONTACT REQUEST PARAMS:',
        requestParams
      );

      const response = await apiClient.get(
        '/Contact',
        {
          params: requestParams,
        }
      );

      console.log(
        'CONTACT RESPONSE:',
        JSON.stringify(
          response.data,
          null,
          2
        )
      );

      const raw = response.data;

      // --------------------------------------------------------
      // PAGINATED RESPONSE
      // --------------------------------------------------------

      if (
        raw?.data &&
        Array.isArray(raw.data)
      ) {

        const total =
          Number(
            raw.totalCount ??
            raw.total ??
            raw.data.length
          ) || 0;

        const pageSize =
          Number(
            raw.pageSize ??
            requestParams.pageSize
          ) || 20;

        const totalPages =
          Number(raw.totalPages) ||
          Math.ceil(total / pageSize) ||
          1;

        return {
          data: raw.data.map(normalizeContact),
          total,
          totalPages,
        };
      }

      // --------------------------------------------------------
      // NORMAL ARRAY RESPONSE
      // --------------------------------------------------------

      if (Array.isArray(raw)) {

        const total = raw.length;

        const pageSize =
          requestParams.pageSize;

        return {
          data: raw.map(normalizeContact),
          total,
          totalPages:
            Math.ceil(
              total / pageSize
            ) || 1,
        };
      }

      return {
        data: [],
        total: 0,
        totalPages: 1,
      };

    } catch (err: any) {

      console.error(
        'ERROR FETCHING CONTACTS'
      );

      console.error(
        'MESSAGE:',
        err?.message
      );

      console.error(
        'STATUS:',
        err?.response?.status
      );

      console.error(
        'DATA:',
        err?.response?.data
      );

      console.error(
        'PARAMS:',
        err?.config?.params
      );

      throw err;
    }
  },

  // ==========================================================
  // GET CONTACT BY ID
  // ==========================================================

  getContactById: async (
    contactID: number
  ): Promise<Contact | null> => {

    try {

      const response =
        await apiClient.get(
          `/Contact/${contactID}`
        );

      return response.data ? normalizeContact(response.data) : null;

    } catch (err: any) {

      console.error(
        'Error fetching contact by id:',
        err?.message
      );

      console.error(
        'Status:',
        err?.response?.status
      );

      console.error(
        'Data:',
        err?.response?.data
      );

      throw err;
    }
  },

  // ==========================================================
  // GET CONTACTS BY LEAD
  // ==========================================================

  getContactsByLead: async (
    leadID: number
  ): Promise<Contact[]> => {

    try {

      const response =
        await apiClient.get(
          `/Contact/lead/${leadID}`
        );

      if (
        Array.isArray(response.data)
      ) {
        return response.data.map(normalizeContact);
      }

      if (
        response.data?.data &&
        Array.isArray(response.data.data)
      ) {
        return response.data.data.map(normalizeContact);
      }

      return [];

    } catch (err: any) {

      console.error(
        'Error fetching contacts by lead:',
        err?.message
      );

      console.error(
        'Status:',
        err?.response?.status
      );

      console.error(
        'Data:',
        err?.response?.data
      );

      throw err;
    }
  },

  // ==========================================================
  // CREATE CONTACT
  // ==========================================================

  createContact: async (
    contactData: Partial<Contact>
  ): Promise<any> => {

    try {

      const response =
        await apiClient.post(
          '/Contact',
          contactData
        );

      return response.data;

    } catch (err: any) {

      console.error(
        'Error creating contact:',
        err?.message
      );

      console.error(
        'Status:',
        err?.response?.status
      );

      console.error(
        'Data:',
        err?.response?.data
      );

      throw err;
    }
  },

  // ==========================================================
  // UPDATE CONTACT
  // ==========================================================

  updateContact: async (
    contactID: number,
    contactData: Partial<Contact>
  ): Promise<any> => {

    try {

      const response =
        await apiClient.put(
          `/Contact/${contactID}`,
          contactData
        );

      return response.data;

    } catch (err: any) {

      console.error(
        'Error updating contact:',
        err?.message
      );

      console.error(
        'Status:',
        err?.response?.status
      );

      console.error(
        'Data:',
        err?.response?.data
      );

      throw err;
    }
  },

  // ==========================================================
  // DELETE CONTACT
  // ==========================================================

  deleteContact: async (
    contactID: number
  ): Promise<any> => {

    try {

      const response =
        await apiClient.delete(
          `/Contact/${contactID}`
        );

      return response.data;

    } catch (err: any) {

      console.error(
        'Error deleting contact:',
        err?.message
      );

      console.error(
        'Status:',
        err?.response?.status
      );

      console.error(
        'Data:',
        err?.response?.data
      );

      throw err;
    }
  },

  // ==========================================================
  // SAVE ALL (ESTABLISHMENT + CONTACTS + ADDRESS + OTHER DETAILS)
  // ==========================================================

  saveAll: async (
    payload: any
  ): Promise<any> => {

    try {

      console.log(
        'CONTACT SERVICE SAVE ALL PAYLOAD:',
        JSON.stringify(payload, null, 2)
      );

      const response =
        await apiClient.post(
          '/Contact/save-all',
          payload
        );

      return response.data;

    } catch (err: any) {

      console.error(
        'Error saving contact (saveAll):',
        err?.message
      );

      console.error(
        'Status:',
        err?.response?.status
      );

      console.error(
        'Data:',
        err?.response?.data
      );

      throw err;
    }
  },

};