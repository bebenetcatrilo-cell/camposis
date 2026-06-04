import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';

function fmt(n: number): string {
  return Number(n).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtFecha(f: string): string {
  if (!f) return '';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

function estadoBadge(estado: string) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    pendiente: { label: 'PENDIENTE', bg: '#fff3cd', color: '#856404' },
    aprobado: { label: 'APROBADO', bg: '#d1fae5', color: '#065f46' },
    rechazado: { label: 'RECHAZADO', bg: '#fee2e2', color: '#991b1b' },
    facturado: { label: 'FACTURADO', bg: '#dbeafe', color: '#1e40af' },
  };
  return map[estado] ?? map.pendiente;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await getProductorActivo();
  if (!ctx) return new NextResponse('No autorizado', { status: 401 });

  const supabase = await createClient();

  const { data: pres } = await supabase
    .from('presupuestos')
    .select('*')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!pres) return new NextResponse('Presupuesto no encontrado', { status: 404 });

  const { data: items } = await supabase
    .from('items_presupuesto')
    .select('*')
    .eq('presupuesto_id', id)
    .order('orden');

  const { data: productor } = await supabase
    .from('productores')
    .select('nombre, nombre_campo, cuit, direccion, localidad, telefono, email_contacto, logo_url, color_primario')
    .eq('id', ctx.productor.id)
    .single();

  if (!productor) return new NextResponse('Productor no encontrado', { status: 404 });

  const color = productor.color_primario || '#4a7c2a';
  const numFmt = String(pres.numero).padStart(4, '0');
  const est = estadoBadge(pres.estado);

  const itemsHTML = items && items.length
    ? items.map((it) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${it.descripcion}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#666">${it.unidad || '-'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${Number(it.cantidad).toLocaleString('es-AR')}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right">$${fmt(Number(it.precio_unitario))}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">$${fmt(Number(it.subtotal))}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="padding:14px;color:#888;font-style:italic;text-align:center">Sin ítems</td></tr>';

  const ivaRow = Number(pres.iva_porcentaje) > 0
    ? `<div class="total-row"><span>IVA (${Number(pres.iva_porcentaje)}%)</span><span>$${fmt(Number(pres.iva_monto))}</span></div>`
    : '';

  const notasHTML = pres.notas
    ? `<div class="section"><div class="section-title">Notas / Observaciones</div><div class="notas">${pres.notas.replace(/\n/g, '<br/>')}</div></div>`
    : '';

  const conceptoHTML = pres.concepto
    ? `<div class="section"><div class="section-title">Concepto</div><div style="font-size:13px;color:#374151">${pres.concepto}</div></div>`
    : '';

  const logoHTML = productor.logo_url
    ? `<img src="${productor.logo_url}" alt="${productor.nombre}" style="height:64px;max-width:200px;object-fit:contain"/>`
    : `<div style="width:64px;height:64px;background:${color};border-radius:8px;display:grid;place-items:center;color:#fff;font-size:32px;font-weight:900">🌾</div>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Presupuesto #${numFmt} - ${productor.nombre_campo || productor.nombre}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a2340;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:800px;margin:0 auto;padding:40px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid ${color}}
.brand{display:flex;align-items:center;gap:14px}
.brand-info{font-size:11px;color:#666;line-height:1.7}
.brand-name{font-size:20px;font-weight:900;color:${color};letter-spacing:-0.5px;margin-bottom:4px}
.doc-tipo{font-size:11px;color:#666;font-weight:700;text-transform:uppercase;letter-spacing:1.5px}
.doc-num{font-size:28px;font-weight:900;color:${color};line-height:1}
.doc-fecha{font-size:12px;color:#666;margin-top:6px}
.badge{display:inline-block;padding:4px 14px;border-radius:50px;font-size:11px;font-weight:700;margin-top:8px;background:${est.bg};color:${est.color}}
.section{margin-bottom:20px}
.section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#666;margin-bottom:8px}
.cliente-box{background:#f4f6f9;border-radius:8px;padding:14px 18px}
.cliente-nombre{font-size:16px;font-weight:800;margin-bottom:6px}
.cliente-dato{font-size:12px;color:#555;margin-top:2px}
table{width:100%;border-collapse:collapse}
thead{background:${color};color:#fff}
thead th{padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
thead th:nth-child(2){text-align:center}
thead th:nth-child(3),thead th:nth-child(4),thead th:nth-child(5){text-align:right}
tbody tr:nth-child(even){background:#f8fafc}
.totales{margin-top:20px;display:flex;justify-content:flex-end}
.totales-inner{min-width:280px}
.total-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#444}
.total-final{display:flex;justify-content:space-between;padding:12px 16px;background:${color};color:#fff;border-radius:8px;margin-top:8px}
.total-final span:first-child{font-size:15px;font-weight:800}
.total-final span:last-child{font-size:20px;font-weight:900}
.notas{background:#fffbeb;border-left:3px solid #f59e0b;border-radius:6px;padding:12px 16px;font-size:12px;color:#78350f;line-height:1.5}
.firma{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end}
.firma-linea{width:240px;text-align:center;padding-top:48px;border-top:1px solid #1a2340;font-size:11px;color:#666}
.footer{margin-top:30px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#999}
@page{size:A4;margin:10mm}
@media print{
  .page{max-width:none;padding:0}
  .header{margin-bottom:20px}
  .section,.cliente-box,.totales,.firma{page-break-inside:avoid}
  tr{page-break-inside:avoid}
}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">
      ${logoHTML}
      <div>
        <div class="brand-name">${productor.nombre_campo || productor.nombre}</div>
        <div class="brand-info">
          ${productor.cuit ? `CUIT: ${productor.cuit}<br/>` : ''}
          ${productor.direccion ? `${productor.direccion}${productor.localidad ? ', ' + productor.localidad : ''}<br/>` : ''}
          ${productor.telefono ? `Tel: ${productor.telefono}<br/>` : ''}
          ${productor.email_contacto ? `${productor.email_contacto}` : ''}
        </div>
      </div>
    </div>
    <div style="text-align:right">
      <div class="doc-tipo">Presupuesto</div>
      <div class="doc-num">N° ${numFmt}</div>
      <div class="doc-fecha">Fecha: <strong>${fmtFecha(pres.fecha)}</strong></div>
      ${pres.fecha_vencimiento ? `<div class="doc-fecha">Válido hasta: <strong>${fmtFecha(pres.fecha_vencimiento)}</strong></div>` : ''}
      <div class="badge">${est.label}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Cliente</div>
    <div class="cliente-box">
      <div class="cliente-nombre">${pres.cliente_nombre}</div>
      ${pres.cliente_cuit ? `<div class="cliente-dato"><strong>CUIT:</strong> ${pres.cliente_cuit}</div>` : ''}
      ${pres.cliente_condicion_iva ? `<div class="cliente-dato"><strong>Cond. IVA:</strong> ${pres.cliente_condicion_iva}</div>` : ''}
      ${pres.cliente_direccion ? `<div class="cliente-dato"><strong>Dirección:</strong> ${pres.cliente_direccion}${pres.cliente_localidad ? ', ' + pres.cliente_localidad : ''}</div>` : ''}
    </div>
  </div>

  ${conceptoHTML}

  <div class="section">
    <div class="section-title">Detalle</div>
    <table>
      <thead>
        <tr>
          <th>Descripción</th>
          <th>Unid.</th>
          <th>Cant.</th>
          <th>P. Unit.</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>${itemsHTML}</tbody>
    </table>
  </div>

  <div class="totales">
    <div class="totales-inner">
      <div class="total-row"><span>Subtotal</span><span>$${fmt(Number(pres.subtotal))}</span></div>
      ${ivaRow}
      <div class="total-final"><span>TOTAL</span><span>$${fmt(Number(pres.total))}</span></div>
    </div>
  </div>

  ${notasHTML}

  <div class="firma"><div class="firma-linea">Firma y Aclaración</div></div>
  <div class="footer">Documento sin valor fiscal · Presupuesto N° ${numFmt} · ${fmtFecha(pres.fecha)}</div>
</div>

<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 300);
  };
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
