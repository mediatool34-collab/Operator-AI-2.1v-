import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const login = async () => {
    if (isLoggingIn) return;
    
    try {
      setIsLoggingIn(true);
      setAuthError(null);
      const { signInWithGoogle } = await import('./firebase');
      await signInWithGoogle();
    } catch (error: any) {
      // Don't show error if user just closed the popup
      if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        process.env.NODE_ENV !== 'production' && console.log('User cancelled sign-in');
        return;
      }
      
      console.error('Login failed:', error);
      
      let message = 'Authentication failed. Please try again.';
      if (error?.code === 'auth/popup-blocked') {
        message = 'Login popup was blocked by your browser. Please allow popups for this site.';
        alert(message);
      } else if (error?.code === 'auth/internal-error') {
        message = 'A connection error occurred. Please try again or open in a new tab.';
      }
      
      setAuthError(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      setAuthError(null);
      const { logOut } = await import('./firebase');
      await logOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

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
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
      {authError && (
        <div className="fixed bottom-4 right-4 z-[9999] animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-xl px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-sm font-medium text-red-100">{authError}</p>
            <button 
              onClick={() => setAuthError(null)}
              className="text-red-400 hover:text-white transition-colors ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
