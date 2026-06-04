'use client';

import { useState } from 'react';
import { Search, Calendar, Building2, Bell, HelpCircle, ChevronDown } from 'lucide-react';

type Props = {
  nombreUsuario: string;
  rolLabel: string;
};

export function Topbar({ nombreUsuario, rolLabel }: Props) {
  const [campania] = useState('2025/26');
  const [sucursal] = useState('Sucursal Central');

  return (
    <header className="h-12 bg-white/80 backdrop-blur-xl border-b border-[var(--border)] flex items-center px-4 gap-3 sticky top-0 z-40">
      {/* BUSCADOR */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--fg-subtle)]"
            strokeWidth={1.8}
          />
          <input
            type="search"
            placeholder="Buscar en Campos SIS..."
            className="w-full pl-8 pr-14 py-1.5 bg-[var(--bg-card-2)] border border-transparent rounded-[6px] text-[13px] placeholder:text-[var(--fg-subtle)] focus:outline-none focus:bg-white focus:border-[var(--primary)]"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[var(--fg-subtle)] bg-white px-1 py-0.5 rounded border border-[var(--border)] font-mono">
            Ctrl+K
          </span>
        </div>
      </div>

      {/* CAMPAÑA */}
      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition text-[12px]">
        <Calendar className="w-3.5 h-3.5 text-[var(--fg-subtle)]" strokeWidth={1.8} />
        <span className="font-medium">Campaña {campania}</span>
        <ChevronDown className="w-3 h-3 text-[var(--fg-subtle)]" strokeWidth={2} />
      </button>

      {/* SUCURSAL */}
      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition text-[12px]">
        <Building2 className="w-3.5 h-3.5 text-[var(--fg-subtle)]" strokeWidth={1.8} />
        <span className="font-medium">{sucursal}</span>
        <ChevronDown className="w-3 h-3 text-[var(--fg-subtle)]" strokeWidth={2} />
      </button>

      {/* NOTIFICACIONES */}
      <button
        className="p-1.5 rounded-[6px] hover:bg-[var(--bg-hover)] transition"
        title="Notificaciones"
      >
        <Bell className="w-4 h-4 text-[var(--fg-muted)]" strokeWidth={1.8} />
      </button>

      {/* AYUDA */}
      <button
        className="p-1.5 rounded-[6px] hover:bg-[var(--bg-hover)] transition"
        title="Ayuda"
      >
        <HelpCircle className="w-4 h-4 text-[var(--fg-muted)]" strokeWidth={1.8} />
      </button>

      {/* AVATAR */}
      <div className="flex items-center gap-2 pl-2.5 border-l border-[var(--border)]">
        <div className="w-7 h-7 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[11px] font-bold">
          {nombreUsuario.charAt(0).toUpperCase()}
        </div>
        <div className="text-right hidden xl:block">
          <p className="text-[12px] font-semibold leading-tight">{nombreUsuario}</p>
          <p className="text-[10px] text-[var(--fg-subtle)] leading-tight">{rolLabel}</p>
        </div>
      </div>
    </header>
  );
}
