'use server';

import { createClient } from '@/lib/supabase/server';
import { getProductorActivo } from '@/lib/productor-actual';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type CondIVA = 'responsable_inscripto' | 'monotributo' | 'exento' | 'consumidor_final' | 'no_categorizado';

export async function crearProveedorAction(formData: FormData) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins pueden crear proveedores' };

  const nombre = String(formData.get('nombre') ?? '').trim();
  if (!nombre) return { error: 'El nombre es obligatorio' };

  const cuit = String(formData.get('cuit') ?? '').trim() || null;
  const condicion_iva = String(formData.get('condicion_iva') ?? 'responsable_inscripto') as CondIVA;
  const rubro = String(formData.get('rubro') ?? '').trim() || null;
  const email = String(formData.get('email') ?? '').trim() || null;
  const telefono = String(formData.get('telefono') ?? '').trim() || null;
  const whatsapp = String(formData.get('whatsapp') ?? '').trim() || null;
  const contacto_nombre = String(formData.get('contacto_nombre') ?? '').trim() || null;
  const direccion = String(formData.get('direccion') ?? '').trim() || null;
  const localidad = String(formData.get('localidad') ?? '').trim() || null;
  const provincia = String(formData.get('provincia') ?? '').trim() || null;
  const cp = String(formData.get('cp') ?? '').trim() || null;
  const plazo_pago_dias = Number(formData.get('plazo_pago_dias') ?? 0) || 0;
  const cbu = String(formData.get('cbu') ?? '').trim() || null;
  const alias_cbu = String(formData.get('alias_cbu') ?? '').trim() || null;
  const notas_internas = String(formData.get('notas_internas') ?? '').trim() || null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('proveedores')
    .insert({
      productor_id: ctx.productor.id,
      nombre, cuit, condicion_iva, rubro,
      email, telefono, whatsapp, contacto_nombre,
      direccion, localidad, provincia, cp,
      plazo_pago_dias, cbu, alias_cbu,
      notas_internas,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return { error: 'Ya existe un proveedor con ese CUIT' };
    return { error: error.message };
  }

  revalidatePath('/admin/proveedores');
  redirect(`/admin/proveedores/${data.id}`);
}

export async function actualizarProveedorAction(id: string, formData: FormData) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins pueden editar proveedores' };

  const nombre = String(formData.get('nombre') ?? '').trim();
  if (!nombre) return { error: 'El nombre es obligatorio' };

  const supabase = await createClient();

  const updates = {
    nombre,
    cuit: String(formData.get('cuit') ?? '').trim() || null,
    condicion_iva: String(formData.get('condicion_iva') ?? 'responsable_inscripto') as CondIVA,
    rubro: String(formData.get('rubro') ?? '').trim() || null,
    email: String(formData.get('email') ?? '').trim() || null,
    telefono: String(formData.get('telefono') ?? '').trim() || null,
    whatsapp: String(formData.get('whatsapp') ?? '').trim() || null,
    contacto_nombre: String(formData.get('contacto_nombre') ?? '').trim() || null,
    direccion: String(formData.get('direccion') ?? '').trim() || null,
    localidad: String(formData.get('localidad') ?? '').trim() || null,
    provincia: String(formData.get('provincia') ?? '').trim() || null,
    cp: String(formData.get('cp') ?? '').trim() || null,
    plazo_pago_dias: Number(formData.get('plazo_pago_dias') ?? 0) || 0,
    cbu: String(formData.get('cbu') ?? '').trim() || null,
    alias_cbu: String(formData.get('alias_cbu') ?? '').trim() || null,
    notas_internas: String(formData.get('notas_internas') ?? '').trim() || null,
  };

  const { error } = await supabase
    .from('proveedores')
    .update(updates)
    .eq('id', id)
    .eq('productor_id', ctx.productor.id);

  if (error) {
    if (error.code === '23505') return { error: 'Ya existe un proveedor con ese CUIT' };
    return { error: error.message };
  }

  revalidatePath('/admin/proveedores');
  revalidatePath(`/admin/proveedores/${id}`);
  redirect(`/admin/proveedores/${id}`);
}

export async function toggleActivoProveedorAction(id: string) {
  const ctx = await getProductorActivo();
  if (!ctx) return { error: 'No autorizado' };
  if (ctx.rol !== 'admin_productor') return { error: 'Solo admins' };

  const supabase = await createClient();

  const { data: prov } = await supabase
    .from('proveedores')
    .select('activo')
    .eq('id', id)
    .eq('productor_id', ctx.productor.id)
    .single();

  if (!prov) return { error: 'Proveedor no encontrado' };

  const { error } = await supabase
    .from('proveedores')
    .update({ activo: !prov.activo })
    .eq('id', id)
    .eq('productor_id', ctx.productor.id);

  if (error) return { error: error.message };

  revalidatePath('/admin/proveedores');
  revalidatePath(`/admin/proveedores/${id}`);
  return { ok: true };
}
