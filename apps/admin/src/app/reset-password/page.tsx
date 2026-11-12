'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState<'checking' | 'ok' | 'missing'>('checking');

  // El enlace del correo debe dejar una sesión de recuperación; si no la hay, el enlace expiró o se abrió en otro navegador.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get('error_description')) { setReady('missing'); return; }
    let alive = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (alive) setReady(data.session ? 'ok' : 'missing');
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session && alive) setReady('ok'); });
    setTimeout(check, 400);
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Mínimo 8 caracteres.'); return; }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setDone(true);
    setTimeout(() => router.replace('/'), 1500);
  }

  return (
    <main className="min-h-screen grid place-items-center bg-surface px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border p-8 shadow-sm">
        <div className="mb-8 text-center">
          <Image src="/logo.png" alt="Aural" width={260} height={80} className="mx-auto h-auto" priority />
          <p className="text-secondary text-xs uppercase tracking-widest font-semibold mt-4">Nueva contraseña</p>
        </div>

        {done ? (
          <p className="text-success text-center font-semibold">Contraseña actualizada. Entrando…</p>
        ) : ready === 'checking' ? (
          <p className="text-secondary text-center text-sm">Verificando el enlace…</p>
        ) : ready === 'missing' ? (
          <div className="text-center space-y-3">
            <p className="text-danger font-semibold">El enlace no es válido o ya expiró</p>
            <p className="text-sm text-secondary">Pide un enlace nuevo y ábrelo en este mismo navegador, unos segundos después de que llegue el correo.</p>
            <Link href="/forgot-password" className="inline-block mt-2 text-primary text-sm font-semibold hover:underline">Pedir un enlace nuevo</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Nueva contraseña</span>
              <input
                value={password} onChange={(e) => setPassword(e.target.value)}
                type="password" required minLength={8}
                className="mt-1 w-full h-12 rounded-lg border border-border bg-surface px-3 outline-none focus:border-primary text-foreground"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Confirmar</span>
              <input
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
                type="password" required minLength={8}
                className="mt-1 w-full h-12 rounded-lg border border-border bg-surface px-3 outline-none focus:border-primary text-foreground"
              />
            </label>
            {error && <p className="text-danger text-sm bg-danger/10 px-3 py-2 rounded-md">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full h-12 rounded-lg bg-primary text-white font-semibold hover:bg-primary-soft disabled:opacity-50"
            >
              {loading ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
