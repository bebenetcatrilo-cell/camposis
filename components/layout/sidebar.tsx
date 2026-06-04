'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  Wheat,
  Beef,
  FileText,
  Receipt,
  BarChart3,
  Bell,
  UserCog,
  Settings,
  Crown,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { logoutAction } from '@/lib/actions/auth';
import { cn } from '@/lib/utils';

const menu = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/silos', label: 'Silos', icon: Wheat },
  { href: '/admin/hacienda', label: 'Hacienda', icon: Beef },
  { href: '/admin/presupuestos', label: 'Presupuestos', icon: FileText },
  { href: '/admin/facturas', label: 'Facturas', icon: Receipt },
  { href: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
  { href: '/admin/recordatorios', label: 'Recordatorios', icon: Bell },
  { href: '/admin/usuarios', label: 'Usuarios', icon: UserCog },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
  { href: '/admin/suscripcion', label: 'Mi plan', icon: Crown },
];

type Props = {
  nombreUsuario: string;
  rolLabel: string;
  nombreProductor?: string | null;
  plan?: string | null;
  estadoSuscripcion?: string | null;
  logoUrl?: string | null;
};

export function Sidebar({
  nombreUsuario,
  rolLabel,
  nombreProductor,
  plan,
  estadoSuscripcion,
  logoUrl,
}: Props) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 flex-col shrink-0 bg-white border-r border-[var(--border)]">
      {/* Logo del productor + nombre */}
      <div className="px-6 py-6 border-b border-[var(--border)] text-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt="Logo"
            className="w-12 h-12 mx-auto mb-2 object-contain rounded"
          />
        ) : (
          <div className="text-4xl mb-2">🌾</div>
        )}
        <p className="text-[12px] font-extrabold tracking-[.25em] leading-none">
          CAMPOS
        </p>
        <p className="text-[9px] tracking-[.35em] text-[var(--fg-muted)] mt-1 leading-none">
          SIS
        </p>
        {nombreProductor && (
          <p className="text-[11px] text-[var(--fg-muted)] mt-3 truncate">
            {nombreProductor}
          </p>
        )}
        {plan && (
          <PlanChip plan={plan} estado={estadoSuscripcion} />
        )}
      </div>

      {/* Menu */}
      <nav className="p-3 flex flex-col gap-1 flex-1 overflow-y-auto">
        {menu.map((item) => {
          const active =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                active
                  ? 'bg-[var(--primary)] text-white shadow-sm'
                  : 'text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]'
              )}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer con usuario */}
      <div className="p-3 border-t border-[var(--border)]">
        <Link
          href="/admin/perfil"
          className={cn(
            'block px-3 py-2 mb-1 rounded-lg transition',
            pathname.startsWith('/admin/perfil')
              ? 'bg-[var(--bg-hover)]'
              : 'hover:bg-[var(--bg-hover)]'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white grid place-items-center text-xs font-bold">
              {nombreUsuario.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{nombreUsuario}</p>
              <p className="text-xs text-[var(--fg-muted)]">{rolLabel}</p>
            </div>
            <UserIcon className="w-4 h-4 text-[var(--fg-muted)]" strokeWidth={1.8} />
          </div>
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--red)] transition"
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}

function PlanChip({ plan, estado }: { plan: string; estado?: string | null }) {
  const planLabels: Record<string, string> = {
    trial: '🎁 Trial',
    basico: '📦 Básico',
    pro: '💎 Pro',
    enterprise: '🏢 Enterprise',
  };

  const colorEstado =
    estado === 'activa' ? 'bg-emerald-100 text-emerald-700'
    : estado === 'vencida' ? 'bg-amber-100 text-amber-700'
    : estado === 'suspendida' ? 'bg-red-100 text-red-700'
    : 'bg-gray-100 text-gray-700';

  return (
    <div className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-semibold ${colorEstado}`}>
      {planLabels[plan] ?? plan}
    </div>
  );
}
