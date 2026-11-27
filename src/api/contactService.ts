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
  // SQL/API response मधील PascalCase आणि camelCase दोन्ही support
  const get = (...keys: string[]) => {
    for (const key of keys) {
      if (c?.[key] !== undefined && c?.[key] !== null) {
        return c[key];
      }
    }
    return '';
  };

  const contactID = Number(
    get('contactID', 'ContactID', 'id', 'Id', 'establishmentID', 'EstablishmentID')
  ) || 0;

  const fullName = get(
    'fullName', 'FullName', 'contactName', 'ContactName',
    'contactPerson', 'ContactPerson', 'leadName', 'LeadName'
  );

  const contactNumber = get(
    'contactNumber', 'ContactNumber', 'mobileNo', 'MobileNo', 'phone', 'Phone'
  );

  const position = get('position', 'Position', 'designation', 'Designation');
  const streetName = get(
    'streetName', 'StreetName', 'addressLine1', 'AddressLine1', 'address', 'Address'
  );

  const aadharNo = get('aadharNo', 'AadharNo', 'adharNo', 'AdharNo');

  const rawStatus = get('status', 'Status');
  const status = (
    rawStatus === true ||
    rawStatus === 1 ||
    String(rawStatus).toLowerCase() === 'active' ||
    String(rawStatus).toLowerCase() === 'true'
  )
    ? 'active'
    : String(rawStatus).toLowerCase() === 'inactive' ||
      rawStatus === false ||
      rawStatus === 0
      ? 'inactive'
      : 'active';

  return {
    ...c,
    contactID,
    id: contactID,
    leadID: Number(get('leadID', 'LeadID', 'leadId', 'LeadId')) || 0,
    leadId: Number(get('leadID', 'LeadID', 'leadId', 'LeadId')) || 0,
    leadName: get('leadName', 'LeadName'),
    companyID: Number(get('companyID', 'CompanyID', 'companyId', 'CompanyId')) || 0,
    companyName: get('companyName', 'CompanyName', 'establishmentName', 'EstablishmentName'),

    fullName,
    contactName: fullName,
    contactPerson: fullName,

    contactNumber,
    mobileNo: contactNumber,
    phone: contactNumber,

    email: get('email', 'Email'),
    position,
    designation: position,

    streetName,
    addressLine1: streetName,
    address: streetName,
    city: get('city', 'City'),
    state: get('state', 'State'),
    pincode: String(get('pincode', 'Pincode', 'postalCode', 'PostalCode')),

    gstNo: get('gstNo', 'GSTNo'),
    panNo: get('panNo', 'PANNo'),
    cinNo: get('cinNo', 'CINNo'),
    aadharNo,
    adharNo: aadharNo,

    status,
    isDefault:
      get('isDefault', 'IsDefault', 'isPrimary', 'IsPrimary') === true ||
      get('isDefault', 'IsDefault', 'isPrimary', 'IsPrimary') === 1,

    followUpDate: get('followUpDate', 'FollowUpDate'),
    followUpTime: get('followUpTime', 'FollowUpTime'),
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
    const response = await apiClient.get(`/Contact/${contactID}`);

    console.log(
      'GET CONTACT BY ID RAW RESPONSE:',
      JSON.stringify(response.data, null, 2)
    );

    const raw = response.data;

    // Extract actual contact object from API response
    const contactData =
      raw?.data?.data ??
      raw?.data ??
      raw?.result ??
      raw;

    if (!contactData || typeof contactData !== 'object') {
      console.warn('Contact details not found in API response');
      return null;
    }

    console.log(
      'GET CONTACT BY ID ACTUAL DATA:',
      JSON.stringify(contactData, null, 2)
    );

    return normalizeContact(contactData);

  } catch (err: any) {
    console.error('Error fetching contact by id:', err?.message);
    console.error('Status:', err?.response?.status);
    console.error('Data:', err?.response?.data);
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
  getChildContacts: async (contactID: number): Promise<Contact[]> => {
  try {
    const response = await apiClient.get(
      `/Contact/${contactID}/contacts`
    );

    const raw = response.data;
    const records = raw?.data ?? raw?.result ?? raw;

    return Array.isArray(records)
      ? records.map(normalizeContact)
      : [];
  } catch (err: any) {
    console.error('Error fetching child contacts:', err?.message);
    console.error('Data:', err?.response?.data);
    throw err;
  }
},

};