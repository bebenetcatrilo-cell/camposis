'use client';

import { useEffect, useTransition } from 'react';
import { cambiarProductorAction } from '@/lib/actions/cambiar-productor';
import type { MembresiaConProductor } from '@/lib/types';

export function SeleccionarProductorList({
  membresia,
  autoSelect = false,
}: {
  membresia: MembresiaConProductor[];
  autoSelect?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  // Si solo hay UNA membresía, seleccionar automáticamente
  useEffect(() => {
    if (autoSelect && membresia.length === 1 && !pending) {
      startTransition(async () => {
        await cambiarProductorAction(membresia[0].productor_id);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSelect, membresia.length]);

  function handleSelect(productorId: string) {
    startTransition(async () => {
      const r = await cambiarProductorAction(productorId);
      if (r?.error) alert(r.error);
    });
  }

  if (autoSelect && membresia.length === 1) {
    return (
      <div className="bg-white border border-[var(--border)] rounded-2xl p-10 shadow-sm text-center">
        <div className="text-3xl mb-3">⏳</div>
        <p className="text-sm text-[var(--fg-muted)]">
          Entrando a <strong>{membresia[0].productor.nombre}</strong>...
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {membresia.map((m) => (
        <button
          key={m.id}
          onClick={() => handleSelect(m.productor_id)}
          disabled={pending}
          className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[var(--primary)] transition text-left flex items-center gap-4 group disabled:opacity-60"
        >
          <div className="w-14 h-14 rounded-xl bg-[var(--bg-hover)] grid place-items-center shrink-0 overflow-hidden">
            {m.productor.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.productor.logo_url}
                alt={m.productor.nombre}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-3xl">🌾</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold group-hover:text-[var(--primary)] truncate">
              {m.productor.nombre}
            </h3>
            {m.productor.nombre_campo && (
              <p className="text-xs text-[var(--fg-muted)] truncate">
                🌾 {m.productor.nombre_campo}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <RolChip rol={m.rol} />
              <PlanChip plan={m.productor.plan} estado={m.productor.estado_suscripcion} />
            </div>
          </div>

          <div className="text-2xl text-[var(--fg-subtle)] group-hover:text-[var(--primary)] transition">
            →
          </div>
        </button>
      ))}
    </div>
  );
}

function RolChip({ rol }: { rol: 'admin_productor' | 'empleado' }) {
  const map = {
    admin_productor: { label: '👑 Admin', bg: 'bg-purple-100', text: 'text-purple-700' },
    empleado: { label: '👤 Empleado', bg: 'bg-blue-100', text: 'text-blue-700' },
  };
  const c = map[rol];
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
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
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${colorEstado}`}>
      {planLabels[plan] ?? plan}
    </span>
  );
}
