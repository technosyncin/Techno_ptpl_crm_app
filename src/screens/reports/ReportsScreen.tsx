import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { Colors } from '../../theme/colors';

interface ReportsScreenProps {
  navigation: any;
}

interface ReportTileItem {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
  badge?: string;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({ navigation }) => {
  const [search, setSearch] = useState('');

  const reportTiles: ReportTileItem[] = [
    {
      id: 'outstanding',
      title: 'Outstanding Report',
      subtitle: 'Aging & Party Receivables',
      icon: 'wallet',
      screen: 'OutstandingReports',
      badge: 'Ledger',
    },
    {
      id: 'visit',
      title: 'Visit Report',
      subtitle: 'Client Field Visits & Logs',
      icon: 'location',
      screen: 'VisitReport',
      badge: 'Visits',
    },
  ];

  const filteredTiles = reportTiles.filter((tile) => {
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
            placeholder="Search reports (e.g. Outstanding, Visit)..."
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

        {/* Reports Tiles Row */}
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

        {filteredTiles.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="search-outline" size={36} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Reports Found</Text>
            <Text style={styles.emptySubtitle}>Try changing your search term.</Text>
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
