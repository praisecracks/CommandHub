// App.js - Fix notification for web
import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StatusBar, StyleSheet, AppState, Text, Platform, LogBox } from 'react-native';

// Ignore specific native module error that requires a rebuild
LogBox.ignoreLogs([
  "Cannot find native module",
  "Unable to get the view config",
  "native view manager for module"
]);
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { onAuthStateChanged } from 'firebase/auth';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import { auth, db } from './firebaseConfig';
import AppNavigator from './AppNavigator';
import SignalService from './components/services/SignalService';
import CustomLoader from './components/common/CustomLoader';
import './global.css';

// Create a navigation ref to handle notifications from App.js
const navigationRef = createNavigationContainerRef();

// Configure notifications - only on native platforms
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
}

const MyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#020408',
    card: '#020408',
    border: '#1F2937',
    primary: '#00D2FF',
    text: '#FFFFFF',
  },
};

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const [error, setError] = useState(null);

  console.log('📱 App rendering, initializing:', initializing);

  // Request notification permissions on start (only native)
  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('🌐 Web platform - skipping native notifications');
      return;
    }

    console.log('🔔 Requesting notification permissions...');
    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        console.log('Notification permissions status:', status);
      } catch (err) {
        console.error('Notification permission error:', err);
      }
    })();
  }, []);

  // Modern navigation bar configuration (only Android)
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    
    console.log('🎨 Setting navigation bar...');
    (async () => {
      try {
        await NavigationBar.setBackgroundColorAsync('#020408');
        await NavigationBar.setButtonStyleAsync('light');
      } catch (err) {
        console.log('Navigation bar setup skipped:', err?.message);
      }
    })();
  }, []);

  // Auth state listener
  useEffect(() => {
    console.log('👤 Setting up auth listener...');

    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        (authenticatedUser) => {
          console.log('Auth state changed:', authenticatedUser ? 'Logged in' : 'Logged out');
          setUser(authenticatedUser);
          setInitializing(false);
        },
        (authError) => {
          console.error('Auth error:', authError);
          setError(authError.message);
          setInitializing(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error('Error setting up auth:', err);
      setError(err.message);
      setInitializing(false);
    }
  }, []);

  // Automatic signal checking
  useEffect(() => {
    if (!user) {
      console.log('⏸️ No user, skipping signal check');
      return;
    }

    console.log('🔍 Setting up signal checking for user:', user.uid);

    let intervalId;
    let isMounted = true;

    const checkSignals = async () => {
      if (!isMounted || !user) return;

      console.log('🔍 Checking for new external signals...');
      try {
        const newSignals = await SignalService.checkAllSources();
        console.log(`✅ Added ${newSignals?.length || 0} new signals`);
      } catch (signalError) {
        console.error('Error checking signals:', signalError);
      }
    };

    checkSignals();
    // Increase interval to 12 hours (12 * 60 * 60 * 1000) to be more API friendly
    intervalId = setInterval(checkSignals, 12 * 60 * 60 * 1000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);

  // Check when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('App state changed:', appState, '->', nextAppState);

      if (appState.match(/inactive|background/) && nextAppState === 'active' && user) {
        console.log('📱 App foregrounded - checking signals');
        SignalService.checkAllSources();
      }

      setAppState(nextAppState);
    });

    return () => subscription.remove();
  }, [appState, user]);

  // Schedule daily digest at 8 AM (only native)
  useEffect(() => {
    if (!user || Platform.OS === 'web') return;

    const scheduleDailyDigest = async () => {
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();

        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📋 Your Daily Radar Digest',
            body: "Check what's new in your HR intelligence feed",
            data: { type: 'daily-digest' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 8,
            minute: 0,
            channelId: 'default',
          },
        });

        console.log('⏰ Daily digest scheduled for 8 AM');
      } catch (scheduleError) {
        console.error('Error scheduling daily digest:', scheduleError);
      }
    };

    scheduleDailyDigest();
  }, [user]);

  // Handle tapping on notifications
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Listener for tapping on a notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 Notification response received:', response.notification.request.content.data);
      
      const data = response.notification.request.content.data;
      
      if (navigationRef.isReady()) {
        // Navigate to the notifications screen
        navigationRef.navigate('Notifications', { data });
      }
    });

    // Listener for foreground notifications
    const foregroundListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Foreground notification received:', notification.request.content.title);
      // Optional: Show in-app banner or something
    });

    return () => {
      responseListener.remove();
      foregroundListener.remove();
    };
  }, []);

  if (error) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.loadingContainer, { padding: 20 }]}>
          <Text style={{ color: '#EF4444', fontSize: 18, marginBottom: 10 }}>Error</Text>
          <Text style={{ color: '#FFFFFF', textAlign: 'center' }}>{error}</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  if (initializing) {
    return (
      <CustomLoader 
        type="fullscreen" 
        message="Initializing Hub..." 
        subtext="Establishing secure connection to Custom Hub"
      />
    );
  }

  console.log('✅ Rendering main app with user:', user ? 'Logged in' : 'Not logged in');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.outerWrapper}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <SafeAreaProvider>
          <NavigationContainer theme={MyDarkTheme} ref={navigationRef}>
            <AppNavigator user={user} />
          </NavigationContainer>
        </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: '#020408',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020408',
    justifyContent: 'center',
    alignItems: 'center',
  },
});