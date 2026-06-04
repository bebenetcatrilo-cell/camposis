import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PerfilForm, CambiarPasswordForm } from './form';

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!perfil) redirect('/auth/login');

  const rolLabel = perfil.rol === 'super_admin'
    ? 'Super Administrador'
    : perfil.rol === 'admin_productor'
    ? 'Administrador del productor'
    : 'Empleado';

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1
          className="text-3xl tracking-tight"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          👤 Mi perfil
        </h1>
        <p className="text-[var(--fg-muted)] mt-1">
          Tus datos personales y contraseña.
        </p>
      </header>

      {/* Info readonly */}
      <div className="bg-[var(--bg-hover)] border border-[var(--border)] rounded-2xl p-5">
        <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider mb-3">
          📋 Información de cuenta
        </h3>
        <dl className="text-sm grid grid-cols-2 gap-y-2">
          <dt className="text-[var(--fg-muted)]">Email</dt>
          <dd className="font-medium text-right">{perfil.email}</dd>
          <dt className="text-[var(--fg-muted)]">Rol</dt>
          <dd className="font-medium text-right">{rolLabel}</dd>
          <dt className="text-[var(--fg-muted)]">Último login</dt>
          <dd className="font-medium text-right">
            {perfil.ultimo_login
              ? new Date(perfil.ultimo_login).toLocaleString('es-AR')
              : '—'}
          </dd>
        </dl>
      </div>

      {/* Datos editables */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider mb-4">
          ✏️ Datos personales
        </h3>
        <PerfilForm
          defaultNombre={perfil.nombre}
          defaultTelefono={perfil.telefono ?? ''}
        />
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-sm text-[var(--fg-muted)] uppercase tracking-wider mb-4">
          🔒 Cambiar contraseña
        </h3>
        <CambiarPasswordForm />
      </div>
    </div>
  );
}
