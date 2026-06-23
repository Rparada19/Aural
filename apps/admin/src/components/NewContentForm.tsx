'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createContent, updateContent, uploadContentMedia } from '@/app/actions/content';

interface Role { slug: string; label: string }
interface Initial {
  id: string;
  type: 'news' | 'video' | 'event' | 'document';
  title: string;
  body: string;
  thumbnail_url: string | null;
  media_url: string | null;
  video_url: string | null;
  event_starts_at: string | null;
  event_location: string | null;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  publish_at: string | null;
  audience_roles: string[];
}

export function NewContentForm({ roles, initial }: { roles: Role[]; initial?: Initial }) {
  const router = useRouter();
  const isEdit = !!initial;
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<'news' | 'video' | 'event' | 'document'>(initial?.type ?? 'news');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailUrlExisting, setThumbnailUrlExisting] = useState<string | null>(initial?.thumbnail_url ?? null);
  const [media, setMedia] = useState<File | null>(null);
  const [mediaUrlExisting, setMediaUrlExisting] = useState<string | null>(initial?.media_url ?? null);
  const [videoUrl, setVideoUrl] = useState(initial?.video_url ?? '');
  const [eventAt, setEventAt] = useState(initial?.event_starts_at ? initial.event_starts_at.slice(0, 16) : '');
  const [eventLocation, setEventLocation] = useState(initial?.event_location ?? '');
  const [audience, setAudience] = useState<string[]>(initial?.audience_roles ?? roles.map((r) => r.slug));
  const [publishNow, setPublishNow] = useState(initial ? initial.status === 'published' : true);
  const [publishAt, setPublishAt] = useState(
    initial?.status === 'scheduled' && initial.publish_at ? initial.publish_at.slice(0, 16) : ''
  );
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
        let thumbnailUrl: string | null = thumbnailUrlExisting;
        let mediaUrl: string | null = mediaUrlExisting;
        if (thumbnail) {
          const fd = new FormData(); fd.append('file', thumbnail);
          thumbnailUrl = await uploadContentMedia(fd);
        }
        if (media) {
          const fd = new FormData(); fd.append('file', media);
          mediaUrl = await uploadContentMedia(fd);
        }
        const payload = {
          type, title: title.trim(), body: body || null,
          thumbnail_url: thumbnailUrl, media_url: mediaUrl,
          status: (publishNow ? 'published' : publishAt ? 'scheduled' : 'draft') as 'draft' | 'scheduled' | 'published' | 'archived',
          publish_at: publishNow ? new Date().toISOString() : (publishAt ? new Date(publishAt).toISOString() : null),
          audience_roles: audience,
          event_starts_at: type === 'event' ? (eventAt ? new Date(eventAt).toISOString() : null) : null,
          event_location: type === 'event' ? eventLocation || null : null,
          video_url: type === 'video' ? videoUrl || null : null,
        };
        if (isEdit && initial) {
          await updateContent(initial.id, payload);
        } else {
          await createContent(payload);
        }
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
        {thumbnailUrlExisting && !thumbnail && (
          <div className="mt-1 flex items-center gap-3">
            <img src={thumbnailUrlExisting} alt="" className="w-32 h-20 object-cover rounded border border-border" />
            <button type="button" onClick={() => setThumbnailUrlExisting(null)} className="text-xs text-danger hover:underline">Quitar</button>
          </div>
        )}
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
        {isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear publicación'}
      </button>
    </div>
  );
}

const lbl = 'text-xs font-semibold uppercase tracking-wider text-secondary';
const inp = 'mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary';
