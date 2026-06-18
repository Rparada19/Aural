'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function ensureAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error('No autorizado');
  return { supabase, adminId: user.id };
}

export async function createCampaign(input: {
  title: string; body: string;
  channel: 'push' | 'email' | 'inapp';
  audience_roles?: string[];
  audience_cities?: string[];
  audience_visitor_id?: string | null;
  scheduled_at?: string | null;
  publish_now: boolean;
}) {
  const { supabase, adminId } = await ensureAdmin();
  const { data, error } = await supabase.from('marketing_campaigns').insert({
    title: input.title, body: input.body, channel: input.channel,
    audience_roles: input.audience_roles?.length ? input.audience_roles : null,
    audience_cities: input.audience_cities?.length ? input.audience_cities : null,
    audience_visitor_id: input.audience_visitor_id ?? null,
    scheduled_at: input.scheduled_at || null,
    status: input.publish_now ? 'sent' : input.scheduled_at ? 'scheduled' : 'draft',
    sent_at: input.publish_now ? new Date().toISOString() : null,
    created_by: adminId,
  }).select().single();
  if (error || !data) throw error ?? new Error('Error');

  // Si es inapp y se manda ya, crear notifications para los usuarios de la audiencia
  if (input.publish_now && input.channel === 'inapp') {
    let q = supabase.from('profiles').select('id').eq('status', 'approved');
    if (input.audience_roles?.length) q = q.in('role', input.audience_roles);
    if (input.audience_cities?.length) q = q.in('city', input.audience_cities);
    if (input.audience_visitor_id) q = q.eq('visitor_id', input.audience_visitor_id);
    const { data: users } = await q;
    if (users && users.length > 0) {
      await supabase.from('notifications').insert(
        users.map((u) => ({
          user_id: u.id, channel: 'inapp', title: input.title, body: input.body, sent_at: new Date().toISOString(),
        }))
      );
    }
  }

  revalidatePath('/marketing');
  return data;
}

export async function sendCampaign(id: string) {
  const { supabase } = await ensureAdmin();
  const { data: c } = await supabase.from('marketing_campaigns').select('*').eq('id', id).single();
  if (!c) throw new Error('No encontrada');

  if (c.channel === 'inapp') {
    let q = supabase.from('profiles').select('id').eq('status', 'approved');
    if (c.audience_roles?.length) q = q.in('role', c.audience_roles);
    if (c.audience_cities?.length) q = q.in('city', c.audience_cities);
    if (c.audience_visitor_id) q = q.eq('visitor_id', c.audience_visitor_id);
    const { data: users } = await q;
    if (users) {
      await supabase.from('notifications').insert(
        users.map((u: any) => ({
          user_id: u.id, channel: 'inapp', title: c.title, body: c.body, sent_at: new Date().toISOString(),
        }))
      );
    }
  }

  await supabase.from('marketing_campaigns').update({
    status: 'sent', sent_at: new Date().toISOString(),
  }).eq('id', id);

  revalidatePath('/marketing');
}

export async function cancelCampaign(id: string) {
  const { supabase } = await ensureAdmin();
  await supabase.from('marketing_campaigns').update({ status: 'cancelled' }).eq('id', id);
  revalidatePath('/marketing');
}
