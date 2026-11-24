import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { mastersService, CompanyMaster } from '../api/mastersService';
import { companyService } from '../api/companyService';
import { useAuth } from './AuthContext';
import { SafeStorage } from '../utils/storage';

const COMPANY_STORAGE_KEY = 'crm_selected_company_id';
const COMPANY_CACHE_KEY_PREFIX = 'crm_cached_companies_';

interface CompanyContextType {
  selectedCompanyId: number | null; // null represents "All Companies"
  selectedCompany: CompanyMaster | null;
  companies: CompanyMaster[];
  allCompanies: CompanyMaster[];
  isAllCompanies: boolean;
  loadingCompanies: boolean;
  isCompaniesInitialized: boolean;
  setSelectedCompanyId: (id: number | null) => Promise<void>;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType>({
  selectedCompanyId: null,
  selectedCompany: null,
  companies: [],
  allCompanies: [],
  isAllCompanies: false,
  loadingCompanies: false,
  isCompaniesInitialized: false,
  setSelectedCompanyId: async () => {},
  refreshCompanies: async () => {},
});

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [companies, setCompanies] = useState<CompanyMaster[]>([]);
  const [allCompaniesRaw, setAllCompaniesRaw] = useState<CompanyMaster[]>([]);
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<number | null>(null);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [isCompaniesInitialized, setIsCompaniesInitialized] = useState(false);

  // Exact Web MainLayout fetchCompaniesForUser logic
  const fetchCompanies = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingCompanies(true);
    try {
      // 1. Fetch all companies from DB table Companies
      let fetched: CompanyMaster[] = [];
      try {
        fetched = await companyService.getCompanies({ status: 'all' });
      } catch (err) {
        console.warn('companyService.getCompanies fallback to mastersService:', err);
      }

      if (!fetched || fetched.length === 0) {
        fetched = await mastersService.getCompanies();
      }

      // 2. Normalize and filter active companies (matches Web MainLayout)
      const normalizedCompanies = (fetched || [])
        .map((company: any) => ({
          ...company,
          id: Number(company.companyID || company.id),
          companyID: Number(company.companyID || company.id),
          companyName: company.companyName || company.name || 'Company',
          status: (company.status || 'active').toString().toLowerCase(),
        }))
        .filter(
          (company: any) =>
            !company.status || company.status.toString().toLowerCase() === 'active'
        );

      setAllCompaniesRaw(normalizedCompanies);

      // 3. User company IDs extraction from User Master (Strict Web CRM Parity)
      const userAny = user as any;
      let userCompanyIdNumbers: number[] = [];
      if (userAny?.companyIds && Array.isArray(userAny.companyIds) && userAny.companyIds.length > 0) {
        userCompanyIdNumbers = userAny.companyIds
          .map((id: any) =>
            typeof id === 'object' ? parseInt(id.companyID || id.id, 10) : parseInt(String(id), 10)
          )
          .filter((n: number) => !isNaN(n) && n > 0);
      }

      const userRole = (userAny?.role || userAny?.userRole || '').toString().toLowerCase();
      const isAdmin = userRole.includes('admin') || userRole.includes('super');

      // 4. Bind companies assigned to the user in User Master (Web CRM Parity)
      let userCompanies: CompanyMaster[] = [];
      if (isAdmin) {
        userCompanies = normalizedCompanies;
      } else if (userCompanyIdNumbers.length > 0) {
        userCompanies = normalizedCompanies.filter((company: CompanyMaster) =>
          userCompanyIdNumbers.includes(company.companyID)
        );
      } else {
        // NON-ADMIN WITH NO COMPANIES ASSIGNED -> userCompanies is strictly empty []!
        userCompanies = [];
      }

      setCompanies(userCompanies);

      // Cache user companies for zero-latency startup on app reboot
      const uId = userAny?.id || userAny?.userID || 0;
      if (uId) {
        SafeStorage.setItem(
          `${COMPANY_CACHE_KEY_PREFIX}${uId}`,
          JSON.stringify({
            userCompanies,
            allCompanies: normalizedCompanies,
          })
        ).catch(() => {});
      }

      // 5. AUTO-SELECT DEFAULT COMPANY (From User Master)
      const userDefaultId =
        userAny?.defaultCompanyId != null && userCompanyIdNumbers.includes(Number(userAny.defaultCompanyId))
          ? Number(userAny.defaultCompanyId)
          : (userCompanyIdNumbers.length > 0 ? userCompanyIdNumbers[0] : null);

      let targetId: number | null = null;
      if (userCompanies.length > 0) {
        if (userDefaultId != null) {
          const parsedDefault = parseInt(String(userDefaultId), 10);
          if (!isNaN(parsedDefault) && userCompanies.some((c) => c.companyID === parsedDefault)) {
            targetId = parsedDefault;
          }
        }

        // If default company was not found, check saved selection
        if (targetId === null) {
          const saved = await SafeStorage.getItem(COMPANY_STORAGE_KEY);
          if (saved === 'all') {
            targetId = null;
          } else if (saved) {
            const parsedSaved = parseInt(saved, 10);
            if (!isNaN(parsedSaved) && userCompanies.some((c) => c.companyID === parsedSaved)) {
              targetId = parsedSaved;
            }
          }
        }

        // If still null and saved was not explicitly 'all', fallback to the first assigned company
        if (targetId === null) {
          const saved = await SafeStorage.getItem(COMPANY_STORAGE_KEY);
          if (saved !== 'all' && userCompanies.length > 0) {
            targetId = userCompanies[0].companyID;
          }
        }
      } else {
        // No companies assigned to this user -> defaults to All Companies
        targetId = null;
      }

      setSelectedCompanyIdState(targetId);
      if (targetId !== null) {
        await SafeStorage.setItem(COMPANY_STORAGE_KEY, String(targetId));
      } else {
        await SafeStorage.setItem(COMPANY_STORAGE_KEY, 'all');
      }
    } catch (err) {
      console.warn('Error fetching companies in CompanyProvider:', err);
    } finally {
      setLoadingCompanies(false);
      setIsCompaniesInitialized(true);
    }
  }, [isAuthenticated, user]);

  // Instant hydration from local cache on startup
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setCompanies([]);
      setAllCompaniesRaw([]);
      setSelectedCompanyIdState(null);
      setIsCompaniesInitialized(false);
      return;
    }

    let isMounted = true;
    const hydrateFromCache = async () => {
      try {
        const uId = user.id || (user as any).userID || 0;
        const cacheKey = `${COMPANY_CACHE_KEY_PREFIX}${uId}`;
        const cachedStr = await SafeStorage.getItem(cacheKey);
        if (cachedStr && isMounted) {
          const cachedData = JSON.parse(cachedStr);
          if (Array.isArray(cachedData?.userCompanies) && cachedData.userCompanies.length > 0) {
            setCompanies(cachedData.userCompanies);
            setAllCompaniesRaw(cachedData.allCompanies || cachedData.userCompanies);
            setIsCompaniesInitialized(true);
          }
        }
      } catch (err) {
        console.warn('Error hydrating cached companies:', err);
      }
    };

    hydrateFromCache();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.id, (user as any)?.userID]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCompanies();
    } else {
      setCompanies([]);
      setAllCompaniesRaw([]);
      setSelectedCompanyIdState(null);
      setIsCompaniesInitialized(false);
    }
  }, [isAuthenticated, fetchCompanies]);

  const userRole = ((user as any)?.role || (user as any)?.userRole || '').toString().toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');

  const setSelectedCompanyId = async (id: number | null) => {
    setSelectedCompanyIdState(id);
    if (id !== null) {
      await SafeStorage.setItem(COMPANY_STORAGE_KEY, String(id));
    } else {
      await SafeStorage.setItem(COMPANY_STORAGE_KEY, 'all');
    }
  };

  const isAllCompanies = selectedCompanyId === null;

  const selectedCompany: CompanyMaster | null = isAllCompanies
    ? { companyID: 0, companyName: 'All Companies' }
    : companies.find((c) => c.companyID === selectedCompanyId) ||
      (companies.length > 0 ? companies[0] : { companyID: 0, companyName: 'All Companies' });

  return (
    <CompanyContext.Provider
      value={{
        selectedCompanyId,
        selectedCompany,
        companies,
        allCompanies: allCompaniesRaw.length > 0 ? allCompaniesRaw : companies,
        isAllCompanies,
        loadingCompanies,
        isCompaniesInitialized,
        setSelectedCompanyId,
        refreshCompanies: fetchCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => useContext(CompanyContext);
