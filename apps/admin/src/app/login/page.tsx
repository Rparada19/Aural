'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, admin_role')
      .eq('id', data.user!.id)
      .single();
    const allowed = profile?.is_admin || !!profile?.admin_role;
    if (!allowed) {
      await supabase.auth.signOut();
      setError('No tienes permisos de administrador.');
      setLoading(false);
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <main className="min-h-screen grid place-items-center bg-surface px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border p-8 shadow-sm">
        <div className="mb-8 text-center">
          <Image src="/logo.png" alt="Aural" width={260} height={80} className="mx-auto h-auto" priority />
          <p className="text-secondary text-xs uppercase tracking-widest font-semibold mt-4">Portal administrativo</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="Correo"
            type="email"
            value={email}
            onChange={(v) => setEmail(v)}
            autoComplete="email"
            required
          />
          <Field
            label="Contraseña"
            type="password"
            value={password}
            onChange={(v) => setPassword(v)}
            autoComplete="current-password"
            required
          />
          {error && (
            <p className="text-danger text-sm bg-danger/10 px-3 py-2 rounded-md">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-lg bg-primary text-white font-semibold hover:bg-primary-soft disabled:opacity-50 transition"
          >
            {loading ? 'Entrando…' : 'Iniciar sesión'}
          </button>
          <Link href="/forgot-password" className="block text-center text-secondary text-sm hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-secondary">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-12 rounded-lg border border-border bg-surface px-3 outline-none focus:border-primary text-foreground"
        {...rest}
      />
    </label>
  );
}
