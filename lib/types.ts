// ════════════════════════════════════════════════════════════
// TIPOS — Campos SIS
// Matchean los enums y tablas de Supabase
// ════════════════════════════════════════════════════════════

// ── Enums ──
export type RolUsuarioTipo =
  | 'super_admin'      // (legacy) compat
  | 'admin_productor'  // Dueño del campo (rol DENTRO de un productor)
  | 'empleado';        // Operario, contador (rol DENTRO de un productor)

/** Nuevo: rol al nivel del usuario (no productor) */
export type RolPerfilTipo =
  | 'super_admin'      // Bebe (puede ver todo)
  | 'usuario_normal';  // Resto (su rol específico está en cada membresía)

export type PlanTipo = 'trial' | 'basico' | 'pro' | 'enterprise';

export type EstadoSuscripcionTipo =
  | 'activa'
  | 'vencida'
  | 'suspendida'
  | 'cancelada';

// ── Tablas ──

/** Un productor = un cliente del SaaS (tenant) */
export interface Productor {
  id: string;
  nombre: string;
  slug: string;
  email_contacto: string;
  telefono: string | null;
  whatsapp: string | null;

  nombre_campo: string | null;
  direccion: string | null;
  localidad: string | null;
  provincia: string | null;
  cuit: string | null;

  logo_url: string | null;
  color_primario: string;
  dominio_custom: string | null;

  plan: PlanTipo;
  estado_suscripcion: EstadoSuscripcionTipo;
  trial_termina: string | null;
  proximo_pago: string | null;

  limite_usuarios: number;
  limite_silos: number;

  activa: boolean;
  notas_internas: string | null;

  created_at: string;
  updated_at: string;
}

export interface Perfil {
  id: string;
  productor_id: string | null;   // (legacy) compat
  nombre: string;
  email: string;
  telefono: string | null;
  rol: RolUsuarioTipo;             // (legacy) compat
  rol_perfil: RolPerfilTipo;       // nuevo
  activo: boolean;
  ultimo_login: string | null;
  created_at: string;
  updated_at: string;
}

/** Nueva tabla: relación N:N usuario ↔ productor */
export interface Miembro {
  id: string;
  perfil_id: string;
  productor_id: string;
  rol: 'admin_productor' | 'empleado';
  activo: boolean;
  agregado_por: string | null;
  created_at: string;
  updated_at: string;
}

/** Combinación útil: una membresía con datos del productor */
export interface MembresiaConProductor extends Miembro {
  productor: Pick<Productor, 'id' | 'nombre' | 'slug' | 'nombre_campo' | 'logo_url' | 'color_primario' | 'plan' | 'estado_suscripcion'>;
}

export interface Suscripcion {
  id: string;
  productor_id: string;
  fecha: string;
  monto: number;
  plan: PlanTipo;
  periodo_desde: string;
  periodo_hasta: string;
  metodo_pago: string | null;
  comprobante_url: string | null;
  notas: string | null;
  registrado_por: string | null;
  created_at: string;
}

// ── Contextos útiles ──

export interface ProductorContexto {
  productor: Productor;
  esPublico: boolean;
}

// ── BLOQUE 5: Productos ──
export type TipoProducto = 'cereal' | 'hacienda';
export type UnidadMedida = 'tn' | 'kg' | 'qq' | 'cabezas';
export type SexoHacienda = 'macho' | 'hembra' | 'mixto';

export interface Producto {
  id: string;
  productor_id: string;
  tipo: TipoProducto;
  nombre: string;
  unidad: UnidadMedida;
  activo: boolean;
  observaciones: string | null;
  especie: string | null;
  variedad: string | null;
  campania: string | null;
  grado: string | null;
  categoria: string | null;
  raza: string | null;
  sexo: SexoHacienda | null;
  edad_aprox_meses: number | null;
  peso_promedio_kg: number | null;
  created_at: string;
  updated_at: string;
}

// ── BLOQUE 6: Clientes ──
export type TipoCliente = 'acopio' | 'frigorifico' | 'proveedor' | 'particular' | 'otro';
export type CondicionIva = 'ri' | 'monotributo' | 'exento' | 'consumidor_final' | 'no_categorizado';

export interface Cliente {
  id: string;
  productor_id: string;
  nombre: string;
  tipo: TipoCliente;
  cuit: string | null;
  condicion_iva: CondicionIva;
  email: string | null;
  telefono: string | null;
  whatsapp: string | null;
  direccion: string | null;
  localidad: string | null;
  provincia: string | null;
  cp: string | null;
  saldo_cta_cte: number;
  notas_internas: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// ── BLOQUE 7: Silos ──
export type TipoSilo = 'aereo' | 'bolsa' | 'galpon' | 'tercero' | 'otro';
export type TipoMovimientoSilo = 'entrada' | 'salida';

export interface Silo {
  id: string;
  productor_id: string;
  nombre: string;
  tipo: TipoSilo;
  ubicacion: string | null;
  capacidad_tn: number | null;
  observaciones: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface MovimientoSilo {
  id: string;
  productor_id: string;
  silo_id: string;
  producto_id: string;
  tipo: TipoMovimientoSilo;
  cantidad_tn: number;
  campania: string | null;
  fecha: string;
  observaciones: string | null;
  registrado_por: string | null;
  created_at: string;
}
