import React, {createContext, useContext, useState, useEffect} from 'react';
import {EntregadorData, setAuthToken} from '../services/api';
import {saveCredentials, getCredentials, clearCredentials} from '../utils/secureStorage';

type AuthContextType = {
  entregador: EntregadorData | null;
  setEntregador: (d: EntregadorData | null) => void;
  saveToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  entregador: null, setEntregador: () => {},
  saveToken: async () => {}, logout: async () => {},
});

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [entregador, setEntregador] = useState<EntregadorData | null>(null);

  useEffect(() => {
    (async () => {
      const creds = await getCredentials();
      if (creds?.password) {
        setAuthToken(creds.password);
      }
    })();
  }, []);

  const saveToken = async (token: string) => {
    setAuthToken(token);
    await saveCredentials('auth_token', token);
  };

  const logout = async () => {
    setEntregador(null);
    setAuthToken(null);
    await clearCredentials();
  };

  return (
    <AuthContext.Provider value={{entregador, setEntregador, saveToken, logout}}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
