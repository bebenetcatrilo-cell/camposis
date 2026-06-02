import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Extrae el slug del productor desde el hostname.
 * Ejemplos:
 *   donluis.camposis.bbnetsystem.com  → "donluis"  (productor)
 *   camposis.bbnetsystem.com          → null       (super-admin / landing)
 *   localhost:3000                    → null       (dev sin subdominio)
 *   donluis.localhost:3000            → "donluis"  (dev con subdominio)
 */
function extraerSlugDeHost(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(':')[0];
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;

  const partes = hostname.split('.');
  // Para que sea slug de productor necesitamos al menos 3 partes:
  // <slug>.camposis.bbnetsystem.com → ["slug", "camposis", "bbnetsystem", "com"]
  if (partes.length >= 3) {
    const slug = partes[0];
    // Slugs reservados que NO son productores
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
  const esRutaAuth = pathname.startsWith('/auth');

  // Super-admin: solo accesible desde dominio principal (no subdominio productor)
  if (esRutaSuperAdmin && esSubdominioProductor) {
    const url = request.nextUrl.clone();
    // Sacar el primer subdominio → quedamos en camposis.bbnetsystem.com
    url.hostname = url.hostname.split('.').slice(1).join('.') || 'localhost';
    url.pathname = '/super-admin';
    return NextResponse.redirect(url);
  }

  // /admin requiere login
  if (!user && (esRutaAdmin || esRutaSuperAdmin)) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Ya logueado pero en /auth → al panel correspondiente
  if (user && esRutaAuth) {
    const url = request.nextUrl.clone();
    url.pathname = esSubdominioProductor ? '/admin' : '/super-admin';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
