// firebaseConfig.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Simple function to get config - no complex fallbacks
const getFirebaseConfig = () => {
  // For web development
  if (Platform.OS === 'web' && process.env.EXPO_PUBLIC_FIREBASE_API_KEY) {
    return {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    };
  }
  
  // For native (Android/iOS) - use Constants
  const extra = Constants.expoConfig?.extra || {};
  
  // Hardcoded fallback for testing (remove after fix)
  // This should NOT be in production, but helps debug
  return {
    apiKey: extra.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCoHkPlMtCDrIC2XK_3srx6Uw-KdsT0dz0",
    authDomain: extra.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "mycommandhub-143e5.firebaseapp.com",
    projectId: extra.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "mycommandhub-143e5",
    storageBucket: extra.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "mycommandhub-143e5.appspot.com",
    messagingSenderId: extra.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "593327699350",
    appId: extra.EXPO_PUBLIC_FIREBASE_APP_ID || "1:593327699350:web:6374a7ad959675b2d7d9b7",
  };
};

const firebaseConfig = getFirebaseConfig();

// Debug - CRITICAL: Check what's actually being used
console.log('🔥 ===== FIREBASE CONFIG DEBUG =====');
console.log('🔥 Platform:', Platform.OS);
console.log('🔥 API Key being used:', firebaseConfig.apiKey);
console.log('🔥 API Key length:', firebaseConfig.apiKey?.length);
console.log('🔥 Auth Domain:', firebaseConfig.authDomain);
console.log('🔥 Project ID:', firebaseConfig.projectId);
console.log('🔥 =================================');

// Validate
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'YOUR_FIREBASE_API_KEY') {
  console.error('❌ Firebase API Key is missing or invalid!');
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    console.log('Auth initialization fallback:', error.message);
    auth = getAuth(app);
  }
}

const db = getFirestore(app);

export { app, auth, db };