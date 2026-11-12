'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { serviceClient } from '@/lib/supabase/service';
import { getWholesaleMe } from '@/lib/wholesale';
import { MARKET_URL } from '@/lib/markets';
import { MODULES, COORDINATION_ONLY } from '@/lib/wholesale-roles';

type Role = 'wholesale_rep' | 'wholesale_assistant' | 'wholesale_coordinator';

async function coordination() {
  const me = await getWholesaleMe();
  if (!me || !me.isCoordination) throw new Error('Solo Rafael y Margarita pueden administrar accesos');
  return me;
}

/** Nadie toca al administrador, y solo el administrador toca a coordinación. */
async function target(profileId: string) {
  const me = await coordination();
  const svc = serviceClient();
  const { data: p } = await svc.from('profiles').select('id, is_admin, admin_role, email, full_name').eq('id', profileId).single();
  if (!p) throw new Error('Usuario no encontrado');
  if (p.is_admin) throw new Error('El administrador no se puede modificar desde aquí');
  if (p.admin_role === 'wholesale_coordinator' && me.role !== 'admin') throw new Error('Solo el administrador cambia a coordinación');
  if (p.id === me.id) throw new Error('No puedes cambiar tu propio acceso');
  return { me, svc, p };
}

function done() { revalidatePath('/wholesale/accesos'); }

async function sendSetPassword(email: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${MARKET_URL.wholesale}/reset-password` });
  if (error) throw new Error(`No se pudo enviar el correo: ${error.message}`);
}

export async function setBlocked(profileId: string, blocked: boolean) {
  const { svc } = await target(profileId);
  const { error } = await svc.from('profiles').update({ wholesale_blocked: blocked }).eq('id', profileId);
  if (error) throw error;
  done();
}

export async function setModules(profileId: string, modules: string[] | null) {
  const { svc } = await target(profileId);
  const valid = modules?.filter((m) => MODULES.some((x) => x.key === m) && !COORDINATION_ONLY.includes(m as never)) ?? null;
  const { error } = await svc.from('profiles').update({ wholesale_modules: valid }).eq('id', profileId);
  if (error) throw error;
  done();
}

export async function setRole(profileId: string, role: Role, repId?: string | null) {
  const { me, svc, p } = await target(profileId);
  if (role === 'wholesale_coordinator' && me.role !== 'admin') throw new Error('Solo el administrador asigna coordinación');
  let linked = role === 'wholesale_rep' ? repId ?? null : null;
  if (role === 'wholesale_rep' && !linked) {
    const { data: rep, error } = await svc.from('wholesale_reps').insert({ name: p.full_name, email: p.email }).select('id').single();
    if (error) throw error;
    linked = rep.id;
  }
  const { error } = await svc.from('profiles')
    .update({ admin_role: role, linked_wholesale_rep_id: linked, wholesale_modules: null }).eq('id', profileId);
  if (error) throw error;
  done();
}

export async function removeAccess(profileId: string) {
  const { svc } = await target(profileId);
  const { error } = await svc.from('profiles')
    .update({ admin_role: null, linked_wholesale_rep_id: null, wholesale_modules: null, wholesale_blocked: false }).eq('id', profileId);
  if (error) throw error;
  done();
}

export async function resendLink(profileId: string) {
  const { p } = await target(profileId);
  await sendSetPassword(String(p.email));
}

/** Da acceso: crea el usuario si no existe y le llega un correo para crear su clave. */
export async function grantAccess(input: { full_name: string; email: string; role: Role; rep_id?: string | null }) {
  const me = await coordination();
  if (input.role === 'wholesale_coordinator' && me.role !== 'admin') throw new Error('Solo el administrador asigna coordinación');
  const email = input.email.trim().toLowerCase();
  const full_name = input.full_name.trim();
  if (!full_name || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Escribe nombre y un correo válido');
  const svc = serviceClient();

  let { data: existing } = await svc.from('profiles').select('id, is_admin').eq('email', email).maybeSingle();
  if (existing?.is_admin) throw new Error('Ese correo ya es administrador');
  if (!existing) {
    const { data: created, error } = await svc.auth.admin.createUser({
      email,
      password: crypto.randomUUID() + 'Aa1!',
      email_confirm: true,
      user_metadata: {
        full_name, cedula: '0', phone: '', city: '', profession: 'Aural', address: 'N/A', role: 'funcionario_aural',
      },
    });
    if (error || !created.user) throw error ?? new Error('No se pudo crear el usuario');
    existing = { id: created.user.id, is_admin: false };
  }

  let repId = input.role === 'wholesale_rep' ? input.rep_id ?? null : null;
  if (input.role === 'wholesale_rep' && !repId) {
    const { data: rep, error } = await svc.from('wholesale_reps').insert({ name: full_name, email }).select('id').single();
    if (error) throw error;
    repId = rep.id;
  }

  const { error } = await svc.from('profiles').update({
    admin_role: input.role, linked_wholesale_rep_id: repId, wholesale_blocked: false, wholesale_modules: null,
    status: 'approved', approved_at: new Date().toISOString(), approved_by: me.id,
  }).eq('id', existing.id);
  if (error) throw error;

  await sendSetPassword(email);
  done();
}
