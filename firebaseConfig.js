import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyCoHkPlMtCDrIC2XK_3srx6Uw-KdsT0dz0',
  authDomain: 'mycommandhub-143e5.firebaseapp.com',
  projectId: 'mycommandhub-143e5',
  storageBucket: 'mycommandhub-143e5.firebasestorage.app',
  messagingSenderId: '593327699350',
  appId: '1:593327699350:web:6374a7ad959675b2d7d9b7',
};

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
    auth = getAuth(app);
  }
}

const db = getFirestore(app);

export { app, auth, db };