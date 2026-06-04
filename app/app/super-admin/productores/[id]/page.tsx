import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatARS, formatFecha } from '@/lib/utils';
import { AccionesProductor } from '@/components/super-admin/acciones-productor';

export default async function ProductorDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Productor
  const { data: productor, error } = await supabase
    .from('productores')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !productor) {
    notFound();
  }

  // Miembros del productor (con perfil)
  const { data: miembros } = await supabase
    .from('miembros')
    .select('id, rol, activo, created_at, perfil:perfiles!miembros_perfil_id_fkey(id, nombre, email, telefono, ultimo_login)')
    .eq('productor_id', id)
    .order('created_at');

  // Suscripciones / pagos
  const { data: suscripciones } = await supabase
    .from('suscripciones')
    .select('*')
    .eq('productor_id', id)
    .order('fecha', { ascending: false });

  const totalPagado = (suscripciones ?? []).reduce(
    (s, x) => s + (Number(x.monto) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <Link
          href="/super-admin/productores"
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver a productores
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-3xl tracking-tight"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              🌾 {productor.nombre}
            </h1>
            {productor.nombre_campo && (
              <p className="text-[var(--fg-muted)] mt-1">{productor.nombre_campo}</p>
            )}
            <p className="text-xs text-[var(--fg-subtle)] mt-2 font-mono">
              slug: {productor.slug}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/super-admin/productores/${productor.id}/usuarios`}
              className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
            >
              👥 Gestionar usuarios
            </Link>
            <Link
              href={`/super-admin/productores/${productor.id}/editar`}
              className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
            >
              ✏️ Editar
            </Link>
            <AccionesProductor
              productorId={productor.id}
              estadoActual={productor.estado_suscripcion}
              activa={productor.activa}
              nombre={productor.nombre}
            />
          </div>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-[var(--fg-muted)] uppercase tracking-wider font-semibold">Plan</div>
          <div className="text-xl font-extrabold capitalize mt-1">{productor.plan}</div>
        </div>
        <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-[var(--fg-muted)] uppercase tracking-wider font-semibold">Estado</div>
          <div className="text-xl font-extrabold mt-1">
            <EstadoBadge estado={productor.estado_suscripcion} />
          </div>
        </div>
        <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-[var(--fg-muted)] uppercase tracking-wider font-semibold">Usuarios</div>
          <div className="text-xl font-extrabold mt-1">
            {miembros?.length ?? 0}
            <span className="text-sm text-[var(--fg-muted)] font-normal">
              {' '}/ {productor.limite_usuarios}
            </span>
          </div>
        </div>
        <div className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-[var(--fg-muted)] uppercase tracking-wider font-semibold">Total pagado</div>
          <div className="text-xl font-extrabold text-[var(--primary)] mt-1">
            {formatARS(totalPagado)}
          </div>
        </div>
      </div>

      {/* Datos */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold mb-4">📋 Datos del establecimiento</h2>
          <DL>
            <DLItem label="Nombre">{productor.nombre}</DLItem>
            <DLItem label="Campo">{productor.nombre_campo || '—'}</DLItem>
            <DLItem label="Email">{productor.email_contacto}</DLItem>
            <DLItem label="Teléfono">{productor.telefono || '—'}</DLItem>
            <DLItem label="WhatsApp">
              {productor.whatsapp ? (
                <a
                  href={`https://wa.me/${productor.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener"
                  className="text-[var(--whatsapp)] hover:underline"
                >
                  {productor.whatsapp}
                </a>
              ) : '—'}
            </DLItem>
            <DLItem label="CUIT">{productor.cuit || '—'}</DLItem>
            <DLItem label="Dirección">{productor.direccion || '—'}</DLItem>
            <DLItem label="Localidad">{productor.localidad || '—'}</DLItem>
            <DLItem label="Provincia">{productor.provincia || '—'}</DLItem>
          </DL>
        </div>

        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold mb-4">💎 Suscripción</h2>
          <DL>
            <DLItem label="Plan">{productor.plan}</DLItem>
            <DLItem label="Estado"><EstadoBadge estado={productor.estado_suscripcion} /></DLItem>
            <DLItem label="Trial termina">{formatFecha(productor.trial_termina)}</DLItem>
            <DLItem label="Próximo pago">{formatFecha(productor.proximo_pago)}</DLItem>
            <DLItem label="Activa">{productor.activa ? '✅ Sí' : '❌ No'}</DLItem>
            <DLItem label="Límite usuarios">{productor.limite_usuarios}</DLItem>
            <DLItem label="Creado">{new Date(productor.created_at).toLocaleDateString('es-AR')}</DLItem>
          </DL>
          {productor.notas_internas && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <div className="text-xs text-[var(--fg-muted)] uppercase tracking-wider font-semibold mb-2">
                📝 Notas internas
              </div>
              <p className="text-sm whitespace-pre-wrap">{productor.notas_internas}</p>
            </div>
          )}
        </div>
      </div>

      {/* Miembros */}
      <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-bold">👥 Usuarios ({miembros?.length ?? 0})</h2>
          <Link
            href={`/super-admin/productores/${productor.id}/usuarios`}
            className="text-sm text-[var(--primary)] hover:underline"
          >
            Gestionar →
          </Link>
        </div>
        {!miembros || miembros.length === 0 ? (
          <div className="p-10 text-center text-[var(--fg-muted)]">
            <div className="text-4xl mb-3">👤</div>
            <p>Sin usuarios asociados todavía.</p>
            <Link
              href={`/super-admin/productores/${productor.id}/usuarios`}
              className="inline-block mt-3 text-sm text-[var(--primary)] hover:underline"
            >
              + Agregar el primer usuario
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-hover)] text-xs uppercase tracking-wider text-[var(--fg-muted)]">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Nombre</th>
                <th className="px-6 py-3 text-left font-semibold">Email</th>
                <th className="px-6 py-3 text-left font-semibold">Rol</th>
                <th className="px-6 py-3 text-left font-semibold">Estado</th>
                <th className="px-6 py-3 text-left font-semibold">Último login</th>
              </tr>
            </thead>
            <tbody>
              {miembros.map((m: any) => {
                const p = Array.isArray(m.perfil) ? m.perfil[0] : m.perfil;
                return (
                  <tr key={m.id} className="border-t border-[var(--border)]">
                    <td className="px-6 py-3 font-medium">{p?.nombre}</td>
                    <td className="px-6 py-3">{p?.email}</td>
                    <td className="px-6 py-3 text-xs capitalize">{m.rol.replace('_', ' ')}</td>
                    <td className="px-6 py-3">
                      {m.activo ? (
                        <span className="text-emerald-600">✓ Activo</span>
                      ) : (
                        <span className="text-red-600">✗ Inactivo</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-[var(--fg-muted)]">
                      {p?.ultimo_login
                        ? new Date(p.ultimo_login).toLocaleString('es-AR')
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagos */}
      <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-bold">💰 Historial de pagos ({suscripciones?.length ?? 0})</h2>
          <p className="text-sm text-[var(--fg-muted)]">
            Total: <strong>{formatARS(totalPagado)}</strong>
          </p>
        </div>
        {!suscripciones || suscripciones.length === 0 ? (
          <div className="p-10 text-center text-[var(--fg-muted)]">
            <div className="text-4xl mb-3">💰</div>
            <p>Sin pagos registrados todavía.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-hover)] text-xs uppercase tracking-wider text-[var(--fg-muted)]">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Fecha</th>
                <th className="px-6 py-3 text-left font-semibold">Plan</th>
                <th className="px-6 py-3 text-left font-semibold">Período</th>
                <th className="px-6 py-3 text-right font-semibold">Monto</th>
                <th className="px-6 py-3 text-left font-semibold">Método</th>
              </tr>
            </thead>
            <tbody>
              {suscripciones.map((s) => (
                <tr key={s.id} className="border-t border-[var(--border)]">
                  <td className="px-6 py-3">{formatFecha(s.fecha)}</td>
                  <td className="px-6 py-3 capitalize">{s.plan}</td>
                  <td className="px-6 py-3 text-xs">
                    {formatFecha(s.periodo_desde)} → {formatFecha(s.periodo_hasta)}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold">
                    {formatARS(Number(s.monto))}
                  </td>
                  <td className="px-6 py-3 text-[var(--fg-muted)]">
                    {s.metodo_pago || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function DL({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-y-2 text-sm">{children}</dl>;
}

function DLItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-[var(--fg-muted)]">{label}</dt>
      <dd className="font-medium text-right">{children}</dd>
    </>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { bg: string; text: string; icon: string }> = {
    activa: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '✓' },
    vencida: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '⏰' },
    suspendida: { bg: 'bg-red-100', text: 'text-red-700', icon: '⛔' },
    cancelada: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '✕' },
  };
  const c = map[estado] ?? map.cancelada;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize ${c.bg} ${c.text}`}>
      {c.icon} {estado}
    </span>
  );
}
