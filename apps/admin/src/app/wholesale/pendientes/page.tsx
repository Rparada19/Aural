import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { MyDeskServer } from '@/components/wholesale/MyDeskServer';
import { requireWholesaleMe } from '@/lib/wholesale';
import { serviceClient } from '@/lib/supabase/service';
import { today } from '@/lib/crm';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const me = await requireWholesaleMe('pendientes');
  const supabase = await createSupabaseServerClient();

  let assigned: { id: string; title: string; due_on: string | null; done_at: string | null; owner: string }[] = [];
  if (me.isCoordination) {
    const { data } = await supabase.from('wholesale_tasks').select('id, title, due_on, done_at, owner_id')
      .eq('created_by', me.id).neq('owner_id', me.id).order('created_at', { ascending: false }).limit(100);
    const ids = [...new Set((data ?? []).map((t) => t.owner_id))];
    const { data: names } = ids.length ? await serviceClient().from('profiles').select('id, full_name').in('id', ids) : { data: [] };
    const nameOf = new Map((names ?? []).map((n) => [n.id, n.full_name]));
    assigned = (data ?? []).map((t) => ({ ...t, owner: nameOf.get(t.owner_id) ?? '—' }));
  }
  const t = today();

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead overline="Wholesale · Pendientes" title="Mis pendientes y notas"
        subtitle="Lo que no se te puede olvidar. Marca la casilla cuando esté hecho; el bloc de notas es solo tuyo." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] items-start">
        <MyDeskServer me={me} />
        {me.isCoordination && (
          <section className="wsale-panel p-5">
            <p className="wsale-overline mb-3">Asignados a otros</p>
            {assigned.length === 0 ? (
              <p className="text-[13px] text-[var(--ink-soft)]">Desde tus pendientes puedes asignarle una tarea a cualquier persona del equipo.</p>
            ) : (
              <ul className="divide-y divide-[var(--rule)]">
                {assigned.map((a) => (
                  <li key={a.id} className="py-2 flex items-start gap-3 text-[13px]">
                    <span className={`mt-1.5 w-2 h-2 rounded-full ${a.done_at ? 'bg-[var(--positive)]' : a.due_on && a.due_on < t ? 'bg-[var(--alert)]' : 'bg-[var(--caution)]'}`} />
                    <div className="flex-1">
                      <p className={a.done_at ? 'line-through text-[var(--ink-faint)]' : ''}>{a.title}</p>
                      <p className="text-[11px] text-[var(--ink-faint)]">{a.owner}{a.due_on ? ` · para ${a.due_on}` : ''}{a.done_at ? ` · hecho ${a.done_at.slice(0, 10)}` : ''}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </WholesaleLayout>
  );
}
