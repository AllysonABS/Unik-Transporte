import { STATUS_CONFIG } from '@/lib/format';
import type { PedidoStatus } from '@/types/empresa';

export default function StatusBadge({ status }: { status: PedidoStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold"
      style={{ color: c.color, backgroundColor: c.bg }}
    >
      {c.label}
    </span>
  );
}
