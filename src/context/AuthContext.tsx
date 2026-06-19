import React, {createContext, useContext, useState, useEffect} from 'react';
import {ClienteData, DespachanteData, setAuthToken} from '../services/api';
import {saveCredentials, getCredentials, clearCredentials} from '../utils/secureStorage';

export type EmpresaData = {
  id: string;
  nome_empresa: string;
  cnpj: string;
  nome_responsavel: string;
  email: string;
  telefone: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  horario_funcionamento?: string;
  status_assinatura: string;
};

type AuthContextType = {
  empresa: EmpresaData | null;
  setEmpresa: (e: EmpresaData | null) => void;
  cliente: ClienteData | null;
  setCliente: (c: ClienteData | null) => void;
  despachante: DespachanteData | null;
  setDespachante: (d: DespachanteData | null) => void;
  saveToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  empresa: null, setEmpresa: () => {},
  cliente: null, setCliente: () => {},
  despachante: null, setDespachante: () => {},
  saveToken: async () => {}, logout: async () => {},
});

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [despachante, setDespachante] = useState<DespachanteData | null>(null);

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
    setEmpresa(null);
    setCliente(null);
    setDespachante(null);
    setAuthToken(null);
    await clearCredentials();
  };

  return (
    <AuthContext.Provider value={{empresa, setEmpresa, cliente, setCliente, despachante, setDespachante, saveToken, logout}}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
