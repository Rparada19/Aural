'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCampaign } from '@/app/actions/marketing';

interface Role { slug: string; label: string }
interface Visitor { id: string; name: string }

export function NewCampaignForm({ roles, cities, visitors }: { roles: Role[]; cities: string[]; visitors: Visitor[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState<'push' | 'email' | 'inapp'>('inapp');
  const [audRoles, setAudRoles] = useState<string[]>([]);
  const [audCities, setAudCities] = useState<string[]>([]);
  const [visitorId, setVisitorId] = useState('');
  const [publishNow, setPublishNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const toggle = (list: string[], val: string, set: (v: string[]) => void) => {
    set(list.includes(val) ? list.filter((v) => v !== val) : [...list, val]);
  };

  function submit() {
    setError(null);
    if (!title.trim() || !body.trim()) { setError('Título y mensaje requeridos.'); return; }
    startTransition(async () => {
      try {
        await createCampaign({
          title: title.trim(), body: body.trim(), channel,
          audience_roles: audRoles, audience_cities: audCities,
          audience_visitor_id: visitorId || null,
          scheduled_at: !publishNow && scheduledAt ? new Date(scheduledAt).toISOString() : null,
          publish_now: publishNow,
        });
        router.push('/marketing');
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error.');
      }
    });
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className={lbl}>Título *</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inp} />
      </label>
      <label className="block">
        <span className={lbl}>Mensaje *</span>
        <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} className={`${inp} h-auto resize-y`} />
      </label>

      <label className="block">
        <span className={lbl}>Canal *</span>
        <select value={channel} onChange={(e) => setChannel(e.target.value as any)} className={inp}>
          <option value="inapp">In-App (notificación dentro de la app)</option>
          <option value="push">Push (notificación nativa)</option>
          <option value="email">Email</option>
        </select>
        {channel !== 'inapp' && (
          <p className="text-xs text-warning mt-1">⚠️ Canal {channel} aún no está conectado — quedará registrada pero no se enviará externamente.</p>
        )}
      </label>

      <div>
        <span className={lbl}>Audiencia — por rol</span>
        <p className="text-xs text-secondary mb-1">Vacío = todos los roles.</p>
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => (
            <Chip key={r.slug} active={audRoles.includes(r.slug)} onClick={() => toggle(audRoles, r.slug, setAudRoles)}>{r.label}</Chip>
          ))}
        </div>
      </div>

      {cities.length > 0 && (
        <div>
          <span className={lbl}>Audiencia — por ciudad</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {cities.map((c) => (
              <Chip key={c} active={audCities.includes(c)} onClick={() => toggle(audCities, c, setAudCities)}>{c}</Chip>
            ))}
          </div>
        </div>
      )}

      <label className="block">
        <span className={lbl}>Audiencia — solo médicos de un visitador</span>
        <select value={visitorId} onChange={(e) => setVisitorId(e.target.value)} className={inp}>
          <option value="">Cualquiera</option>
          {visitors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </label>

      <div>
        <span className={lbl}>Envío</span>
        <div className="space-y-2 mt-1">
          <label className="flex items-center gap-2">
            <input type="radio" checked={publishNow} onChange={() => setPublishNow(true)} />
            <span className="text-sm">Enviar ahora</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={!publishNow} onChange={() => setPublishNow(false)} />
            <span className="text-sm">Programar</span>
            {!publishNow && (
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="ml-2 h-9 rounded-md border border-border px-2 text-sm" />
            )}
          </label>
        </div>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <button onClick={submit} disabled={isPending} className="px-5 h-11 rounded-md bg-primary text-white font-semibold disabled:opacity-50">
        {isPending ? 'Procesando…' : publishNow ? 'Crear y enviar' : 'Crear campaña'}
      </button>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-md border text-sm ${active ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-foreground hover:bg-white'}`}
    >
      {children}
    </button>
  );
}

const lbl = 'text-xs font-semibold uppercase tracking-wider text-secondary';
const inp = 'mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary';
