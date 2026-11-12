import { createSupabaseServerClient } from '@/lib/supabase/server';
import { serviceClient } from '@/lib/supabase/service';
import type { WholesaleMe } from '@/lib/wholesale';
import { MyDesk, type Task } from './MyDesk';

/** Pendientes y bloc de notas de la persona; coordinación puede asignar a otros. */
export async function MyDeskServer({ me }: { me: WholesaleMe }) {
  const supabase = await createSupabaseServerClient();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [{ data: tasks }, { data: pad }] = await Promise.all([
    supabase.from('wholesale_tasks').select('id, title, due_on, done_at, created_by_name, owner_id')
      .eq('owner_id', me.id).or(`done_at.is.null,done_at.gte.${weekAgo}`).order('created_at', { ascending: false }).limit(100),
    supabase.from('wholesale_notepads').select('body').eq('owner_id', me.id).maybeSingle(),
  ]);

  let people: { id: string; name: string }[] = [];
  if (me.isCoordination) {
    const { data } = await serviceClient().from('profiles').select('id, full_name, wholesale_blocked')
      .in('admin_role', ['wholesale_rep', 'wholesale_assistant', 'wholesale_coordinator']).is('deleted_at', null);
    people = (data ?? []).filter((p) => !p.wholesale_blocked && p.id !== me.id)
      .map((p) => ({ id: p.id, name: p.full_name })).sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <MyDesk
      tasks={(tasks ?? []).map((t) => ({ ...t, mine: true })) as Task[]}
      notepad={pad?.body ?? ''}
      people={people}
      myName={me.full_name}
    />
  );
}
