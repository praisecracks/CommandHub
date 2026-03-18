import React from 'react';
import { View, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

// Screen Imports
import LandingScreen from './LandingScreen';
import LoginScreen from './LoginScreen';
import SignUpScreen from './SignUpScreen';
import HubScreen from './HubScreen';
import GateScreen from './GateScreen';
import RadarScreen from './RadarScreen';
import DelegateScreen from './DelegateScreen';
import ProfileScreen from './ProfileScreen';
import DecisionScreen from './DecisionScreen';
import TaskHistoryScreen from './TaskHistoryScreen';
import NotificationScreen from './NotificationScreen';
import DepartmentPerformanceScreen from './DepartmentPerformanceScreen';
import SettingsScreen from './SettingsScreen';
import FAQScreen from './screens/FAQScreen'; // ✅ NEW
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen'; // ✅ NEW

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 1. COLORS AND STYLES AT THE TOP (Global Scope)
const APP_COLORS = {
  background: '#020408',
  tabBar: '#0A0C10',
  border: '#1F2937',
  active: '#00D2FF',
  inactive: '#6B7280',
  black: '#000000',
};

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  glowIndicator: {
    position: 'absolute',
    top: -12,
    width: 20,
    height: 2,
    borderRadius: 999,
    backgroundColor: APP_COLORS.active,
    shadowColor: APP_COLORS.active,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  fabContainer: {
    top: -22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: APP_COLORS.active,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  fabButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: APP_COLORS.active,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: APP_COLORS.tabBar,
  },
});

// --- CUSTOM FLOATING BUTTON COMPONENT ---
const FloatingActionButton = () => {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      style={styles.fabContainer}
      activeOpacity={0.85}
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        navigation.navigate('DecisionScreen'); 
      }}
    >
      <View style={styles.fabButton}>
        <Ionicons name="add" size={32} color={APP_COLORS.black} />
      </View>
    </TouchableOpacity>
  );
};

const handleTabPress = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

function TabGroup() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        sceneStyle: {
          backgroundColor: APP_COLORS.background,
        },
        tabBarActiveTintColor: APP_COLORS.active,
        tabBarInactiveTintColor: APP_COLORS.inactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 2,
          marginBottom: Platform.OS === 'ios' ? 6 : 8,
        },
        tabBarStyle: {
          backgroundColor: APP_COLORS.tabBar,
          height: Platform.OS === 'ios' ? 88 : 72,
          borderTopWidth: 1,
          borderTopColor: APP_COLORS.border,
          elevation: 0,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 12 : 8,
        },
      }}
    >
      <Tab.Screen
        name="Hub"
        component={HubScreen}
        listeners={{ tabPress: handleTabPress }}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              {focused && <View style={styles.glowIndicator} />}
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Gate"
        component={GateScreen}
        listeners={{ tabPress: handleTabPress }}
        options={{
          tabBarLabel: 'Contacts',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              {focused && <View style={styles.glowIndicator} />}
              <Ionicons
                name={focused ? 'people' : 'people-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Add"
        component={DecisionScreen} 
        options={{
          tabBarLabel: '',
          tabBarButton: () => <FloatingActionButton />,
        }}
      />

      <Tab.Screen
        name="Radar"
        component={RadarScreen}
        listeners={{ tabPress: handleTabPress }}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              {focused && <View style={styles.glowIndicator} />}
              <Ionicons
                name={focused ? 'aperture' : 'aperture-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Delegate"
        component={DelegateScreen}
        listeners={{ tabPress: handleTabPress }}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconWrapper}>
              {focused && <View style={styles.glowIndicator} />}
              <Ionicons
                name={focused ? 'shield-half' : 'shield-outline'}
                size={22}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator({ user }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: APP_COLORS.background,
        },
      }}
    >
      {user ? (
        <Stack.Group>
          <Stack.Screen name="MainTabs" component={TabGroup} />
          <Stack.Screen 
            name="DecisionScreen" 
            component={DecisionScreen} 
            options={{
              animation: 'slide_from_right'
            }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="TaskHistory"
            component={TaskHistoryScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="DepartmentPerformance"
            component={DepartmentPerformanceScreen}
            options={{
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          {/* ✅ NEW: FAQ Screen */}
          <Stack.Screen
            name="FAQ"
            component={FAQScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
          {/* ✅ NEW: Privacy Policy Screen */}
          <Stack.Screen
            name="PrivacyPolicy"
            component={PrivacyPolicyScreen}
            options={{
              animation: 'slide_from_right',
            }}
          />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}