import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  limit,
  startAfter,
  setDoc,
  getDoc,
  getDocFromServer,
  serverTimestamp,
  persistentLocalCache
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Detect if mobile for better login strategy
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const signIn = async () => {
  try {
    // Attempt popup first, as it's better for maintaining state in iframes
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error("Login error:", error);
    
    // Fallback for mobile and blocked popups
    if (
      error.code === 'auth/popup-blocked' || 
      error.code === 'auth/cancelled-popup-request' ||
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    ) {
      console.log("Switching to redirect for mobile/blocked environment");
      return await signInWithRedirect(auth, googleProvider);
    }
    
    throw error;
  }
};

export const checkRedirectResult = () => getRedirectResult(auth);
export const signOut = () => auth.signOut();

export { 
  onAuthStateChanged,
  type User,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  setDoc,
  getDoc,
  getDocFromServer,
  serverTimestamp
};
