import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
import { useAuth } from './context/AuthContext';

// Screens
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { HomeScreen } from './screens/HomeScreen';
import { TransactionScreen } from './screens/TransactionScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF8C00',
        tabBarInactiveTintColor: '#AAA',
        tabBarStyle: {
          position: Platform.OS === 'android' ? 'absolute' : 'relative',
          bottom: Platform.OS === 'android' ? 35 : 0,
          left: Platform.OS === 'android' ? 20 : 0,
          right: Platform.OS === 'android' ? 20 : 0,
          height: Platform.OS === 'android' ? 75 : 60,
          backgroundColor: '#FFF',
          borderRadius: Platform.OS === 'android' ? 35 : 0,
          elevation: 15,
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'android' ? 0 : 8,
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
          fontSize: 12,
          fontWeight: '700',
          marginBottom: Platform.OS === 'android' ? 5 : 0,
        }
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Painel',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📊</Text>
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Ajustes',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text>
        }}
      />
    </Tab.Navigator>
  );
};

export const Router = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
