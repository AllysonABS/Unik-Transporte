import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  Map,
  BarChart2,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { contarNotificacoesNaoLidas } from '@/services/notificacoes';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/empresa/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/empresa/pedidos', label: 'Pedidos', icon: Package },
  { to: '/empresa/clientes', label: 'Clientes', icon: Users },
  { to: '/empresa/despachantes', label: 'Despachantes', icon: Truck },
  { to: '/empresa/excursoes', label: 'Excursões', icon: Map },
  { to: '/empresa/relatorios', label: 'Relatórios', icon: BarChart2 },
  { to: '/empresa/notificacoes', label: 'Notificações', icon: Bell, badge: true },
  { to: '/empresa/configuracoes', label: 'Configurações', icon: Settings },
];

export default function DashboardLayout() {
  const { empresa, logout } = useEmpresaAuth();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['notificacoes-nao-lidas', empresa?.id],
    queryFn: () => contarNotificacoesNaoLidas(empresa!.id),
    enabled: !!empresa?.id,
    refetchInterval: 60_000,
  });
  const naoLidas = data?.total ?? 0;

  function handleLogout() {
    logout();
    navigate('/empresa/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-matriz flex">
      <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="px-5 py-6">
          <p className="text-xs uppercase tracking-widest text-gray">Empresa</p>
          <p className="text-clareza font-bold truncate">{empresa?.nome_empresa}</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-pulso/10 text-pulso'
                    : 'text-gray hover:bg-accent hover:text-clareza',
                )
              }
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-4 w-4" />
                {item.label}
              </span>
              {item.badge && naoLidas > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {naoLidas > 9 ? '9+' : naoLidas}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-danger hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
