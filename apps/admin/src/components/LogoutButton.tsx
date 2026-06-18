'use client';

import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  async function onClick() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }
  return (
    <button onClick={onClick} className="mt-2 text-xs opacity-80 hover:opacity-100 underline">
      Cerrar sesión
    </button>
  );
}
