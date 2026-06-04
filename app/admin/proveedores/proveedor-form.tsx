'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, AlertCircle } from 'lucide-react';
import { crearProveedorAction, actualizarProveedorAction } from '@/lib/actions/proveedores';

type Proveedor = {
  id?: string;
  nombre?: string | null;
  cuit?: string | null;
  condicion_iva?: string | null;
  rubro?: string | null;
  email?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  contacto_nombre?: string | null;
  direccion?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  cp?: string | null;
  plazo_pago_dias?: number | null;
  cbu?: string | null;
  alias_cbu?: string | null;
  notas_internas?: string | null;
};

type Props = {
  proveedor?: Proveedor;
};

export function ProveedorForm({ proveedor }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(proveedor?.id);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await actualizarProveedorAction(proveedor!.id!, formData)
        : await crearProveedorAction(formData);
      if (result && 'error' in result) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-[var(--red-l)] border border-[var(--red)] rounded-[6px] p-3 text-[13px] text-[var(--red)] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      {/* SECCIÓN 1: Identificación */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">1</div>
          <h3 className="font-semibold text-[14px]">Identificación</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
              Nombre / Razón social <span className="text-[var(--red)]">*</span>
            </label>
            <input
              type="text"
              name="nombre"
              defaultValue={proveedor?.nombre ?? ''}
              required
              autoFocus
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">CUIT</label>
            <input
              type="text"
              name="cuit"
              defaultValue={proveedor?.cuit ?? ''}
              placeholder="20-12345678-9"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] mono focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Condición IVA</label>
            <select
              name="condicion_iva"
              defaultValue={proveedor?.condicion_iva ?? 'ri'}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] bg-white focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="ri">Responsable Inscripto</option>
              <option value="monotributo">Monotributo</option>
              <option value="exento">Exento</option>
              <option value="consumidor_final">Consumidor Final</option>
              <option value="no_categorizado">No Categorizado</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Rubro</label>
            <input
              type="text"
              name="rubro"
              defaultValue={proveedor?.rubro ?? ''}
              placeholder="Ej: Agroquímicos, Fletes, Veterinaria..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: Contacto */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">2</div>
          <h3 className="font-semibold text-[14px]">Contacto</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Persona de contacto</label>
            <input
              type="text"
              name="contacto_nombre"
              defaultValue={proveedor?.contacto_nombre ?? ''}
              placeholder="Nombre del vendedor / contacto"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Email</label>
            <input
              type="email"
              name="email"
              defaultValue={proveedor?.email ?? ''}
              placeholder="contacto@empresa.com"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Teléfono</label>
            <input
              type="text"
              name="telefono"
              defaultValue={proveedor?.telefono ?? ''}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] mono focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">WhatsApp</label>
            <input
              type="text"
              name="whatsapp"
              defaultValue={proveedor?.whatsapp ?? ''}
              placeholder="5492954..."
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] mono focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: Dirección */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">3</div>
          <h3 className="font-semibold text-[14px]">Dirección</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Calle y número</label>
            <input
              type="text"
              name="direccion"
              defaultValue={proveedor?.direccion ?? ''}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Localidad</label>
            <input
              type="text"
              name="localidad"
              defaultValue={proveedor?.localidad ?? ''}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Provincia</label>
            <input
              type="text"
              name="provincia"
              defaultValue={proveedor?.provincia ?? ''}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">CP</label>
            <input
              type="text"
              name="cp"
              defaultValue={proveedor?.cp ?? ''}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] mono focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: Comercial */}
      <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-[var(--primary)] text-white grid place-items-center text-[12px] font-bold">4</div>
          <h3 className="font-semibold text-[14px]">Datos comerciales</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">
              Plazo de pago (días)
            </label>
            <input
              type="number"
              name="plazo_pago_dias"
              defaultValue={proveedor?.plazo_pago_dias ?? 0}
              min="0"
              step="1"
              placeholder="0 = contado"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] mono focus:outline-none focus:border-[var(--primary)]"
            />
            <p className="text-[10px] text-[var(--fg-subtle)] mt-1">0 = contado, 30 = a 30 días, etc.</p>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">CBU</label>
            <input
              type="text"
              name="cbu"
              defaultValue={proveedor?.cbu ?? ''}
              placeholder="22 dígitos"
              maxLength={22}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] mono focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Alias bancario</label>
            <input
              type="text"
              name="alias_cbu"
              defaultValue={proveedor?.alias_cbu ?? ''}
              placeholder="MI.ALIAS.BANCO"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] mono focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-[11px] font-semibold text-[var(--fg-muted)] mb-1">Notas internas</label>
          <textarea
            name="notas_internas"
            defaultValue={proveedor?.notas_internas ?? ''}
            rows={3}
            placeholder="Cualquier observación interna sobre este proveedor..."
            className="w-full px-3 py-2 border border-[var(--border)] rounded-[6px] text-[13px] focus:outline-none focus:border-[var(--primary)] resize-y"
          />
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-[13px] flex items-center gap-2"
          disabled={isPending}
        >
          <X className="w-4 h-4" strokeWidth={2} />
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition text-[13px] flex items-center gap-2 disabled:opacity-60"
        >
          <Save className="w-4 h-4" strokeWidth={2} />
          {isPending ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear proveedor')}
        </button>
      </div>
    </form>
  );
}
