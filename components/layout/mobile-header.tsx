'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import { logoutAction } from '@/lib/actions/auth';
import { cn } from '@/lib/utils';

const menu = [
  { href: '/admin', label: '🏠 Dashboard' },
  { href: '/admin/clientes', label: '👤 Clientes' },
  { href: '/admin/productos', label: '📦 Productos' },
  { href: '/admin/silos', label: '🌾 Silos' },
  { href: '/admin/presupuestos', label: '📋 Presupuestos' },
  { href: '/admin/facturas', label: '🧾 Facturas' },
  { href: '/admin/cheques', label: '💳 Cheques' },
  { href: '/admin/cuentas-corrientes', label: '💰 Cta. Corriente' },
  { href: '/admin/configuracion', label: '⚙️ Configuración' },
  { href: '/admin/suscripcion', label: '💎 Mi plan' },
];

export default function MobileHeader({
  nombreUsuario,
  rolLabel,
  nombreProductor,
}: {
  nombreUsuario: string;
  rolLabel: string;
  nombreProductor?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[var(--border)] sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🌾</span>
          <div>
            <p className="text-sm font-extrabold leading-none">Campos SIS</p>
            {nombreProductor && (
              <p className="text-[10px] text-[var(--fg-muted)] mt-0.5 truncate max-w-[180px]">
                {nombreProductor}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-2 -m-2 rounded-lg hover:bg-[var(--bg-hover)] transition"
          aria-label="Menú"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setOpen(false)}
          />
          <aside className="lg:hidden fixed top-0 right-0 bottom-0 w-72 bg-white z-50 shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <p className="text-sm font-semibold">{nombreUsuario}</p>
              <p className="text-xs text-[var(--fg-muted)]">{rolLabel}</p>
            </div>
            <nav className="p-3 flex flex-col gap-1 flex-1 overflow-y-auto">
              {menu.map((item) => {
                const active =
                  item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'px-3 py-2.5 rounded-lg text-sm font-medium transition',
                      active
                        ? 'bg-[var(--primary)] text-white'
                        : 'text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg)]'
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-[var(--border)]">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--red)] hover:bg-[var(--red-bg)] transition"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </form>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
