'use client';

import { Printer } from 'lucide-react';

type Item = {
  descripcion: string;
  unidad: string | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

type Factura = {
  tipo: string;
  punto_venta: string;
  numero: number;
  fecha: string;
  cae: string | null;
  cae_vencimiento: string | null;
  cliente_nombre: string;
  cliente_cuit: string | null;
  cliente_condicion_iva: string | null;
  cliente_direccion: string | null;
  cliente_localidad: string | null;
  concepto: string | null;
  subtotal: number;
  iva_porcentaje: number;
  iva_monto: number;
  total: number;
  estado: string;
  notas: string | null;
};

type Productor = {
  nombre: string;
  nombre_campo: string | null;
  cuit: string | null;
  direccion: string | null;
  localidad: string | null;
  provincia: string | null;
  telefono: string | null;
  email_contacto: string | null;
  logo_url: string | null;
  color_primario: string;
  condicion_iva_propia: string | null;
};

type Props = {
  factura: Factura;
  items: Item[];
  productor: Productor;
};

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

const ivaLabels: Record<string, string> = {
  ri: 'Responsable Inscripto',
  monotributo: 'Monotributo',
  exento: 'Exento',
  consumidor_final: 'Consumidor Final',
  no_categorizado: 'No Categorizado',
};

const condicionIvaPropiaLabels: Record<string, string> = {
  ri: 'IVA RESPONSABLE INSCRIPTO',
  monotributo: 'RESPONSABLE MONOTRIBUTO',
  exento: 'IVA EXENTO',
};

function tipoBadge(tipo: string): { letra: string; nombre: string; bgBadge: string } {
  switch (tipo) {
    case 'A': return { letra: 'A', nombre: 'FACTURA A', bgBadge: '#1e40af' };
    case 'B': return { letra: 'B', nombre: 'FACTURA B', bgBadge: '#dc2626' };
    case 'C': return { letra: 'C', nombre: 'FACTURA C', bgBadge: '#059669' };
    case 'M': return { letra: 'M', nombre: 'FACTURA M', bgBadge: '#7c3aed' };
    case 'X': return { letra: 'X', nombre: 'DOCUMENTO X (sin valor fiscal)', bgBadge: '#6b7280' };
    default:  return { letra: tipo, nombre: `FACTURA ${tipo}`, bgBadge: '#6b7280' };
  }
}

function estadoBadge(estado: string) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    borrador: { label: 'BORRADOR', bg: '#f3f4f6', color: '#374151' },
    emitida:  { label: 'EMITIDA',  bg: '#fff3cd', color: '#856404' },
    cobrada:  { label: 'COBRADA',  bg: '#d1fae5', color: '#065f46' },
    anulada:  { label: 'ANULADA',  bg: '#fee2e2', color: '#991b1b' },
  };
  return map[estado] ?? map.borrador;
}

function buildHTML(f: Factura, items: Item[], p: Productor): string {
  const color = p.color_primario || '#4a7c2a';
  const numFmt = String(f.numero).padStart(8, '0');
  const tBadge = tipoBadge(f.tipo);
  const est = estadoBadge(f.estado);
  const condicionPropia = p.condicion_iva_propia ? (condicionIvaPropiaLabels[p.condicion_iva_propia] ?? '') : '';

  const itemsHTML = items.length
    ? items.map(it => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${it.descripcion}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#666">${it.unidad || '-'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${Number(it.cantidad).toLocaleString('es-AR')}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right">$${fmt(Number(it.precio_unitario))}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">$${fmt(Number(it.subtotal))}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="padding:14px;color:#888;font-style:italic;text-align:center">Sin ítems</td></tr>';

  const ivaRow = Number(f.iva_porcentaje) > 0
    ? `<div class="total-row"><span>IVA (${Number(f.iva_porcentaje)}%)</span><span>$${fmt(Number(f.iva_monto))}</span></div>`
    : '';

  const conceptoHTML = f.concepto
    ? `<div class="section"><div class="section-title">Concepto</div><div style="font-size:13px;color:#374151">${f.concepto}</div></div>`
    : '';

  const notasHTML = f.notas
    ? `<div class="section"><div class="section-title">Notas / Observaciones</div><div class="notas">${f.notas.replace(/\n/g, '<br/>')}</div></div>`
    : '';

  const caeHTML = f.cae
    ? `<div style="background:#f4f6f9;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-top:14px;display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#666;font-weight:700">CAE</div>
          <div style="font-family:'Courier New',monospace;font-size:14px;font-weight:700">${f.cae}</div>
        </div>
        ${f.cae_vencimiento ? `
        <div style="text-align:right">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#666;font-weight:700">Vto. CAE</div>
          <div style="font-family:'Courier New',monospace;font-size:13px">${fmtFecha(f.cae_vencimiento)}</div>
        </div>` : ''}
      </div>`
    : '';

  const logoHTML = p.logo_url
    ? `<img src="${p.logo_url}" alt="${p.nombre}" style="height:60px;max-width:200px;object-fit:contain"/>`
    : `<div style="width:60px;height:60px;background:${color};border-radius:8px;display:grid;place-items:center;color:#fff;font-size:30px;font-weight:900">🌾</div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>${tBadge.nombre} ${f.punto_venta}-${numFmt} - ${p.nombre_campo || p.nombre}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a2340;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:800px;margin:0 auto;padding:30px}
.header{display:grid;grid-template-columns:1fr auto 1fr;gap:14px;margin-bottom:18px;padding-bottom:16px;border-bottom:3px solid ${color}}
.brand{display:flex;align-items:flex-start;gap:12px}
.brand-info{font-size:11px;color:#666;line-height:1.6}
.brand-name{font-size:18px;font-weight:900;color:${color};letter-spacing:-0.5px;margin-bottom:3px}
.condicion-propia{font-size:10px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px}
.letra-box{border:2px solid #1a2340;border-radius:6px;padding:6px 10px;text-align:center;min-width:64px}
.letra-grande{font-size:38px;font-weight:900;line-height:1;font-family:Georgia,serif}
.letra-cod{font-size:9px;color:#666;letter-spacing:1px}
.doc-info{text-align:right}
.doc-tipo{font-size:11px;color:#666;font-weight:700;text-transform:uppercase;letter-spacing:1.5px}
.doc-num{font-size:24px;font-weight:900;color:${color};line-height:1;font-family:'Courier New',monospace}
.doc-fecha{font-size:11px;color:#666;margin-top:4px}
.badge{display:inline-block;padding:3px 12px;border-radius:50px;font-size:10px;font-weight:700;margin-top:6px;background:${est.bg};color:${est.color}}
.section{margin-bottom:16px}
.section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#666;margin-bottom:6px}
.cliente-box{background:#f4f6f9;border-radius:8px;padding:12px 16px}
.cliente-nombre{font-size:15px;font-weight:800;margin-bottom:4px}
.cliente-dato{font-size:11px;color:#555;margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:12px}
thead{background:${color};color:#fff}
thead th{padding:9px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
thead th:nth-child(2){text-align:center}
thead th:nth-child(3),thead th:nth-child(4),thead th:nth-child(5){text-align:right}
tbody tr:nth-child(even){background:#f8fafc}
.totales{margin-top:16px;display:flex;justify-content:flex-end}
.totales-inner{min-width:280px}
.total-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#444}
.total-final{display:flex;justify-content:space-between;padding:10px 14px;background:${color};color:#fff;border-radius:8px;margin-top:6px}
.total-final span:first-child{font-size:14px;font-weight:800}
.total-final span:last-child{font-size:18px;font-weight:900}
.notas{background:#fffbeb;border-left:3px solid #f59e0b;border-radius:6px;padding:10px 14px;font-size:11px;color:#78350f;line-height:1.5}
.footer{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#999}
@page{size:A4;margin:10mm}
@media print{
  .page{max-width:none;padding:0}
  .section,.cliente-box,.totales{page-break-inside:avoid}
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
        <div class="brand-name">${p.nombre_campo || p.nombre}</div>
        <div class="brand-info">
          ${p.cuit ? `CUIT: ${p.cuit}<br/>` : ''}
          ${p.direccion ? `${p.direccion}${p.localidad ? ', ' + p.localidad : ''}<br/>` : ''}
          ${p.telefono ? `Tel: ${p.telefono}<br/>` : ''}
          ${p.email_contacto ? `${p.email_contacto}` : ''}
        </div>
        ${condicionPropia ? `<div class="condicion-propia">${condicionPropia}</div>` : ''}
      </div>
    </div>

    <div class="letra-box">
      <div class="letra-grande">${tBadge.letra}</div>
      <div class="letra-cod">COD. ${f.tipo === 'A' ? '01' : f.tipo === 'B' ? '06' : f.tipo === 'C' ? '11' : '00'}</div>
    </div>

    <div class="doc-info">
      <div class="doc-tipo">${tBadge.nombre}</div>
      <div class="doc-num">${f.punto_venta}-${numFmt}</div>
      <div class="doc-fecha">Fecha: <strong>${fmtFecha(f.fecha)}</strong></div>
      <div class="badge">${est.label}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Cliente</div>
    <div class="cliente-box">
      <div class="cliente-nombre">${f.cliente_nombre}</div>
      ${f.cliente_cuit ? `<div class="cliente-dato"><strong>CUIT:</strong> ${f.cliente_cuit}</div>` : ''}
      ${f.cliente_condicion_iva ? `<div class="cliente-dato"><strong>Cond. IVA:</strong> ${ivaLabels[f.cliente_condicion_iva] ?? f.cliente_condicion_iva}</div>` : ''}
      ${f.cliente_direccion ? `<div class="cliente-dato"><strong>Dirección:</strong> ${f.cliente_direccion}${f.cliente_localidad ? ', ' + f.cliente_localidad : ''}</div>` : ''}
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
      <div class="total-row"><span>Subtotal</span><span>$${fmt(Number(f.subtotal))}</span></div>
      ${ivaRow}
      <div class="total-final"><span>TOTAL</span><span>$${fmt(Number(f.total))}</span></div>
    </div>
  </div>

  ${caeHTML}

  ${notasHTML}

  <div class="footer">
    ${f.cae ? `Comprobante autorizado · CAE ${f.cae}` : 'Documento sin código de autorización'} · ${tBadge.nombre} ${f.punto_venta}-${numFmt} · ${fmtFecha(f.fecha)}
  </div>

</div>

<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 300);
  };
</script>
</body>
</html>`;
}

export function ImprimirBtn({ factura, items, productor }: Props) {
  function imprimir() {
    const html = buildHTML(factura, items, productor);
    const win = window.open('', '_blank');
    if (!win) {
      alert('El navegador bloqueó la ventana de impresión. Habilitá pop-ups para este sitio.');
      return;
    }
    win.document.write(html);
    win.document.close();
  }

  return (
    <button
      type="button"
      onClick={imprimir}
      className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition text-sm flex items-center gap-2"
    >
      <Printer className="w-4 h-4" strokeWidth={2} />
      Imprimir / PDF
    </button>
  );
}
