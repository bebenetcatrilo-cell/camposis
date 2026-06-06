'use client';

import { Printer } from 'lucide-react';

type Imputacion = {
  importe: number;
  factura?: { tipo: string; punto_venta: string; numero: number; fecha: string } | null;
};

type Cobro = {
  numero: number;
  fecha: string;
  cliente_nombre: string;
  importe_total: number;
  forma_cobro: string;
  notas: string | null;
  imputaciones?: Imputacion[];
  cheque_recibido?: { numero: string; banco_emisor: string; fecha_cobro: string } | null;
};

type Productor = {
  nombre: string;
  nombre_campo: string | null;
  cuit: string | null;
  direccion: string | null;
  localidad: string | null;
  telefono: string | null;
  email_contacto: string | null;
  logo_url: string | null;
  color_primario: string;
};

type Props = { cobro: Cobro; productor: Productor };

const formaCobroLabels: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cheque_recibido: 'Cheque',
  tarjeta: 'Tarjeta',
  otro: 'Otro',
};

function fmt(n: number): string {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtFecha(f: string): string {
  if (!f) return '';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

// ── Monto en letras (pesos argentinos) ──
const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const ESPECIALES: Record<number, string> = {
  10: 'DIEZ', 11: 'ONCE', 12: 'DOCE', 13: 'TRECE', 14: 'CATORCE', 15: 'QUINCE',
  16: 'DIECISÉIS', 17: 'DIECISIETE', 18: 'DIECIOCHO', 19: 'DIECINUEVE',
  20: 'VEINTE', 21: 'VEINTIUNO', 22: 'VEINTIDÓS', 23: 'VEINTITRÉS', 24: 'VEINTICUATRO',
  25: 'VEINTICINCO', 26: 'VEINTISÉIS', 27: 'VEINTISIETE', 28: 'VEINTIOCHO', 29: 'VEINTINUEVE',
};
const DECENAS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function menorAMil(n: number, apocope = false): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  let out = '';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  if (c > 0) out += CENTENAS[c] + ' ';
  if (resto > 0) {
    if (resto < 10) {
      out += (apocope && resto === 1) ? 'UN' : UNIDADES[resto];
    } else if (ESPECIALES[resto]) {
      out += (apocope && resto === 21) ? 'VEINTIÚN' : ESPECIALES[resto];
    } else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      out += DECENAS[d];
      if (u > 0) out += ' Y ' + ((apocope && u === 1) ? 'UN' : UNIDADES[u]);
    }
  }
  return out.trim();
}

function enteroEnLetras(n: number): string {
  if (n === 0) return 'CERO';
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  let out = '';
  if (millones > 0) out += (millones === 1 ? 'UN MILLÓN' : menorAMil(millones, true) + ' MILLONES') + ' ';
  if (miles > 0) out += (miles === 1 ? 'MIL' : menorAMil(miles, true) + ' MIL') + ' ';
  if (resto > 0) out += menorAMil(resto);
  return out.trim();
}

function montoEnLetras(monto: number): string {
  const entero = Math.floor(monto);
  const centavos = Math.round((monto - entero) * 100);
  const cent = String(centavos).padStart(2, '0');
  return `SON PESOS ${enteroEnLetras(entero)} CON ${cent}/100`;
}

function buildHTML(c: Cobro, p: Productor): string {
  const color = p.color_primario || '#4a7c2a';
  const numFmt = String(c.numero).padStart(8, '0');

  const impHTML = (c.imputaciones && c.imputaciones.length)
    ? c.imputaciones.map(it => {
        const fac = it.factura
          ? `Factura ${it.factura.tipo} ${it.factura.punto_venta}-${String(it.factura.numero).padStart(8, '0')}`
          : 'Factura';
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${fac}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">$${fmt(Number(it.importe))}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="2" style="padding:12px;color:#888;font-style:italic;text-align:center">Sin imputaciones</td></tr>';

  const chequeHTML = c.cheque_recibido
    ? `<div class="section"><div class="section-title">Cheque recibido</div><div style="font-size:12px;color:#374151">N° ${c.cheque_recibido.numero} · ${c.cheque_recibido.banco_emisor} · Vto ${fmtFecha(c.cheque_recibido.fecha_cobro)}</div></div>`
    : '';

  const notasHTML = c.notas
    ? `<div class="section"><div class="section-title">Observaciones</div><div class="notas">${c.notas.replace(/\n/g, '<br/>')}</div></div>`
    : '';

  const logoHTML = p.logo_url
    ? `<img src="${p.logo_url}" alt="${p.nombre}" style="height:60px;max-width:200px;object-fit:contain"/>`
    : `<div style="width:60px;height:60px;background:${color};border-radius:8px;display:grid;place-items:center;color:#fff;font-size:30px;font-weight:900">🌾</div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>RECIBO N° ${numFmt} - ${p.nombre_campo || p.nombre}</title>
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
.recibi{background:#f4f6f9;border-radius:8px;padding:16px 18px;margin-bottom:16px}
.recibi-line{font-size:13px;color:#374151;margin-bottom:8px}
.recibi-line strong{color:#1a2340}
.monto-grande{font-size:26px;font-weight:900;color:${color};font-family:'Courier New',monospace}
.en-letras{font-size:12px;font-weight:700;color:#444;text-transform:uppercase;letter-spacing:0.3px;margin-top:4px;font-style:italic}
.section{margin-bottom:14px}
.section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#666;margin-bottom:6px}
table{width:100%;border-collapse:collapse;font-size:12px}
thead{background:${color};color:#fff}
thead th{padding:8px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
thead th:last-child{text-align:right}
.aviso{margin-top:14px;background:#fff7ed;border:1px dashed #d97706;border-radius:8px;padding:8px 14px;font-size:10px;color:#92400e;text-align:center;font-weight:700;letter-spacing:0.5px}
.notas{background:#fffbeb;border-left:3px solid #f59e0b;border-radius:6px;padding:10px 14px;font-size:11px;color:#78350f;line-height:1.5}
.firma{margin-top:48px;width:260px;margin-left:auto;text-align:center;font-size:11px;color:#666;border-top:1px solid #333;padding-top:6px}
.footer{margin-top:24px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#999}
@page{size:A4;margin:10mm}
@media print{.page{max-width:none;padding:0}.section,.recibi{page-break-inside:avoid}tr{page-break-inside:avoid}}
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
      <div class="letra-grande">X</div>
      <div class="letra-cod">COD. 99</div>
    </div>
    <div class="doc-info">
      <div class="doc-tipo">RECIBO</div>
      <div class="doc-num">N° ${numFmt}</div>
      <div class="doc-fecha">Fecha: <strong>${fmtFecha(c.fecha)}</strong></div>
    </div>
  </div>

  <div class="recibi">
    <div class="recibi-line">Recibí de <strong>${c.cliente_nombre}</strong></div>
    <div class="recibi-line">la cantidad de:</div>
    <div class="monto-grande">$${fmt(Number(c.importe_total))}</div>
    <div class="en-letras">${montoEnLetras(Number(c.importe_total))}</div>
    <div class="recibi-line" style="margin-top:10px">en concepto de pago de las siguientes facturas, mediante <strong>${formaCobroLabels[c.forma_cobro] ?? c.forma_cobro}</strong>:</div>
  </div>

  <div class="section">
    <table>
      <thead><tr><th>Comprobante</th><th>Importe</th></tr></thead>
      <tbody>${impHTML}</tbody>
    </table>
  </div>

  ${chequeHTML}

  <div class="aviso">DOCUMENTO NO VÁLIDO COMO FACTURA · COMPROBANTE DE PAGO</div>

  ${notasHTML}

  <div class="firma">Firma y aclaración</div>

  <div class="footer">
    RECIBO N° ${numFmt} · ${fmtFecha(c.fecha)} · ${p.nombre_campo || p.nombre}
  </div>
</div>

<script>
  window.onload = function() { setTimeout(function() { window.print(); }, 300); };
</script>
</body>
</html>`;
}

export function ReciboBtn({ cobro, productor }: Props) {
  function imprimir() {
    const html = buildHTML(cobro, productor);
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
      className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--primary)] text-white rounded-lg font-semibold hover:bg-[var(--primary-h)] transition text-sm">
      <Printer className="w-4 h-4" strokeWidth={2} />
      Imprimir recibo
    </button>
  );
}
