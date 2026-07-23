import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '@/context/AdminAuthContext';

export default function AdminProtectedRoute() {
  const { token } = useAdminAuth();

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
