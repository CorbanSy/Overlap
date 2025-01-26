// Import the necessary functions from Firebase SDKs
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // Firestore import
import { getAuth } from "firebase/auth";
//import AsyncStorage from "@react-native-async-storage/async-storage"; // AsyncStorage for persistence
//import { initializeAuth, getReactNativePersistence } from "firebase/auth"; // Initialize Auth with persistence

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
export const analytics = getAnalytics(app);
export const FIREBASE_AUTH = getAuth(app)
// Initialize Firestore
export const firestore = getFirestore(app);

// Initialize Auth with React Native persistence
//export const auth = initializeAuth(app, {
//  persistence: getReactNativePersistence(AsyncStorage),
//});