import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Truck, Edit, Phone, Mail, MapPin, MessageCircle, CheckCircle2, DollarSign, Calendar, Briefcase, FileText } from 'lucide-react';
import { formatARS } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { ToggleActivoBtn } from './toggle-activo-btn';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

const ivaLabels: Record<string, string> = {
  ri: 'Responsable Inscripto',
  monotributo: 'Monotributo',
  exento: 'Exento',
  consumidor_final: 'Consumidor Final',
  no_categorizado: 'No Categorizado',
};

export default async function ProveedorDetallePage({ params }: { params: Params }) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) redirect('/auth/seleccionar-productor');

  const supabase = await createClient();
  const { data: prov } = await supabase
    .from('proveedores')
    .select('*')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!prov) notFound();

  const saldo = Number(prov.saldo_cta_cte);
  const esAdmin = ctx.rol === 'admin_productor';

  return (
    <div className="space-y-4">
      <PageHeader
        title={prov.nombre}
        subtitle={prov.rubro || 'Proveedor'}
        icon={<Truck className="w-5 h-5" />}
        breadcrumbs={[
          { label: 'Proveedores', href: '/admin/proveedores' },
          { label: prov.nombre },
        ]}
        action={
          esAdmin && (
            <div className="flex gap-2">
              <ToggleActivoBtn id={prov.id} activo={prov.activo} />
              <Link
                href={`/admin/proveedores/${prov.id}/editar`}
                className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-[var(--bg-hover)] transition text-[13px] flex items-center gap-2"
              >
                <Edit className="w-4 h-4" strokeWidth={2} />
                Editar
              </Link>
            </div>
          )
        }
      />

      {/* Banner saldo */}
      {saldo !== 0 && (
        <div className={`rounded-[12px] p-4 border-2 ${
          saldo > 0
            ? 'bg-[var(--red-l)] border-[var(--red)]'
            : 'bg-[var(--green-l)] border-[var(--green)]'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-wider ${
                saldo > 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'
              }`}>
                {saldo > 0 ? 'Le debés a este proveedor' : 'Saldo a favor'}
              </p>
              <p className={`text-[24px] font-bold mono leading-tight mt-1 ${
                saldo > 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'
              }`}>
                ${formatARS(Math.abs(saldo))}
              </p>
            </div>
            <DollarSign className={`w-12 h-12 ${
              saldo > 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'
            } opacity-30`} strokeWidth={1.5} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Datos generales */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-3 flex items-center gap-1.5">
              <Briefcase className="w-3 h-3" strokeWidth={2} />
              Datos fiscales
            </h3>
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              {prov.cuit && (
                <div>
                  <dt className="text-[11px] text-[var(--fg-muted)] font-semibold mb-0.5">CUIT</dt>
                  <dd className="mono font-bold">{prov.cuit}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] text-[var(--fg-muted)] font-semibold mb-0.5">Condición IVA</dt>
                <dd>{ivaLabels[prov.condicion_iva] ?? prov.condicion_iva}</dd>
              </div>
              {prov.rubro && (
                <div>
                  <dt className="text-[11px] text-[var(--fg-muted)] font-semibold mb-0.5">Rubro</dt>
                  <dd>{prov.rubro}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] text-[var(--fg-muted)] font-semibold mb-0.5">Plazo de pago</dt>
                <dd>
                  {prov.plazo_pago_dias === 0 ? (
                    <span className="text-[var(--green)] font-semibold">Contado</span>
                  ) : (
                    <span>{prov.plazo_pago_dias} días</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {(prov.contacto_nombre || prov.email || prov.telefono || prov.whatsapp) && (
            <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-3 flex items-center gap-1.5">
                <Phone className="w-3 h-3" strokeWidth={2} />
                Contacto
              </h3>
              <div className="space-y-2 text-[13px]">
                {prov.contacto_nombre && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[var(--fg-muted)] font-semibold w-24">Persona:</span>
                    <span>{prov.contacto_nombre}</span>
                  </div>
                )}
                {prov.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[var(--fg-muted)]" strokeWidth={1.8} />
                    <a href={`mailto:${prov.email}`} className="text-[var(--primary)] hover:underline">
                      {prov.email}
                    </a>
                  </div>
                )}
                {prov.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[var(--fg-muted)]" strokeWidth={1.8} />
                    <a href={`tel:${prov.telefono}`} className="text-[var(--primary)] hover:underline mono">
                      {prov.telefono}
                    </a>
                  </div>
                )}
                {prov.whatsapp && (
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-3.5 h-3.5 text-[var(--whatsapp)]" strokeWidth={1.8} />
                    <a
                      href={`https://wa.me/${prov.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--primary)] hover:underline mono"
                    >
                      {prov.whatsapp}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {(prov.direccion || prov.localidad) && (
            <div className="bg-white border border-[var(--border)] rounded-[12px] p-5 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-3 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" strokeWidth={2} />
                Dirección
              </h3>
              <p className="text-[13px]">
                {[prov.direccion, prov.localidad, prov.provincia, prov.cp].filter(Boolean).join(', ')}
              </p>
            </div>
          )}

          {prov.notas_internas && (
            <div className="bg-[#fffbeb] border border-[#fcd34d] rounded-[12px] p-4">
              <h3 className="text-[10px] uppercase tracking-wider text-[#92400e] font-bold mb-2 flex items-center gap-1.5">
                <FileText className="w-3 h-3" strokeWidth={2} />
                Notas internas
              </h3>
              <p className="text-[12px] text-[#78350f] whitespace-pre-line">{prov.notas_internas}</p>
            </div>
          )}
        </div>

        {/* Sidebar: estado + datos bancarios */}
        <div className="space-y-4">
          <div className={`rounded-[12px] p-4 border ${
            prov.activo
              ? 'bg-[var(--green-l)] border-[var(--green)]'
              : 'bg-[var(--bg-card-3)] border-[var(--border-2)]'
          }`}>
            <div className="flex items-center gap-2">
              {prov.activo ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[var(--green)]" strokeWidth={2.5} />
                  <span className="font-bold text-[var(--green)] text-[13px]">ACTIVO</span>
                </>
              ) : (
                <span className="font-bold text-[var(--fg-muted)] text-[13px]">INACTIVO</span>
              )}
            </div>
          </div>

          {(prov.cbu || prov.alias_cbu) && (
            <div className="bg-white border border-[var(--border)] rounded-[12px] p-4 shadow-[0_2px_4px_rgba(0,0,0,.06)]">
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--fg-muted)] font-bold mb-3">
                Datos bancarios
              </h3>
              {prov.cbu && (
                <div className="mb-2">
                  <p className="text-[10px] text-[var(--fg-muted)] mb-0.5">CBU</p>
                  <p className="mono font-bold text-[12px] break-all">{prov.cbu}</p>
                </div>
              )}
              {prov.alias_cbu && (
                <div>
                  <p className="text-[10px] text-[var(--fg-muted)] mb-0.5">Alias</p>
                  <p className="mono font-bold text-[12px]">{prov.alias_cbu}</p>
                </div>
              )}
            </div>
          )}

          <div className="bg-[var(--blue-ll)] border border-[var(--blue-l)] rounded-[12px] p-4">
            <p className="text-[11px] text-[var(--blue)] font-semibold mb-1">💡 Próximamente</p>
            <p className="text-[11px] text-[var(--blue)] leading-relaxed">
              Vas a poder cargar facturas de compra, registrar pagos y ver la cuenta corriente con este proveedor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
