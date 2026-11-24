import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { MainTabNavigator } from './MainTabNavigator';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ServerConfigScreen } from '../screens/auth/ServerConfigScreen';
import { LeadDetailsScreen } from '../screens/leads/LeadDetailsScreen';
import { AddEditLeadScreen } from '../screens/leads/AddEditLeadScreen';
import { AddContactScreen } from '../screens/contacts/AddContactScreen';
import { QuotationsListScreen } from '../screens/sales/QuotationsListScreen';
import { AddEditQuotationScreen } from '../screens/sales/AddEditQuotationScreen';import { SalesFollowUpScreen } from '../screens/sales/SalesFollowUpScreen';
import { ReceiptsScreen } from '../screens/credit/ReceiptsScreen';
import { NewTransactionScreen } from '../screens/credit/NewTransactionScreen';
import { OutstandingReportsScreen } from '../screens/credit/OutstandingReportsScreen';
import { VisitReportScreen } from '../screens/reports/VisitReportScreen';
import { UserProfileScreen } from '../screens/profile/UserProfileScreen';
import { AddCompanyScreen } from '../screens/company/AddCompanyScreen';
import { CompaniesListScreen } from '../screens/company/CompaniesListScreen';
import { AddUserScreen } from '../screens/user/AddUserScreen';
import { UsersListScreen } from '../screens/user/UsersListScreen';
import { UserPermissionScreen } from '../screens/user/UserPermissionScreen';
import { InternalChatScreen } from '../screens/chat/InternalChatScreen';
import { ActivitiesScreen } from '../screens/activities/ActivitiesScreen';
import { ContactsListScreen } from '../screens/contacts/ContactsListScreen';
import { ReminderScreen } from '../screens/activities/ReminderScreen';
import { LeadsListScreen } from '../screens/leads/LeadsListScreen';
import { CreditMasterScreen } from '../screens/credit/CreditMasterScreen';
import { CreditFollowUpScreen } from '../screens/credit/CreditFollowUpScreen';
import { SalesReminderScreen } from '../screens/sales/SalesReminderScreen';
import { CreditReminderScreen } from '../screens/credit/CreditReminderScreen';
import { MyTasksScreen } from '../screens/activities/MyTasksScreen';
import { NotesScreen } from '../screens/activities/NotesScreen';
import { Colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
  {!isAuthenticated ? (
    <>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ServerConfig" component={ServerConfigScreen} />
    </>
  ) : (
    <>
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen name="LeadDetails" component={LeadDetailsScreen} />
      <Stack.Screen name="AddLead" component={AddEditLeadScreen} />
      <Stack.Screen name="AddContact" component={AddContactScreen} />
      <Stack.Screen name="Quotations" component={QuotationsListScreen} />
      <Stack.Screen name="AddEditQuotationScreen" component={AddEditQuotationScreen} />
      <Stack.Screen name="SalesFollowUp" component={SalesFollowUpScreen} />
      <Stack.Screen name="InternalChat" component={InternalChatScreen} />
      <Stack.Screen name="Receipts" component={ReceiptsScreen} />
      <Stack.Screen name="NewTransaction" component={NewTransactionScreen} />
      <Stack.Screen name="OutstandingReports" component={OutstandingReportsScreen} />
      <Stack.Screen name="VisitReport" component={VisitReportScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="CompaniesList" component={CompaniesListScreen} />
      <Stack.Screen name="AddCompany" component={AddCompanyScreen} />
      <Stack.Screen name="UsersList" component={UsersListScreen} />
      <Stack.Screen name="AddUser" component={AddUserScreen} />
      <Stack.Screen name="UserPermission" component={UserPermissionScreen} />
      <Stack.Screen name="Reminder" component={ReminderScreen} />
      <Stack.Screen name="Activities" component={ActivitiesScreen} />
      <Stack.Screen name="Contacts" component={ContactsListScreen} />
      <Stack.Screen name="LeadsList" component={LeadsListScreen} />
      <Stack.Screen name="CreditMaster" component={CreditMasterScreen} />
      <Stack.Screen name="CreditFollowUp" component={CreditFollowUpScreen} />
      <Stack.Screen name="SalesReminder" component={SalesReminderScreen} />
      <Stack.Screen name="CreditReminder" component={CreditReminderScreen} />
      <Stack.Screen name="MyTasks" component={MyTasksScreen} />
      <Stack.Screen name="MyTask" component={MyTasksScreen} />
      <Stack.Screen name="Notes" component={NotesScreen} />
      <Stack.Screen name="NotesScreen" component={NotesScreen} />
      <Stack.Screen name="ServerConfig" component={ServerConfigScreen} />
    </>
  )}
</Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
