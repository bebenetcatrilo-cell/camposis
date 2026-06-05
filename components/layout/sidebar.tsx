'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  LayoutDashboard,
  Users,
  Truck,
  ShoppingCart,
  Package,
  Wheat,
  Beef,
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

const menuPrincipal = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/proveedores', label: 'Proveedores', icon: Truck },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/silos', label: 'Silos', icon: Wheat },
  { href: '/admin/hacienda', label: 'Hacienda', icon: Beef },
  { href: '/admin/presupuestos', label: 'Presupuestos', icon: FileText },
  { href: '/admin/facturas', label: 'Facturas', icon: Receipt },
  { href: '/admin/compras', label: 'Compras', icon: ShoppingCart },
  { href: '/admin/pagos-proveedor', label: 'Pagos a Prov.', icon: Wallet },
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
    <aside className="hidden lg:flex w-[240px] flex-col shrink-0 bg-white border-r border-[var(--border)]">
      {/* LOGO */}
      <div className="px-4 pt-4 pb-3 border-b border-[var(--border)]">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[8px] bg-[var(--primary)] grid place-items-center shrink-0">
            <Sprout className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] leading-none font-bold tracking-tight">
              Campos <span className="text-[var(--primary)]">SIS</span>
            </p>
            <p className="text-[9px] text-[var(--fg-subtle)] mt-1 leading-none uppercase tracking-wider">
              Sistema Agropecuario
            </p>
          </div>
        </Link>
      </div>

      {/* PRODUCTOR ACTIVO */}
      <div className="px-3 py-3 border-b border-[var(--border)]">
        <p className="text-[9px] uppercase tracking-[.12em] text-[var(--fg-subtle)] font-semibold mb-1.5 px-1">
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

      {/* MENU PRINCIPAL */}
      <nav className="px-2 py-2 flex flex-col gap-px flex-1 overflow-y-auto">
        {menuPrincipal.map((item) => {
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
                'flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] font-medium transition relative',
                active
                  ? 'bg-[var(--primary-ll)] text-[var(--primary)] font-semibold'
                  : 'text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]'
              )}
            >
              {/* Línea izquierda cuando activo (estilo BBNet) */}
              {active && (
                <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r bg-[var(--primary)]" />
              )}
              <Icon className="w-[16px] h-[16px] shrink-0" strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}

        <div className="my-2 mx-2 border-t border-[var(--border)]" />

        {menuSecundario.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] font-medium transition relative',
                active
                  ? 'bg-[var(--primary-ll)] text-[var(--primary)] font-semibold'
                  : 'text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]'
              )}
            >
              {active && (
                <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r bg-[var(--primary)]" />
              )}
              <Icon className="w-[16px] h-[16px] shrink-0" strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* CENTRO DE AYUDA */}
      <div className="px-2 py-1">
        <Link
          href="#"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[12px] font-medium text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] transition"
        >
          <HelpCircle className="w-[14px] h-[14px]" strokeWidth={1.8} />
          Centro de ayuda
        </Link>
      </div>

      {/* USUARIO */}
      <div className="px-2 py-2 border-t border-[var(--border)]">
        <Link
          href="/admin/perfil"
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-[8px] transition',
            pathname.startsWith('/admin/perfil')
              ? 'bg-[var(--bg-hover)]'
              : 'hover:bg-[var(--bg-hover)]'
          )}
        >
          <div className="w-7 h-7 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[11px] font-bold shrink-0">
            {nombreUsuario.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold truncate leading-tight">{nombreUsuario}</p>
            <p className="text-[10px] text-[var(--fg-subtle)] truncate leading-tight">{rolLabel}</p>
          </div>
        </Link>
        <form action={logoutAction} className="mt-1">
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium text-[var(--fg-muted)] hover:bg-[#fde7e9] hover:text-[var(--red)] transition"
          >
            <LogOut className="w-[13px] h-[13px]" strokeWidth={1.8} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}

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
          'w-full flex items-center gap-2 p-1.5 rounded-[8px] transition text-left',
          tieneMultiple ? 'hover:bg-[var(--primary-ll)] cursor-pointer bg-[var(--primary-ll)]' : 'cursor-default bg-[var(--primary-ll)]'
        )}
      >
        <div className="w-7 h-7 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[11px] font-bold shrink-0 overflow-hidden">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            (nombreProductor || '?').charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold truncate leading-tight text-[var(--primary)]">{nombreProductor}</p>
          {tieneMultiple && (
            <p className="text-[10px] text-[var(--primary)] opacity-70 flex items-center gap-1 leading-tight mt-0.5">
              Cambiar
              <ChevronDown
                className={cn('w-2.5 h-2.5 transition', open && 'rotate-180')}
                strokeWidth={2}
              />
            </p>
          )}
        </div>
      </button>

      {open && tieneMultiple && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[var(--border)] rounded-[8px] shadow-lg z-40 overflow-hidden">
            <div className="px-2.5 py-1.5 border-b border-[var(--border)] text-[9px] uppercase tracking-wider text-[var(--fg-subtle)] font-semibold">
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
                    'w-full flex items-center gap-2 p-2 hover:bg-[var(--bg-hover)] transition text-left',
                    activo && 'bg-[var(--bg-hover)] cursor-default'
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[10px] font-bold shrink-0 overflow-hidden">
                    {m.productor.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.productor.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      m.productor.nombre.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate">{m.productor.nombre}</p>
                  </div>
                  {activo && <Check className="w-3 h-3 text-[var(--primary)] shrink-0" />}
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
      ? 'bg-[#dff6dd] text-[#107c10]'
      : estado === 'vencida'
      ? 'bg-[#fde7d9] text-[#ca5010]'
      : estado === 'suspendida'
      ? 'bg-[#fde7e9] text-[#c42b1c]'
      : 'bg-[#f0f0f0] text-[#5a5a5a]';
  return (
    <div className={`inline-block mt-2 px-1.5 py-0.5 rounded-[3px] text-[9px] font-semibold ${colorEstado}`}>
      {planLabels[plan] ?? plan}
    </div>
  );
}
