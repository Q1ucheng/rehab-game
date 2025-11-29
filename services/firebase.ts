import * as firebaseAppModule from 'firebase/app';
const { initializeApp, getApps } = firebaseAppModule as any;

import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc 
} from 'firebase/firestore';
import { UserProfile } from '../types';

// TODO: Replace with your actual Firebase configuration
// For development without keys, this service includes a mock fallback mode
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

let app: any;
let auth: any;
let db: any;
let isMockMode = true; // Set to true if config is invalid

try {
  if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.warn("Firebase config missing. Running in Mock Mode.");
    isMockMode = true;
  } else {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    isMockMode = false;
  }
} catch (e) {
  console.error("Firebase init error:", e);
  isMockMode = true;
}

// MOCK DATA STORE for offline dev
const mockDb: Record<string, UserProfile> = {};
// Observer callback to notify App of auth changes in mock mode
let mockAuthObserver: ((user: UserProfile | null) => void) | null = null;

export const authService = {
  login: async (email: string, pass: string) => {
    if (isMockMode) {
      // Mock login - create deterministic ID from email for consistency
      const uid = 'mock-user-' + email.replace(/[^a-zA-Z0-9]/g, '');
      let profile = mockDb[uid];
      
      // Try to recover from local storage if memory is empty (page refresh)
      if (!profile) {
        const stored = localStorage.getItem('mock_auth');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.email === email) {
                profile = parsed;
                mockDb[uid] = profile;
            }
        }
      }

      // If still no profile, create a default one to allow login
      if (!profile) {
          profile = { 
            uid, 
            email, 
            displayName: 'Mock User', 
            description: 'Recovering nicely.', 
            highScore: 0 
          };
          mockDb[uid] = profile;
      }

      // Persist session
      localStorage.setItem('mock_auth', JSON.stringify(profile));
      
      // Notify listener
      if (mockAuthObserver) mockAuthObserver(profile);

      return { user: { uid, email, displayName: profile.displayName } };
    }
    return signInWithEmailAndPassword(auth, email, pass);
  },

  register: async (email: string, pass: string, name: string) => {
    if (isMockMode) {
      const uid = 'mock-user-' + email.replace(/[^a-zA-Z0-9]/g, '');
      const mockUser = { uid, email, displayName: name };
      
      const profile: UserProfile = {
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.displayName,
        description: 'Recovering nicely.',
        highScore: 0
      };
      
      // Update DB
      mockDb[uid] = profile;
      
      // Persist session
      localStorage.setItem('mock_auth', JSON.stringify(profile));
      
      // Notify listener
      if (mockAuthObserver) mockAuthObserver(profile);

      return { user: mockUser };
    }
    
    // Real Firebase
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (result.user) {
      await updateProfile(result.user, { displayName: name });
      await userService.createUserProfile({
        uid: result.user.uid,
        email: result.user.email,
        displayName: name,
        description: '',
        highScore: 0
      });
    }
    return result;
  },

  logout: async () => {
    if (isMockMode) {
      localStorage.removeItem('mock_auth');
      if (mockAuthObserver) mockAuthObserver(null);
      return;
    }
    return signOut(auth);
  }
};

export const userService = {
  createUserProfile: async (profile: UserProfile) => {
    if (isMockMode) {
      mockDb[profile.uid] = profile;
      // Also update current session if it matches (syncs updates to storage)
      const stored = localStorage.getItem('mock_auth');
      if (stored) {
          const current = JSON.parse(stored);
          if (current.uid === profile.uid) {
              localStorage.setItem('mock_auth', JSON.stringify(profile));
          }
      }
      return;
    }
    await setDoc(doc(db, "users", profile.uid), profile);
  },

  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    if (isMockMode) {
      return mockDb[uid] || null;
    }
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  },

  updateStats: async (uid: string, newScore: number, description?: string) => {
    if (isMockMode) {
      if (mockDb[uid]) {
        if (newScore > mockDb[uid].highScore) mockDb[uid].highScore = newScore;
        if (description !== undefined) mockDb[uid].description = description;
        
        // Update session if it matches
        const stored = localStorage.getItem('mock_auth');
        if (stored) {
            const current = JSON.parse(stored);
            if (current.uid === uid) {
                 localStorage.setItem('mock_auth', JSON.stringify(mockDb[uid]));
            }
        }
      }
      return;
    }
    
    const userRef = doc(db, "users", uid);
    const updates: any = {};
    if (description !== undefined) updates.description = description;
    
    // Simple check-and-update for score
    const current = await getDoc(userRef);
    if (current.exists()) {
        const data = current.data() as UserProfile;
        if (newScore > data.highScore) {
            updates.highScore = newScore;
        }
    }
    
    if (Object.keys(updates).length > 0) {
        await updateDoc(userRef, updates);
    }
  }
};

export const initializeAuthListener = (cb: (user: UserProfile | null) => void) => {
  if (isMockMode) {
    mockAuthObserver = cb;
    
    // Check initial state from local storage to restore session on refresh
    const stored = localStorage.getItem('mock_auth');
    if (stored) {
        try {
            const user = JSON.parse(stored);
            mockDb[user.uid] = user; // Hydrate memory DB
            cb(user);
        } catch (e) {
            console.error("Failed to parse mock auth", e);
            cb(null);
        }
    } else {
        cb(null);
    }
    
    return () => { mockAuthObserver = null; };
  }
  
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const profile = await userService.getUserProfile(firebaseUser.uid);
      cb(profile);
    } else {
      cb(null);
    }
  });
};