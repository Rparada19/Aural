import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { marketFromHost } from '@/lib/markets';
import { withCookieDomain } from '@/lib/supabase/cookie-options';

export async function proxy(req: NextRequest) {
  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, withCookieDomain(options, req.headers.get('host'))),
          );
        },
      },
    },
  );

  // Enlaces de correo (recuperar contraseña): si Supabase devuelve el código a cualquier
  // ruta (por ejemplo a la raíz cuando la URL de retorno no está permitida), se canjea aquí
  // y se lleva a la persona a crear su nueva contraseña, en vez de perder el código en /login.
  const sp = req.nextUrl.searchParams;
  const code = sp.get('code');
  const tokenHash = sp.get('token_hash');
  if ((code || tokenHash) && !req.nextUrl.pathname.startsWith('/auth')) {
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ type: (sp.get('type') as 'recovery') || 'recovery', token_hash: tokenHash! });
    const url = req.nextUrl.clone();
    url.search = '';
    url.pathname = error ? '/forgot-password' : '/reset-password';
    if (error) url.searchParams.set('error', 'enlace');
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  const { data: { user } } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const isLogin = path.startsWith('/login');
  const isAuthCallback = path.startsWith('/auth');
  const isPublicAuth = path.startsWith('/forgot-password') || path.startsWith('/reset-password');

  if (!user && !isLogin && !isAuthCallback && !isPublicAuth) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Con sesión pero sin permiso para esta sección, se muestra el login con el aviso (evita un ciclo de redirecciones)
  if (user && isLogin && !req.nextUrl.searchParams.has('sin-acceso')) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Cada subdominio sirve solo su mercado. Las rutas de auth son comunes
  // porque los enlaces de correo viejos apuntan a admin.
  if (!isLogin && !isAuthCallback && !isPublicAuth) {
    const market = marketFromHost(req.headers.get('host'));
    const isHub = path === '/hub' || path.startsWith('/hub/');
    const isWholesale = path === '/wholesale' || path.startsWith('/wholesale/');

    const target =
      market === 'hub' && !isHub ? '/hub'
      : market === 'wholesale' && !isWholesale ? '/wholesale'
      : market === 'vm' && (isHub || isWholesale) ? '/'
      : null;

    if (target) {
      const url = req.nextUrl.clone();
      url.pathname = target;
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
