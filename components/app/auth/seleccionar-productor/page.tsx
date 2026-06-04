import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMisMembresia } from '@/lib/productor-actual';
import { SeleccionarProductorList } from './lista';
import { logoutAction } from '@/lib/actions/auth';

export default async function SeleccionarProductorPage({
  searchParams,
}: {
  searchParams: Promise<{ auto?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol_perfil, activo')
    .eq('id', user.id)
    .single();

  if (!perfil || !perfil.activo) {
    redirect('/auth/login');
  }
  if (perfil.rol_perfil === 'super_admin') {
    redirect('/super-admin');
  }

  const membresia = await getMisMembresia();

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl mb-3">🌾</div>
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            ¿Con qué campo querés trabajar?
          </h1>
          <p className="text-sm text-[var(--fg-muted)]">
            Hola, {perfil.nombre.split(' ')[0]}. Tenés acceso a {membresia.length} {membresia.length === 1 ? 'productor' : 'productores'}.
          </p>
        </div>

        {membresia.length === 0 ? (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-10 shadow-sm text-center">
            <div className="text-5xl mb-3">⏳</div>
            <h2 className="text-lg font-bold">Sin productores asignados</h2>
            <p className="text-sm text-[var(--fg-muted)] mt-2 max-w-md mx-auto">
              Tu cuenta todavía no está asociada a ningún productor. Contactá
              al administrador del sistema para activar tu acceso.
            </p>
            <form action={logoutAction} className="mt-4">
              <button
                type="submit"
                className="text-sm text-[var(--primary)] hover:underline"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        ) : (
          <SeleccionarProductorList membresia={membresia} autoSelect={membresia.length === 1} />
        )}

        {membresia.length > 0 && (
          <div className="text-center">
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-sm text-[var(--fg-muted)] hover:text-[var(--red)]"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
