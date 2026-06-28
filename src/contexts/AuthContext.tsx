import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isPremium: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isPremium: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch custom claims or user document
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setIsAdmin(!!data.isAdmin);
          setIsPremium(!!data.isPremium);
        } else {
          // create default record
          await setDoc(userRef, {
            email: currentUser.email,
            isAdmin: false,
            isPremium: false,
            createdAt: new Date()
          });
          setIsAdmin(false);
          setIsPremium(false);
        }
      } else {
        setIsAdmin(false);
        setIsPremium(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOut = () => firebaseSignOut(auth);

  return (
    <AuthContext.Provider value={{ user, isAdmin, isPremium, loading, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
