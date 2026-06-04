'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  cambiarEstadoChequeRecibidoAction,
  eliminarChequeRecibidoAction,
} from '@/lib/actions/cheques';

type Cheque = {
  id: string;
  importe: number;
  estado: string;
};

export function AccionesChequeRec({ cheque }: { cheque: Cheque }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<null | 'depositar' | 'acreditar' | 'rechazar' | 'endosar' | 'vender'>(null);

  // Form states
  const [bancoDep, setBancoDep] = useState('');
  const [fechaDep, setFechaDep] = useState(new Date().toISOString().slice(0, 10));
  const [bancoVenta, setBancoVenta] = useState('');
  const [fechaVenta, setFechaVenta] = useState(new Date().toISOString().slice(0, 10));
  const [montoRecibido, setMontoRecibido] = useState<number>(Number(cheque.importe));
  const [endosadoA, setEndosadoA] = useState('');
  const [fechaEndoso, setFechaEndoso] = useState(new Date().toISOString().slice(0, 10));
  const [fechaRechazo, setFechaRechazo] = useState(new Date().toISOString().slice(0, 10));
  const [motivoRechazo, setMotivoRechazo] = useState('');

  function ejecutar(nuevoEstado: string, data: any = {}) {
    startTransition(async () => {
      const r = await cambiarEstadoChequeRecibidoAction(cheque.id, nuevoEstado as any, data);
      if (r?.error) {
        alert(r.error);
      } else {
        setModal(null);
        router.refresh();
      }
    });
  }

  function eliminar() {
    if (!confirm('¿Eliminar este cheque? No se puede deshacer.')) return;
    startTransition(async () => {
      const r = await eliminarChequeRecibidoAction(cheque.id);
      if (r?.error) alert(r.error);
    });
  }

  const comision = Number(cheque.importe) - montoRecibido;

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {cheque.estado === 'cartera' && (
          <>
            <button
              onClick={() => setModal('depositar')}
              disabled={pending}
              className="px-3 py-2 bg-amber-100 text-amber-700 border border-amber-300 rounded-lg font-medium hover:bg-amber-200 transition text-sm disabled:opacity-60"
            >
              💼 Depositar
            </button>
            <button
              onClick={() => setModal('vender')}
              disabled={pending}
              className="px-3 py-2 bg-cyan-100 text-cyan-700 border border-cyan-300 rounded-lg font-medium hover:bg-cyan-200 transition text-sm disabled:opacity-60"
            >
              💵 Vender al banco
            </button>
            <button
              onClick={() => setModal('endosar')}
              disabled={pending}
              className="px-3 py-2 bg-purple-100 text-purple-700 border border-purple-300 rounded-lg font-medium hover:bg-purple-200 transition text-sm disabled:opacity-60"
            >
              ↪ Endosar
            </button>
          </>
        )}
        {cheque.estado === 'depositado' && (
          <>
            <button
              onClick={() => ejecutar('acreditado')}
              disabled={pending}
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition text-sm disabled:opacity-60"
            >
              ✓ Marcar acreditado
            </button>
            <button
              onClick={() => setModal('rechazar')}
              disabled={pending}
              className="px-3 py-2 border border-red-300 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition text-sm disabled:opacity-60"
            >
              ❌ Rechazado
            </button>
          </>
        )}
        {(cheque.estado === 'cartera' || cheque.estado === 'depositado') && (
          <button
            onClick={() => {
              if (confirm('¿Anular este cheque?')) ejecutar('anulado');
            }}
            disabled={pending}
            className="px-3 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm disabled:opacity-60"
          >
            ⛔ Anular
          </button>
        )}
        <button
          onClick={eliminar}
          disabled={pending}
          className="px-3 py-2 border border-red-300 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition text-sm disabled:opacity-60"
        >
          🗑 Eliminar
        </button>
      </div>

      {/* MODAL DEPOSITAR */}
      {modal === 'depositar' && (
        <Modal title="💼 Depositar cheque" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Input label="Banco donde depositás" value={bancoDep} onChange={setBancoDep} placeholder="Ej: Galicia" />
            <Input label="Fecha de depósito" value={fechaDep} onChange={setFechaDep} type="date" />
            <Footer
              onCancel={() => setModal(null)}
              onSave={() => ejecutar('depositado', { banco_deposito: bancoDep, fecha_deposito: fechaDep })}
              pending={pending}
              saveText="Confirmar depósito"
            />
          </div>
        </Modal>
      )}

      {/* MODAL VENDER */}
      {modal === 'vender' && (
        <Modal title="💵 Vender al banco" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Input label="Banco que compra" value={bancoVenta} onChange={setBancoVenta} placeholder="Ej: Banco Macro" />
            <Input label="Fecha de venta" value={fechaVenta} onChange={setFechaVenta} type="date" />
            <div>
              <label className="block text-sm font-medium mb-1">Monto recibido ($)</label>
              <input
                type="number"
                step="0.01"
                value={montoRecibido}
                onChange={(e) => setMontoRecibido(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              {comision > 0 && (
                <p className="text-xs text-red-700 mt-1">
                  💸 Comisión del banco: <strong>${comision.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
                </p>
              )}
            </div>
            <Footer
              onCancel={() => setModal(null)}
              onSave={() =>
                ejecutar('vendido', {
                  banco_venta: bancoVenta,
                  fecha_venta: fechaVenta,
                  monto_recibido: montoRecibido,
                })
              }
              pending={pending}
              saveText="Confirmar venta"
            />
          </div>
        </Modal>
      )}

      {/* MODAL ENDOSAR */}
      {modal === 'endosar' && (
        <Modal title="↪ Endosar cheque" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Input label="Endosado a" value={endosadoA} onChange={setEndosadoA} placeholder="Nombre del endosatario" />
            <Input label="Fecha de endoso" value={fechaEndoso} onChange={setFechaEndoso} type="date" />
            <Footer
              onCancel={() => setModal(null)}
              onSave={() => ejecutar('endosado', { endosado_a: endosadoA, fecha_endoso: fechaEndoso })}
              pending={pending}
              saveText="Confirmar endoso"
            />
          </div>
        </Modal>
      )}

      {/* MODAL RECHAZAR */}
      {modal === 'rechazar' && (
        <Modal title="❌ Marcar como rechazado" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Input label="Fecha de rechazo" value={fechaRechazo} onChange={setFechaRechazo} type="date" />
            <div>
              <label className="block text-sm font-medium mb-1">Motivo del rechazo</label>
              <textarea
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                rows={2}
                placeholder="Sin fondos, firma rara, etc."
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-y"
              />
            </div>
            <Footer
              onCancel={() => setModal(null)}
              onSave={() => ejecutar('rechazado', { fecha_rechazo: fechaRechazo, motivo_rechazo: motivoRechazo })}
              pending={pending}
              saveText="Confirmar rechazo"
            />
          </div>
        </Modal>
      )}
    </>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-2xl hover:opacity-70">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
    </div>
  );
}

function Footer({
  onCancel,
  onSave,
  pending,
  saveText,
}: {
  onCancel: () => void;
  onSave: () => void;
  pending: boolean;
  saveText: string;
}) {
  return (
    <div className="flex gap-2 justify-end pt-2">
      <button
        onClick={onCancel}
        disabled={pending}
        className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-sm"
      >
        Cancelar
      </button>
      <button
        onClick={onSave}
        disabled={pending}
        className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary-h)] transition text-sm disabled:opacity-60"
      >
        {pending ? 'Guardando...' : saveText}
      </button>
    </div>
  );
}
