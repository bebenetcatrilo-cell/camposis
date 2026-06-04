/**
 * Calcula el saldo de cuenta corriente de un cliente.
 *
 * Lógica:
 * - saldo_cta_cte (cliente): saldo inicial / manual (puede ser + o −)
 * - Facturas EMITIDAS no cobradas: suman al saldo (deuda)
 * - Facturas COBRADAS: ya saldadas (no impactan)
 * - Cheques recibidos no rechazados/anulados que NO están vinculados a factura cobrada:
 *   restan del saldo (pago en curso)
 *
 * Resultado:
 * - saldo > 0: el cliente nos debe
 * - saldo < 0: nosotros le debemos
 * - saldo = 0: cuentas saldadas
 */

type Factura = {
  id: string;
  cliente_id: string | null;
  total: number | string;
  estado: string;
  fecha: string;
};

type Cheque = {
  id: string;
  cliente_id: string | null;
  factura_id: string | null;
  importe: number | string;
  estado: string;
  fecha_emision: string;
};

export type SaldoCliente = {
  saldo_inicial: number;
  facturas_pendientes_total: number;
  facturas_pendientes_cantidad: number;
  facturas_cobradas_total: number;
  facturas_cobradas_cantidad: number;
  cheques_aplicados_total: number;
  cheques_aplicados_cantidad: number;
  saldo_total: number;
};

export function calcularSaldoCliente(
  saldoInicial: number,
  facturas: Factura[],
  cheques: Cheque[]
): SaldoCliente {
  // Facturas pendientes de cobro (emitidas)
  const facturasPendientes = facturas.filter((f) => f.estado === 'emitida');
  const facturasCobradas = facturas.filter((f) => f.estado === 'cobrada');

  const facPendTotal = facturasPendientes.reduce(
    (s, f) => s + Number(f.total),
    0
  );
  const facCobTotal = facturasCobradas.reduce(
    (s, f) => s + Number(f.total),
    0
  );

  // Cheques recibidos del cliente que están "en curso" pero no anulados/rechazados
  // y que NO están vinculados a una factura ya cobrada (porque si la factura está cobrada, ya se contó)
  const facturasCobradasIds = new Set(facturasCobradas.map((f) => f.id));
  const chequesAplicados = cheques.filter(
    (c) =>
      c.estado !== 'anulado' &&
      c.estado !== 'rechazado' &&
      // Solo cheques no vinculados a factura ya cobrada
      (!c.factura_id || !facturasCobradasIds.has(c.factura_id))
  );

  const chqAplicadosTotal = chequesAplicados.reduce(
    (s, c) => s + Number(c.importe),
    0
  );

  // Saldo final:
  // + saldo inicial manual
  // + facturas pendientes (deuda)
  // − cheques recibidos en curso (pago anticipado o aplicado a factura)
  const saldoTotal = saldoInicial + facPendTotal - chqAplicadosTotal;

  return {
    saldo_inicial: saldoInicial,
    facturas_pendientes_total: facPendTotal,
    facturas_pendientes_cantidad: facturasPendientes.length,
    facturas_cobradas_total: facCobTotal,
    facturas_cobradas_cantidad: facturasCobradas.length,
    cheques_aplicados_total: chqAplicadosTotal,
    cheques_aplicados_cantidad: chequesAplicados.length,
    saldo_total: saldoTotal,
  };
}
