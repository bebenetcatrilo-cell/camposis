-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN 16: Cobros ATÓMICOS (aplicar_cobro / anular_cobro)
-- Reemplaza la lógica suelta del server action por funciones
-- Postgres que corren TODO dentro de una sola transacción.
-- Si algo falla → rollback completo. Sin estados a medias.
-- Además serializa la numeración con advisory lock (sin carrera).
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- aplicar_cobro: crea el cobro completo de forma atómica
-- Devuelve el UUID del cobro creado.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION aplicar_cobro(
  p_productor_id   UUID,
  p_cliente_id     UUID,
  p_fecha          DATE,
  p_forma_cobro    forma_cobro,
  p_imputaciones   JSONB,                 -- [{ "factura_id": "...", "importe": 123.45 }, ...]
  p_notas          TEXT DEFAULT NULL,
  p_cheque         JSONB DEFAULT NULL,    -- { numero, banco_emisor, fecha_emision, fecha_cobro, importe, librador, a_nombre_de }
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
  -- Serializa toda la operación (y la numeración) por productor.
  -- Evita números de cobro duplicados ante registros simultáneos.
  PERFORM pg_advisory_xact_lock(hashtext('cobro_' || p_productor_id::text));

  -- ── Cliente (bloqueado para evitar carrera en el saldo) ──
  SELECT * INTO v_cliente
  FROM clientes
  WHERE id = p_cliente_id AND productor_id = p_productor_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente no encontrado'; END IF;

  IF p_imputaciones IS NULL OR jsonb_array_length(p_imputaciones) = 0 THEN
    RAISE EXCEPTION 'Imputá el cobro a al menos una factura';
  END IF;

  -- ── Validar cada imputación contra su factura (bloqueada) ──
  FOR v_imp IN SELECT * FROM jsonb_array_elements(p_imputaciones)
  LOOP
    v_imp_importe := (v_imp->>'importe')::NUMERIC;
    IF v_imp_importe IS NULL OR v_imp_importe <= 0 THEN
      RAISE EXCEPTION 'Importe inválido en una factura';
    END IF;

    SELECT * INTO v_factura
    FROM facturas
    WHERE id = (v_imp->>'factura_id')::UUID AND productor_id = p_productor_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Alguna factura no se encontró'; END IF;
    IF v_factura.cliente_id <> p_cliente_id THEN
      RAISE EXCEPTION 'Hay facturas de otro cliente mezcladas';
    END IF;
    IF v_factura.estado = 'anulada' THEN
      RAISE EXCEPTION 'No podés cobrar una factura anulada';
    END IF;
    IF v_factura.estado = 'borrador' THEN
      RAISE EXCEPTION 'No podés cobrar una factura en borrador (emitila primero)';
    END IF;

    v_pendiente := v_factura.total - v_factura.monto_cobrado;
    IF v_imp_importe > v_pendiente + 0.01 THEN
      RAISE EXCEPTION 'Importe ($%) supera lo pendiente ($%) en una factura',
        v_imp_importe, round(v_pendiente, 2);
    END IF;

    v_importe_total := v_importe_total + v_imp_importe;
  END LOOP;

  IF v_importe_total <= 0 THEN RAISE EXCEPTION 'El importe total debe ser > 0'; END IF;

  -- ── Cheque a cartera (si corresponde) ──
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
      p_productor_id,
      p_cheque->>'numero',
      p_cheque->>'banco_emisor',
      (p_cheque->>'fecha_emision')::DATE,
      (p_cheque->>'fecha_cobro')::DATE,
      (p_cheque->>'importe')::NUMERIC,
      COALESCE(NULLIF(p_cheque->>'a_nombre_de', ''), v_cliente.nombre),
      COALESCE(NULLIF(p_cheque->>'librador', ''), v_cliente.nombre),
      p_cliente_id,
      'cartera',
      p_registrado_por
    )
    RETURNING id INTO v_cheque_id;
  END IF;

  -- ── Número correlativo (ya serializado por el advisory lock) ──
  SELECT COALESCE(MAX(numero), 0) + 1 INTO v_numero
  FROM cobros WHERE productor_id = p_productor_id;

  -- ── Cabecera del cobro ──
  INSERT INTO cobros (
    productor_id, cliente_id, numero, fecha, cliente_nombre,
    importe_total, forma_cobro, cheque_recibido_id, notas, registrado_por
  ) VALUES (
    p_productor_id, p_cliente_id, v_numero, p_fecha, v_cliente.nombre,
    v_importe_total, p_forma_cobro, v_cheque_id, NULLIF(trim(p_notas), ''), p_registrado_por
  )
  RETURNING id INTO v_cobro_id;

  -- ── Imputaciones + actualizar facturas ──
  FOR v_imp IN SELECT * FROM jsonb_array_elements(p_imputaciones)
  LOOP
    v_imp_importe := (v_imp->>'importe')::NUMERIC;

    INSERT INTO cobro_imputaciones (cobro_id, factura_id, importe)
    VALUES (v_cobro_id, (v_imp->>'factura_id')::UUID, v_imp_importe);

    SELECT * INTO v_factura FROM facturas WHERE id = (v_imp->>'factura_id')::UUID;
    v_nuevo_cobrado := v_factura.monto_cobrado + v_imp_importe;

    IF v_nuevo_cobrado >= v_factura.total - 0.01 THEN
      v_nuevo_estado := 'cobrada';
    ELSIF v_nuevo_cobrado > 0 THEN
      v_nuevo_estado := 'parcial';
    ELSE
      v_nuevo_estado := 'emitida';
    END IF;

    UPDATE facturas
    SET monto_cobrado = v_nuevo_cobrado, estado = v_nuevo_estado
    WHERE id = (v_imp->>'factura_id')::UUID;
  END LOOP;

  -- ── Restar del saldo de cuenta corriente del cliente ──
  UPDATE clientes
  SET saldo_cta_cte = saldo_cta_cte - v_importe_total
  WHERE id = p_cliente_id;

  RETURN v_cobro_id;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- anular_cobro: revierte un cobro completo de forma atómica.
-- ─────────────────────────────────────────────────────────────
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

  SELECT * INTO v_cobro
  FROM cobros
  WHERE id = p_cobro_id AND productor_id = p_productor_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cobro no encontrado'; END IF;
  IF v_cobro.anulado THEN RAISE EXCEPTION 'El cobro ya está anulado'; END IF;

  -- ── Revertir cada factura imputada ──
  FOR v_imp IN
    SELECT factura_id, importe FROM cobro_imputaciones WHERE cobro_id = p_cobro_id
  LOOP
    SELECT * INTO v_factura FROM facturas WHERE id = v_imp.factura_id FOR UPDATE;
    IF FOUND THEN
      v_nuevo_cobrado := GREATEST(0, v_factura.monto_cobrado - v_imp.importe);

      IF v_factura.estado NOT IN ('anulada', 'borrador') THEN
        IF v_nuevo_cobrado <= 0.01 THEN
          v_nuevo_estado := 'emitida';
        ELSIF v_nuevo_cobrado >= v_factura.total - 0.01 THEN
          v_nuevo_estado := 'cobrada';
        ELSE
          v_nuevo_estado := 'parcial';
        END IF;
      ELSE
        v_nuevo_estado := v_factura.estado;
      END IF;

      UPDATE facturas
      SET monto_cobrado = v_nuevo_cobrado, estado = v_nuevo_estado
      WHERE id = v_imp.factura_id;
    END IF;
  END LOOP;

  -- ── Anular el cheque si lo había ──
  IF v_cobro.cheque_recibido_id IS NOT NULL THEN
    UPDATE cheques_recibidos SET estado = 'anulado' WHERE id = v_cobro.cheque_recibido_id;
  END IF;

  -- ── Devolver el importe al saldo del cliente ──
  UPDATE clientes
  SET saldo_cta_cte = saldo_cta_cte + v_cobro.importe_total
  WHERE id = v_cobro.cliente_id;

  -- ── Marcar el cobro como anulado (no se borra) ──
  UPDATE cobros
  SET anulado = TRUE, anulado_en = now(), anulado_por = p_anulado_por
  WHERE id = p_cobro_id;

  RETURN TRUE;
END;
$$;


-- ── Permisos de ejecución ──
GRANT EXECUTE ON FUNCTION aplicar_cobro(UUID, UUID, DATE, forma_cobro, JSONB, TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION anular_cobro(UUID, UUID, UUID) TO authenticated;
