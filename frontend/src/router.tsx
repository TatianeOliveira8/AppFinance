import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, Platform, StatusBar } from 'react-native';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';

// Screens
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { HomeScreen } from './screens/HomeScreen';
import { TransactionScreen } from './screens/TransactionScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import FinancialProfileScreen from './screens/FinancialProfileScreen';
import { CreditCardsScreen } from './screens/CreditCardsScreen';
import { AccountsScreen } from './screens/AccountsScreen';
import { GoalsScreen } from './screens/GoalsScreen';
import { TransfersScreen } from './screens/TransfersScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { MapScreen } from './screens/MapScreen';
import FinancialPlanningScreen from './screens/FinancialPlanningScreen';
import ExpenseGroupsScreen from './screens/ExpenseGroupsScreen';
import ExpenseGroupDetailsScreen from './screens/ExpenseGroupDetailsScreen';
import ReconciliationScreen from './screens/ReconciliationScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';

import { MaterialCommunityIcons } from '@expo/vector-icons';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          position: Platform.OS === 'android' ? 'absolute' : 'relative',
          bottom: Platform.OS === 'android' ? 35 : 0,
          left: Platform.OS === 'android' ? 20 : 0,
          right: Platform.OS === 'android' ? 20 : 0,
          height: Platform.OS === 'android' ? 75 : 65,
          backgroundColor: colors.tabBarBg,
          borderRadius: Platform.OS === 'android' ? 35 : 0,
          elevation: 15,
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'android' ? 0 : 12,
          paddingTop: Platform.OS === 'android' ? 0 : 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.15,
          shadowRadius: 15,
        },
        tabBarItemStyle: {
          paddingVertical: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginBottom: Platform.OS === 'android' ? 5 : 0,
        }
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{
          tabBarLabel: 'LISO',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="Transfers"
        component={TransfersScreen}
        options={{
          tabBarLabel: 'Transferências',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="swap-horizontal" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          tabBarLabel: 'Metas',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bullseye-arrow" size={size} color={color} />
          )
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-outline" size={size} color={color} />
          )
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Ajustes',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" size={size} color={color} />
          )
        }}
      />
    </Tab.Navigator>
  );
};

export const Router = () => {
  const { isAuthenticated, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.headerBg} translucent />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="Transaction" component={TransactionScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="FinancialProfile" component={FinancialProfileScreen} />
            <Stack.Screen name="CreditCards" component={CreditCardsScreen} />
            <Stack.Screen name="Accounts" component={AccountsScreen} />
            <Stack.Screen name="Map" component={MapScreen} />
            <Stack.Screen name="FinancialPlanning" component={FinancialPlanningScreen} />
            <Stack.Screen name="ExpenseGroups" component={ExpenseGroupsScreen} />
            <Stack.Screen name="ExpenseGroupDetails" component={ExpenseGroupDetailsScreen} />
            <Stack.Screen name="Reconciliation" component={ReconciliationScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
