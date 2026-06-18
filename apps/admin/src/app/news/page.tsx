import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NewsActions } from '@/components/NewsActions';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  news: 'Blog/Noticia', video: 'Video', event: 'Evento', document: 'Documento',
};
const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador', scheduled: 'Programado', published: 'Publicado', archived: 'Archivado',
};

export default async function NewsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const { data: list } = await supabase
    .from('content')
    .select('id, type, title, status, publish_at, thumbnail_url, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return (
    <DashboardLayout userName={me.full_name}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Noticias</h1>
          <p className="text-secondary mt-1">Blogs, videos, eventos y documentos para los profesionales.</p>
        </div>
        <Link href="/news/new" className="px-4 h-11 rounded-md bg-primary text-white font-semibold inline-flex items-center hover:bg-primary-soft">
          + Nueva publicación
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {(list ?? []).map((c) => (
          <article key={c.id} className="bg-white border border-border rounded-2xl overflow-hidden flex flex-col">
            {c.thumbnail_url ? (
              <img src={c.thumbnail_url} alt="" className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-40 bg-surface flex items-center justify-center text-secondary text-sm">Sin portada</div>
            )}
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-wider bg-surface text-primary px-2 py-0.5 rounded font-semibold border border-border">{TYPE_LABEL[c.type]}</span>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold ${
                  c.status === 'published' ? 'bg-success/15 text-success' :
                  c.status === 'scheduled' ? 'bg-warning/15 text-warning' :
                  c.status === 'archived' ? 'bg-secondary/15 text-secondary' :
                  'bg-border'
                }`}>{STATUS_LABEL[c.status]}</span>
              </div>
              <h3 className="font-semibold text-primary line-clamp-2">{c.title}</h3>
              <p className="text-xs text-secondary mt-2">
                {c.publish_at
                  ? `Publica: ${new Date(c.publish_at).toLocaleString('es-CO')}`
                  : `Creado: ${new Date(c.created_at).toLocaleDateString('es-CO')}`}
              </p>
              <div className="mt-auto pt-3">
                <NewsActions id={c.id} status={c.status} />
              </div>
            </div>
          </article>
        ))}
        {(list ?? []).length === 0 && (
          <p className="text-secondary col-span-3 text-center py-8">Sin publicaciones aún.</p>
        )}
      </div>
    </DashboardLayout>
  );
}
