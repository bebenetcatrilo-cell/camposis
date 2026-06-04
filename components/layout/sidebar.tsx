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
  Wallet,
  Settings,
  Crown,
  LogOut,
  ChevronDown,
  Check,
  Sprout,
  HelpCircle,
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
  { href: '/admin/cuentas-corrientes', label: 'Cta. Corriente', icon: Wallet },
];

const menuSecundario = [
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

  return (
    <aside className="hidden lg:flex w-[260px] flex-col shrink-0 bg-white border-r border-[var(--border)]">
      {/* ── LOGO ── */}
      <div className="px-5 pt-6 pb-5 border-b border-[var(--border)]">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)] grid place-items-center shrink-0">
            <Sprout className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[19px] leading-none font-extrabold tracking-tight"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Campos <span className="text-[var(--primary)]">SIS</span>
            </p>
            <p className="text-[10px] text-[var(--fg-muted)] mt-1 leading-none">
              Sistema Integral Agropecuario
            </p>
          </div>
        </Link>
      </div>

      {/* ── PRODUCTOR ACTIVO ── */}
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <p className="text-[10px] uppercase tracking-[.18em] text-[var(--fg-muted)] font-bold mb-2">
          Productor activo
        </p>
        <ProductorSwitcher
          productorActivoId={productorActivoId}
          nombreProductor={nombreProductor}
          logoUrl={logoUrl}
          membresia={membresia}
          tieneMultiple={membresia.length > 1}
        />
        {plan && <PlanChip plan={plan} estado={estadoSuscripcion} />}
      </div>

      {/* ── MENU PRINCIPAL ── */}
      <nav className="px-3 py-3 flex flex-col gap-0.5 flex-1 overflow-y-auto">
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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition',
                active
                  ? 'bg-[var(--primary-bg)] text-[var(--primary)] font-semibold'
                  : 'text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]'
              )}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.7} />
              {item.label}
            </Link>
          );
        })}

        {/* Separador */}
        <div className="my-3 mx-3 border-t border-[var(--border)]" />

        {menuSecundario.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition',
                active
                  ? 'bg-[var(--primary-bg)] text-[var(--primary)] font-semibold'
                  : 'text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]'
              )}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.7} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── CENTRO DE AYUDA ── */}
      <div className="px-3 py-2">
        <Link
          href="#"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] transition"
        >
          <HelpCircle className="w-[16px] h-[16px]" strokeWidth={1.7} />
          Centro de ayuda
        </Link>
      </div>

      {/* ── USUARIO (FOOTER) ── */}
      <div className="px-3 py-3 border-t border-[var(--border)]">
        <Link
          href="/admin/perfil"
          className={cn(
            'flex items-center gap-2.5 px-2 py-2 rounded-lg transition',
            pathname.startsWith('/admin/perfil')
              ? 'bg-[var(--bg-hover)]'
              : 'hover:bg-[var(--bg-hover)]'
          )}
        >
          <div className="w-9 h-9 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[13px] font-bold shrink-0">
            {nombreUsuario.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold truncate leading-tight">{nombreUsuario}</p>
            <p className="text-[11px] text-[var(--fg-muted)] truncate leading-tight">{rolLabel}</p>
          </div>
        </Link>
        <form action={logoutAction} className="mt-1">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-[var(--fg-muted)] hover:bg-red-50 hover:text-[var(--red)] transition"
          >
            <LogOut className="w-[15px] h-[15px]" strokeWidth={1.7} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────
// SWITCHER PRODUCTOR
// ─────────────────────────────────────────
function ProductorSwitcher({
  productorActivoId,
  nombreProductor,
  logoUrl,
  membresia,
  tieneMultiple,
}: {
  productorActivoId: string;
  nombreProductor?: string | null;
  logoUrl?: string | null;
  membresia: MembresiaConProductor[];
  tieneMultiple: boolean;
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
        onClick={() => tieneMultiple && setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-3 p-2 rounded-lg transition text-left',
          tieneMultiple ? 'hover:bg-[var(--bg-hover)] cursor-pointer' : 'cursor-default'
        )}
      >
        <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[14px] font-bold shrink-0 overflow-hidden">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            (nombreProductor || '?').charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold truncate leading-tight">{nombreProductor}</p>
          {tieneMultiple && (
            <p className="text-[11px] text-[var(--fg-muted)] flex items-center gap-1 leading-tight mt-0.5">
              Cambiar productor
              <ChevronDown
                className={cn('w-3 h-3 transition', open && 'rotate-180')}
                strokeWidth={2}
              />
            </p>
          )}
        </div>
      </button>

      {open && tieneMultiple && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
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
                  <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold shrink-0 overflow-hidden">
                    {m.productor.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.productor.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      m.productor.nombre.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{m.productor.nombre}</p>
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
    trial: 'Trial',
    basico: 'Básico',
    pro: 'Pro',
    enterprise: 'Enterprise',
  };
  const colorEstado =
    estado === 'activa'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : estado === 'vencida'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : estado === 'suspendida'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-gray-50 text-gray-700 border-gray-200';
  return (
    <div className={`inline-block mt-2.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${colorEstado}`}>
      {planLabels[plan] ?? plan}
    </div>
  );
}
