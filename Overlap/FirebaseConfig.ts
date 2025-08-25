// FirebaseConfig.ts
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";

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

// Initialize Firebase app (prevent multiple initialization)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

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

// Initialize Auth with React Native persistence (prevent double initialization)
let auth;
try {
  // Try to get existing auth instance first
  auth = getAuth(app);
} catch (error) {
  // If no auth instance exists, initialize with React Native persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export const FIREBASE_AUTH = auth;

// Export auth for convenience (so you can import { auth } from FirebaseConfig)
export { auth };