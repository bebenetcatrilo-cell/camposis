'use client';

import { Printer } from 'lucide-react';

type Item = {
  descripcion: string;
  unidad: string | null;
  cantidad: number;
};

type Remito = {
  punto_venta: string;
  numero: number;
  fecha: string;
  cliente_nombre: string;
  cliente_cuit: string | null;
  cliente_direccion: string | null;
  cliente_localidad: string | null;
  transporte: string | null;
  observaciones: string | null;
  estado: string;
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
};

type Props = { remito: Remito; items: Item[]; productor: Productor };

function fmtCant(n: number): string {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function fmtFecha(f: string): string {
  if (!f) return '';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

function buildHTML(r: Remito, items: Item[], p: Productor): string {
  const color = p.color_primario || '#4a7c2a';
  const numFmt = `${r.punto_venta}-${String(r.numero).padStart(8, '0')}`;

  const itemsHTML = items.length
    ? items.map(it => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${it.descripcion}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#666">${it.unidad || '-'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">${fmtCant(Number(it.cantidad))}</td>
      </tr>`).join('')
    : '<tr><td colspan="3" style="padding:14px;color:#888;font-style:italic;text-align:center">Sin ítems</td></tr>';

  const logoHTML = p.logo_url
    ? `<img src="${p.logo_url}" alt="${p.nombre}" style="height:60px;max-width:200px;object-fit:contain"/>`
    : `<div style="width:60px;height:60px;background:${color};border-radius:8px;display:grid;place-items:center;color:#fff;font-size:30px;font-weight:900">🌾</div>`;

  const transporteHTML = r.transporte
    ? `<div class="section"><div class="section-title">Transporte</div><div style="font-size:13px;color:#374151">${r.transporte}</div></div>`
    : '';

  const obsHTML = r.observaciones
    ? `<div class="section"><div class="section-title">Observaciones</div><div class="notas">${r.observaciones.replace(/\n/g, '<br/>')}</div></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>REMITO ${numFmt} - ${p.nombre_campo || p.nombre}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a2340;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:800px;margin:0 auto;padding:30px}
.header{display:grid;grid-template-columns:1fr auto 1fr;gap:14px;margin-bottom:18px;padding-bottom:16px;border-bottom:3px solid ${color}}
.brand{display:flex;align-items:flex-start;gap:12px}
.brand-info{font-size:11px;color:#666;line-height:1.6}
.brand-name{font-size:18px;font-weight:900;color:${color};letter-spacing:-0.5px;margin-bottom:3px}
.letra-box{border:2px solid #1a2340;border-radius:6px;padding:6px 10px;text-align:center;min-width:64px}
.letra-grande{font-size:38px;font-weight:900;line-height:1;font-family:Georgia,serif}
.letra-cod{font-size:9px;color:#666;letter-spacing:1px}
.doc-info{text-align:right}
.doc-tipo{font-size:11px;color:#666;font-weight:700;text-transform:uppercase;letter-spacing:1.5px}
.doc-num{font-size:24px;font-weight:900;color:${color};line-height:1;font-family:'Courier New',monospace}
.doc-fecha{font-size:11px;color:#666;margin-top:4px}
.section{margin-bottom:16px}
.section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#666;margin-bottom:6px}
.cliente-box{background:#f4f6f9;border-radius:8px;padding:12px 16px}
.cliente-nombre{font-size:15px;font-weight:800;margin-bottom:4px}
.cliente-dato{font-size:11px;color:#555;margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:12px}
thead{background:${color};color:#fff}
thead th{padding:9px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
thead th:nth-child(2){text-align:center}
thead th:nth-child(3){text-align:right}
tbody tr:nth-child(even){background:#f8fafc}
.aviso{margin-top:16px;background:#fff7ed;border:1px dashed #d97706;border-radius:8px;padding:10px 14px;font-size:11px;color:#92400e;text-align:center;font-weight:700;letter-spacing:0.5px}
.firmas{margin-top:40px;display:flex;justify-content:space-between;gap:40px}
.firma{flex:1;text-align:center;font-size:11px;color:#666;border-top:1px solid #333;padding-top:6px}
.notas{background:#fffbeb;border-left:3px solid #f59e0b;border-radius:6px;padding:10px 14px;font-size:11px;color:#78350f;line-height:1.5}
.footer{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#999}
@page{size:A4;margin:10mm}
@media print{.page{max-width:none;padding:0}.section,.cliente-box{page-break-inside:avoid}tr{page-break-inside:avoid}}
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
      </div>
    </div>

    <div class="letra-box">
      <div class="letra-grande">R</div>
      <div class="letra-cod">COD. 91</div>
    </div>

    <div class="doc-info">
      <div class="doc-tipo">REMITO</div>
      <div class="doc-num">${numFmt}</div>
      <div class="doc-fecha">Fecha: <strong>${fmtFecha(r.fecha)}</strong></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Cliente</div>
    <div class="cliente-box">
      <div class="cliente-nombre">${r.cliente_nombre}</div>
      ${r.cliente_cuit ? `<div class="cliente-dato"><strong>CUIT:</strong> ${r.cliente_cuit}</div>` : ''}
      ${r.cliente_direccion ? `<div class="cliente-dato"><strong>Dirección:</strong> ${r.cliente_direccion}${r.cliente_localidad ? ', ' + r.cliente_localidad : ''}</div>` : ''}
    </div>
  </div>

  ${transporteHTML}

  <div class="section">
    <div class="section-title">Detalle de mercadería</div>
    <table>
      <thead>
        <tr>
          <th>Descripción</th>
          <th>Unid.</th>
          <th>Cantidad</th>
        </tr>
      </thead>
      <tbody>${itemsHTML}</tbody>
    </table>
  </div>

  <div class="aviso">DOCUMENTO NO VÁLIDO COMO FACTURA</div>

  ${obsHTML}

  <div class="firmas">
    <div class="firma">Entregué conforme</div>
    <div class="firma">Recibí conforme</div>
  </div>

  <div class="footer">
    REMITO ${numFmt} · ${fmtFecha(r.fecha)} · ${p.nombre_campo || p.nombre}
  </div>
</div>

<script>
  window.onload = function() { setTimeout(function() { window.print(); }, 300); };
</script>
</body>
</html>`;
}

export function ImprimirRemitoBtn({ remito, items, productor }: Props) {
  function imprimir() {
    const html = buildHTML(remito, items, productor);
    const win = window.open('', '_blank');
    if (!win) {
      alert('El navegador bloqueó la ventana de impresión. Habilitá pop-ups para este sitio.');
      return;
    }
    win.document.write(html);
    win.document.close();
  }

  return (
    <button type="button" onClick={imprimir}
      className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition text-sm flex items-center gap-2">
      <Printer className="w-4 h-4" strokeWidth={2} />
      Imprimir / PDF
    </button>
  );
}
