import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SuperSidebar } from '@/components/layout/super-sidebar';
import { Topbar } from '@/components/layout/topbar';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol, activo')
    .eq('id', user.id)
    .single();

  if (!perfil || !perfil.activo || perfil.rol !== 'super_admin') {
    redirect('/admin');
  }

  return (
    <div className="flex min-h-screen">
      <SuperSidebar nombreUsuario={perfil.nombre} />
      <main className="flex-1 min-w-0">
        <Topbar />
        <div className="p-4 md:p-7">{children}</div>
      </main>
    </div>
  );
}
