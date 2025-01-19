import { firestore } from "../config/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Save preferences completion status
export const savePreferencesCompletion = async (userId) => {
  try {
    await setDoc(
      doc(firestore, "users", userId),
      { preferencesCompleted: true },
      { merge: true } // Merge with existing data
    );
  } catch (error) {
    console.error("Error saving preferences completion:", error);
  }
};

// Check preferences completion status
export const someStorageCheck = async (userId) => {
  try {
    const userDoc = await getDoc(doc(firestore, "users", userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.preferencesCompleted || false; // Default to false if not set
    }
    return false; // User document doesn't exist
  } catch (error) {
    console.error("Error checking preferences completion:", error);
    return false;
  }
};
