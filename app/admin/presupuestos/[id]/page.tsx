import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { CambiarEstado } from './cambiar-estado';
import { CompartirBtn } from './compartir-btn';
import { ImprimirBtn } from './imprimir-btn';
import { formatARS, formatFecha } from '@/lib/utils';

const ESTADOS: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  pendiente: { label: 'Pendiente', icon: '⏳', bg: 'bg-amber-100', text: 'text-amber-700' },
  aprobado: { label: 'Aprobado', icon: '✓', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  rechazado: { label: 'Rechazado', icon: '✗', bg: 'bg-red-100', text: 'text-red-700' },
  facturado: { label: 'Facturado', icon: '🧾', bg: 'bg-blue-100', text: 'text-blue-700' },
};

export default async function PresupuestoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();

  const { data: pres } = await supabase
    .from('presupuestos')
    .select('*')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!pres) notFound();

  const { data: items } = await supabase
    .from('items_presupuesto')
    .select('*')
    .eq('presupuesto_id', id)
    .order('orden');

  const { data: productor } = await supabase
    .from('productores')
    .select('nombre, nombre_campo, cuit, direccion, localidad, provincia, telefono, whatsapp, email_contacto, logo_url, color_primario')
    .eq('id', ctx.productor.id)
    .single();

  const est = ESTADOS[pres.estado] ?? ESTADOS.pendiente;
  const numFmt = String(pres.numero).padStart(4, '0');

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <Link
          href="/admin/presupuestos"
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver a presupuestos
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap mt-2">
          <div>
            <h1
              className="text-3xl tracking-tight flex items-center gap-3"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              📋 Presupuesto Nº {numFmt}
              <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${est.bg} ${est.text}`}>
                {est.icon} {est.label}
              </span>
            </h1>
            <p className="text-[var(--fg-muted)] mt-1">
              {formatFecha(pres.fecha)} · {pres.cliente_nombre}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {pres.token_publico && <CompartirBtn token={pres.token_publico} cliente={pres.cliente_nombre} numero={numFmt} total={Number(pres.total)} />}
            {productor && items && (
              <ImprimirBtn
                pres={pres}
                items={items}
                productor={productor}
              />
            )}
            <CambiarEstado id={pres.id} estado={pres.estado} />
            <Link
              href={`/admin/presupuestos/${pres.id}/editar`}
              className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
            >
              ✏️ Editar
            </Link>
          </div>
        </div>
      </header>

      {/* Datos cliente */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--fg-muted)] mb-3">
          👤 Cliente
        </h2>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="font-bold text-base">{pres.cliente_nombre}</p>
            {pres.cliente_cuit && (
              <p className="text-[var(--fg-muted)]">CUIT: {pres.cliente_cuit}</p>
            )}
            {pres.cliente_condicion_iva && (
              <p className="text-[var(--fg-muted)]">IVA: {pres.cliente_condicion_iva}</p>
            )}
          </div>
          <div>
            {pres.cliente_direccion && <p>{pres.cliente_direccion}</p>}
            {pres.cliente_localidad && (
              <p className="text-[var(--fg-muted)]">{pres.cliente_localidad}</p>
            )}
          </div>
        </div>
        {pres.concepto && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <p className="text-xs uppercase tracking-wider text-[var(--fg-muted)] font-semibold mb-1">Concepto</p>
            <p className="text-sm">{pres.concepto}</p>
          </div>
        )}
      </div>

      {/* Ítems */}
      <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--fg-muted)]">
            🛒 Ítems ({items?.length ?? 0})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-hover)] text-xs uppercase tracking-wider text-[var(--fg-muted)]">
            <tr>
              <th className="px-5 py-2.5 text-left font-semibold">Descripción</th>
              <th className="px-5 py-2.5 text-right font-semibold">Cantidad</th>
              <th className="px-5 py-2.5 text-right font-semibold">P. Unit.</th>
              <th className="px-5 py-2.5 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((it) => (
              <tr key={it.id} className="border-t border-[var(--border)]">
                <td className="px-5 py-3">{it.descripcion}</td>
                <td className="px-5 py-3 text-right font-mono">
                  {Number(it.cantidad).toFixed(2)} {it.unidad ?? ''}
                </td>
                <td className="px-5 py-3 text-right font-mono">
                  ${formatARS(Number(it.precio_unitario))}
                </td>
                <td className="px-5 py-3 text-right font-mono font-semibold">
                  ${formatARS(Number(it.subtotal))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Totales */}
        <div className="border-t border-[var(--border)] p-5 space-y-2 bg-[var(--bg-hover)]">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span className="font-semibold">${formatARS(Number(pres.subtotal))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>IVA ({pres.iva_porcentaje}%)</span>
            <span className="font-semibold">${formatARS(Number(pres.iva_monto))}</span>
          </div>
          <div className="flex justify-between text-lg font-extrabold border-t-2 border-[var(--border)] pt-2">
            <span>TOTAL</span>
            <span className="text-[var(--primary)]">${formatARS(Number(pres.total))}</span>
          </div>
        </div>
      </div>

      {/* Notas */}
      {pres.notas && (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--fg-muted)] mb-2">
            📝 Notas / Condiciones
          </h2>
          <p className="text-sm whitespace-pre-wrap">{pres.notas}</p>
        </div>
      )}

      {/* Tracking */}
      <div className="text-xs text-[var(--fg-muted)]">
        Creado: {new Date(pres.created_at).toLocaleString('es-AR')}
        {pres.updated_at !== pres.created_at && (
          <> · Modificado: {new Date(pres.updated_at).toLocaleString('es-AR')}</>
        )}
      </div>
    </div>
  );
}
