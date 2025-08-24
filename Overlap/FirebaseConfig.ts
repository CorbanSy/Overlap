// Import the necessary functions from Firebase SDKs
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB6fvIePcBwSZQvyXtZvW-9XCbcKMf2I7o",
  authDomain: "overlap-87ba1.firebaseapp.com",
  projectId: "overlap-87ba1",
  storageBucket: "overlap-87ba1.firebasestorage.app",
  messagingSenderId: "336731982703",
  appId: "1:336731982703:web:bbdde0c570aa8ea692b69a",
  measurementId: "G-99ND91EFYT",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Analytics (wrap in try-catch for React Native)
export let analytics: any = null;
try {
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (error) {
  console.log('Analytics not available in this environment');
}

// Initialize Firestore
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Auth with React Native persistence
export const FIREBASE_AUTH = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});