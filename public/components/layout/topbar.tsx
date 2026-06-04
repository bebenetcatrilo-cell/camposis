'use client';

import { useState } from 'react';
import { Search, Calendar, Building2, Bell, HelpCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  nombreUsuario: string;
  rolLabel: string;
};

export function Topbar({ nombreUsuario, rolLabel }: Props) {
  const [campania, setCampania] = useState('2025/26');
  const [sucursal, setSucursal] = useState('Sucursal Central');

  return (
    <header className="h-16 bg-white border-b border-[var(--border)] flex items-center px-6 gap-4">
      {/* ── BUSCADOR ── */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-muted)]"
            strokeWidth={1.8}
          />
          <input
            type="search"
            placeholder="Buscar en Campos SIS..."
            className="w-full pl-10 pr-16 py-2 bg-[var(--bg-hover)] border border-transparent rounded-lg text-sm placeholder:text-[var(--fg-muted)] focus:outline-none focus:bg-white focus:border-[var(--primary)]"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--fg-muted)] bg-white px-1.5 py-0.5 rounded border border-[var(--border)] font-mono font-semibold">
            Ctrl + K
          </span>
        </div>
      </div>

      {/* ── CAMPAÑA ── */}
      <div className="relative">
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-hover)] transition text-sm">
          <Calendar className="w-4 h-4 text-[var(--fg-muted)]" strokeWidth={1.8} />
          <span className="font-semibold">Campaña {campania}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--fg-muted)]" strokeWidth={2} />
        </button>
      </div>

      {/* ── SUCURSAL ── */}
      <div className="relative">
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-hover)] transition text-sm">
          <Building2 className="w-4 h-4 text-[var(--fg-muted)]" strokeWidth={1.8} />
          <span className="font-semibold">{sucursal}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--fg-muted)]" strokeWidth={2} />
        </button>
      </div>

      {/* ── NOTIFICACIONES ── */}
      <button
        className="relative p-2 rounded-lg hover:bg-[var(--bg-hover)] transition"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5 text-[var(--fg-muted)]" strokeWidth={1.8} />
      </button>

      {/* ── AYUDA ── */}
      <button
        className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition"
        title="Ayuda"
      >
        <HelpCircle className="w-5 h-5 text-[var(--fg-muted)]" strokeWidth={1.8} />
      </button>

      {/* ── AVATAR ── */}
      <div className="flex items-center gap-2.5 pl-3 border-l border-[var(--border)]">
        <div className="w-9 h-9 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[13px] font-bold">
          {nombreUsuario.charAt(0).toUpperCase()}
        </div>
        <div className="text-right hidden xl:block">
          <p className="text-[13px] font-bold leading-tight">{nombreUsuario}</p>
          <p className="text-[11px] text-[var(--fg-muted)] leading-tight">{rolLabel}</p>
        </div>
      </div>
    </header>
  );
}
