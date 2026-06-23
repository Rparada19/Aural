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

export async function uploadContentMedia(formData: FormData): Promise<string> {
  const { supabase } = await ensureAdmin();
  const file = formData.get('file') as File | null;
  if (!file) throw new Error('Falta archivo');
  const ext = (file.name.split('.').pop() ?? 'png').toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from('content-media').upload(path, buf, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('content-media').getPublicUrl(path);
  return data.publicUrl;
}

interface ContentInput {
  type: 'news' | 'video' | 'event' | 'document';
  title: string;
  body?: string | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  publish_at?: string | null;
  audience_roles: string[];
  event_starts_at?: string | null;
  event_location?: string | null;
  video_url?: string | null;
}

export async function createContent(input: ContentInput) {
  const { supabase, adminId } = await ensureAdmin();
  const { data: content, error } = await supabase.from('content').insert({
    type: input.type,
    title: input.title,
    body: input.body || null,
    media_url: input.media_url || null,
    thumbnail_url: input.thumbnail_url || null,
    status: input.status,
    publish_at: input.publish_at || null,
    created_by: adminId,
  }).select().single();
  if (error || !content) throw error ?? new Error('Error');

  if (input.audience_roles.length > 0) {
    await supabase.from('content_audiences').insert(
      input.audience_roles.map((r) => ({ content_id: content.id, role: r }))
    );
  }
  if (input.type === 'event') {
    await supabase.from('events').insert({
      content_id: content.id,
      starts_at: input.event_starts_at || new Date().toISOString(),
      location: input.event_location || null,
    });
  }
  if (input.type === 'video' && input.video_url) {
    await supabase.from('videos').insert({
      content_id: content.id,
      video_url: input.video_url,
    });
  }

  revalidatePath('/news');
  return content;
}

export async function updateContent(id: string, input: ContentInput) {
  const { supabase } = await ensureAdmin();
  const { error } = await supabase.from('content').update({
    type: input.type,
    title: input.title,
    body: input.body || null,
    media_url: input.media_url ?? null,
    thumbnail_url: input.thumbnail_url ?? null,
    status: input.status,
    publish_at: input.publish_at || null,
  }).eq('id', id);
  if (error) throw error;

  await supabase.from('content_audiences').delete().eq('content_id', id);
  if (input.audience_roles.length > 0) {
    await supabase.from('content_audiences').insert(
      input.audience_roles.map((r) => ({ content_id: id, role: r }))
    );
  }

  if (input.type === 'event') {
    await supabase.from('events').upsert({
      content_id: id,
      starts_at: input.event_starts_at || new Date().toISOString(),
      location: input.event_location || null,
    }, { onConflict: 'content_id' });
  }
  if (input.type === 'video' && input.video_url) {
    await supabase.from('videos').upsert({
      content_id: id,
      video_url: input.video_url,
    }, { onConflict: 'content_id' });
  }

  revalidatePath('/news');
  revalidatePath(`/news/${id}/edit`);
}

export async function updateContentStatus(id: string, status: 'draft' | 'scheduled' | 'published' | 'archived') {
  const { supabase } = await ensureAdmin();
  const { error } = await supabase.from('content').update({ status }).eq('id', id);
  if (error) throw error;
  revalidatePath('/news');
}

export async function deleteContent(id: string) {
  const { supabase } = await ensureAdmin();
  const { error } = await supabase.from('content').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  revalidatePath('/news');
}
