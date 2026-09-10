'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getWholesaleMe } from '@/lib/wholesale';

async function ensureCoordinator() {
  const me = await getWholesaleMe();
  if (!me || me.role !== 'coordinator') throw new Error('Solo coordinación wholesale');
  const supabase = await createSupabaseServerClient();
  return { supabase, me };
}

async function ensureMember() {
  const me = await getWholesaleMe();
  if (!me) throw new Error('Sin acceso a wholesale');
  const supabase = await createSupabaseServerClient();
  return { supabase, me };
}

export async function createWholesaleRep(input: {
  name: string;
  zone?: string;
  phone?: string;
  email?: string;
}) {
  const { supabase } = await ensureCoordinator();
  const { error } = await supabase.from('wholesale_reps').insert({
    name: input.name,
    zone: input.zone || null,
    phone: input.phone || null,
    email: input.email || null,
  });
  if (error) throw error;
  revalidatePath('/wholesale/reps');
}

export async function createWholesaleClient(input: {
  name: string;
  nit?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  city?: string;
  zone?: string;
  rep_id?: string | null;
  notes?: string;
}) {
  const { supabase } = await ensureCoordinator();
  const { error } = await supabase.from('wholesale_clients').insert({
    name: input.name,
    nit: input.nit || null,
    contact_name: input.contact_name || null,
    phone: input.phone || null,
    email: input.email || null,
    city: input.city || null,
    zone: input.zone || null,
    rep_id: input.rep_id || null,
    notes: input.notes || null,
  });
  if (error) throw error;
  revalidatePath('/wholesale/clients');
  revalidatePath('/wholesale');
}

export async function assignClientRep(clientId: string, repId: string | null) {
  const { supabase } = await ensureCoordinator();
  const { error } = await supabase
    .from('wholesale_clients')
    .update({ rep_id: repId })
    .eq('id', clientId);
  if (error) throw error;
  revalidatePath('/wholesale/clients');
}

export async function createWholesaleSale(input: {
  client_id: string;
  sold_on: string;
  invoice_number?: string;
  campaign_name?: string;
  campaign_id?: string | null;
  patient_name?: string;
  patient_document?: string;
  units: number;
  binaural: boolean;
  rechargeable: boolean;
  style?: string | null;
  platform?: string | null;
  tech_level?: string | null;
  list_price: number;
  discount_percent: number;
}) {
  const { supabase, me } = await ensureMember();

  // El comercial solo carga sobre su propia cartera; la RLS lo vuelve a validar.
  const { data: client, error: clientErr } = await supabase
    .from('wholesale_clients')
    .select('id, rep_id')
    .eq('id', input.client_id)
    .single();
  if (clientErr || !client) throw clientErr ?? new Error('Cliente no encontrado');
  if (me.role === 'rep' && client.rep_id !== me.repId) {
    throw new Error('Ese cliente no está en tu cartera');
  }

  const net = input.list_price * input.units * (1 - input.discount_percent / 100);

  const { error } = await supabase.from('wholesale_sales').insert({
    client_id: input.client_id,
    rep_id: client.rep_id,
    sold_on: input.sold_on,
    invoice_number: input.invoice_number || null,
    campaign_name: input.campaign_name || null,
    campaign_id: input.campaign_id || null,
    patient_name: input.patient_name || null,
    patient_document: input.patient_document || null,
    units: input.units,
    binaural: input.binaural,
    rechargeable: input.rechargeable,
    style: input.style || null,
    platform: input.platform || null,
    tech_level: input.tech_level || null,
    list_price: input.list_price,
    discount_percent: input.discount_percent,
    net_amount: net,
    created_by: me.id,
  });
  if (error) throw error;

  revalidatePath('/wholesale/sales');
  revalidatePath(`/wholesale/clients/${input.client_id}`);
  revalidatePath('/wholesale');
}

export async function saveWholesaleBudgets(
  clientId: string,
  year: number,
  rows: { month: number; amount: number; units: number }[],
) {
  const { supabase } = await ensureCoordinator();
  const { error } = await supabase.from('wholesale_budgets').upsert(
    rows.map((r) => ({
      client_id: clientId,
      year,
      month: r.month,
      amount: r.amount,
      units: r.units,
    })),
    { onConflict: 'client_id,year,month' },
  );
  if (error) throw error;
  revalidatePath('/wholesale/budgets');
  revalidatePath(`/wholesale/budgets/${clientId}`);
  revalidatePath('/wholesale');
}

type GoalStatus = 'pending' | 'in_progress' | 'done' | 'dropped';

export async function createWholesaleGoal(input: {
  rep_id: string;
  year: number;
  month: number;
  title: string;
  description?: string;
  target_value?: number | null;
}) {
  const { supabase, me } = await ensureCoordinator();
  const { error } = await supabase.from('wholesale_goals').insert({
    rep_id: input.rep_id,
    year: input.year,
    month: input.month,
    title: input.title,
    description: input.description || null,
    target_value: input.target_value ?? null,
    created_by: me.id,
  });
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${input.rep_id}`);
}

/** El avance lo reporta quien ejecuta: coordinación o el propio comercial. */
export async function updateGoalProgress(
  goalId: string,
  repId: string,
  patch: { progress_percent: number; status: GoalStatus; progress_note?: string },
) {
  const { supabase } = await ensureMember();
  const { error } = await supabase
    .from('wholesale_goals')
    .update({
      progress_percent: patch.progress_percent,
      status: patch.status,
      progress_note: patch.progress_note ?? null,
    })
    .eq('id', goalId);
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${repId}`);
}

export async function createWholesaleProject(input: {
  rep_id: string;
  client_id?: string | null;
  title: string;
  kind: 'evento' | 'campana' | 'capacitacion' | 'otro';
  description?: string;
  starts_on?: string | null;
  ends_on?: string | null;
  budget_amount?: number | null;
}) {
  const { supabase, me } = await ensureMember();
  if (me.role === 'rep' && input.rep_id !== me.repId) {
    throw new Error('Solo puedes crear proyectos de tu zona');
  }
  const { error } = await supabase.from('wholesale_projects').insert({
    rep_id: input.rep_id,
    client_id: input.client_id || null,
    title: input.title,
    kind: input.kind,
    description: input.description || null,
    starts_on: input.starts_on || null,
    ends_on: input.ends_on || null,
    budget_amount: input.budget_amount ?? null,
    created_by: me.id,
  });
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${input.rep_id}`);
}

export async function updateProjectProgress(
  projectId: string,
  repId: string,
  patch: { progress_percent: number; status: GoalStatus; progress_note?: string },
) {
  const { supabase } = await ensureMember();
  const { error } = await supabase
    .from('wholesale_projects')
    .update({
      progress_percent: patch.progress_percent,
      status: patch.status,
      progress_note: patch.progress_note ?? null,
    })
    .eq('id', projectId);
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${repId}`);
}

/** Los tipos viven en wholesale_activity_types, así que aquí es texto libre
 *  validado por la llave foránea. */
export type ActivityKind = string;
export type ActivityStatus = 'planned' | 'done' | 'cancelled';

export async function createActivity(input: {
  rep_id: string;
  client_id?: string | null;
  kind: ActivityKind;
  scheduled_on: string;
  starts_at?: string | null;
  title: string;
  notes?: string;
}) {
  const { supabase, me } = await ensureMember();
  if (me.role === 'rep' && input.rep_id !== me.repId) {
    throw new Error('Solo puedes agendar en tu propia agenda');
  }
  const { error } = await supabase.from('wholesale_activities').insert({
    rep_id: input.rep_id,
    client_id: input.client_id || null,
    kind: input.kind,
    scheduled_on: input.scheduled_on,
    starts_at: input.starts_at || null,
    title: input.title,
    notes: input.notes || null,
    created_by: me.id,
  });
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${input.rep_id}`);
}

export async function setActivityStatus(activityId: string, repId: string, status: ActivityStatus) {
  const { supabase } = await ensureMember();
  const { error } = await supabase
    .from('wholesale_activities')
    .update({ status })
    .eq('id', activityId);
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${repId}`);
}

export async function deleteActivity(activityId: string, repId: string) {
  const { supabase } = await ensureMember();
  const { error } = await supabase
    .from('wholesale_activities')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', activityId);
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${repId}`);
}

export async function saveActivityTargets(
  repId: string,
  year: number,
  month: number,
  targets: { kind: ActivityKind; target: number }[],
) {
  const { supabase } = await ensureCoordinator();
  const { error } = await supabase.from('wholesale_activity_targets').upsert(
    targets.map((t) => ({ rep_id: repId, year, month, kind: t.kind, target: t.target })),
    { onConflict: 'rep_id,year,month,kind' },
  );
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${repId}`);
}

export async function createActivityType(input: {
  slug: string;
  label: string;
  icon?: string;
  sort_order?: number;
}) {
  const { supabase } = await ensureCoordinator();
  const slug = input.slug
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  if (!slug) throw new Error('Nombre inválido');
  const { error } = await supabase.from('wholesale_activity_types').insert({
    slug,
    label: input.label,
    icon: input.icon || '📌',
    sort_order: input.sort_order ?? 100,
  });
  if (error) throw error;
  revalidatePath('/wholesale', 'layout');
}

export async function setActivityTypeActive(slug: string, isActive: boolean) {
  const { supabase } = await ensureCoordinator();
  const { error } = await supabase
    .from('wholesale_activity_types')
    .update({ is_active: isActive })
    .eq('slug', slug);
  if (error) throw error;
  revalidatePath('/wholesale', 'layout');
}

export async function createExpense(input: {
  rep_id: string;
  client_id?: string | null;
  category: string;
  spent_on: string;
  amount: number;
  description?: string;
}) {
  const { supabase, me } = await ensureMember();
  if (me.role === 'rep' && input.rep_id !== me.repId) {
    throw new Error('Solo puedes cargar gastos de tu zona');
  }
  const { error } = await supabase.from('wholesale_expenses').insert({
    rep_id: input.rep_id,
    client_id: input.client_id || null,
    category: input.category,
    spent_on: input.spent_on,
    amount: input.amount,
    description: input.description || null,
    created_by: me.id,
  });
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${input.rep_id}`);
  if (input.client_id) revalidatePath(`/wholesale/clients/${input.client_id}`);
  revalidatePath('/wholesale/clients');
}

export async function deleteExpense(expenseId: string, repId: string) {
  const { supabase } = await ensureMember();
  const { error } = await supabase
    .from('wholesale_expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', expenseId);
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${repId}`);
  revalidatePath('/wholesale/clients');
}

/** Cliente con service role: crear usuarios en auth exige bypass de RLS.
 *  Solo se usa dentro de acciones server-side ya validadas. */
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Crea el usuario del comercial y lo deja vinculado a su ficha. */
export async function createRepAccess(input: {
  rep_id: string;
  full_name: string;
  email: string;
  password: string;
}) {
  const { supabase } = await ensureCoordinator();
  if (input.password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');

  const svc = adminClient();
  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name,
      cedula: '0',
      phone: '',
      city: '',
      profession: 'Aural',
      address: 'N/A',
      role: 'funcionario_aural',
    },
  });
  if (createErr || !created.user) throw createErr ?? new Error('No se pudo crear el usuario');

  const { error: upErr } = await supabase
    .from('profiles')
    .update({
      admin_role: 'wholesale_rep',
      linked_wholesale_rep_id: input.rep_id,
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', created.user.id);
  if (upErr) throw upErr;

  revalidatePath(`/wholesale/reps/${input.rep_id}`);
}

/** Vincula un usuario que ya existe a la ficha del comercial. */
export async function linkRepAccess(repId: string, profileId: string) {
  const { supabase } = await ensureCoordinator();
  const { error } = await supabase
    .from('profiles')
    .update({ admin_role: 'wholesale_rep', linked_wholesale_rep_id: repId })
    .eq('id', profileId);
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${repId}`);
}

export async function unlinkRepAccess(repId: string, profileId: string) {
  const { supabase } = await ensureCoordinator();
  const { error } = await supabase
    .from('profiles')
    .update({ linked_wholesale_rep_id: null, admin_role: null })
    .eq('id', profileId);
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${repId}`);
}

export async function createLoan(input: {
  client_id: string;
  loaned_on: string;
  due_on?: string | null;
  platform?: string | null;
  tech_level?: string | null;
  style?: string | null;
  units: number;
  binaural: boolean;
  rechargeable: boolean;
  serials: string[];
  patient_name?: string;
  notes?: string;
}) {
  const { supabase, me } = await ensureMember();

  const { data: client, error: clientErr } = await supabase
    .from('wholesale_clients')
    .select('id, rep_id')
    .eq('id', input.client_id)
    .single();
  if (clientErr || !client) throw clientErr ?? new Error('Cliente no encontrado');
  if (me.role === 'rep' && client.rep_id !== me.repId) {
    throw new Error('Ese cliente no está en tu cartera');
  }

  const serials = input.serials.map((s) => s.trim()).filter(Boolean);
  if (serials.length === 0) throw new Error('Registra al menos un serial');

  // Plazo estándar de prueba: 14 días.
  const due = input.due_on
    ? input.due_on
    : new Date(Date.parse(`${input.loaned_on}T00:00:00Z`) + 14 * 86_400_000)
        .toISOString().slice(0, 10);

  const { error } = await supabase.from('wholesale_loans').insert({
    client_id: input.client_id,
    rep_id: client.rep_id,
    loaned_on: input.loaned_on,
    due_on: due,
    platform: input.platform || null,
    tech_level: input.tech_level || null,
    style: input.style || null,
    units: input.units,
    binaural: input.binaural,
    rechargeable: input.rechargeable,
    serials,
    patient_name: input.patient_name || null,
    notes: input.notes || null,
    created_by: me.id,
  });
  if (error) throw error;

  revalidatePath('/wholesale/loans');
  if (client.rep_id) revalidatePath(`/wholesale/reps/${client.rep_id}`);
  revalidatePath(`/wholesale/clients/${input.client_id}`);
}

export async function returnLoan(loanId: string, returnedOn?: string) {
  const { supabase } = await ensureMember();
  const { error } = await supabase
    .from('wholesale_loans')
    .update({ status: 'returned', returned_on: returnedOn ?? new Date().toISOString().slice(0, 10) })
    .eq('id', loanId);
  if (error) throw error;
  revalidatePath('/wholesale/loans');
  revalidatePath('/wholesale/reps', 'layout');
}

/** El centro vendió el equipo prestado: se crea la venta con los datos
 *  del préstamo y el préstamo queda cerrado apuntando a ella. */
export async function sellLoan(loanId: string, input: {
  sold_on: string;
  invoice_number?: string;
  campaign_name?: string;
  list_price: number;
  discount_percent: number;
}) {
  const { supabase, me } = await ensureMember();

  const { data: loan, error: loanErr } = await supabase
    .from('wholesale_loans')
    .select('*')
    .eq('id', loanId)
    .single();
  if (loanErr || !loan) throw loanErr ?? new Error('Préstamo no encontrado');
  if (loan.status !== 'active') throw new Error('Ese préstamo ya está cerrado');

  const net = input.list_price * loan.units * (1 - input.discount_percent / 100);

  const { data: sale, error: saleErr } = await supabase
    .from('wholesale_sales')
    .insert({
      client_id: loan.client_id,
      rep_id: loan.rep_id,
      sold_on: input.sold_on,
      invoice_number: input.invoice_number || null,
      campaign_name: input.campaign_name || null,
      patient_name: loan.patient_name,
      units: loan.units,
      binaural: loan.binaural,
      rechargeable: loan.rechargeable,
      style: loan.style,
      platform: loan.platform,
      tech_level: loan.tech_level,
      list_price: input.list_price,
      discount_percent: input.discount_percent,
      net_amount: net,
      created_by: me.id,
    })
    .select('id')
    .single();
  if (saleErr || !sale) throw saleErr ?? new Error('No se pudo registrar la venta');

  const { error } = await supabase
    .from('wholesale_loans')
    .update({ status: 'sold', sale_id: sale.id, returned_on: input.sold_on })
    .eq('id', loanId);
  if (error) throw error;

  revalidatePath('/wholesale/loans');
  revalidatePath('/wholesale/sales');
  revalidatePath(`/wholesale/clients/${loan.client_id}`);
}

export async function deleteLoan(loanId: string) {
  const { supabase } = await ensureMember();
  const { error } = await supabase
    .from('wholesale_loans')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', loanId);
  if (error) throw error;
  revalidatePath('/wholesale/loans');
}

const DOCS_BUCKET = 'wholesale-docs';
const MAX_UPLOAD_MB = 25;

/** Nombre seguro para el almacenamiento: sin tildes, espacios ni rutas. */
function safeName(name: string) {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-80);
}

async function uploadToBucket(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, folder: string, file: File) {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new Error(`El archivo supera ${MAX_UPLOAD_MB} MB`);
  }
  const path = `${folder}/${Date.now()}-${safeName(file.name)}`;
  const { error } = await supabase.storage
    .from(DOCS_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  return path;
}

/** Coordinación publica un documento y decide quién lo ve. */
export async function uploadDocument(formData: FormData) {
  const { supabase, me } = await ensureCoordinator();

  const file = formData.get('file') as File | null;
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const repIds = formData.getAll('rep_ids').map(String).filter(Boolean);

  if (!file || file.size === 0) throw new Error('Selecciona un archivo');
  if (!title) throw new Error('Ponle un título');

  const path = await uploadToBucket(supabase, 'docs', file);

  const { data: doc, error } = await supabase
    .from('wholesale_documents')
    .insert({
      title,
      description: description || null,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      is_public: repIds.length === 0,
      uploaded_by: me.id,
    })
    .select('id')
    .single();
  if (error || !doc) throw error ?? new Error('No se pudo guardar');

  if (repIds.length > 0) {
    const { error: audErr } = await supabase
      .from('wholesale_document_audience')
      .insert(repIds.map((rep_id) => ({ document_id: doc.id, rep_id })));
    if (audErr) throw audErr;
  }

  revalidatePath('/wholesale/documentos');
}

export async function deleteDocument(documentId: string) {
  const { supabase } = await ensureCoordinator();
  const { data: doc } = await supabase
    .from('wholesale_documents')
    .select('file_path')
    .eq('id', documentId)
    .single();

  const { error } = await supabase
    .from('wholesale_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', documentId);
  if (error) throw error;

  if (doc?.file_path) {
    await supabase.storage.from(DOCS_BUCKET).remove([doc.file_path]);
  }
  revalidatePath('/wholesale/documentos');
}

/** URL temporal de descarga: el bucket es privado, así que se firma. */
export async function getDownloadUrl(filePath: string) {
  const { supabase } = await ensureMember();
  const { data, error } = await supabase.storage
    .from(DOCS_BUCKET)
    .createSignedUrl(filePath, 60 * 5);
  if (error || !data) throw error ?? new Error('No se pudo generar el enlace');
  return data.signedUrl;
}

/** Mensaje en el hilo de un proyecto, con archivo opcional y avance. */
export async function addProjectNote(formData: FormData) {
  const { supabase, me } = await ensureMember();

  const projectId = String(formData.get('project_id') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  const progressRaw = String(formData.get('progress_percent') ?? '').trim();
  const file = formData.get('file') as File | null;

  if (!projectId) throw new Error('Falta el proyecto');
  if (!body && (!file || file.size === 0) && !progressRaw) {
    throw new Error('Escribe algo o adjunta un archivo');
  }

  let filePath: string | null = null;
  let fileName: string | null = null;
  let fileSize: number | null = null;
  if (file && file.size > 0) {
    filePath = await uploadToBucket(supabase, `projects/${projectId}`, file);
    fileName = file.name;
    fileSize = file.size;
  }

  const progress = progressRaw === '' ? null : Number(progressRaw);

  const { error } = await supabase.from('wholesale_project_notes').insert({
    project_id: projectId,
    author_id: me.id,
    author_name: me.full_name,
    author_role: me.role === 'coordinator' ? 'Coordinación' : 'Comercial',
    body: body || null,
    file_path: filePath,
    file_name: fileName,
    file_size: fileSize,
    progress_percent: progress,
  });
  if (error) throw error;

  // Si el mensaje reporta avance, el proyecto se actualiza con él
  if (progress !== null) {
    await supabase
      .from('wholesale_projects')
      .update({
        progress_percent: progress,
        status: progress >= 100 ? 'done' : progress > 0 ? 'in_progress' : 'pending',
      })
      .eq('id', projectId);
  }

  revalidatePath(`/wholesale/proyectos/${projectId}`);
  revalidatePath('/wholesale/proyectos');
}

export async function deleteProjectNote(noteId: string, projectId: string) {
  const { supabase, me } = await ensureMember();

  // Cada quien borra lo suyo. La RLS lo impone igual; esto da el mensaje.
  const { data: note } = await supabase
    .from('wholesale_project_notes')
    .select('author_id')
    .eq('id', noteId)
    .single();
  if (note && note.author_id !== me.id) {
    throw new Error('Solo puedes borrar tus propios mensajes');
  }

  const { error } = await supabase
    .from('wholesale_project_notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', noteId);
  if (error) throw error;
  revalidatePath(`/wholesale/proyectos/${projectId}`);
}

/** Proyecto creado por coordinación, con uno o varios comerciales. */
export async function createTeamProject(input: {
  title: string;
  kind: 'evento' | 'campana' | 'capacitacion' | 'otro';
  rep_ids: string[];
  client_id?: string | null;
  description?: string;
  starts_on?: string | null;
  ends_on?: string | null;
  budget_amount?: number | null;
}) {
  const { supabase, me } = await ensureCoordinator();
  if (input.rep_ids.length === 0) throw new Error('Elige al menos un comercial');

  const { data: project, error } = await supabase
    .from('wholesale_projects')
    .insert({
      // El primero queda como responsable; los demás participan
      rep_id: input.rep_ids[0],
      client_id: input.client_id || null,
      title: input.title,
      kind: input.kind,
      description: input.description || null,
      starts_on: input.starts_on || null,
      ends_on: input.ends_on || null,
      budget_amount: input.budget_amount ?? null,
      created_by: me.id,
    })
    .select('id')
    .single();
  if (error || !project) throw error ?? new Error('No se pudo crear');

  const { error: teamErr } = await supabase
    .from('wholesale_project_reps')
    .insert(input.rep_ids.map((rep_id) => ({ project_id: project.id, rep_id })));
  if (teamErr) throw teamErr;

  revalidatePath('/wholesale/proyectos');
  return project.id;
}

export async function setProjectTeam(projectId: string, repIds: string[]) {
  const { supabase } = await ensureCoordinator();
  if (repIds.length === 0) throw new Error('El proyecto necesita al menos un comercial');

  const { error: delErr } = await supabase
    .from('wholesale_project_reps')
    .delete()
    .eq('project_id', projectId);
  if (delErr) throw delErr;

  const { error } = await supabase
    .from('wholesale_project_reps')
    .insert(repIds.map((rep_id) => ({ project_id: projectId, rep_id })));
  if (error) throw error;

  await supabase.from('wholesale_projects').update({ rep_id: repIds[0] }).eq('id', projectId);
  revalidatePath(`/wholesale/proyectos/${projectId}`);
  revalidatePath('/wholesale/proyectos');
}

/** El comercial mantiene sus datos personales. Zona, cargo y estado no
 *  pasan por aquí: los cambia coordinación y el disparador de la base
 *  rechaza cualquier intento por otra vía. */
export async function updateMyProfile(formData: FormData) {
  const { supabase, me } = await ensureMember();
  if (!me.repId) throw new Error('Tu usuario no está vinculado a una ficha de comercial');

  const patch: Record<string, string | null> = {
    mobile: String(formData.get('mobile') ?? '').trim() || null,
    phone: String(formData.get('phone') ?? '').trim() || null,
    email: String(formData.get('email') ?? '').trim() || null,
    city: String(formData.get('city') ?? '').trim() || null,
    bio: String(formData.get('bio') ?? '').trim() || null,
  };

  const photo = formData.get('photo') as File | null;
  if (photo && photo.size > 0) {
    const path = `${me.repId}/${Date.now()}-${safeName(photo.name)}`;
    const { error: upErr } = await supabase.storage
      .from('wholesale-avatars')
      .upload(path, photo, { contentType: photo.type || undefined, upsert: true });
    if (upErr) throw upErr;
    patch.photo_url = path;
  }

  const { error } = await supabase.from('wholesale_reps').update(patch).eq('id', me.repId);
  if (error) throw error;

  revalidatePath('/wholesale/perfil');
  revalidatePath(`/wholesale/reps/${me.repId}`);
}

/** Coordinación mantiene lo que compromete: zona, cargo, ingreso, estado. */
export async function updateRepAssignment(repId: string, input: {
  zone?: string | null;
  job_title?: string | null;
  document_id?: string | null;
  started_on?: string | null;
  territory_note?: string | null;
  is_active?: boolean;
}) {
  const { supabase } = await ensureCoordinator();
  const { error } = await supabase.from('wholesale_reps').update(input).eq('id', repId);
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${repId}`);
  revalidatePath('/wholesale/reps');
}

export async function getAvatarUrl(path: string) {
  const { supabase } = await ensureMember();
  const { data } = await supabase.storage.from('wholesale-avatars').createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
