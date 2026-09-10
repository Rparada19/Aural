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

  if (user && isLogin) {
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
