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
    <aside className="hidden lg:flex w-[240px] flex-col shrink-0 bg-white border-r border-[var(--border)]">
      {/* LOGO */}
      <div className="px-4 pt-4 pb-3 border-b border-[var(--border)]">
        <Link href="/super-admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[8px] bg-[var(--primary)] grid place-items-center shrink-0">
            <Shield className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] leading-none font-bold tracking-tight">
              Campos <span className="text-[var(--primary)]">SIS</span>
            </p>
            <p className="text-[9px] text-[var(--fg-subtle)] mt-1 leading-none uppercase tracking-wider">
              Super-Admin
            </p>
          </div>
        </Link>
      </div>

      {/* MENU */}
      <nav className="px-2 py-2 flex flex-col gap-px flex-1 overflow-y-auto">
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

      {/* AYUDA */}
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
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-[8px]">
          <div className="w-7 h-7 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[11px] font-bold shrink-0">
            {nombreUsuario.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold truncate leading-tight">{nombreUsuario}</p>
            <p className="text-[10px] text-[var(--fg-subtle)] truncate leading-tight">Super-admin</p>
          </div>
        </div>
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
