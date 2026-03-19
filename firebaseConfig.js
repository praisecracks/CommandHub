// firebaseConfig.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get all extra config
const extra = Constants.expoConfig?.extra || {};

// Get Firebase keys with fallbacks
const firebaseConfig = {
  apiKey: extra.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: extra.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: extra.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: extra.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: extra.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: extra.EXPO_PUBLIC_FIREBASE_APP_ID || process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Debug: Log what we have
console.log('🔥 Platform:', Platform.OS);
console.log('🔥 Extra keys available:', Object.keys(extra).filter(k => k.includes('FIREBASE')));
console.log('🔥 Firebase API Key exists:', !!firebaseConfig.apiKey);
console.log('🔥 Firebase Project ID:', firebaseConfig.projectId);

// Validate before initializing
if (!firebaseConfig.apiKey) {
  console.error('❌ Firebase API Key is missing!');
  console.log('📋 Available extra keys:', Object.keys(extra));
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