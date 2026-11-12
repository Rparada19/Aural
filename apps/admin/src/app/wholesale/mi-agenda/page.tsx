import { redirect } from 'next/navigation';
import { requireWholesaleMe } from '@/lib/wholesale';

export default async function MyAgenda() {
  const me = await requireWholesaleMe('agenda');
  redirect(me.repId ? `/wholesale/reps/${me.repId}` : '/wholesale/perfil');
}
