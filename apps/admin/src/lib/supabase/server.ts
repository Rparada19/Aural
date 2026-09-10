import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { withCookieDomain } from './cookie-options';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const host = (await headers()).get('host');
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, withCookieDomain(options, host)),
            );
          } catch {
            // Server Components no permiten setear cookies, se ignora
          }
        },
      },
    },
  );
}
