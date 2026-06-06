-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN 19: Cuenta corriente de CLIENTES consistente
-- Un solo dueño del saldo: un trigger en facturas que ajusta
-- clientes.saldo_cta_cte ante cualquier cambio (emitir, cobrar,
-- anular, editar). Se saca la lógica de saldo del RPC de cobros
-- (ahora la hace el trigger) para no contar dos veces.
--
-- Modelo: la "deuda" de una factura =
--   (estado ∈ emitida/parcial/cobrada) ? (total − monto_cobrado) : 0
-- El saldo del cliente = suma de esa deuda en todas sus facturas.
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) Trigger: ajusta el saldo del cliente por el delta de deuda
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION actualizar_saldo_cliente_factura()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_out NUMERIC(15,2) := 0;
  v_new_out NUMERIC(15,2) := 0;
  v_delta   NUMERIC(15,2);
  v_cli     UUID;
BEGIN
  -- Deuda anterior
  IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE')
     AND OLD.cliente_id IS NOT NULL
     AND OLD.estado IN ('emitida', 'parcial', 'cobrada') THEN
    v_old_out := OLD.total - OLD.monto_cobrado;
  END IF;

  -- Deuda nueva
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE')
     AND NEW.cliente_id IS NOT NULL
     AND NEW.estado IN ('emitida', 'parcial', 'cobrada') THEN
    v_new_out := NEW.total - NEW.monto_cobrado;
  END IF;

  -- Si cambió de cliente en un UPDATE, mover la deuda de uno a otro
  IF TG_OP = 'UPDATE' AND OLD.cliente_id IS DISTINCT FROM NEW.cliente_id THEN
    IF OLD.cliente_id IS NOT NULL AND v_old_out <> 0 THEN
      UPDATE clientes SET saldo_cta_cte = saldo_cta_cte - v_old_out WHERE id = OLD.cliente_id;
    END IF;
    IF NEW.cliente_id IS NOT NULL AND v_new_out <> 0 THEN
      UPDATE clientes SET saldo_cta_cte = saldo_cta_cte + v_new_out WHERE id = NEW.cliente_id;
    END IF;
  ELSE
    v_delta := v_new_out - v_old_out;
    v_cli := COALESCE(NEW.cliente_id, OLD.cliente_id);
    IF v_cli IS NOT NULL AND v_delta <> 0 THEN
      UPDATE clientes SET saldo_cta_cte = saldo_cta_cte + v_delta WHERE id = v_cli;
    END IF;
  END IF;

  RETURN NULL; -- AFTER trigger
END;
$$;

DROP TRIGGER IF EXISTS trg_saldo_cliente_factura ON facturas;
CREATE TRIGGER trg_saldo_cliente_factura
AFTER INSERT OR UPDATE OR DELETE ON facturas
FOR EACH ROW EXECUTE FUNCTION actualizar_saldo_cliente_factura();

-- ─────────────────────────────────────────────────────────────
-- 2) Recalcular saldos (sincroniza lo existente con las facturas)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION recalcular_saldos_clientes(p_productor_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE clientes c
  SET saldo_cta_cte = COALESCE((
    SELECT SUM(f.total - f.monto_cobrado)
    FROM facturas f
    WHERE f.cliente_id = c.id
      AND f.productor_id = c.productor_id
      AND f.estado IN ('emitida', 'parcial', 'cobrada')
  ), 0)
  WHERE c.productor_id = p_productor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3) Cobros: ahora NO tocan el saldo (lo hace el trigger).
--    Se reemplazan aplicar_cobro / anular_cobro sin la línea de saldo.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION aplicar_cobro(
  p_productor_id   UUID,
  p_cliente_id     UUID,
  p_fecha          DATE,
  p_forma_cobro    forma_cobro,
  p_imputaciones   JSONB,
  p_notas          TEXT DEFAULT NULL,
  p_cheque         JSONB DEFAULT NULL,
  p_registrado_por UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_cliente        clientes%ROWTYPE;
  v_factura        facturas%ROWTYPE;
  v_imp            JSONB;
  v_imp_importe    NUMERIC(15,2);
  v_pendiente      NUMERIC(15,2);
  v_importe_total  NUMERIC(15,2) := 0;
  v_cheque_id      UUID := NULL;
  v_numero         INTEGER;
  v_cobro_id       UUID;
  v_nuevo_cobrado  NUMERIC(15,2);
  v_nuevo_estado   estado_factura;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('cobro_' || p_productor_id::text));

  SELECT * INTO v_cliente FROM clientes
  WHERE id = p_cliente_id AND productor_id = p_productor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente no encontrado'; END IF;

  IF p_imputaciones IS NULL OR jsonb_array_length(p_imputaciones) = 0 THEN
    RAISE EXCEPTION 'Imputá el cobro a al menos una factura';
  END IF;

  FOR v_imp IN SELECT * FROM jsonb_array_elements(p_imputaciones)
  LOOP
    v_imp_importe := (v_imp->>'importe')::NUMERIC;
    IF v_imp_importe IS NULL OR v_imp_importe <= 0 THEN
      RAISE EXCEPTION 'Importe inválido en una factura';
    END IF;

    SELECT * INTO v_factura FROM facturas
    WHERE id = (v_imp->>'factura_id')::UUID AND productor_id = p_productor_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Alguna factura no se encontró'; END IF;
    IF v_factura.cliente_id <> p_cliente_id THEN RAISE EXCEPTION 'Hay facturas de otro cliente mezcladas'; END IF;
    IF v_factura.estado = 'anulada' THEN RAISE EXCEPTION 'No podés cobrar una factura anulada'; END IF;
    IF v_factura.estado = 'borrador' THEN RAISE EXCEPTION 'No podés cobrar una factura en borrador (emitila primero)'; END IF;

    v_pendiente := v_factura.total - v_factura.monto_cobrado;
    IF v_imp_importe > v_pendiente + 0.01 THEN
      RAISE EXCEPTION 'Importe ($%) supera lo pendiente ($%) en una factura', v_imp_importe, round(v_pendiente, 2);
    END IF;

    v_importe_total := v_importe_total + v_imp_importe;
  END LOOP;

  IF v_importe_total <= 0 THEN RAISE EXCEPTION 'El importe total debe ser > 0'; END IF;

  IF p_forma_cobro = 'cheque_recibido' THEN
    IF p_cheque IS NULL THEN RAISE EXCEPTION 'Faltan datos del cheque recibido'; END IF;
    IF (p_cheque->>'numero') IS NULL OR (p_cheque->>'banco_emisor') IS NULL
       OR (p_cheque->>'fecha_emision') IS NULL OR (p_cheque->>'fecha_cobro') IS NULL THEN
      RAISE EXCEPTION 'Datos del cheque incompletos';
    END IF;
    IF abs((p_cheque->>'importe')::NUMERIC - v_importe_total) > 0.01 THEN
      RAISE EXCEPTION 'El importe del cheque debe igualar el cobro total ($%)', round(v_importe_total, 2);
    END IF;

    INSERT INTO cheques_recibidos (
      productor_id, numero, banco_emisor, fecha_emision, fecha_cobro,
      importe, a_nombre_de, librador, cliente_id, estado, registrado_por
    ) VALUES (
      p_productor_id, p_cheque->>'numero', p_cheque->>'banco_emisor',
      (p_cheque->>'fecha_emision')::DATE, (p_cheque->>'fecha_cobro')::DATE,
      (p_cheque->>'importe')::NUMERIC,
      COALESCE(NULLIF(p_cheque->>'a_nombre_de', ''), v_cliente.nombre),
      COALESCE(NULLIF(p_cheque->>'librador', ''), v_cliente.nombre),
      p_cliente_id, 'cartera', p_registrado_por
    ) RETURNING id INTO v_cheque_id;
  END IF;

  SELECT COALESCE(MAX(numero), 0) + 1 INTO v_numero FROM cobros WHERE productor_id = p_productor_id;

  INSERT INTO cobros (
    productor_id, cliente_id, numero, fecha, cliente_nombre,
    importe_total, forma_cobro, cheque_recibido_id, notas, registrado_por
  ) VALUES (
    p_productor_id, p_cliente_id, v_numero, p_fecha, v_cliente.nombre,
    v_importe_total, p_forma_cobro, v_cheque_id, NULLIF(trim(p_notas), ''), p_registrado_por
  ) RETURNING id INTO v_cobro_id;

  FOR v_imp IN SELECT * FROM jsonb_array_elements(p_imputaciones)
  LOOP
    v_imp_importe := (v_imp->>'importe')::NUMERIC;
    INSERT INTO cobro_imputaciones (cobro_id, factura_id, importe)
    VALUES (v_cobro_id, (v_imp->>'factura_id')::UUID, v_imp_importe);

    SELECT * INTO v_factura FROM facturas WHERE id = (v_imp->>'factura_id')::UUID;
    v_nuevo_cobrado := v_factura.monto_cobrado + v_imp_importe;
    IF v_nuevo_cobrado >= v_factura.total - 0.01 THEN v_nuevo_estado := 'cobrada';
    ELSIF v_nuevo_cobrado > 0 THEN v_nuevo_estado := 'parcial';
    ELSE v_nuevo_estado := 'emitida'; END IF;

    -- El trigger de facturas ajusta el saldo del cliente automáticamente.
    UPDATE facturas SET monto_cobrado = v_nuevo_cobrado, estado = v_nuevo_estado
    WHERE id = (v_imp->>'factura_id')::UUID;
  END LOOP;

  RETURN v_cobro_id;
END;
$$;

CREATE OR REPLACE FUNCTION anular_cobro(
  p_cobro_id     UUID,
  p_productor_id UUID,
  p_anulado_por  UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_cobro          cobros%ROWTYPE;
  v_imp            RECORD;
  v_factura        facturas%ROWTYPE;
  v_nuevo_cobrado  NUMERIC(15,2);
  v_nuevo_estado   estado_factura;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('cobro_' || p_productor_id::text));

  SELECT * INTO v_cobro FROM cobros
  WHERE id = p_cobro_id AND productor_id = p_productor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cobro no encontrado'; END IF;
  IF v_cobro.anulado THEN RAISE EXCEPTION 'El cobro ya está anulado'; END IF;

  FOR v_imp IN SELECT factura_id, importe FROM cobro_imputaciones WHERE cobro_id = p_cobro_id
  LOOP
    SELECT * INTO v_factura FROM facturas WHERE id = v_imp.factura_id FOR UPDATE;
    IF FOUND THEN
      v_nuevo_cobrado := GREATEST(0, v_factura.monto_cobrado - v_imp.importe);
      IF v_factura.estado NOT IN ('anulada', 'borrador') THEN
        IF v_nuevo_cobrado <= 0.01 THEN v_nuevo_estado := 'emitida';
        ELSIF v_nuevo_cobrado >= v_factura.total - 0.01 THEN v_nuevo_estado := 'cobrada';
        ELSE v_nuevo_estado := 'parcial'; END IF;
      ELSE
        v_nuevo_estado := v_factura.estado;
      END IF;
      -- El trigger ajusta el saldo del cliente automáticamente.
      UPDATE facturas SET monto_cobrado = v_nuevo_cobrado, estado = v_nuevo_estado
      WHERE id = v_imp.factura_id;
    END IF;
  END LOOP;

  IF v_cobro.cheque_recibido_id IS NOT NULL THEN
    UPDATE cheques_recibidos SET estado = 'anulado' WHERE id = v_cobro.cheque_recibido_id;
  END IF;

  UPDATE cobros
  SET anulado = TRUE, anulado_en = now(), anulado_por = p_anulado_por
  WHERE id = p_cobro_id;

  RETURN TRUE;
END;
$$;

-- ── Permisos ──
GRANT EXECUTE ON FUNCTION recalcular_saldos_clientes(UUID) TO authenticated;
