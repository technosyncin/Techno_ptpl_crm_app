import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/common/Header';
import { MobileDropdown, DropdownOption } from '../../components/common/MobileDropdown';
import {
  userPermissionService,
  UserSummary,
  UserPermissionItem,
} from '../../api/userPermissionService';
import { mapBootstrapIconToIonic } from '../more/MoreScreen';
import { Colors } from '../../theme/colors';
import { Spacing, BorderRadius, Shadows } from '../../theme/spacing';

if (
  Platform.OS === 'android' &&
  !(globalThis as any).nativeFabricUIManager &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface UserPermissionScreenProps {
  navigation: any;
}

export const UserPermissionScreen: React.FC<UserPermissionScreenProps> = ({ navigation }) => {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hierarchy from server
  const [menus, setMenus] = useState<UserPermissionItem[]>([]);
  // Local state map of menuID -> boolean auth status
  const [localAuthMap, setLocalAuthMap] = useState<Record<number, boolean>>({});
  // Baseline loaded state to detect unsaved changes and for Reset
  const [originalAuthMap, setOriginalAuthMap] = useState<Record<number, boolean>>({});

  // Accordion expanded state for parent menus: menuID -> boolean
  const [expandedParents, setExpandedParents] = useState<Record<number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const userList = await userPermissionService.getUsers();
        setUsers(userList);
        if (userList.length > 0) {
          // Pre-select first user
          setSelectedUserId(userList[0].userID);
        }
      } catch (err: any) {
        console.error('Failed to load users:', err);
        Alert.alert('Error', 'Failed to load user list for permissions.');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // 2. Fetch permissions when selectedUserId changes
  const loadPermissionsForUser = useCallback(async (userId: number) => {
    setLoadingPermissions(true);
    try {
      const res = await userPermissionService.getUserPermissions(userId);
      if (res && res.menus) {
        // Strict deduplication of parents and child menus by menuID
        const uniqueParentsMap = new Map<number, UserPermissionItem>();
        (res.menus || []).forEach((parent) => {
          if (!uniqueParentsMap.has(parent.menuID)) {
            const uniqueChildrenMap = new Map<number, UserPermissionItem>();
            (parent.children || []).forEach((child) => {
              if (!uniqueChildrenMap.has(child.menuID)) {
                uniqueChildrenMap.set(child.menuID, child);
              }
            });
            uniqueParentsMap.set(parent.menuID, {
              ...parent,
              children: Array.from(uniqueChildrenMap.values()),
            });
          }
        });
        const sanitizedMenus = Array.from(uniqueParentsMap.values());
        setMenus(sanitizedMenus);

        // Build flat auth map
        const initialMap: Record<number, boolean> = {};
        const expandMap: Record<number, boolean> = {};

        const traverse = (items: UserPermissionItem[]) => {
          items.forEach((item) => {
            initialMap[item.menuID] = !!item.auth;
            if (item.children && item.children.length > 0) {
              expandMap[item.menuID] = true; // Expand all by default
              traverse(item.children);
            }
          });
        };

        traverse(sanitizedMenus);
        setLocalAuthMap(initialMap);
        setOriginalAuthMap(initialMap);
        // By default, ALL modules remain COLLAPSED as requested
        setExpandedParents({});
      }
    } catch (err: any) {
      console.error('Failed to load permissions:', err);
      Alert.alert('Error', 'Failed to load menu permissions for selected user.');
    } finally {
      setLoadingPermissions(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadPermissionsForUser(selectedUserId);
    } else {
      setMenus([]);
      setLocalAuthMap({});
      setOriginalAuthMap({});
    }
  }, [selectedUserId, loadPermissionsForUser]);

  // Dropdown options
  const userDropdownOptions: DropdownOption[] = useMemo(() => {
    return users.map((u) => ({
      label: u.fullName || `User #${u.userID}`,
      value: u.userID,
      subtitle: `${u.role || 'User'} • ${u.email || ''}`,
    }));
  }, [users]);

  const selectedUser = useMemo(() => {
    return users.find((u) => u.userID === selectedUserId) || null;
  }, [users, selectedUserId]);

  // Check if there are unsaved local modifications
  const hasChanges = useMemo(() => {
    const keys = Object.keys(localAuthMap);
    for (const key of keys) {
      const id = Number(key);
      if (localAuthMap[id] !== originalAuthMap[id]) {
        return true;
      }
    }
    return false;
  }, [localAuthMap, originalAuthMap]);

  // Count active / total
  const stats = useMemo(() => {
    let total = 0;
    let enabled = 0;
    menus.forEach((parent) => {
      total++;
      if (localAuthMap[parent.menuID]) enabled++;
      if (parent.children) {
        parent.children.forEach((child) => {
          total++;
          if (localAuthMap[child.menuID]) enabled++;
        });
      }
    });
    return { total, enabled };
  }, [menus, localAuthMap]);

  // Toggle single child menu
  const handleToggleChild = (childMenuId: number, currentVal: boolean) => {
    const newVal = !currentVal;
    setLocalAuthMap((prev) => ({
      ...prev,
      [childMenuId]: newVal,
    }));
  };

  // Toggle parent menu with CASCADE to all its child submenus (Web CRM behavior)
  const handleToggleParent = (parent: UserPermissionItem, currentVal: boolean) => {
    const newVal = !currentVal;
    setLocalAuthMap((prev) => {
      const updated = { ...prev, [parent.menuID]: newVal };
      if (parent.children && parent.children.length > 0) {
        parent.children.forEach((child) => {
          updated[child.menuID] = newVal;
        });
      }
      return updated;
    });
  };

  // Expand / Collapse single parent accordion
  const toggleAccordion = (parentId: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  // Expand All / Collapse All
  const handleExpandAll = (expand: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newExpandState: Record<number, boolean> = {};
    menus.forEach((m) => {
      newExpandState[m.menuID] = expand;
    });
    setExpandedParents(newExpandState);
  };

  // Select All / Deselect All
  const handleSelectAll = (authValue: boolean) => {
    const updated: Record<number, boolean> = {};
    menus.forEach((parent) => {
      updated[parent.menuID] = authValue;
      if (parent.children) {
        parent.children.forEach((c) => {
          updated[c.menuID] = authValue;
        });
      }
    });
    setLocalAuthMap(updated);
  };

  // Revert unsaved local changes to original loaded state
  const handleReset = () => {
    Alert.alert('Reset Changes', 'Are you sure you want to revert all unsaved changes?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setLocalAuthMap({ ...originalAuthMap });
        },
      },
    ]);
  };

  // Save changes to backend via separate Mobile API
  const handleSave = async () => {
    if (!selectedUserId) {
      Alert.alert('Validation', 'Please select a user first.');
      return;
    }

    setSaving(true);
    try {
      const permissionsToSave = Object.entries(localAuthMap).map(([idStr, auth]) => ({
        menuID: Number(idStr),
        auth: !!auth,
      }));

      const res = await userPermissionService.savePermissions(selectedUserId, permissionsToSave);
      if (res && res.success) {
        setOriginalAuthMap({ ...localAuthMap });
        Alert.alert('Success', 'User permissions saved successfully!');
      } else {
        Alert.alert('Error', res?.message || 'Could not save permissions.');
      }
    } catch (err: any) {
      console.error('Save permissions error:', err);
      Alert.alert('Save Failed', err?.response?.data?.message || err?.message || 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  // Filter menus based on search query
  const filteredMenus = useMemo(() => {
    if (!searchQuery.trim()) return menus;
    const q = searchQuery.toLowerCase().trim();

    return menus
      .map((parent) => {
        const parentMatches = parent.menuName.toLowerCase().includes(q);
        const matchedChildren = (parent.children || []).filter((child) =>
          child.menuName.toLowerCase().includes(q)
        );

        if (parentMatches) {
          return parent;
        } else if (matchedChildren.length > 0) {
          return {
            ...parent,
            children: matchedChildren,
          };
        }
        return null;
      })
      .filter(Boolean) as UserPermissionItem[];
  }, [menus, searchQuery]);

  return (
    <View style={styles.container}>
      <Header title="User Permission" showBack={false} navigation={navigation} />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* User Selection Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>User Selection</Text>

          <MobileDropdown
            placeholder="Select user..."
            options={userDropdownOptions}
            selectedValue={selectedUserId}
            onSelect={(val) => setSelectedUserId(Number(val))}
            searchable={true}
            searchPlaceholder="Search by name, role or email..."
            loading={loadingUsers}
          />
        </View>

        {/* Search & Bulk Action Bar */}
        <View style={styles.toolBarCard}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={Colors.slate400} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Filter menu items..."
              placeholderTextColor={Colors.slate400}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={Colors.slate400} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.actionsRow}>
            <View style={styles.statsContainer}>
              <Text style={styles.statsText}>
                Active: <Text style={{ fontWeight: '700', color: Colors.primary }}>{stats.enabled}</Text> / {stats.total}
              </Text>
            </View>

            <View style={styles.quickButtons}>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => handleSelectAll(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-done" size={14} color={Colors.primary} />
                <Text style={styles.quickBtnText}>Select All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => handleSelectAll(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={14} color={Colors.slate600} />
                <Text style={styles.quickBtnText}>Clear All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => handleExpandAll(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-expand" size={14} color={Colors.primary} />
                <Text style={styles.quickBtnText}>Expand</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Loading Indicator for Permissions */}
        {loadingPermissions ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading permissions for user...</Text>
          </View>
        ) : filteredMenus.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="folder-open-outline" size={44} color={Colors.slate400} />
            <Text style={styles.emptyTitle}>No Menus Found</Text>
            <Text style={styles.emptyDesc}>No menus match the search query or no menus configured.</Text>
          </View>
        ) : (
          /* Menu Hierarchy Tree */
          <View style={styles.menuListContainer}>
            {filteredMenus.map((parent, pIndex) => {
              const isParentAuth = !!localAuthMap[parent.menuID];
              const isExpanded = !!expandedParents[parent.menuID];
              const children = parent.children || [];
              const hasChildren = children.length > 0;
              const parentIcon = mapBootstrapIconToIonic(parent.icon, parent.menuName);

              return (
                <View
                  key={`parent-${parent.menuID}-${pIndex}`}
                  style={[styles.parentCard, isExpanded && styles.parentCardExpanded]}
                >
                  {/* Parent Row Header */}
                  <View style={styles.parentHeader}>
                    <TouchableOpacity
                      style={styles.parentTitleSection}
                      onPress={() => hasChildren && toggleAccordion(parent.menuID)}
                      activeOpacity={hasChildren ? 0.7 : 1}
                    >
                      <View style={[styles.parentIconBadge, isParentAuth && styles.parentIconBadgeActive]}>
                        <Ionicons
                          name={parentIcon}
                          size={18}
                          color={isParentAuth ? '#645695' : Colors.slate500}
                        />
                      </View>

                      <View style={styles.parentTextCol}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[styles.parentName, isParentAuth && styles.parentNameActive]}>
                            {parent.menuName}
                          </Text>
                          {hasChildren && (
                            <View style={styles.childCountPill}>
                              <Text style={styles.childCountText}>
                                {children.length}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {hasChildren && (
                        <View style={styles.chevronWrapper}>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={isExpanded ? '#7c3aed' : Colors.slate400}
                          />
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Parent Toggle Switch (cascades to children) */}
                    <View style={styles.switchWrapper}>
                      <Switch
                        value={isParentAuth}
                        onValueChange={() => handleToggleParent(parent, isParentAuth)}
                        trackColor={{ false: '#cbd5e1', true: '#c4b5fd' }}
                        thumbColor={isParentAuth ? '#7c3aed' : '#f8fafc'}
                      />
                    </View>
                  </View>

                  {/* Child Submenus list */}
                  {hasChildren && isExpanded && (
                    <View style={styles.childContainer}>
                      {children.map((child, index) => {
                        const isChildAuth = !!localAuthMap[child.menuID];
                        const childIcon = mapBootstrapIconToIonic(child.icon, child.menuName);

                        return (
                          <View
                            key={`child-${child.menuID}-${index}`}
                            style={[
                              styles.childCard,
                              isChildAuth && styles.childCardActive,
                            ]}
                          >
                            <View style={styles.childLeft}>
                              <View
                                style={[
                                  styles.childIconBox,
                                  isChildAuth && styles.childIconBoxActive,
                                ]}
                              >
                                <Ionicons
                                  name={childIcon}
                                  size={15}
                                  color={isChildAuth ? '#645695' : Colors.slate400}
                                />
                              </View>
                              <Text
                                style={[
                                  styles.childName,
                                  isChildAuth && styles.childNameActive,
                                ]}
                                numberOfLines={1}
                              >
                                {child.menuName}
                              </Text>
                            </View>

                            <Switch
                              value={isChildAuth}
                              onValueChange={() => handleToggleChild(child.menuID, isChildAuth)}
                              trackColor={{ false: '#e2e8f0', true: '#ddd6fe' }}
                              thumbColor={isChildAuth ? '#7c3aed' : '#ffffff'}
                              style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                            />
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.footerBar}>
        <TouchableOpacity
          style={[styles.resetButton, !hasChanges && styles.disabledBtn]}
          onPress={handleReset}
          disabled={!hasChanges || saving}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={16} color={hasChanges ? Colors.slate700 : Colors.slate400} />
          <Text style={[styles.resetButtonText, !hasChanges && { color: Colors.slate400 }]}>
            Reset
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, (!hasChanges && !saving) && styles.saveButtonUnchanged]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
          )}
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Save Permissions'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.slate800,
    marginBottom: Spacing.xs,
  },
  toolBarCard: {
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.slate800,
    paddingVertical: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  statsContainer: {
    paddingLeft: 4,
  },
  statsText: {
    fontSize: 12,
    color: Colors.slate600,
  },
  quickButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.slate700,
    marginLeft: 3,
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.slate600,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.slate700,
  },
  emptyDesc: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.slate500,
    textAlign: 'center',
  },
  menuListContainer: {
    gap: 10,
  },
  parentCard: {
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    ...Shadows.sm,
    marginBottom: 8,
  },
  parentCardExpanded: {
    borderColor: '#c4b5fd',
    ...Shadows.md,
  },
  parentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  parentTitleSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  parentIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  parentIconBadgeActive: {
    backgroundColor: '#ede9fe',
  },
  parentTextCol: {
    flex: 1,
  },
  parentName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.slate800,
  },
  parentNameActive: {
    color: '#645695',
  },
  childCountPill: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    marginLeft: 8,
  },
  childCountText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#645695',
    lineHeight: 15,
  },
  chevronWrapper: {
    paddingHorizontal: 4,
  },
  switchWrapper: {
    paddingLeft: 6,
  },
  childContainer: {
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  childCardActive: {
    borderColor: '#ddd6fe',
    backgroundColor: '#fcfaff',
  },
  childLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  childIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  childIconBoxActive: {
    backgroundColor: '#ede9fe',
  },
  childName: {
    fontSize: 13,
    color: Colors.slate700,
    fontWeight: '500',
    flex: 1,
  },
  childNameActive: {
    color: Colors.slate900,
    fontWeight: '600',
  },
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    ...Shadows.md,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.slate700,
    marginLeft: 6,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  saveButtonUnchanged: {
    backgroundColor: '#8b5cf6',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
