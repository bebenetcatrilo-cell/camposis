import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProductorActivo, getMisMembresia } from '@/lib/productor-actual';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import MobileHeader from '@/components/layout/mobile-header';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  // Super-admin no debería estar acá
  if (perfil.rol_perfil === 'super_admin') {
    redirect('/super-admin');
  }

  // Buscar el productor activo (cookie)
  const productorCtx = await getProductorActivo();

  if (!productorCtx) {
    // No hay productor activo válido → al selector
    redirect('/auth/seleccionar-productor');
  }

  const { productor, rol } = productorCtx;
  const rolLabel = rol === 'admin_productor' ? 'Administrador' : 'Empleado';

  // Para el switcher: traer todas las membresías
  const todasMisMembresia = await getMisMembresia();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        nombreUsuario={perfil.nombre}
        rolLabel={rolLabel}
        nombreProductor={productor.nombre_campo ?? productor.nombre}
        plan={productor.plan}
        estadoSuscripcion={productor.estado_suscripcion}
        logoUrl={productor.logo_url}
        productorActivoId={productor.id}
        membresia={todasMisMembresia}
      />
      <main className="flex-1 min-w-0">
        <MobileHeader
          nombreUsuario={perfil.nombre}
          rolLabel={rolLabel}
          nombreProductor={productor.nombre_campo ?? productor.nombre}
        />
        <div className="hidden lg:block">
          <Topbar />
        </div>
        <div className="p-4 md:p-7">{children}</div>
      </main>
    </div>
  );
}
