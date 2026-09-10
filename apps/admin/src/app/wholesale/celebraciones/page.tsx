import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { UpcomingList, NewContact, type Upcoming, type TemplateRow } from '@/components/wholesale/Celebrations';
import { requireWholesaleMe } from '@/lib/wholesale';
import { daysUntil, dateLabel, type Celebration, type Contact } from '@/lib/celebrations';
import { mailerReady } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

/** Ventana de anticipación: lo que viene en los próximos dos meses. */
const HORIZON_DAYS = 60;

export default async function CelebrationsPage() {
  const me = await requireWholesaleMe();
  const supabase = await createSupabaseServerClient();
  const year = new Date().getFullYear();

  const [{ data: contacts }, { data: dates }, { data: clients }, { data: templates }, { data: sends }] =
    await Promise.all([
      supabase
        .from('wholesale_contacts')
        .select('id, client_id, name, role, email, phone, birth_month, birth_day')
        .is('deleted_at', null),
      supabase.from('wholesale_celebrations').select('*').eq('is_active', true).order('month'),
      supabase.from('wholesale_clients').select('id, name, zone').is('deleted_at', null).eq('is_active', true).order('name'),
      supabase.from('wholesale_templates').select('id, name, kind, subject, body, celebration_slug').is('deleted_at', null).eq('is_active', true),
      supabase.from('wholesale_sends').select('contact_id, celebration_slug, channel, status').eq('year', year),
    ]);

  const contactList = (contacts ?? []) as Contact[];
  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));

  // Un saludo por contacto, fecha y año: así no se felicita dos veces
  const done = new Map<string, string>();
  for (const s of sends ?? []) {
    if (s.status !== 'sent') continue;
    done.set(`${s.contact_id}·${s.celebration_slug ?? 'cumpleanos'}`, s.channel);
  }

  const upcoming: Upcoming[] = [];

  // Cumpleaños de cada contacto
  for (const c of contactList) {
    if (!c.birth_month || !c.birth_day) continue;
    const d = daysUntil(c.birth_month, c.birth_day);
    if (d > HORIZON_DAYS) continue;
    const key = `${c.id}·cumpleanos`;
    upcoming.push({
      key,
      kind: 'cumpleanos',
      celebrationSlug: null,
      label: `Cumpleaños de ${c.name}`,
      month: c.birth_month,
      day: c.birth_day,
      contactId: c.id,
      contactName: c.name,
      contactRole: c.role,
      contactEmail: c.email,
      clientId: c.client_id,
      clientName: clientName.get(c.client_id) ?? 'Centro',
      alreadySent: done.has(key),
      sentChannel: done.get(key) ?? null,
    });
  }

  // Fechas del gremio: una entrada por contacto al que aplican
  for (const cel of (dates ?? []) as Celebration[]) {
    const d = daysUntil(cel.month, cel.day);
    if (d > HORIZON_DAYS) continue;
    for (const c of contactList) {
      // Las fechas de gremio solo van a quien ejerce esa profesión
      if (cel.audience === 'audiologos' && !/audi/i.test(c.role ?? '')) continue;
      if (cel.audience === 'fonoaudiologos' && !/fono/i.test(c.role ?? '')) continue;
      const key = `${c.id}·${cel.slug}`;
      upcoming.push({
        key,
        kind: 'fecha',
        celebrationSlug: cel.slug,
        label: cel.label,
        month: cel.month,
        day: cel.day,
        contactId: c.id,
        contactName: c.name,
        contactRole: c.role,
        contactEmail: c.email,
        clientId: c.client_id,
        clientName: clientName.get(c.client_id) ?? 'Centro',
        alreadySent: done.has(key),
        sentChannel: done.get(key) ?? null,
      });
    }
  }

  upcoming.sort((a, b) => {
    if (a.alreadySent !== b.alreadySent) return a.alreadySent ? 1 : -1;
    return daysUntil(a.month, a.day) - daysUntil(b.month, b.day);
  });

  const pendientes = upcoming.filter((u) => !u.alreadySent).length;
  const sinCorreo = contactList.filter((c) => !c.email).length;
  const sinCumple = contactList.filter((c) => !c.birth_month).length;

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline="Wholesale"
        title="Celebraciones"
        subtitle="Cumpleaños de los contactos y fechas del gremio. Lo que viene en los próximos dos meses."
        actions={<NewContact clients={clients ?? []} />}
      />

      <section className="grid gap-3 sm:grid-cols-4 mb-7">
        <div className="wsale-stat" data-tone={pendientes > 0 ? 'caution' : undefined}>
          <p className="wsale-overline">Por saludar</p>
          <p className="wsale-figure text-[26px] mt-2 leading-none">{pendientes}</p>
        </div>
        <div className="wsale-stat">
          <p className="wsale-overline">Contactos</p>
          <p className="wsale-figure text-[26px] mt-2 leading-none">{contactList.length}</p>
        </div>
        <div className="wsale-stat" data-tone={sinCumple > 0 ? 'caution' : undefined}>
          <p className="wsale-overline">Sin cumpleaños</p>
          <p className="wsale-figure text-[26px] mt-2 leading-none">{sinCumple}</p>
          <p className="text-[11px] text-[var(--ink-faint)] mt-2">No aparecerán en la agenda</p>
        </div>
        <div className="wsale-stat" data-tone={sinCorreo > 0 ? 'caution' : undefined}>
          <p className="wsale-overline">Sin correo</p>
          <p className="wsale-figure text-[26px] mt-2 leading-none">{sinCorreo}</p>
          <p className="text-[11px] text-[var(--ink-faint)] mt-2">Solo se pueden saludar por otro canal</p>
        </div>
      </section>

      <UpcomingList
        items={upcoming}
        templates={(templates ?? []) as TemplateRow[]}
        mailerReady={mailerReady()}
      />

      <section className="wsale-panel p-6 mt-8">
        <h2 className="wsale-display text-[17px] pb-3 border-b border-[var(--rule)]">
          Calendario del gremio
        </h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {((dates ?? []) as Celebration[]).map((c) => (
            <li key={c.slug} className="flex items-baseline gap-3 text-[13px] py-1">
              <span className="wsale-mono text-[11px] text-[var(--ink-faint)] w-24">
                {dateLabel(c.month, c.day)}
              </span>
              <span className="flex-1">{c.label}</span>
              {c.audience !== 'todos' && (
                <span className="wsale-overline">{c.audience}</span>
              )}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-[var(--ink-faint)] mt-4 pt-3 border-t border-[var(--rule)]">
          El Día de la Madre y el del Padre caen en domingo variable; las fechas cargadas son
          aproximadas y conviene ajustarlas cada año.
        </p>
      </section>
    </WholesaleLayout>
  );
}
