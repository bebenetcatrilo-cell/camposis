import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatFecha } from '@/lib/utils';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol, productores(*)')
    .eq('id', user!.id)
    .single();

  const productor = Array.isArray(perfil?.productores)
    ? perfil!.productores[0]
    : perfil?.productores;

  // Calcular días restantes de trial / próximo pago
  let alertaSuscripcion: { tipo: 'trial' | 'pago' | 'vencido'; dias: number; fecha: string } | null = null;
  if (productor) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (productor.plan === 'trial' && productor.trial_termina) {
      const fin = new Date(productor.trial_termina + 'T00:00:00');
      const dias = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      alertaSuscripcion = {
        tipo: dias < 0 ? 'vencido' : 'trial',
        dias,
        fecha: productor.trial_termina,
      };
    } else if (productor.proximo_pago) {
      const fin = new Date(productor.proximo_pago + 'T00:00:00');
      const dias = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      if (dias <= 10) {
        alertaSuscripcion = {
          tipo: dias < 0 ? 'vencido' : 'pago',
          dias,
          fecha: productor.proximo_pago,
        };
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <header>
        <h1
          className="text-3xl tracking-tight"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Hola, {perfil?.nombre?.split(' ')[0]} 🌾
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">
          Bienvenido a{' '}
          <strong>{productor?.nombre_campo ?? productor?.nombre}</strong>
        </p>
      </header>

      {/* Alerta de suscripción */}
      {alertaSuscripcion && (
        <AlertaSuscripcion alerta={alertaSuscripcion} />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction
          href="/admin/clientes"
          icon="👤"
          label="Clientes"
          desc="ABM clientes"
        />
        <QuickAction
          href="/admin/silos"
          icon="🌾"
          label="Silos"
          desc="Stock cereal"
        />
        <QuickAction
          href="/admin/hacienda"
          icon="🐄"
          label="Hacienda"
          desc="Rodeo"
        />
        <QuickAction
          href="/admin/configuracion"
          icon="⚙️"
          label="Configurar"
          desc="Datos del campo"
        />
      </div>

      {/* Empty state mientras no haya features */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-8 shadow-sm">
        <div className="text-center space-y-3 py-8">
          <div className="text-5xl">🚧</div>
          <h2 className="text-xl font-bold">Tu sistema está en construcción</h2>
          <p className="text-[var(--fg-muted)] max-w-md mx-auto">
            Los módulos de productos, silos, hacienda y operaciones se van a
            habilitar progresivamente. Por ahora podés configurar tu campo desde
            la sección{' '}
            <Link
              href="/admin/configuracion"
              className="text-[var(--primary)] font-semibold hover:underline"
            >
              Configuración
            </Link>.
          </p>
        </div>
      </div>

      {/* Resumen del campo */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-[var(--fg-muted)]">
            🌾 Tu campo
          </h3>
          <dl className="text-sm space-y-1.5">
            <DLRow label="Nombre">{productor?.nombre}</DLRow>
            <DLRow label="Campo">{productor?.nombre_campo ?? '—'}</DLRow>
            <DLRow label="Localidad">
              {[productor?.localidad, productor?.provincia].filter(Boolean).join(', ') || '—'}
            </DLRow>
            <DLRow label="CUIT">{productor?.cuit ?? '—'}</DLRow>
          </dl>
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <Link
              href="/admin/configuracion"
              className="text-sm text-[var(--primary)] hover:underline font-medium"
            >
              ⚙️ Editar configuración →
            </Link>
          </div>
        </div>

        <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-[var(--fg-muted)]">
            💎 Tu suscripción
          </h3>
          <dl className="text-sm space-y-1.5">
            <DLRow label="Plan">
              <span className="capitalize">{productor?.plan}</span>
            </DLRow>
            <DLRow label="Estado">
              <EstadoChip estado={productor?.estado_suscripcion ?? 'activa'} />
            </DLRow>
            {productor?.plan === 'trial' && productor?.trial_termina && (
              <DLRow label="Trial termina">{formatFecha(productor.trial_termina)}</DLRow>
            )}
            {productor?.proximo_pago && (
              <DLRow label="Próximo pago">{formatFecha(productor.proximo_pago)}</DLRow>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}

// ─── Componentes ───
function AlertaSuscripcion({
  alerta,
}: {
  alerta: { tipo: 'trial' | 'pago' | 'vencido'; dias: number; fecha: string };
}) {
  const colores = {
    trial: 'bg-blue-50 border-blue-300 text-blue-900',
    pago: 'bg-amber-50 border-amber-300 text-amber-900',
    vencido: 'bg-red-50 border-red-300 text-red-900',
  };

  let mensaje = '';
  let icon = '';
  if (alerta.tipo === 'trial') {
    icon = '🎁';
    mensaje =
      alerta.dias === 0
        ? 'Hoy es el último día de tu prueba gratuita.'
        : `Te quedan ${alerta.dias} días de prueba gratuita.`;
  } else if (alerta.tipo === 'pago') {
    icon = '💳';
    mensaje =
      alerta.dias === 0
        ? 'Hoy vence tu próximo pago.'
        : `En ${alerta.dias} días vence tu próximo pago (${formatFecha(alerta.fecha)}).`;
  } else {
    icon = '⚠️';
    mensaje = `Tu suscripción venció hace ${Math.abs(alerta.dias)} días. Contactanos para renovar.`;
  }

  return (
    <div className={`border rounded-2xl p-4 flex items-center gap-3 ${colores[alerta.tipo]}`}>
      <div className="text-2xl">{icon}</div>
      <div className="flex-1">
        <p className="font-semibold text-sm">{mensaje}</p>
        {alerta.tipo === 'vencido' && (
          <a
            href="https://wa.me/543512345678"
            target="_blank"
            rel="noopener"
            className="text-xs underline mt-1 inline-block"
          >
            💬 Contactar por WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  desc,
}: {
  href: string;
  icon: string;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white border border-[var(--border)] rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-[var(--primary)] transition group"
    >
      <div className="text-3xl mb-2">{icon}</div>
      <div className="font-semibold text-sm group-hover:text-[var(--primary)]">{label}</div>
      <div className="text-xs text-[var(--fg-muted)]">{desc}</div>
    </Link>
  );
}

function DLRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <dt className="text-[var(--fg-muted)]">{label}</dt>
      <dd className="font-medium text-right">{children}</dd>
    </div>
  );
}

function EstadoChip({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    activa: 'bg-emerald-100 text-emerald-700',
    vencida: 'bg-amber-100 text-amber-700',
    suspendida: 'bg-red-100 text-red-700',
    cancelada: 'bg-gray-100 text-gray-700',
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${map[estado] ?? map.cancelada}`}
    >
      {estado}
    </span>
  );
}
