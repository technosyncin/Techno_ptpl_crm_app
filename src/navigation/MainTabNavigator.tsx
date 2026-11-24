import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { SalesFollowUpScreen } from '../screens/sales/SalesFollowUpScreen';
import { CreditFollowUpScreen } from '../screens/credit/CreditFollowUpScreen';
import { ReportsScreen } from '../screens/reports/ReportsScreen';
import { MoreScreen } from '../screens/more/MoreScreen';
import { NoAccessScreen } from '../screens/auth/NoAccessScreen';
import { useAuth } from '../context/AuthContext';
import { useMenu } from '../context/MenuContext';
import { useCompany } from '../context/CompanyContext';
import { Colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

export const MainTabNavigator = () => {
  const { user } = useAuth();
  const {
    canAccessDashboard,
    canAccessSales,
    canAccessCredit,
    canAccessReports,
    canAccessMore,
    loadingMenus,
    isMenusInitialized,
  } = useMenu();
  const { companies, loadingCompanies, isCompaniesInitialized } = useCompany();

  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');
  const userAny = user as any;
  const userCompanyIds = Array.isArray(userAny?.companyIds) ? userAny.companyIds : [];
  const hasCompanyAssigned = isAdmin || (companies && companies.length > 0) || userCompanyIds.length > 0;

  const showDashboard = hasCompanyAssigned && (isAdmin || canAccessDashboard);
  const showSales = hasCompanyAssigned && (isAdmin || canAccessSales);
  const showCredit = hasCompanyAssigned && (isAdmin || canAccessCredit);
  const showReports = hasCompanyAssigned && (isAdmin || canAccessReports);
  const showMore = hasCompanyAssigned && (isAdmin || canAccessMore);

  const hasAnyAccess = hasCompanyAssigned && (showDashboard || showSales || showCredit || showReports || showMore);

  const isStillLoading = !isCompaniesInitialized || !isMenusInitialized || loadingCompanies || loadingMenus;

  if (!hasAnyAccess && isStillLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#645695" />
      </View>
    );
  }

  let initialRoute = 'DashboardTab';
  if (showDashboard) initialRoute = 'DashboardTab';
  else if (showSales) initialRoute = 'LeadsTab';
  else if (showCredit) initialRoute = 'CreditTab';
  else if (showReports) initialRoute = 'ReportsTab';
  else if (showMore) initialRoute = 'MoreTab';
  else if (!hasAnyAccess) initialRoute = 'NoAccessTab';

  return (
    <Tab.Navigator
      initialRouteName={initialRoute}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#645695',
        tabBarInactiveTintColor: Colors.slate400,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'DashboardTab') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'LeadsTab') {
            iconName = focused ? 'funnel' : 'funnel-outline';
          } else if (route.name === 'CreditTab') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'ReportsTab') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'MoreTab') {
            iconName = focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline';
          } else if (route.name === 'NoAccessTab') {
            iconName = focused ? 'shield' : 'shield-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      {!hasAnyAccess ? (
        <Tab.Screen
          name="NoAccessTab"
          component={NoAccessScreen}
          options={{ tabBarLabel: 'Account' }}
        />
      ) : (
        <>
          {showDashboard && (
            <Tab.Screen
              name="DashboardTab"
              component={DashboardScreen}
              options={{ tabBarLabel: 'Dashboard' }}
            />
          )}
          {showSales && (
            <Tab.Screen
              name="LeadsTab"
              component={SalesFollowUpScreen}
              options={{ tabBarLabel: 'Leads' }}
            />
          )}
          {showCredit && (
            <Tab.Screen
              name="CreditTab"
              component={CreditFollowUpScreen}
              options={{ tabBarLabel: 'Credit' }}
            />
          )}
          {showReports && (
            <Tab.Screen
              name="ReportsTab"
              component={ReportsScreen}
              options={{ tabBarLabel: 'Report' }}
            />
          )}
          {showMore && (
            <Tab.Screen
              name="MoreTab"
              component={MoreScreen}
              options={{ tabBarLabel: 'More' }}
            />
          )}
        </>
      )}
    </Tab.Navigator>
  );
};
