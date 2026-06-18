'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  }

  return (
    <main className="min-h-screen grid place-items-center bg-surface px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border p-8 shadow-sm">
        <div className="mb-8 text-center">
          <Image src="/logo.png" alt="Aural" width={260} height={80} className="mx-auto h-auto" priority />
          <p className="text-secondary text-xs uppercase tracking-widest font-semibold mt-4">Recuperar contraseña</p>
        </div>

        {sent ? (
          <div className="text-center space-y-3">
            <p className="text-success font-semibold">Correo enviado</p>
            <p className="text-sm text-secondary">
              Revisa tu bandeja de entrada en <strong className="text-primary">{email}</strong> y sigue el enlace para crear una nueva contraseña.
            </p>
            <Link href="/login" className="inline-block mt-4 text-primary text-sm font-semibold hover:underline">
              ← Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-sm text-secondary">
              Te enviaremos un enlace para restablecer tu contraseña.
            </p>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Correo</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="mt-1 w-full h-12 rounded-lg border border-border bg-surface px-3 outline-none focus:border-primary text-foreground"
              />
            </label>
            {error && <p className="text-danger text-sm bg-danger/10 px-3 py-2 rounded-md">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-lg bg-primary text-white font-semibold hover:bg-primary-soft disabled:opacity-50 transition"
            >
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </button>
            <Link href="/login" className="block text-center text-secondary text-sm hover:underline">
              ← Volver
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
