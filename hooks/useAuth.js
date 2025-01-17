import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../config/firebase";
import { someStorageCheck } from "../utils/firestoreHelpers"; // Helper to check preferences

export default function useAuth() {
  const [user, setUser] = useState(null); // Stores authenticated user object
  const [preferencesCompleted, setPreferencesCompleted] = useState(false); // Tracks preference status
  const [loading, setLoading] = useState(true); // Tracks loading state

  useEffect(() => {
    // Subscribe to authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth state changed:", currentUser);
      if (currentUser) {
        try {
          setUser(currentUser); // Set the authenticated user
          const completed = await someStorageCheck(currentUser.uid); // Check preferences status
          console.log("Preferences completed:", completed);
          setPreferencesCompleted(completed); // Update state with result
        } catch (error) {
          console.error("Error checking preferences:", error);
          setPreferencesCompleted(false); // Default to false on error
        }
      } else {
        setUser(null); // Clear user on logout
        setPreferencesCompleted(false); // Reset preferences
      }
      setLoading(false); // Stop loading regardless of the outcome
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, []);

  return { user, preferencesCompleted, loading };
}
