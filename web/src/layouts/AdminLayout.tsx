import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Truck,
  Package,
  CreditCard,
  MessageCircle,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { PageHeaderProvider, usePageHeader } from '@/context/PageHeaderContext';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/empresas', label: 'Empresas', icon: Building2 },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/despachantes', label: 'Despachantes', icon: Truck },
  { to: '/admin/pedidos', label: 'Pedidos', icon: Package },
  { to: '/admin/assinaturas', label: 'Assinaturas', icon: CreditCard },
  { to: '/admin/whatsapp', label: 'WhatsApp', icon: MessageCircle },
];

const COLLAPSE_KEY = 'narota_admin_sidebar_collapsed';

function AdminTopHeader() {
  const { title, subtitle } = usePageHeader();
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 h-14">
      <div>
        <h1 className="text-xl font-bold text-clareza leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray mt-0.5">{subtitle}</p>}
      </div>
    </header>
  );
}

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === 'true');

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, String(collapsed));
  }, [collapsed]);

  function handleLogout() {
    logout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="h-screen bg-matriz flex overflow-hidden">
        <aside
          className={cn(
            'relative shrink-0 border-r border-border bg-card flex flex-col transition-[width] duration-300 ease-in-out',
            collapsed ? 'w-[76px]' : 'w-64',
          )}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="absolute -right-3 top-[17px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-gray shadow-md hover:text-pulso hover:border-pulso/40 transition-colors"
          >
            <ChevronLeft className={cn('h-3.5 w-3.5 transition-transform', collapsed && 'rotate-180')} />
          </button>

          <div className={cn('flex items-center gap-3 px-5 h-14 border-b border-border', collapsed && 'justify-center px-0')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pulso/10 text-pulso font-bold text-sm shrink-0">
              A
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-clareza font-bold leading-tight truncate">Admin</p>
                <p className="text-xs text-gray truncate">{admin?.nome}</p>
              </div>
            )}
          </div>

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
                  </span>
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
        <main className="flex-1 flex flex-col overflow-y-auto">
          <PageHeaderProvider>
            <AdminTopHeader />
            <div className="flex-1 p-6">
              <Outlet />
            </div>
          </PageHeaderProvider>
        </main>
      </div>
    </TooltipProvider>
  );
}
