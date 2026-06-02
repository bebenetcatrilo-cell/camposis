// ════════════════════════════════════════════════════════════
// TIPOS — Campos SIS
// Matchean los enums y tablas de Supabase
// ════════════════════════════════════════════════════════════

// ── Enums ──
export type RolUsuarioTipo =
  | 'super_admin'      // Bebe: ve todos los productores
  | 'admin_productor'  // Dueño del campo
  | 'empleado';        // Operario, contador, etc.

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
  productor_id: string | null;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: RolUsuarioTipo;
  activo: boolean;
  ultimo_login: string | null;
  created_at: string;
  updated_at: string;
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
