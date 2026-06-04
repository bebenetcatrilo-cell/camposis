import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import MobileHeader from '@/components/layout/mobile-header';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Traer perfil + productor
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol, activo, productor_id, productores(nombre, nombre_campo, color_primario, plan, estado_suscripcion, logo_url)')
    .eq('id', user.id)
    .single();

  if (!perfil || !perfil.activo) {
    redirect('/auth/login');
  }

  // Super-admin no debería estar acá
  if (perfil.rol === 'super_admin') {
    redirect('/super-admin');
  }

  // Si no tiene productor asignado, mensaje
  if (!perfil.productor_id) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-2xl border border-[var(--border)] shadow-sm">
          <div className="text-5xl">⏳</div>
          <h1 className="text-xl font-bold">Cuenta sin asignar</h1>
          <p className="text-sm text-[var(--fg-muted)]">
            Tu usuario todavía no está asociado a un productor. Contactá al
            administrador del sistema para que active tu cuenta.
          </p>
          <form action="/api/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-[var(--primary)] hover:underline"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </main>
    );
  }

  const productor = Array.isArray(perfil.productores)
    ? perfil.productores[0]
    : perfil.productores;
  const rolLabel =
    perfil.rol === 'admin_productor' ? 'Administrador' : 'Empleado';

  return (
    <div className="flex min-h-screen">
      <Sidebar
        nombreUsuario={perfil.nombre}
        rolLabel={rolLabel}
        nombreProductor={productor?.nombre_campo ?? productor?.nombre ?? null}
        plan={productor?.plan ?? null}
        estadoSuscripcion={productor?.estado_suscripcion ?? null}
        logoUrl={productor?.logo_url ?? null}
      />
      <main className="flex-1 min-w-0">
        <MobileHeader
          nombreUsuario={perfil.nombre}
          rolLabel={rolLabel}
          nombreProductor={productor?.nombre_campo ?? productor?.nombre ?? null}
        />
        <div className="hidden lg:block">
          <Topbar />
        </div>
        <div className="p-4 md:p-7">{children}</div>
      </main>
    </div>
  );
}
