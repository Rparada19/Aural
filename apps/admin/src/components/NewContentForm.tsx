'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createContent, uploadContentMedia } from '@/app/actions/content';

interface Role { slug: string; label: string }

export function NewContentForm({ roles }: { roles: Role[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<'news' | 'video' | 'event' | 'document'>('news');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [media, setMedia] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [eventAt, setEventAt] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [audience, setAudience] = useState<string[]>(roles.map((r) => r.slug));
  const [publishNow, setPublishNow] = useState(true);
  const [publishAt, setPublishAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  function toggleRole(slug: string) {
    setAudience((p) => p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug]);
  }

  function submit() {
    setError(null);
    if (!title.trim()) { setError('Título requerido.'); return; }
    if (audience.length === 0) { setError('Selecciona al menos una audiencia.'); return; }
    startTransition(async () => {
      try {
        let thumbnailUrl: string | null = null;
        let mediaUrl: string | null = null;
        if (thumbnail) {
          const fd = new FormData(); fd.append('file', thumbnail);
          thumbnailUrl = await uploadContentMedia(fd);
        }
        if (media) {
          const fd = new FormData(); fd.append('file', media);
          mediaUrl = await uploadContentMedia(fd);
        }
        await createContent({
          type, title: title.trim(), body: body || null,
          thumbnail_url: thumbnailUrl, media_url: mediaUrl,
          status: publishNow ? 'published' : publishAt ? 'scheduled' : 'draft',
          publish_at: publishNow ? new Date().toISOString() : (publishAt ? new Date(publishAt).toISOString() : null),
          audience_roles: audience,
          event_starts_at: type === 'event' ? (eventAt ? new Date(eventAt).toISOString() : null) : null,
          event_location: type === 'event' ? eventLocation || null : null,
          video_url: type === 'video' ? videoUrl || null : null,
        });
        router.push('/news');
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error.');
      }
    });
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className={lbl}>Tipo *</span>
        <select value={type} onChange={(e) => setType(e.target.value as any)} className={inp}>
          <option value="news">Blog / Noticia</option>
          <option value="video">Video</option>
          <option value="event">Evento</option>
          <option value="document">Documento</option>
        </select>
      </label>

      <label className="block">
        <span className={lbl}>Título *</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inp} />
      </label>

      <label className="block">
        <span className={lbl}>{type === 'video' ? 'Descripción' : type === 'event' ? 'Descripción del evento' : 'Cuerpo / contenido'}</span>
        <textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} className={`${inp} h-auto resize-y`} />
      </label>

      <label className="block">
        <span className={lbl}>Portada (imagen)</span>
        <input type="file" accept="image/*" onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)} className="mt-1 text-sm" />
        {thumbnail && <p className="text-xs text-secondary mt-1">{thumbnail.name}</p>}
      </label>

      {type === 'video' && (
        <label className="block">
          <span className={lbl}>URL del video (YouTube, Vimeo, MP4)</span>
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://" className={inp} />
        </label>
      )}

      {type === 'document' && (
        <label className="block">
          <span className={lbl}>Archivo (PDF / documento)</span>
          <input type="file" accept="application/pdf" onChange={(e) => setMedia(e.target.files?.[0] ?? null)} className="mt-1 text-sm" />
          {media && <p className="text-xs text-secondary mt-1">{media.name}</p>}
        </label>
      )}

      {type === 'event' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className={lbl}>Fecha y hora del evento</span>
            <input type="datetime-local" value={eventAt} onChange={(e) => setEventAt(e.target.value)} className={inp} />
          </label>
          <label className="block">
            <span className={lbl}>Lugar</span>
            <input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} className={inp} />
          </label>
        </div>
      )}

      <div>
        <span className={lbl}>Audiencia *</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {roles.map((r) => (
            <label key={r.slug} className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-md cursor-pointer hover:bg-surface">
              <input type="checkbox" checked={audience.includes(r.slug)} onChange={() => toggleRole(r.slug)} className="accent-primary" />
              <span className="text-sm">{r.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className={lbl}>Publicación</span>
        <div className="space-y-2 mt-1">
          <label className="flex items-center gap-2">
            <input type="radio" checked={publishNow} onChange={() => setPublishNow(true)} />
            <span className="text-sm">Publicar ahora</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={!publishNow} onChange={() => setPublishNow(false)} />
            <span className="text-sm">Programar fecha</span>
            {!publishNow && (
              <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className="ml-2 h-9 rounded-md border border-border px-2 text-sm" />
            )}
          </label>
        </div>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <button onClick={submit} disabled={isPending} className="px-5 h-11 rounded-md bg-primary text-white font-semibold disabled:opacity-50">
        {isPending ? 'Guardando…' : 'Crear publicación'}
      </button>
    </div>
  );
}

const lbl = 'text-xs font-semibold uppercase tracking-wider text-secondary';
const inp = 'mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary';
