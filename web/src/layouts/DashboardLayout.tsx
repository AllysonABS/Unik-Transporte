import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  ChevronLeft,
} from 'lucide-react';
import { useEmpresaAuth } from '@/context/EmpresaAuthContext';
import { contarNotificacoesNaoLidas } from '@/services/notificacoes';
import { cn } from '@/lib/utils';
import LogoMark from '@/components/empresa/LogoMark';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

const COLLAPSE_KEY = 'narota_sidebar_collapsed';

export default function DashboardLayout() {
  const { empresa, logout } = useEmpresaAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === 'true');

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, String(collapsed));
  }, [collapsed]);

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
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-matriz flex">
        <aside
          className={cn(
            'relative shrink-0 border-r border-border bg-card flex flex-col transition-[width] duration-300 ease-in-out',
            collapsed ? 'w-[76px]' : 'w-64',
          )}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="absolute -right-3 top-9 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-gray shadow-md hover:text-pulso hover:border-pulso/40 transition-colors"
          >
            <ChevronLeft className={cn('h-3.5 w-3.5 transition-transform', collapsed && 'rotate-180')} />
          </button>

          <div className={cn('flex items-center gap-3 px-5 py-6', collapsed && 'justify-center px-0')}>
            <LogoMark size="sm" />
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-clareza font-bold leading-tight truncate">Na Rota</p>
                <p className="text-xs text-gray truncate">{empresa?.nome_empresa}</p>
              </div>
            )}
          </div>

          <div className="border-t border-border" />

          <nav className="flex-1 space-y-1 px-3 py-3">
            {navItems.map(item => {
              const isActive = location.pathname === item.to;
              const linkContent = (
                <Link
                  to={item.to}
                  className={cn(
                    'relative flex items-center gap-3 rounded-md py-2.5 text-sm font-medium transition-colors',
                    collapsed ? 'justify-center px-0' : 'justify-between px-3',
                    isActive ? 'bg-pulso/10 text-pulso' : 'text-gray hover:bg-accent hover:text-clareza',
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-pulso" />
                  )}
                  <span className={cn('flex items-center gap-3', collapsed && 'relative')}>
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && item.label}
                    {collapsed && item.badge && naoLidas > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-destructive" />
                    )}
                  </span>
                  {!collapsed && item.badge && naoLidas > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {naoLidas > 9 ? '9+' : naoLidas}
                    </span>
                  )}
                </Link>
              );

              if (!collapsed) return <div key={item.to}>{linkContent}</div>;

              return (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="bg-card border-border text-clareza">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>

          <div className="px-3 py-4 border-t border-border">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    aria-label="Sair"
                    className="flex w-full items-center justify-center rounded-md py-2.5 text-danger hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-card border-border text-clareza">
                  Sair
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-danger hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            )}
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
