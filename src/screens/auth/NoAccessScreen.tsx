import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useMenu } from '../../context/MenuContext';
import { useCompany } from '../../context/CompanyContext';
import { Colors } from '../../theme/colors';

export const NoAccessScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { refreshMenus, loadingMenus } = useMenu();
  const { companies, refreshCompanies, loadingCompanies, isAllCompanies } = useCompany();
  const [refreshing, setRefreshing] = useState(false);

  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');
  const userAny = user as any;
  const userCompanyIds = Array.isArray(userAny?.companyIds) ? userAny.companyIds : [];
  const hasNoCompany = !isAdmin && companies.length === 0 && userCompanyIds.length === 0 && !isAllCompanies;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshMenus(), refreshCompanies()]);
    } finally {
      setRefreshing(false);
    }
  };

  const isLoading = loadingMenus || loadingCompanies || refreshing;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Card */}
      <View style={styles.card}>
        <View style={[styles.iconCircle, hasNoCompany && { backgroundColor: '#fee2e2' }]}>
          <Ionicons
            name={hasNoCompany ? 'business-outline' : 'shield-outline'}
            size={44}
            color={hasNoCompany ? '#ef4444' : '#645695'}
          />
        </View>

        <Text style={styles.title}>
          {hasNoCompany ? 'No Company Assigned' : 'Account Activated'}
        </Text>
        <Text style={styles.subtitle}>
          {hasNoCompany ? 'Company Assignment Pending' : 'Permissions & Company Access Pending'}
        </Text>

        <View style={styles.userBadge}>
          <Ionicons name="person-circle-outline" size={18} color="#645695" />
          <Text style={styles.userBadgeText}>
            {user?.fullName || user?.username || 'User'} ({user?.role || 'User'})
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#0284c7" style={styles.infoIcon} />
          <Text style={styles.infoText}>
            {hasNoCompany
              ? 'Your account is registered, but no company has been assigned to you by the administrator. Please contact your administrator to assign a company in Web CRM before you can access modules and data.'
              : 'Your account is registered. In accordance with Techno CRM security, you can only access modules and data once an administrator assigns company and menu permissions in Web CRM.'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.refreshButtonText}>Check Permissions Again</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" style={{ marginRight: 6 }} />
          <Text style={styles.logoutButtonText}>Sign Out / Switch Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 14,
    fontWeight: '500',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 18,
  },
  userBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#645695',
    marginLeft: 6,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#0369a1',
    lineHeight: 18,
  },
  stepsBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#645695',
    marginRight: 8,
  },
  stepText: {
    fontSize: 12,
    color: '#334155',
  },
  refreshButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#645695',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  logoutButtonText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },
});
