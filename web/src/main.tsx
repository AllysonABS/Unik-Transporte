import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import LandingPage from './pages/LandingPage';
import CadastroPage from './pages/CadastroPage';
import PrivacidadePage from './pages/PrivacidadePage';
import TermosPage from './pages/TermosPage';
import ExclusaoDadosPage from './pages/ExclusaoDadosPage';
import { queryClient } from './lib/queryClient';
import { EmpresaAuthProvider } from './context/EmpresaAuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';
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
import AdminLoginPage from './pages/admin/LoginPage';
import AdminDashboardPage from './pages/admin/DashboardPage';
import AdminEmpresasPage from './pages/admin/EmpresasPage';
import AdminClientesPage from './pages/admin/ClientesPage';
import AdminDespachantesPage from './pages/admin/DespachantesPage';
import AdminPedidosPage from './pages/admin/PedidosPage';
import AdminAssinaturasPage from './pages/admin/AssinaturasPage';
import AdminWhatsappPage from './pages/admin/WhatsappPage';
import { Toaster } from './components/ui/sonner';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <EmpresaAuthProvider>
        <AdminAuthProvider>
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

              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboardPage />} />
                  <Route path="empresas" element={<AdminEmpresasPage />} />
                  <Route path="clientes" element={<AdminClientesPage />} />
                  <Route path="despachantes" element={<AdminDespachantesPage />} />
                  <Route path="pedidos" element={<AdminPedidosPage />} />
                  <Route path="assinaturas" element={<AdminAssinaturasPage />} />
                  <Route path="whatsapp" element={<AdminWhatsappPage />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster />
        </AdminAuthProvider>
      </EmpresaAuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
