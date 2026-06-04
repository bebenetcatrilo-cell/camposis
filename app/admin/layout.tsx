import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProductorActivo, getMisMembresia } from '@/lib/productor-actual';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { ContextualSidebar } from '@/components/layout/contextual-sidebar';
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

  if (perfil.rol_perfil === 'super_admin') {
    redirect('/super-admin');
  }

  const productorCtx = await getProductorActivo();

  if (!productorCtx) {
    redirect('/auth/seleccionar-productor');
  }

  const { productor, rol } = productorCtx;
  const rolLabel = rol === 'admin_productor' ? 'Administrador' : 'Empleado';

  const todasMisMembresia = await getMisMembresia();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar principal (siempre fijo izquierda) */}
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

      {/* Contenedor principal */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header (solo móvil) */}
        <MobileHeader
          nombreUsuario={perfil.nombre}
          rolLabel={rolLabel}
          nombreProductor={productor.nombre_campo ?? productor.nombre}
        />

        {/* Topbar (solo desktop) */}
        <div className="hidden lg:block">
          <Topbar nombreUsuario={perfil.nombre} rolLabel={rolLabel} />
        </div>

        {/* Contenido + Sidebar contextual */}
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto flex gap-6">
            {/* Contenido principal (izquierda) */}
            <div className="flex-1 min-w-0">{children}</div>

            {/* Sidebar contextual (solo XL hacia arriba) */}
            <ContextualSidebar />
          </div>
        </div>
      </main>
    </div>
  );
}
