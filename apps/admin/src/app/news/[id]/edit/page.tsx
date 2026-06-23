import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NewContentForm } from '@/components/NewContentForm';
import { ROLES } from '@aural/shared';

export const dynamic = 'force-dynamic';

export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const { data: content } = await supabase
    .from('content').select('*').eq('id', id).is('deleted_at', null).single();
  if (!content) notFound();

  const { data: audiences } = await supabase
    .from('content_audiences').select('role').eq('content_id', id);
  const { data: ev } = await supabase
    .from('events').select('starts_at, location').eq('content_id', id).maybeSingle();
  const { data: vid } = await supabase
    .from('videos').select('video_url').eq('content_id', id).maybeSingle();

  return (
    <DashboardLayout userName={me.full_name}>
      <Link href="/news" className="text-sm text-secondary hover:text-primary">← Noticias</Link>
      <h1 className="text-3xl font-bold text-primary mt-4">Editar publicación</h1>
      <div className="bg-white border border-border rounded-2xl p-6 mt-6 max-w-3xl">
        <NewContentForm
          roles={ROLES.map((r) => ({ slug: r.slug, label: r.label }))}
          initial={{
            id: content.id,
            type: content.type,
            title: content.title,
            body: content.body ?? '',
            thumbnail_url: content.thumbnail_url,
            media_url: content.media_url,
            video_url: vid?.video_url ?? null,
            event_starts_at: ev?.starts_at ?? null,
            event_location: ev?.location ?? null,
            status: content.status,
            publish_at: content.publish_at,
            audience_roles: (audiences ?? []).map((a: any) => a.role),
          }}
        />
      </div>
    </DashboardLayout>
  );
}
