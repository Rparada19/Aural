import { supabase } from '../../lib/supabase';

export interface NewsRow {
  id: string;
  type: 'news' | 'video' | 'event' | 'document';
  title: string;
  body: string | null;
  thumbnail_url: string | null;
  media_url: string | null;
  publish_at: string | null;
  created_at: string;
}

export async function listNews(): Promise<NewsRow[]> {
  const { data, error } = await supabase
    .from('content')
    .select('id, type, title, body, thumbnail_url, media_url, publish_at, created_at')
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('publish_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as NewsRow[];
}

export async function getNews(id: string) {
  const { data, error } = await supabase
    .from('content')
    .select('*, event:events(starts_at, ends_at, location), video:videos(video_url, duration_seconds)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}
