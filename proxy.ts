import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function extraerSlugDeHost(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(':')[0];
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;

  const partes = hostname.split('.');
  if (partes.length >= 3) {
    const slug = partes[0];
    if (['app', 'www', 'admin', 'api', 'camposis'].includes(slug)) return null;
    return slug;
  }
  return null;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const host = request.headers.get('host');
  const pathname = request.nextUrl.pathname;
  const slug = extraerSlugDeHost(host);

  const esSubdominioProductor = slug !== null;
  const esRutaAdmin = pathname.startsWith('/admin');
  const esRutaSuperAdmin = pathname.startsWith('/super-admin');
  const esRutaLoginRegistro =
    pathname === '/auth/login' || pathname === '/auth/registro';

  if (esRutaSuperAdmin && esSubdominioProductor) {
    const url = request.nextUrl.clone();
    url.hostname = url.hostname.split('.').slice(1).join('.') || 'localhost';
    url.pathname = '/super-admin';
    return NextResponse.redirect(url);
  }

  if (!user && (esRutaAdmin || esRutaSuperAdmin)) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  if (user && esRutaLoginRegistro) {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol_perfil')
      .eq('id', user.id)
      .single();

    const url = request.nextUrl.clone();
    if (perfil?.rol_perfil === 'super_admin') {
      url.pathname = '/super-admin';
    } else {
      url.pathname = '/auth/seleccionar-productor';
    }
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
