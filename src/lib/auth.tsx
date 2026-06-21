import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, logOut as firebaseLogOut } from './firebase.ts';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  signInAsSandbox: () => void;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInAsSandbox: () => {},
  logOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(() => {
    const cachedSandbox = localStorage.getItem('operator_sandbox_user');
    if (cachedSandbox) {
      try {
        return JSON.parse(cachedSandbox);
      } catch (e) {
        console.error("Failed to parse cached sandbox user", e);
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    const cachedSandbox = localStorage.getItem('operator_sandbox_user');
    return cachedSandbox ? false : true;
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser: any) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        localStorage.removeItem('operator_sandbox_user'); // Clear sandbox if real authentic user is signed in
      } else {
        const sandbox = localStorage.getItem('operator_sandbox_user');
        if (sandbox) {
          try {
            setUser(JSON.parse(sandbox));
          } catch (e) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInAsSandbox = () => {
    const sandboxUser = {
      uid: 'sandbox_developer_uid',
      displayName: 'Sandbox Designer',
      email: 'sandbox@operator.ai',
      photoURL: 'https://ui-avatars.com/api/?name=Sandbox+Designer&background=2563eb&color=fff',
      isSandbox: true,
    };
    localStorage.setItem('operator_sandbox_user', JSON.stringify(sandboxUser));
    setUser(sandboxUser);
  };

  const handleLogOut = async () => {
    localStorage.removeItem('operator_sandbox_user');
    setUser(null);
    await firebaseLogOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInAsSandbox, logOut: handleLogOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
