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
    <aside className="hidden lg:flex w-64 flex-col shrink-0 bg-[var(--carbon)] text-white">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10 text-center">
        <div className="text-4xl mb-2">🛡️</div>
        <p className="text-[12px] font-extrabold tracking-[.25em] leading-none">
          CAMPOS
        </p>
        <p className="text-[9px] tracking-[.35em] text-white/60 mt-1 leading-none">
          SUPER-ADMIN
        </p>
      </div>

      {/* Menu */}
      <nav className="p-3 flex flex-col gap-1 flex-1 overflow-y-auto">
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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-semibold truncate">{nombreUsuario}</p>
          <p className="text-xs text-white/60">Super-admin</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
