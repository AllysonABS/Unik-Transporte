import { useQuery } from '@tanstack/react-query';
import { Building2, Users, Truck, Package, CreditCard, CheckCircle2 } from 'lucide-react';
import { useSetPageHeader } from '@/hooks/useSetPageHeader';
import { buscarStatsAdmin } from '@/services/admin';
import { Skeleton } from '@/components/ui/skeleton';

const cards = [
  { key: 'total_empresas', label: 'Empresas', icon: Building2, color: '#00E676' },
  { key: 'empresas_ativas', label: 'Empresas ativas', icon: CheckCircle2, color: '#60A5FA' },
  { key: 'total_clientes', label: 'Clientes', icon: Users, color: '#F59E0B' },
  { key: 'total_despachantes', label: 'Despachantes', icon: Truck, color: '#A78BFA' },
  { key: 'total_pedidos', label: 'Pedidos', icon: Package, color: '#FCA5A5' },
  { key: 'assinaturas_ativas', label: 'Assinaturas ativas', icon: CreditCard, color: '#86EFAC' },
] as const;

export default function AdminDashboardPage() {
  useSetPageHeader('Dashboard', 'Panorama geral da plataforma');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: buscarStatsAdmin,
    refetchInterval: 5000,
  });

  const stats = data?.stats;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {isLoading
        ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        : cards.map(card => (
            <div
              key={card.key}
              className="rounded-xl border border-border bg-card p-5 flex items-center gap-4"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${card.color}1A` }}
              >
                <card.icon className="h-5 w-5" style={{ color: card.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-clareza leading-tight">
                  {stats ? stats[card.key] : 0}
                </p>
                <p className="text-sm text-gray">{card.label}</p>
              </div>
            </div>
          ))}
    </div>
  );
}
