import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { caseHandlers } from '@/lib/supabase/service';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { CaseActions } from '@/components/wholesale/cases/CaseForms';
import { requireWholesaleMe } from '@/lib/wholesale';
import { CASE_KIND, CASE_STATUS, OPEN_STATUS, PRIORITY } from '@/lib/cases';
import { today } from '@/lib/crm';

export const dynamic = 'force-dynamic';

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireWholesaleMe('casos');
  const supabase = await createSupabaseServerClient();

  const { data: c } = await supabase.from('wholesale_cases').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!c) notFound();

  const [{ data: notes }, { data: client }, { data: others }, people] = await Promise.all([
    supabase.from('wholesale_case_notes').select('id, author_name, body, created_at').eq('case_id', id).order('created_at', { ascending: false }),
    supabase.from('wholesale_clients').select('id, name, contact_name, phone, email, city, rep_id').eq('id', c.client_id).maybeSingle(),
    supabase.from('wholesale_cases').select('id, number, subject, status').eq('client_id', c.client_id).neq('id', id).is('deleted_at', null).order('created_at', { ascending: false }).limit(6),
    caseHandlers().catch(() => [] as { id: string; name: string }[]),
  ]);
  const { data: rep } = client?.rep_id
    ? await supabase.from('wholesale_reps').select('name, phone').eq('id', client.rep_id).maybeSingle()
    : { data: null };

  const t = today();
  const isLate = OPEN_STATUS.includes(c.status) && c.due_on && c.due_on < t;
  const assignees = people.some((p) => p.id === c.assigned_to) || !c.assigned_to
    ? people : [...people, { id: c.assigned_to, name: c.assigned_name ?? 'Responsable' }];

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline={`Caso #${c.number} · ${CASE_KIND[c.kind]?.label}`}
        title={c.subject}
        subtitle={
          <>
            <span className={c.priority === 'alta' ? 'wsale-bad font-semibold' : ''}>{PRIORITY[c.priority]}</span>
            {' · '}{CASE_STATUS[c.status]}
            {' · '}<span className={isLate ? 'wsale-bad' : ''}>{c.due_on ? `compromiso ${c.due_on}${isLate ? ' (vencido)' : ''}` : 'sin fecha'}</span>
            {' · '}{c.assigned_name ? `a cargo de ${c.assigned_name}` : 'sin responsable'}
          </>
        }
        actions={<Link href="/wholesale/casos" className="wsale-btn-ghost">← Casos</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
          <CaseActions id={c.id} status={c.status} mine={c.assigned_to === me.id} assignedTo={c.assigned_to}
            priority={c.priority} dueOn={c.due_on} people={assignees} />

          <section>
            <p className="wsale-overline mb-3">Historial</p>
            <ol className="relative border-l border-[var(--rule)] ml-2 space-y-4">
              {(notes ?? []).map((n) => (
                <li key={n.id} className="pl-5 relative">
                  <span className="absolute -left-[5px] top-1.5 w-[9px] h-[9px] rounded-full bg-[var(--ink-faint)]" />
                  <p className="text-[11px] text-[var(--ink-faint)]">{n.created_at.slice(0, 16).replace('T', ' ')} · {n.author_name}</p>
                  <p className="text-[13px] mt-0.5 whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
              <li className="pl-5 relative">
                <span className="absolute -left-[5px] top-1.5 w-[9px] h-[9px] rounded-full bg-[var(--accent)]" />
                <p className="text-[11px] text-[var(--ink-faint)]">{c.created_at.slice(0, 16).replace('T', ' ')} · {c.created_by_name}</p>
                <p className="text-[13px] mt-0.5">Abrió el caso.{c.description ? ` ${c.description}` : ''}</p>
              </li>
            </ol>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="wsale-panel p-5 space-y-1.5 text-[13px]">
            <p className="wsale-overline mb-2">Cliente</p>
            {me.modules.includes('clientes')
              ? <Link href={`/wholesale/clients/${client?.id}`} className="text-[15px] hover:text-[var(--accent)]">{client?.name}</Link>
              : <p className="text-[15px]">{client?.name}</p>}
            {client?.contact_name && <p>{client.contact_name}</p>}
            {client?.phone && <p><a href={`tel:${client.phone}`} className="text-[var(--accent)]">{client.phone}</a></p>}
            {client?.email && <p><a href={`mailto:${client.email}`} className="text-[var(--accent)]">{client.email}</a></p>}
            {client?.city && <p className="text-[var(--ink-soft)]">{client.city}</p>}
            {rep && <p className="text-[var(--ink-soft)] pt-2">Comercial: {rep.name}{rep.phone ? ` · ${rep.phone}` : ''}</p>}
          </section>

          {(c.patient_name || c.serial) && (
            <section className="wsale-panel p-5 space-y-1 text-[13px]">
              <p className="wsale-overline mb-2">Equipo</p>
              {c.patient_name && <p>Paciente: {c.patient_name}</p>}
              {c.serial && <p>Serial: <span className="wsale-mono">{c.serial}</span></p>}
            </section>
          )}

          {(others ?? []).length > 0 && (
            <section className="wsale-panel p-5">
              <p className="wsale-overline mb-2">Otros casos de este cliente</p>
              <ul className="space-y-1.5">
                {(others ?? []).map((o) => (
                  <li key={o.id} className="text-[12px]">
                    <Link href={`/wholesale/casos/${o.id}`} className="hover:text-[var(--accent)]">#{o.number} {o.subject}</Link>
                    <span className="text-[var(--ink-faint)]"> · {CASE_STATUS[o.status]}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </WholesaleLayout>
  );
}
