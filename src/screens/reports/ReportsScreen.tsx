import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { userPermissionService } from '../../api/userPermissionService';
import { Colors } from '../../theme/colors';

interface ReportsScreenProps {
  navigation: any;
}

export interface ReportTileItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
  badge?: string;
}

// Maps action/name to mobile screen
const getReportScreen = (action?: string, name?: string): string => {
  const act = (action || '').toLowerCase().trim();
  const nm = (name || '').toLowerCase().trim();

  if (act.includes('visit') || nm.includes('visit')) {
    return 'VisitReport';
  }
  if (
    act.includes('outstanding') ||
    nm.includes('outstanding') ||
    act.includes('credit') ||
    nm.includes('credit')
  ) {
    return 'OutstandingReports';
  }
  if (act.includes('call') || nm.includes('call')) {
    return 'Activities';
  }

  return 'OutstandingReports';
};

// Maps icon/name to Ionicons glyph
const getReportIcon = (iconClass?: string, name?: string): keyof typeof Ionicons.glyphMap => {
  const ic = (iconClass || '').toLowerCase().trim();
  const nm = (name || '').toLowerCase().trim();

  if (nm.includes('visit') || ic.includes('geo') || ic.includes('location')) return 'location';
  if (
    nm.includes('outstanding') ||
    nm.includes('credit') ||
    ic.includes('wallet') ||
    ic.includes('cash')
  )
    return 'wallet';
  if (nm.includes('call') || ic.includes('telephone') || ic.includes('phone')) return 'call';
  if (nm.includes('sales') || ic.includes('funnel') || ic.includes('graph')) return 'trending-up';
  if (nm.includes('lead') || ic.includes('person')) return 'people';

  return 'document-text';
};

// Generates dynamic subtitle
const getReportSubtitle = (name?: string): string => {
  const nm = (name || '').toLowerCase().trim();
  if (nm.includes('outstanding')) return 'Aging & Party Receivables';
  if (nm.includes('visit')) return 'Client Field Visits & Logs';
  if (nm.includes('call')) return 'Client Calls & Follow-up Logs';
  return 'Analytics & Summary Data';
};

export const ReportsScreen: React.FC<ReportsScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { companies } = useCompany();

  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');

  const [search, setSearch] = useState('');
  const [authorizedReports, setAuthorizedReports] = useState<ReportTileItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 100% Dynamic Loader: Fetches live authorized report menus directly from API/Database
  const loadDynamicReports = useCallback(async () => {
    if (!isAdmin && companies.length === 0) {
      setAuthorizedReports([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const uId = Number(user?.id || (user as any)?.userID || 0);
      const res = await userPermissionService.getUserPermissions(uId);

      if (res && res.menus && res.menus.length > 0) {
        const dynamicList: ReportTileItem[] = [];
        const seenIds = new Set<number>();
        const seenNames = new Set<string>();

        res.menus.forEach((parent) => {
          const parentName = (parent.menuName || '').toLowerCase().trim();
          const isParentReports = parentName.includes('report');
          const isParentAuth = !!parent.auth;

          // 1. Submenus under 'Reports' parent module
          if (isParentReports && parent.children && parent.children.length > 0) {
            parent.children.forEach((child) => {
              // Strictly require database auth
              if (!child.auth) return;

              const cleanName = (child.menuName || '').trim();
              const lowerName = cleanName.toLowerCase();
              if (seenIds.has(child.menuID) || seenNames.has(lowerName)) return;

              seenIds.add(child.menuID);
              seenNames.add(lowerName);

              dynamicList.push({
                id: String(child.menuID),
                title: cleanName,
                subtitle: getReportSubtitle(cleanName),
                icon: getReportIcon(child.icon, cleanName),
                screen: getReportScreen(child.action, cleanName),
                badge: 'Report',
              });
            });
          }

          // 2. Standalone root Report menu
          if (isParentReports && (!parent.children || parent.children.length === 0)) {
            if (isParentAuth) {
              const cleanName = (parent.menuName || '').trim();
              const lowerName = cleanName.toLowerCase();
              if (!seenIds.has(parent.menuID) && !seenNames.has(lowerName)) {
                seenIds.add(parent.menuID);
                seenNames.add(lowerName);

                dynamicList.push({
                  id: String(parent.menuID),
                  title: cleanName,
                  subtitle: getReportSubtitle(cleanName),
                  icon: getReportIcon(parent.icon, cleanName),
                  screen: getReportScreen(parent.action, cleanName),
                  badge: 'Report',
                });
              }
            }
          }

          // 3. Report-specific child menus under other modules (e.g. Outstanding Reports under Credit)
          if (!isParentReports && parent.children && parent.children.length > 0) {
            parent.children.forEach((child) => {
              const isChildAuth = isAdmin || isParentAuth || !!child.auth;
              if (!isChildAuth) return;

              const cleanName = (child.menuName || '').trim();
              const lowerName = cleanName.toLowerCase();
              const childAct = (child.action || '').toLowerCase();

              const isReportChild =
                lowerName.includes('report') ||
                lowerName.includes('outstanding') ||
                lowerName.includes('visit') ||
                childAct.includes('report') ||
                childAct.includes('outstanding') ||
                childAct.includes('visit');

              if (isReportChild && !seenIds.has(child.menuID) && !seenNames.has(lowerName)) {
                seenIds.add(child.menuID);
                seenNames.add(lowerName);

                dynamicList.push({
                  id: String(child.menuID),
                  title: cleanName,
                  subtitle: getReportSubtitle(cleanName),
                  icon: getReportIcon(child.icon, cleanName),
                  screen: getReportScreen(child.action, cleanName),
                  badge: 'Report',
                });
              }
            });
          }
        });

        setAuthorizedReports(dynamicList);
      } else {
        setAuthorizedReports([]);
      }
    } catch (err) {
      console.warn('Error dynamically loading reports from API:', err);
      setAuthorizedReports([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, companies.length]);

  useEffect(() => {
    loadDynamicReports();
  }, [loadDynamicReports]);

  // Refresh dynamic reports whenever the tab gains focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadDynamicReports();
    });
    return unsubscribe;
  }, [navigation, loadDynamicReports]);

  const filteredTiles = authorizedReports.filter((tile) => {
    if (!search) return true;
    const q = search.toLowerCase().trim();
    return (
      tile.title.toLowerCase().includes(q) ||
      tile.subtitle.toLowerCase().includes(q)
    );
  });

  const handleTilePress = (item: ReportTileItem) => {
    navigation.navigate(item.screen);
  };

  return (
    <View style={styles.container}>
      {/* Top Navbar without back button (Main Tab) */}
      <Header title="Reports" showBack={false} currentRoute="ReportsTab" />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search reports..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Section Heading */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderIconBox}>
            <Ionicons name="layers" size={15} color="#645695" />
          </View>
          <Text style={styles.sectionHeadingTitle}>ALL REPORTS</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#645695" />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        ) : (
          /* Reports Tiles Row */
          <View style={styles.tilesRow}>
            {filteredTiles.map((tile) => (
              <TouchableOpacity
                key={tile.id}
                style={styles.gridTile}
                onPress={() => handleTilePress(tile)}
                activeOpacity={0.7}
              >
                <View style={styles.tileIconBox}>
                  <Ionicons name={tile.icon} size={22} color="#645695" />
                </View>
                <Text style={styles.tileTitle} numberOfLines={2}>
                  {tile.title}
                </Text>
                <Text style={styles.tileSubtitle} numberOfLines={1}>
                  {tile.subtitle}
                </Text>
                <View style={styles.openPill}>
                  <Text style={styles.openPillText}>Open Report</Text>
                  <Ionicons name="arrow-forward" size={11} color="#645695" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!loading && filteredTiles.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name={search ? 'search-outline' : 'shield-outline'} size={36} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>
              {search ? 'No Reports Found' : 'No Reports Assigned'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {search
                ? 'Try changing your search term.'
                : 'No report permissions have been assigned to your account yet. Please contact your administrator.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#645695',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
    padding: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
    paddingHorizontal: 2,
  },
  sectionHeaderIconBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.3,
  },
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridTile: {
    width: '48.4%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8ecf4',
    shadowColor: '#645695',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 130,
  },
  tileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 3,
  },
  tileSubtitle: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 10,
  },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ede9fe',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  openPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#645695',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
});
