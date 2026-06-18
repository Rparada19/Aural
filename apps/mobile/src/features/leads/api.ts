import { supabase } from '../../lib/supabase';
import type { LeadInput } from '@aural/shared';

export async function createLead(input: LeadInput) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  // Origen "Visita médica" si existe
  const { data: origin } = await supabase
    .from('patient_origins').select('id').eq('name', 'Visita médica').maybeSingle();

  const { error } = await supabase.from('patients').insert({
    professional_id: user.id,
    full_name: input.full_name,
    phone: input.phone,
    address: input.address || null,
    city_text: input.city_text,
    priority: input.priority,
    notes: input.notes || null,
    origin_id: origin?.id ?? null,
    created_by_role: 'professional',
    funnel_status: 'registered',
    case_type: 'pending_evaluation',
  });
  if (error) throw error;
}
