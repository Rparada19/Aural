'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sendGreeting, markGreetingDone, upsertContact } from '@/app/actions/wholesale';
import { daysUntil, dateLabel } from '@/lib/celebrations';

export interface Upcoming {
  key: string;
  kind: 'cumpleanos' | 'fecha';
  celebrationSlug: string | null;
  label: string;
  month: number;
  day: number;
  contactId: string;
  contactName: string;
  contactRole: string | null;
  contactEmail: string | null;
  clientId: string;
  clientName: string;
  alreadySent: boolean;
  sentChannel: string | null;
}

export interface TemplateRow {
  id: string;
  name: string;
  kind: string;
  subject: string | null;
  body: string;
  celebration_slug: string | null;
}

const CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'llamada', label: 'Llamada' },
  { value: 'presencial', label: 'En persona' },
  { value: 'tarjeta', label: 'Tarjeta física' },
];

function fill(text: string, u: Upcoming) {
  return text
    .replace(/\{\{nombre\}\}/g, u.contactName.split(' ')[0])
    .replace(/\{\{nombre_completo\}\}/g, u.contactName)
    .replace(/\{\{centro\}\}/g, u.clientName)
    .replace(/\{\{fecha\}\}/g, dateLabel(u.month, u.day));
}

export function UpcomingList({
  items, templates, mailerReady,
}: {
  items: Upcoming[];
  templates: TemplateRow[];
  mailerReady: boolean;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-[13px] text-[var(--ink-soft)] py-8 text-center border border-dashed border-[var(--rule-strong)] rounded-[3px]">
        No hay celebraciones en los próximos días. Registra los cumpleaños de tus contactos para que aparezcan aquí.
      </p>
    );
  }

  return (
    <ul className="wsale-panel divide-y divide-[var(--rule)]">
      {items.map((u) => {
        const d = daysUntil(u.month, u.day);
        const urgency =
          u.alreadySent ? 'text-[var(--ink-faint)]'
          : d === 0 ? 'wsale-bad font-medium'
          : d <= 3 ? 'wsale-warn'
          : 'text-[var(--ink-faint)]';

        return (
          <li key={u.key} className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-16 shrink-0 text-center">
                <p className="wsale-figure text-[20px] leading-none">{u.day}</p>
                <p className="wsale-overline mt-1">
                  {dateLabel(u.month, u.day).split(' de ')[1].slice(0, 3)}
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[14px]">
                  {u.kind === 'cumpleanos' ? `Cumpleaños de ${u.contactName}` : u.label}
                </p>
                <p className="text-[11px] text-[var(--ink-faint)] mt-0.5">
                  {[u.contactRole, u.contactName !== u.clientName ? u.clientName : null]
                    .filter(Boolean).join(' · ')}
                  {u.kind === 'fecha' && ` · ${u.contactName}`}
                </p>
                {!u.contactEmail && (
                  <p className="text-[11px] wsale-warn mt-1">Sin correo registrado</p>
                )}
              </div>

              <div className="text-right shrink-0">
                <p className={`text-[11px] ${urgency}`}>
                  {u.alreadySent
                    ? `Enviado${u.sentChannel && u.sentChannel !== 'email' ? ` · ${u.sentChannel}` : ''}`
                    : d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : `En ${d} días`}
                </p>
                {!u.alreadySent && (
                  <button
                    onClick={() => setOpenId(openId === u.key ? null : u.key)}
                    className="text-[12px] text-[var(--accent)] font-medium hover:underline mt-1"
                  >
                    Saludar
                  </button>
                )}
              </div>
            </div>

            {openId === u.key && (
              <GreetingForm
                item={u}
                templates={templates}
                mailerReady={mailerReady}
                busy={busy === u.key}
                onBusy={(b) => setBusy(b ? u.key : null)}
                onDone={() => { setOpenId(null); router.refresh(); }}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function GreetingForm({
  item, templates, mailerReady, busy, onBusy, onDone,
}: {
  item: Upcoming;
  templates: TemplateRow[];
  mailerReady: boolean;
  busy: boolean;
  onBusy: (b: boolean) => void;
  onDone: () => void;
}) {
  const matching = templates.filter((t) =>
    item.kind === 'cumpleanos' ? t.kind === 'cumpleanos' : t.celebration_slug === item.celebrationSlug || t.kind === 'celebracion',
  );
  const first = matching[0] ?? templates[0];

  const [templateId, setTemplateId] = useState(first?.id ?? '');
  const [subject, setSubject] = useState(first ? fill(first.subject ?? '', item) : '');
  const [body, setBody] = useState(first ? fill(first.body, item) : '');
  const [error, setError] = useState<string | null>(null);

  function pick(id: string) {
    const t = templates.find((x) => x.id === id);
    setTemplateId(id);
    if (t) {
      setSubject(fill(t.subject ?? '', item));
      setBody(fill(t.body, item));
    }
  }

  async function send() {
    onBusy(true);
    setError(null);
    try {
      await sendGreeting({
        contact_id: item.contactId,
        client_id: item.clientId,
        celebration_slug: item.celebrationSlug,
        template_id: templateId || null,
        subject,
        body,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar');
    } finally {
      onBusy(false);
    }
  }

  async function mark(channel: string) {
    onBusy(true);
    try {
      await markGreetingDone({
        contact_id: item.contactId,
        client_id: item.clientId,
        celebration_slug: item.celebrationSlug,
        channel,
      });
      onDone();
    } finally {
      onBusy(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-[var(--rule)] space-y-3">
      {templates.length > 1 && (
        <label className="block">
          <span className="wsale-overline">Plantilla</span>
          <select value={templateId} onChange={(e) => pick(e.target.value)} className="wsale-input mt-1.5">
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      )}

      <label className="block">
        <span className="wsale-overline">Asunto</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className="wsale-input mt-1.5" />
      </label>

      <label className="block">
        <span className="wsale-overline">Mensaje</span>
        <textarea
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-1.5 w-full rounded-[2px] border border-[var(--rule-strong)] bg-white p-3 text-[13px] leading-relaxed outline-none focus:border-[var(--accent)]"
        />
      </label>

      {!mailerReady && (
        <p className="text-[11px] wsale-warn">
          El correo saliente no está configurado, así que el envío por correo fallará.
          Puedes registrar el saludo por otro canal.
        </p>
      )}
      {error && <p className="wsale-bad text-[12px]">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={send}
          disabled={busy || !item.contactEmail || !mailerReady}
          className="wsale-btn"
          title={!item.contactEmail ? 'Este contacto no tiene correo' : undefined}
        >
          {busy ? 'Enviando…' : 'Enviar por correo'}
        </button>

        <span className="text-[11px] text-[var(--ink-faint)] mx-1">o registrar como enviado por</span>

        {CHANNELS.map((c) => (
          <button
            key={c.value}
            onClick={() => mark(c.value)}
            disabled={busy}
            className="wsale-btn-ghost h-9 text-[12px]"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Alta rápida de contactos con su cumpleaños. */
export function NewContact({ clients }: { clients: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_id: clients[0]?.id ?? '', name: '', role: '', email: '', phone: '', birthday: '',
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const [m, d] = form.birthday ? form.birthday.split('-').slice(1).map(Number) : [null, null];
      await upsertContact({
        client_id: form.client_id,
        name: form.name,
        role: form.role,
        email: form.email,
        phone: form.phone,
        birth_month: m,
        birth_day: d,
      });
      setForm({ ...form, name: '', role: '', email: '', phone: '', birthday: '' });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="wsale-btn">Nuevo contacto</button>;
  }

  return (
    <form onSubmit={submit} className="wsale-panel p-5 space-y-4 mb-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="wsale-overline">Centro</span>
          <select required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="wsale-input mt-1.5">
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="wsale-overline">Nombre</span>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="wsale-input mt-1.5" />
        </label>
        <label className="block">
          <span className="wsale-overline">Cargo</span>
          <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Audióloga, propietario…" className="wsale-input mt-1.5" />
        </label>
        <label className="block">
          <span className="wsale-overline">Cumpleaños</span>
          <input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} className="wsale-input mt-1.5" />
        </label>
        <label className="block">
          <span className="wsale-overline">Correo</span>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="wsale-input mt-1.5" />
        </label>
        <label className="block">
          <span className="wsale-overline">Celular</span>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="wsale-input mt-1.5" />
        </label>
      </div>
      <p className="text-[11px] text-[var(--ink-faint)]">
        Del cumpleaños solo se guardan el día y el mes. El año no se usa ni se muestra.
      </p>
      {error && <p className="wsale-bad text-[12px]">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="wsale-btn">
          {saving ? 'Guardando…' : 'Guardar contacto'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="wsale-btn-ghost">Cancelar</button>
      </div>
    </form>
  );
}
