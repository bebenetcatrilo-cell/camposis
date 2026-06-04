import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AgregarMiembroForm, MiembrosLista } from './forms';

export default async function GestionUsuariosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: productor } = await supabase
    .from('productores')
    .select('id, nombre, nombre_campo, limite_usuarios')
    .eq('id', id)
    .single();

  if (!productor) notFound();

  const { data: miembros } = await supabase
    .from('miembros')
    .select('id, rol, activo, created_at, perfil:perfiles!miembros_perfil_id_fkey(id, nombre, email, telefono, ultimo_login)')
    .eq('productor_id', id)
    .order('created_at');

  // Normalizar miembros
  const miembrosNorm = (miembros ?? []).map((m: any) => ({
    ...m,
    perfil: Array.isArray(m.perfil) ? m.perfil[0] : m.perfil,
  }));

  return (
    <div className="space-y-6">
      <header>
        <Link
          href={`/super-admin/productores/${id}`}
          className="text-sm text-[var(--fg-muted)] hover:text-[var(--primary)]"
        >
          ← Volver al productor
        </Link>
        <h1
          className="text-3xl tracking-tight mt-2"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          👥 Gestión de usuarios
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">
          {productor.nombre} · {miembrosNorm.length} / {productor.limite_usuarios} usuarios
        </p>
      </header>

      {/* Agregar usuario */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold mb-4">➕ Agregar usuario al productor</h3>
        <AgregarMiembroForm productorId={id} />
      </div>

      {/* Lista de usuarios */}
      <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h3 className="font-bold">Usuarios del productor</h3>
        </div>
        <MiembrosLista miembros={miembrosNorm} productorId={id} />
      </div>
    </div>
  );
}
