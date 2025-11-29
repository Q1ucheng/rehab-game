import * as firebaseAppModule from 'firebase/app';
// Use namespace import and cast to handle potential CDN module differences
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

// Configuration
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
let isMockMode = true;

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
// Set of observers to notify when auth state changes in mock mode
const mockAuthObservers = new Set<(user: UserProfile | null) => void>();

const notifyMockObservers = (user: UserProfile | null) => {
  mockAuthObservers.forEach(cb => {
    try {
      cb(user);
    } catch (e) {
      console.error("Error in auth observer", e);
    }
  });
};

export const authService = {
  login: async (email: string, pass: string) => {
    if (isMockMode) {
      // Mock login - create deterministic ID from email
      const uid = 'mock-user-' + email.replace(/[^a-zA-Z0-9]/g, '');
      let profile = mockDb[uid];
      
      // Try to recover from local storage
      if (!profile) {
        const stored = localStorage.getItem('mock_auth');
        if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed.email === email) {
                  profile = parsed;
                  mockDb[uid] = profile;
              }
            } catch (e) {
              console.error("Failed to parse mock auth storage", e);
            }
        }
      }

      // If still no profile, create a default one
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
      
      // Notify listeners
      notifyMockObservers(profile);

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
      
      // Notify listeners
      notifyMockObservers(profile);

      return { user: mockUser };
    }
    
    // Real Firebase
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (result.user) {
      await updateProfile(result.user, { displayName: name });
      // Create the profile in Firestore
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
      notifyMockObservers(null);
      return;
    }
    return signOut(auth);
  }
};

export const userService = {
  createUserProfile: async (profile: UserProfile) => {
    if (isMockMode) {
      mockDb[profile.uid] = profile;
      // Sync to storage if current user
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
        
        // Sync to storage if current user
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
    
    // Simple check-and-update for score (race conditions possible but ok for demo)
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
    mockAuthObservers.add(cb);
    
    // Check initial state from local storage to restore session on refresh
    const stored = localStorage.getItem('mock_auth');
    if (stored) {
        try {
            const user = JSON.parse(stored);
            if (user && user.uid) {
              mockDb[user.uid] = user; // Hydrate memory DB
              cb(user);
            } else {
              cb(null);
            }
        } catch (e) {
            console.error("Failed to parse mock auth", e);
            cb(null);
        }
    } else {
        cb(null);
    }
    
    return () => { mockAuthObservers.delete(cb); };
  }
  
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        let profile = await userService.getUserProfile(firebaseUser.uid);
        // Fallback if profile doesn't exist yet (race condition with creation)
        if (!profile) {
           profile = {
             uid: firebaseUser.uid,
             email: firebaseUser.email,
             displayName: firebaseUser.displayName,
             description: '',
             highScore: 0
           };
        }
        cb(profile);
      } catch (e) {
        console.error("Error fetching user profile", e);
        cb(null);
      }
    } else {
      cb(null);
    }
  });
};