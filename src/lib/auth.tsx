import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Sync user profile to Firestore
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          const profileData = {
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || null,
            photoURL: firebaseUser.photoURL || null,
            updatedAt: serverTimestamp(),
          };

          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              ...profileData,
              createdAt: serverTimestamp(),
            });
          } else {
            await setDoc(userDocRef, profileData, { merge: true });
          }
        } catch (error) {
          console.error('Error syncing user profile:', error);
          if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
             try {
               handleFirestoreError(error, 'write', `users/${firebaseUser.uid}`);
             } catch (handledError) {
               console.error('Detailed security error:', handledError);
             }
          }
        }
      }
      
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
