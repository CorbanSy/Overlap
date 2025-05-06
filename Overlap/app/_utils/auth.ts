import { FIREBASE_AUTH } from '../../FirebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../FirebaseConfig'; // Make sure this is your Firestore instance

export const signUp = async (email: string, password: string) => {
  try {
    // 1. Create the user via Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(FIREBASE_AUTH, email, password);
    const user = userCredential.user;

    // 2. Create a corresponding doc in Firestore using user.uid as the document ID
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email?.toLowerCase(),
      createdAt: new Date(),
      // Add any other profile data as needed
    });

    return user;
  } catch (error) {
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(FIREBASE_AUTH, email, password);
    const user = userCredential.user;

    // Check if a Firestore document exists for this user
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      // If not, create one automatically
      await setDoc(userDocRef, {
        email: user.email?.toLowerCase(),
        createdAt: new Date(),
        // Add any other profile data as needed
      });
    }

    return user;
  } catch (error) {
    throw error;
  }
};