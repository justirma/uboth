import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "uboth-9f6ee.firebaseapp.com",
  databaseURL: "https://uboth-9f6ee-default-rtdb.firebaseio.com/",
  projectId: "uboth-9f6ee",
  storageBucket: "uboth-9f6ee.firebasestorage.app",
  messagingSenderId: "673379298777",
  appId: "1:673379298777:web:08a9fc02db1cc958f23dc8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const database = getDatabase(app);
