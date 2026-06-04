'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { logoutAction } from '@/lib/actions/auth';
import { cn } from '@/lib/utils';

const menu = [
  { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/super-admin/productores', label: 'Productores', icon: Building2 },
  { href: '/super-admin/suscripciones', label: 'Suscripciones', icon: CreditCard },
  { href: '/super-admin/reportes', label: 'Reportes', icon: BarChart3 },
  { href: '/super-admin/configuracion', label: 'Configuración', icon: Settings },
];

export function SuperSidebar({ nombreUsuario }: { nombreUsuario: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-[260px] flex-col shrink-0 bg-white border-r border-[var(--border)]">
      {/* LOGO */}
      <div className="px-5 pt-6 pb-5 border-b border-[var(--border)]">
        <Link href="/super-admin" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)] grid place-items-center shrink-0">
            <Shield className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[19px] leading-none font-extrabold tracking-tight"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Campos <span className="text-[var(--primary)]">SIS</span>
            </p>
            <p className="text-[10px] text-[var(--fg-muted)] mt-1 leading-none tracking-[.18em] uppercase">
              Super-Admin
            </p>
          </div>
        </Link>
      </div>

      {/* MENU */}
      <nav className="px-3 py-3 flex flex-col gap-0.5 flex-1 overflow-y-auto">
        {menu.map((item) => {
          const active =
            item.href === '/super-admin'
              ? pathname === '/super-admin'
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
      </nav>

      {/* AYUDA */}
      <div className="px-3 py-2">
        <Link
          href="#"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] transition"
        >
          <HelpCircle className="w-[16px] h-[16px]" strokeWidth={1.7} />
          Centro de ayuda
        </Link>
      </div>

      {/* USUARIO */}
      <div className="px-3 py-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          <div className="w-9 h-9 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[13px] font-bold shrink-0">
            {nombreUsuario.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold truncate leading-tight">{nombreUsuario}</p>
            <p className="text-[11px] text-[var(--fg-muted)] truncate leading-tight">Super-admin</p>
          </div>
        </div>
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
