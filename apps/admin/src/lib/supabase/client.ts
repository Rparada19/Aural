import { createBrowserClient } from '@supabase/ssr';
import { cookieDomainFor } from './cookie-options';

export function createSupabaseBrowserClient() {
  const domain = cookieDomainFor(
    typeof window === 'undefined' ? undefined : window.location.hostname,
  );
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    domain ? { cookieOptions: { domain } } : undefined,
  );
}
