import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import LandingPage from './pages/LandingPage';
import CadastroPage from './pages/CadastroPage';
import PrivacidadePage from './pages/PrivacidadePage';
import TermosPage from './pages/TermosPage';
import ExclusaoDadosPage from './pages/ExclusaoDadosPage';
import { queryClient } from './lib/queryClient';
import { EmpresaAuthProvider } from './context/EmpresaAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/empresa/LoginPage';
import EsqueceuSenhaPage from './pages/empresa/EsqueceuSenhaPage';
import DashboardPage from './pages/empresa/DashboardPage';
import PedidosPage from './pages/empresa/PedidosPage';
import ClientesPage from './pages/empresa/ClientesPage';
import DespachantesPage from './pages/empresa/DespachantesPage';
import ExcursoesPage from './pages/empresa/ExcursoesPage';
import RelatoriosPage from './pages/empresa/RelatoriosPage';
import NotificacoesPage from './pages/empresa/NotificacoesPage';
import ConfiguracoesPage from './pages/empresa/ConfiguracoesPage';
import { Toaster } from './components/ui/sonner';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <EmpresaAuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/cadastro" element={<CadastroPage />} />
            <Route path="/privacidade" element={<PrivacidadePage />} />
            <Route path="/termos" element={<TermosPage />} />
            <Route path="/exclusao-de-dados" element={<ExclusaoDadosPage />} />

            <Route path="/empresa/login" element={<LoginPage />} />
            <Route path="/empresa/esqueceu-senha" element={<EsqueceuSenhaPage />} />
            <Route path="/empresa" element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="despachos" element={<PedidosPage />} />
                <Route path="clientes" element={<ClientesPage />} />
                <Route path="despachantes" element={<DespachantesPage />} />
                <Route path="excursoes" element={<ExcursoesPage />} />
                <Route path="relatorios" element={<RelatoriosPage />} />
                <Route path="notificacoes" element={<NotificacoesPage />} />
                <Route path="configuracoes" element={<ConfiguracoesPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </EmpresaAuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
