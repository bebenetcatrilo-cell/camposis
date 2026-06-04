'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  Wheat,
  FileText,
  Receipt,
  CreditCard,
  Settings,
  Crown,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Check,
} from 'lucide-react';
import { logoutAction } from '@/lib/actions/auth';
import { cambiarProductorAction } from '@/lib/actions/cambiar-productor';
import { cn } from '@/lib/utils';
import type { MembresiaConProductor } from '@/lib/types';

const menu = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/silos', label: 'Silos', icon: Wheat },
  { href: '/admin/presupuestos', label: 'Presupuestos', icon: FileText },
  { href: '/admin/facturas', label: 'Facturas', icon: Receipt },
  { href: '/admin/cheques', label: 'Cheques', icon: CreditCard },
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
  productorActivoId: string;
  membresia: MembresiaConProductor[];
};

export function Sidebar({
  nombreUsuario,
  rolLabel,
  nombreProductor,
  plan,
  estadoSuscripcion,
  logoUrl,
  productorActivoId,
  membresia,
}: Props) {
  const pathname = usePathname();
  const tieneMultipleMembresia = membresia.length > 1;

  return (
    <aside className="hidden lg:flex w-64 flex-col shrink-0 bg-white border-r border-[var(--border)]">
      {/* Header: Logo + Switcher de productor */}
      <div className="px-4 py-5 border-b border-[var(--border)]">
        {tieneMultipleMembresia ? (
          <ProductorSwitcher
            productorActivoId={productorActivoId}
            nombreProductor={nombreProductor}
            logoUrl={logoUrl}
            membresia={membresia}
          />
        ) : (
          <div className="text-center">
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

      {/* Footer */}
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

// ──────────────────────────────────────────────────────────────
// SWITCHER DE PRODUCTOR (dropdown)
// ──────────────────────────────────────────────────────────────
function ProductorSwitcher({
  productorActivoId,
  nombreProductor,
  logoUrl,
  membresia,
}: {
  productorActivoId: string;
  nombreProductor?: string | null;
  logoUrl?: string | null;
  membresia: MembresiaConProductor[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSwitch(productorId: string) {
    setOpen(false);
    startTransition(async () => {
      await cambiarProductorAction(productorId);
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--bg-hover)] transition text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-[var(--bg-hover)] grid place-items-center shrink-0 overflow-hidden">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="text-2xl">🌾</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-semibold leading-none">
            Productor activo
          </p>
          <p className="text-sm font-bold truncate mt-0.5">{nombreProductor}</p>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-[var(--fg-muted)] transition',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[var(--border)] rounded-xl shadow-xl z-40 overflow-hidden">
            <div className="px-3 py-2 border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-semibold">
              Cambiar a otro productor
            </div>
            {membresia.map((m) => {
              const activo = m.productor_id === productorActivoId;
              return (
                <button
                  key={m.productor_id}
                  onClick={() => handleSwitch(m.productor_id)}
                  disabled={pending || activo}
                  className={cn(
                    'w-full flex items-center gap-2 p-2.5 hover:bg-[var(--bg-hover)] transition text-left',
                    activo && 'bg-[var(--bg-hover)] cursor-default'
                  )}
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-hover)] grid place-items-center shrink-0 overflow-hidden">
                    {m.productor.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.productor.logo_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-base">🌾</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{m.productor.nombre}</p>
                    {m.productor.nombre_campo && (
                      <p className="text-[10px] text-[var(--fg-muted)] truncate">{m.productor.nombre_campo}</p>
                    )}
                  </div>
                  {activo && <Check className="w-4 h-4 text-[var(--primary)] shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
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
