-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN 18: Pagos a Proveedor ATÓMICOS
-- Espejo de la migración 16 (cobros). Toda la operación corre
-- en una sola transacción → si algo falla, rollback completo.
-- Maneja cheque propio (emitido) y endoso de cheque recibido.
-- BONUS: corrige el bug del cheque propio (el action viejo
-- insertaba la columna inexistente 'entregado_a' y rompía).
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- aplicar_pago_proveedor: crea el pago completo de forma atómica.
-- Devuelve el UUID del pago creado.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION aplicar_pago_proveedor(
  p_productor_id        UUID,
  p_proveedor_id        UUID,
  p_fecha               DATE,
  p_forma_pago          forma_pago_prov,
  p_imputaciones        JSONB,                -- [{ "compra_id": "...", "importe": 123.45 }, ...]
  p_notas               TEXT DEFAULT NULL,
  p_cheque_propio       JSONB DEFAULT NULL,   -- { numero, banco_propio, fecha_emision, fecha_pago, importe }
  p_cheque_recibido_id  UUID DEFAULT NULL,    -- para endoso
  p_registrado_por      UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_prov           proveedores%ROWTYPE;
  v_compra         compras%ROWTYPE;
  v_imp            JSONB;
  v_imp_importe    NUMERIC(15,2);
  v_pendiente      NUMERIC(15,2);
  v_importe_total  NUMERIC(15,2) := 0;
  v_cheque_emi_id  UUID := NULL;
  v_cheque_rec_id  UUID := NULL;
  v_cheque_rec     cheques_recibidos%ROWTYPE;
  v_numero         INTEGER;
  v_pago_id        UUID;
  v_nuevo_pagado   NUMERIC(15,2);
  v_nuevo_estado   estado_compra;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('pago_prov_' || p_productor_id::text));

  -- ── Proveedor (bloqueado) ──
  SELECT * INTO v_prov
  FROM proveedores
  WHERE id = p_proveedor_id AND productor_id = p_productor_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proveedor no encontrado'; END IF;

  IF p_imputaciones IS NULL OR jsonb_array_length(p_imputaciones) = 0 THEN
    RAISE EXCEPTION 'Imputá el pago a al menos una compra';
  END IF;

  -- ── Validar imputaciones contra cada compra (bloqueada) ──
  FOR v_imp IN SELECT * FROM jsonb_array_elements(p_imputaciones)
  LOOP
    v_imp_importe := (v_imp->>'importe')::NUMERIC;
    IF v_imp_importe IS NULL OR v_imp_importe <= 0 THEN
      RAISE EXCEPTION 'Importe inválido en una compra';
    END IF;

    SELECT * INTO v_compra
    FROM compras
    WHERE id = (v_imp->>'compra_id')::UUID AND productor_id = p_productor_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Alguna compra no se encontró'; END IF;
    IF v_compra.proveedor_id <> p_proveedor_id THEN
      RAISE EXCEPTION 'Hay compras de otro proveedor mezcladas';
    END IF;
    IF v_compra.estado = 'anulada' THEN
      RAISE EXCEPTION 'No podés pagar una compra anulada';
    END IF;

    v_pendiente := v_compra.total - v_compra.monto_pagado;
    IF v_imp_importe > v_pendiente + 0.01 THEN
      RAISE EXCEPTION 'Importe ($%) supera lo pendiente ($%) en una compra',
        v_imp_importe, round(v_pendiente, 2);
    END IF;

    v_importe_total := v_importe_total + v_imp_importe;
  END LOOP;

  IF v_importe_total <= 0 THEN RAISE EXCEPTION 'El importe total debe ser > 0'; END IF;

  -- ── Cheque propio (emitido nuevo) ──
  IF p_forma_pago = 'cheque_propio' THEN
    IF p_cheque_propio IS NULL THEN RAISE EXCEPTION 'Faltan datos del cheque propio'; END IF;
    IF (p_cheque_propio->>'numero') IS NULL OR (p_cheque_propio->>'banco_propio') IS NULL
       OR (p_cheque_propio->>'fecha_emision') IS NULL OR (p_cheque_propio->>'fecha_pago') IS NULL THEN
      RAISE EXCEPTION 'Datos del cheque propio incompletos';
    END IF;
    IF abs((p_cheque_propio->>'importe')::NUMERIC - v_importe_total) > 0.01 THEN
      RAISE EXCEPTION 'El importe del cheque debe igualar el pago total ($%)', round(v_importe_total, 2);
    END IF;

    INSERT INTO cheques_emitidos (
      productor_id, numero, banco_propio, fecha_emision, fecha_pago,
      importe, beneficiario, concepto, estado, fecha_entrega, registrado_por
    ) VALUES (
      p_productor_id,
      p_cheque_propio->>'numero',
      p_cheque_propio->>'banco_propio',
      (p_cheque_propio->>'fecha_emision')::DATE,
      (p_cheque_propio->>'fecha_pago')::DATE,
      (p_cheque_propio->>'importe')::NUMERIC,
      v_prov.nombre,
      'Pago a ' || v_prov.nombre,
      'entregado',
      p_fecha,
      p_registrado_por
    )
    RETURNING id INTO v_cheque_emi_id;

  -- ── Endoso de cheque recibido ──
  ELSIF p_forma_pago = 'cheque_endoso' THEN
    IF p_cheque_recibido_id IS NULL THEN RAISE EXCEPTION 'Falta el cheque recibido a endosar'; END IF;

    SELECT * INTO v_cheque_rec
    FROM cheques_recibidos
    WHERE id = p_cheque_recibido_id AND productor_id = p_productor_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cheque recibido no encontrado'; END IF;
    IF v_cheque_rec.estado <> 'cartera' THEN
      RAISE EXCEPTION 'El cheque no está en cartera (no se puede endosar)';
    END IF;
    IF abs(v_cheque_rec.importe - v_importe_total) > 0.01 THEN
      RAISE EXCEPTION 'El importe del cheque debe igualar el pago total ($%)', round(v_importe_total, 2);
    END IF;

    UPDATE cheques_recibidos
    SET estado = 'endosado', endosado_a = v_prov.nombre, fecha_endoso = p_fecha
    WHERE id = v_cheque_rec.id;

    v_cheque_rec_id := v_cheque_rec.id;
  END IF;

  -- ── Número correlativo (serializado por advisory lock) ──
  SELECT COALESCE(MAX(numero), 0) + 1 INTO v_numero
  FROM pagos_proveedor WHERE productor_id = p_productor_id;

  -- ── Cabecera del pago ──
  INSERT INTO pagos_proveedor (
    productor_id, proveedor_id, numero, fecha, proveedor_nombre,
    importe_total, forma_pago, cheque_emitido_id, cheque_recibido_id, notas, registrado_por
  ) VALUES (
    p_productor_id, p_proveedor_id, v_numero, p_fecha, v_prov.nombre,
    v_importe_total, p_forma_pago, v_cheque_emi_id, v_cheque_rec_id, NULLIF(trim(p_notas), ''), p_registrado_por
  )
  RETURNING id INTO v_pago_id;

  -- ── Imputaciones + actualizar compras ──
  FOR v_imp IN SELECT * FROM jsonb_array_elements(p_imputaciones)
  LOOP
    v_imp_importe := (v_imp->>'importe')::NUMERIC;

    INSERT INTO pago_proveedor_imputaciones (pago_id, compra_id, importe)
    VALUES (v_pago_id, (v_imp->>'compra_id')::UUID, v_imp_importe);

    SELECT * INTO v_compra FROM compras WHERE id = (v_imp->>'compra_id')::UUID;
    v_nuevo_pagado := v_compra.monto_pagado + v_imp_importe;

    IF v_nuevo_pagado >= v_compra.total - 0.01 THEN
      v_nuevo_estado := 'pagada';
    ELSIF v_nuevo_pagado > 0 THEN
      v_nuevo_estado := 'parcial';
    ELSE
      v_nuevo_estado := 'pendiente';
    END IF;

    UPDATE compras
    SET monto_pagado = v_nuevo_pagado, estado = v_nuevo_estado
    WHERE id = (v_imp->>'compra_id')::UUID;
  END LOOP;

  -- ── Restar del saldo del proveedor ──
  UPDATE proveedores
  SET saldo_cta_cte = saldo_cta_cte - v_importe_total
  WHERE id = p_proveedor_id;

  RETURN v_pago_id;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- anular_pago_proveedor: revierte un pago completo de forma atómica.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION anular_pago_proveedor(
  p_pago_id      UUID,
  p_productor_id UUID,
  p_anulado_por  UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_pago           pagos_proveedor%ROWTYPE;
  v_imp            RECORD;
  v_compra         compras%ROWTYPE;
  v_nuevo_pagado   NUMERIC(15,2);
  v_nuevo_estado   estado_compra;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('pago_prov_' || p_productor_id::text));

  SELECT * INTO v_pago
  FROM pagos_proveedor
  WHERE id = p_pago_id AND productor_id = p_productor_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pago no encontrado'; END IF;
  IF v_pago.anulado THEN RAISE EXCEPTION 'El pago ya está anulado'; END IF;

  -- ── Revertir cada compra imputada ──
  FOR v_imp IN
    SELECT compra_id, importe FROM pago_proveedor_imputaciones WHERE pago_id = p_pago_id
  LOOP
    SELECT * INTO v_compra FROM compras WHERE id = v_imp.compra_id FOR UPDATE;
    IF FOUND THEN
      v_nuevo_pagado := GREATEST(0, v_compra.monto_pagado - v_imp.importe);

      IF v_compra.estado <> 'anulada' THEN
        IF v_nuevo_pagado <= 0.01 THEN
          v_nuevo_estado := 'pendiente';
        ELSIF v_nuevo_pagado >= v_compra.total - 0.01 THEN
          v_nuevo_estado := 'pagada';
        ELSE
          v_nuevo_estado := 'parcial';
        END IF;
      ELSE
        v_nuevo_estado := v_compra.estado;
      END IF;

      UPDATE compras
      SET monto_pagado = v_nuevo_pagado, estado = v_nuevo_estado
      WHERE id = v_imp.compra_id;
    END IF;
  END LOOP;

  -- ── Anular cheque emitido si lo había ──
  IF v_pago.cheque_emitido_id IS NOT NULL THEN
    UPDATE cheques_emitidos SET estado = 'anulado' WHERE id = v_pago.cheque_emitido_id;
  END IF;

  -- ── Devolver cheque endosado a cartera ──
  IF v_pago.cheque_recibido_id IS NOT NULL THEN
    UPDATE cheques_recibidos
    SET estado = 'cartera', endosado_a = NULL, fecha_endoso = NULL
    WHERE id = v_pago.cheque_recibido_id;
  END IF;

  -- ── Devolver el importe al saldo del proveedor ──
  UPDATE proveedores
  SET saldo_cta_cte = saldo_cta_cte + v_pago.importe_total
  WHERE id = v_pago.proveedor_id;

  -- ── Marcar el pago como anulado ──
  UPDATE pagos_proveedor
  SET anulado = TRUE, anulado_en = now(), anulado_por = p_anulado_por
  WHERE id = p_pago_id;

  RETURN TRUE;
END;
$$;


-- ── Permisos de ejecución ──
GRANT EXECUTE ON FUNCTION aplicar_pago_proveedor(UUID, UUID, DATE, forma_pago_prov, JSONB, TEXT, JSONB, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION anular_pago_proveedor(UUID, UUID, UUID) TO authenticated;
