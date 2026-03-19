import React, { lazy, Suspense, memo, useCallback } from 'react';
import { View, Platform, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

// PERFORMANCE: Lazy load screens that aren't immediately visible
// Auth screens - loaded immediately (needed for initial render)
import LandingScreen from './LandingScreen';
import LoginScreen from './LoginScreen';
import SignUpScreen from './SignUpScreen';

// Main tab screens - loaded immediately (core navigation)
import HubScreen from './HubScreen';
import GateScreen from './GateScreen';
import RadarScreen from './RadarScreen';
import DelegateScreen from './DelegateScreen';

// Secondary screens - lazy loaded (only when navigated to)
const ProfileScreen = lazy(() => import('./ProfileScreen'));
const DecisionScreen = lazy(() => import('./DecisionScreen'));
const TaskHistoryScreen = lazy(() => import('./TaskHistoryScreen'));
const NotificationScreen = lazy(() => import('./NotificationScreen'));
const DepartmentPerformanceScreen = lazy(() => import('./DepartmentPerformanceScreen'));
const SettingsScreen = lazy(() => import('./SettingsScreen'));
const FAQScreen = lazy(() => import('./screens/FAQScreen'));
const PrivacyPolicyScreen = lazy(() => import('./screens/PrivacyPolicyScreen'));

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

// PERFORMANCE: Loading fallback for lazy-loaded screens
const ScreenLoader = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: APP_COLORS.background }}>
    <ActivityIndicator size="large" color={APP_COLORS.active} />
  </View>
);

// PERFORMANCE: Wrap lazy screens with Suspense
const withSuspense = (Component) => (props) => (
  <Suspense fallback={<ScreenLoader />}>
    <Component {...props} />
  </Suspense>
);

// --- CUSTOM FLOATING BUTTON COMPONENT ---
// PERFORMANCE: Memoize to prevent unnecessary re-renders
const FloatingActionButton = memo(() => {
  const navigation = useNavigation();

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.navigate('DecisionScreen'); 
  }, [navigation]);

  return (
    <TouchableOpacity
      style={styles.fabContainer}
      activeOpacity={0.85}
      onPress={handlePress}
    >
      <View style={styles.fabButton}>
        <Ionicons name="add" size={32} color={APP_COLORS.black} />
      </View>
    </TouchableOpacity>
  );
});

const handleTabPress = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

// PERFORMANCE: Memoize TabGroup to prevent unnecessary re-renders
const TabGroup = memo(() => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        // PERFORMANCE: Detach inactive screens to free memory
        lazy: true,
        unmountOnBlur: false,
        freezeOnBlur: true,
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
});

export default function AppNavigator({ user }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: APP_COLORS.background,
        },
        // PERFORMANCE: Enable native animations for smoother transitions
        animation: 'default',
        animationDuration: 200,
      }}
    >
      {user ? (
        <Stack.Group>
          <Stack.Screen name="MainTabs" component={TabGroup} />
          <Stack.Screen 
            name="DecisionScreen" 
            component={withSuspense(DecisionScreen)} 
            options={{
              animation: 'slide_from_right'
            }}
          />
          <Stack.Screen
            name="Profile"
            component={withSuspense(ProfileScreen)}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="TaskHistory"
            component={withSuspense(TaskHistoryScreen)}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="Notifications"
            component={withSuspense(NotificationScreen)}
            options={{
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="DepartmentPerformance"
            component={withSuspense(DepartmentPerformanceScreen)}
            options={{
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="Settings"
            component={withSuspense(SettingsScreen)}
            options={{
              animation: 'slide_from_right',
            }}
          />
          {/* ✅ NEW: FAQ Screen */}
          <Stack.Screen
            name="FAQ"
            component={withSuspense(FAQScreen)}
            options={{
              animation: 'slide_from_right',
            }}
          />
          {/* ✅ NEW: Privacy Policy Screen */}
          <Stack.Screen
            name="PrivacyPolicy"
            component={withSuspense(PrivacyPolicyScreen)}
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