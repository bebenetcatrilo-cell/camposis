'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearClienteAction, editarClienteAction, eliminarClienteAction } from '@/lib/actions/clientes';

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

type Cliente = {
  id: string;
  nombre: string;
  tipo: string;
  cuit: string | null;
  condicion_iva: string;
  email: string | null;
  telefono: string | null;
  whatsapp: string | null;
  direccion: string | null;
  localidad: string | null;
  provincia: string | null;
  cp: string | null;
  saldo_cta_cte: number;
  notas_internas: string | null;
};

export function ClienteForm({ cliente }: { cliente?: Cliente }) {
  const esEdicion = !!cliente;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    if (esEdicion) formData.set('id', cliente!.id);

    const r = esEdicion
      ? await editarClienteAction(formData)
      : await crearClienteAction(formData);

    if (r?.error) {
      setError(r.error);
      setLoading(false);
    }
  }

  function handleEliminar() {
    if (!cliente) return;
    if (!confirm(`¿Eliminar el cliente "${cliente.nombre}"?\n\nNo se puede deshacer.`)) {
      return;
    }
    startTransition(async () => {
      const r = await eliminarClienteAction(cliente.id);
      if (r?.error) alert(r.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* IDENTIFICACIÓN */}
      <section className="space-y-4">
        <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider">
          🏢 Identificación
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Nombre / Razón social *</label>
            <input
              name="nombre"
              type="text"
              required
              defaultValue={cliente?.nombre ?? ''}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="Acopio La Catriló SRL"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Tipo *</label>
            <select
              name="tipo"
              defaultValue={cliente?.tipo ?? 'particular'}
              required
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            >
              <option value="acopio">🌾 Acopio</option>
              <option value="frigorifico">🐄 Frigorífico</option>
              <option value="proveedor">🚜 Proveedor</option>
              <option value="particular">👤 Particular</option>
              <option value="otro">📋 Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">CUIT</label>
            <input
              name="cuit"
              type="text"
              maxLength={13}
              defaultValue={cliente?.cuit ?? ''}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="20-12345678-9"
            />
            <p className="text-xs text-[var(--fg-muted)] mt-1">
              11 dígitos. Podés ponerlo con o sin guiones.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Condición frente al IVA *</label>
          <select
            name="condicion_iva"
            defaultValue={cliente?.condicion_iva ?? 'consumidor_final'}
            required
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          >
            <option value="ri">Responsable Inscripto</option>
            <option value="monotributo">Monotributista</option>
            <option value="exento">Exento</option>
            <option value="consumidor_final">Consumidor Final</option>
            <option value="no_categorizado">No categorizado</option>
          </select>
        </div>
      </section>

      {/* CONTACTO */}
      <section className="space-y-4 pt-4 border-t border-[var(--border)]">
        <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider">
          📞 Contacto
        </h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={cliente?.email ?? ''}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="cliente@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Teléfono</label>
            <input
              name="telefono"
              type="tel"
              defaultValue={cliente?.telefono ?? ''}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="2954-123456"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">WhatsApp</label>
            <input
              name="whatsapp"
              type="tel"
              defaultValue={cliente?.whatsapp ?? ''}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="2954123456"
            />
          </div>
        </div>
      </section>

      {/* DIRECCIÓN */}
      <section className="space-y-4 pt-4 border-t border-[var(--border)]">
        <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider">
          📍 Dirección
        </h3>

        <div>
          <label className="block text-sm font-medium mb-1.5">Dirección</label>
          <input
            name="direccion"
            type="text"
            defaultValue={cliente?.direccion ?? ''}
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            placeholder="Av. San Martín 1234"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Localidad</label>
            <input
              name="localidad"
              type="text"
              defaultValue={cliente?.localidad ?? ''}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="Catriló"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Provincia</label>
            <select
              name="provincia"
              defaultValue={cliente?.provincia ?? ''}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            >
              <option value="">— Seleccionar —</option>
              {PROVINCIAS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Código postal</label>
            <input
              name="cp"
              type="text"
              defaultValue={cliente?.cp ?? ''}
              className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="6437"
            />
          </div>
        </div>
      </section>

      {/* SALDO Y NOTAS */}
      <section className="space-y-4 pt-4 border-t border-[var(--border)]">
        <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider">
          💰 Cuenta corriente y notas
        </h3>

        <div>
          <label className="block text-sm font-medium mb-1.5">Saldo cta. cte.</label>
          <input
            name="saldo_cta_cte"
            type="number"
            step="0.01"
            defaultValue={cliente?.saldo_cta_cte ?? 0}
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2 text-xs text-blue-900 space-y-1">
            <p>💡 <strong>Cómo cargar el saldo:</strong></p>
            <ul className="list-disc list-inside ml-2 space-y-0.5">
              <li><strong>Positivo</strong> (ej: 500000): el cliente TE DEBE plata</li>
              <li><strong>Negativo</strong> (ej: -300000): VOS LE DEBÉS al cliente</li>
              <li><strong>0</strong>: cuentas saldadas</li>
            </ul>
            <p className="mt-1">⚠️ Por ahora se carga manual. Cuando hagamos facturas, se va a actualizar solo.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Notas internas</label>
          <textarea
            name="notas_internas"
            rows={3}
            defaultValue={cliente?.notas_internas ?? ''}
            placeholder="Cualquier dato útil (referente, formas de pago, etc.)"
            className="w-full px-3.5 py-2.5 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-y"
          />
        </div>
      </section>

      {error && (
        <div className="bg-[var(--red-bg)] border border-[var(--red)] text-[var(--red)] text-sm px-4 py-3 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3 justify-between pt-4 border-t border-[var(--border)] flex-wrap">
        {esEdicion ? (
          <button
            type="button"
            onClick={handleEliminar}
            disabled={pending || loading}
            className="px-4 py-2 border border-red-300 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition text-sm disabled:opacity-60"
          >
            🗑 Eliminar cliente
          </button>
        ) : (
          <div></div>
        )}
        <div className="flex gap-3">
          <a
            href="/admin/clientes"
            className="px-5 py-2.5 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
          >
            Cancelar
          </a>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>
      </div>
    </form>
  );
}
