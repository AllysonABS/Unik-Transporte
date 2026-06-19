import { Navigate, Outlet } from 'react-router-dom';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';

export default function ProtectedRoute() {
  const { token } = useEmpresaAuth();

  if (!token) {
    return <Navigate to="/empresa/login" replace />;
  }

  return <Outlet />;
}
