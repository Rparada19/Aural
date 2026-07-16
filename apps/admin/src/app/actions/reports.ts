'use server';

import { revalidatePath } from 'next/cache';
import Anthropic from '@anthropic-ai/sdk';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function ensureAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error('No autorizado');
  return { supabase, adminId: user.id };
}

export async function uploadExamImage(formData: FormData): Promise<string> {
  const { supabase } = await ensureAdmin();
  const file = formData.get('file') as File | null;
  const patientId = formData.get('patient_id') as string | null;
  const kind = formData.get('kind') as string | null; // audiometry | logoaudiometry
  if (!file || !patientId || !kind) throw new Error('Falta file/patient_id/kind');
  const ext = (file.name.split('.').pop() ?? 'png').toLowerCase();
  const path = `${patientId}/${kind}-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from('medical-exams').upload(path, buf, {
    contentType: file.type || 'image/png',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function createReport(patientId: string, professionalId: string, input: {
  title: string;
  audiometry_url?: string | null;
  logoaudiometry_url?: string | null;
  otoscopy_description?: string | null;
}) {
  const { supabase, adminId } = await ensureAdmin();
  const { data, error } = await supabase.from('medical_reports').insert({
    patient_id: patientId,
    author_id: adminId,
    title: input.title,
    audiometry_url: input.audiometry_url || null,
    logoaudiometry_url: input.logoaudiometry_url || null,
    otoscopy_description: input.otoscopy_description || null,
  }).select().single();
  if (error) throw error;
  revalidatePath(`/users/${professionalId}/patients/${patientId}`);
  return data;
}

export async function updateReportBody(reportId: string, professionalId: string, patientId: string, body: string) {
  const { supabase, adminId } = await ensureAdmin();
  const { data: existing, error: readErr } = await supabase
    .from('medical_reports').select('author_id').eq('id', reportId).single();
  if (readErr || !existing) throw new Error('Informe no encontrado');
  if (existing.author_id !== adminId) {
    throw new Error('Solo el autor original puede editar este informe.');
  }
  const { error } = await supabase
    .from('medical_reports')
    .update({ ai_body: body, generated_at: new Date().toISOString() })
    .eq('id', reportId);
  if (error) throw error;
  revalidatePath(`/users/${professionalId}/patients/${patientId}`);
  revalidatePath(`/users/${professionalId}/patients/${patientId}/reports/${reportId}`);
}

export async function deleteReport(reportId: string, professionalId?: string, patientId?: string) {
  const { supabase } = await ensureAdmin();
  const { error } = await supabase
    .from('medical_reports')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', reportId);
  if (error) throw error;
  if (professionalId && patientId) {
    revalidatePath(`/users/${professionalId}/patients/${patientId}`);
  }
}

export async function regenerateReportBody(reportId: string, professionalId: string, patientId: string) {
  const body = await generateReportWithAI(reportId, professionalId, patientId);
  await updateReportBody(reportId, professionalId, patientId, body);
  return body;
}

export async function getExamSignedUrl(path: string): Promise<string | null> {
  const { supabase } = await ensureAdmin();
  const { data, error } = await supabase.storage
    .from('medical-exams')
    .createSignedUrl(path, 60 * 60);
  if (error || !data) return null;
  return data.signedUrl;
}

export type GlossaryEntry = { avoid: string; prefer: string };

export type AIConfig = {
  system_prompt: string;
  glossary: GlossaryEntry[];
  banned_words: string[];
  report_sections: string[];
  updated_at: string | null;
};

export async function getAIConfig(): Promise<AIConfig> {
  const { supabase } = await ensureAdmin();
  const { data } = await supabase
    .from('ai_report_config')
    .select('system_prompt, glossary, banned_words, report_sections, updated_at')
    .eq('id', 1).single();
  return {
    system_prompt: data?.system_prompt ?? '',
    glossary: Array.isArray(data?.glossary) ? (data!.glossary as GlossaryEntry[]) : [],
    banned_words: Array.isArray(data?.banned_words) ? (data!.banned_words as string[]) : [],
    report_sections: Array.isArray(data?.report_sections) ? (data!.report_sections as string[]) : [],
    updated_at: data?.updated_at ?? null,
  };
}

export async function updateAIConfig(input: {
  system_prompt?: string;
  glossary?: GlossaryEntry[];
  banned_words?: string[];
  report_sections?: string[];
}) {
  const { supabase, adminId } = await ensureAdmin();
  const patch: Record<string, any> = { id: 1, updated_at: new Date().toISOString(), updated_by: adminId };
  if (input.system_prompt !== undefined) patch.system_prompt = input.system_prompt;
  if (input.glossary !== undefined) patch.glossary = input.glossary;
  if (input.banned_words !== undefined) patch.banned_words = input.banned_words;
  if (input.report_sections !== undefined) patch.report_sections = input.report_sections;
  const { error } = await supabase.from('ai_report_config').upsert(patch);
  if (error) throw error;
  revalidatePath('/settings/ai');
}

export async function uploadReferenceDoc(formData: FormData) {
  const { supabase, adminId } = await ensureAdmin();
  const file = formData.get('file') as File | null;
  const title = ((formData.get('title') as string | null) || file?.name || 'Documento').trim();
  if (!file) throw new Error('Falta archivo.');
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (ext !== 'pdf') throw new Error('Solo PDF permitido.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${Date.now()}-${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage.from('ai-refs').upload(path, buf, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (upErr) throw upErr;
  const { error } = await supabase.from('ai_reference_docs').insert({
    title, storage_path: path, uploaded_by: adminId,
  });
  if (error) throw error;
  revalidatePath('/settings/ai');
}

export async function deleteReferenceDoc(id: string) {
  const { supabase } = await ensureAdmin();
  const { data: row } = await supabase
    .from('ai_reference_docs').select('storage_path').eq('id', id).single();
  if (row?.storage_path) {
    await supabase.storage.from('ai-refs').remove([row.storage_path]);
  }
  const { error } = await supabase.from('ai_reference_docs').delete().eq('id', id);
  if (error) throw error;
  revalidatePath('/settings/ai');
}

export async function updateCatalogAISpec(kind: 'technology' | 'platform', id: string, aiSpec: string) {
  const { supabase } = await ensureAdmin();
  const table = kind === 'technology' ? 'technologies' : 'platforms';
  const { error } = await supabase.from(table).update({ ai_spec: aiSpec }).eq('id', id);
  if (error) throw error;
  revalidatePath('/settings/ai');
}

export async function toggleGoldExample(reportId: string, value: boolean, professionalId: string, patientId: string) {
  const { supabase } = await ensureAdmin();
  const { error } = await supabase
    .from('medical_reports')
    .update({ is_gold_example: value })
    .eq('id', reportId);
  if (error) throw error;
  revalidatePath(`/users/${professionalId}/patients/${patientId}/reports/${reportId}`);
  revalidatePath('/settings/ai');
}

export async function generateReportWithAI(reportId: string, professionalId: string, patientId: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Falta ANTHROPIC_API_KEY en .env.local del admin');

  const { supabase } = await ensureAdmin();
  const { data: report, error } = await supabase
    .from('medical_reports').select('*').eq('id', reportId).single();
  if (error || !report) throw new Error('Informe no encontrado');

  const { data: patient } = await supabase
    .from('patients')
    .select(`full_name, cedula, phone, binaural, rechargeable, professional_id,
      technology:technology_id (name, ai_spec),
      platform:platform_id (code, ai_spec),
      audiologist:audiologist_id (name),
      visitor:visitor_id (name)
    `)
    .eq('id', patientId).single();

  const { data: professional } = patient?.professional_id
    ? await supabase.from('profiles').select('full_name').eq('id', patient.professional_id).single()
    : { data: null };

  // Descargar las imágenes como base64 (Anthropic exige HTTPS para URLs)
  const images: { kind: string; mediaType: string; data: string }[] = [];
  for (const [kind, path] of [
    ['audiometría', report.audiometry_url],
    ['logoaudiometría', report.logoaudiometry_url],
  ] as const) {
    if (!path) continue;
    const { data: blob, error: dlErr } = await supabase.storage.from('medical-exams').download(path);
    if (dlErr || !blob) continue;
    const buf = Buffer.from(await blob.arrayBuffer());
    const ext = path.split('.').pop()?.toLowerCase() ?? 'png';
    const mediaMap: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
    const mediaType = mediaMap[ext] ?? 'image/png';
    images.push({ kind, mediaType, data: buf.toString('base64') });
  }

  const anthropic = new Anthropic({ apiKey });

  const doctorName: string = (professional as any)?.full_name ?? '';
  const audiologistName: string = (patient as any)?.audiologist?.name ?? '';
  const visitorName: string = (patient as any)?.visitor?.name ?? '';
  const techName: string = (patient as any)?.technology?.name ?? '';
  const platformCode: string = (patient as any)?.platform?.code ?? '';
  const binaural = (patient as any)?.binaural === true;
  const rechargeable = (patient as any)?.rechargeable === true;

  // Descripciones de catálogo (editables desde /settings/ai)
  const techSpec: string | null = (patient as any)?.technology?.ai_spec ?? null;
  const platformSpec: string | null = (patient as any)?.platform?.ai_spec ?? null;

  // Entrenamiento: config completa desde /settings/ai
  const { data: cfg } = await supabase
    .from('ai_report_config')
    .select('system_prompt, glossary, banned_words, report_sections')
    .eq('id', 1).single();
  const systemPrompt = (cfg?.system_prompt ?? '').trim();
  const glossary: GlossaryEntry[] = Array.isArray(cfg?.glossary) ? cfg!.glossary as GlossaryEntry[] : [];
  const bannedWords: string[] = Array.isArray(cfg?.banned_words) ? cfg!.banned_words as string[] : [];
  const DEFAULT_SECTIONS = ['Identificación del paciente', 'Resumen otoscópico', 'Audiometría tonal liminar', 'Logoaudiometría', 'Diagnóstico audiológico', 'Recomendaciones'];
  const reportSections: string[] = Array.isArray(cfg?.report_sections) && cfg!.report_sections.length > 0
    ? cfg!.report_sections as string[]
    : DEFAULT_SECTIONS;

  // Documentos PDF de referencia
  const { data: refDocs } = await supabase
    .from('ai_reference_docs')
    .select('id, title, storage_path')
    .order('uploaded_at', { ascending: false });
  const referencePDFs: { title: string; data: string }[] = [];
  for (const d of refDocs ?? []) {
    const { data: blob, error: dlErr } = await supabase.storage.from('ai-refs').download(d.storage_path);
    if (dlErr || !blob) continue;
    const buf = Buffer.from(await blob.arrayBuffer());
    referencePDFs.push({ title: d.title, data: buf.toString('base64') });
  }

  const recommendationBlock = techName
    ? `\n\n## Producto cotizado al paciente\n- **Tecnología:** ${techName}${techSpec ? `\n  Características: ${techSpec}` : ''}\n- **Plataforma:** ${platformCode || '—'}${platformSpec ? `\n  Características: ${platformSpec}` : ''}\n- **Adaptación:** ${binaural ? 'binaural (2 audífonos)' : 'monoaural (1 audífono)'}\n- **Energía:** ${rechargeable ? 'recargable' : 'pilas'}\n\nEn la sección **Recomendaciones** del informe debes:\n1. Justificar clínicamente por qué los audífonos **${techName} ${platformCode}** son apropiados para el diagnóstico audiológico del paciente.\n2. Describir explícitamente las características técnicas listadas arriba (no inventes funciones que no figuren).\n3. Explicar el beneficio de la adaptación ${binaural ? 'binaural' : 'monoaural'} y de la opción ${rechargeable ? 'recargable' : 'con pilas'} en este caso.\n4. Sugerir programas de uso y expectativas realistas de adaptación.`
    : `\n\nEn la sección **Recomendaciones**, dado que aún no se ha cotizado producto, sugiere tecnología y plataforma adecuadas al diagnóstico audiológico, justificando la elección.`;

  const sectionsBlock = reportSections.map((s) => `## ${s}`).join('\n');
  const glossaryBlock = glossary.length > 0
    ? `\n\nGlosario terminológico obligatorio (respetar sin excepciones):\n${glossary.map(g => `- En vez de "${g.avoid}", di "${g.prefer}".`).join('\n')}`
    : '';
  const bannedBlock = bannedWords.length > 0
    ? `\n\nPalabras/frases prohibidas — NO uses nunca:\n${bannedWords.map(w => `- ${w}`).join('\n')}`
    : '';

  const userContent: any[] = [
    {
      type: 'text',
      text: `Redacta un informe audiológico profesional, personalizado y firme, en español, para el paciente **${patient?.full_name ?? ''}** (CC ${patient?.cedula ?? ''}).

Estructúralo con estos encabezados (## en markdown, en este orden):
${sectionsBlock}

Importante:
- Dirígete al **Dr(a). ${doctorName || 'profesional tratante'}** mencionando su nombre como receptor del informe (no como autor).
- El informe es elaborado por la audióloga tratante **${audiologistName || 'a definir'}** (firma al final).
- Resume la otoscopia en máximo 2 frases con lenguaje clínico, sin transcribir literalmente lo escrito por el operador.
- Usa lenguaje técnico audiológico colombiano (umbrales, PTA, SRT, discriminación, configuración audiométrica).
- Si una imagen no es legible, dilo y sugiere repetir el examen.${glossaryBlock}${bannedBlock}

Datos de input:
- Otoscopia (texto del operador): ${report.otoscopy_description ?? '(no proporcionada)'}
${recommendationBlock}

Cierra con una línea: "Atentamente, ${audiologistName || 'Audióloga tratante'} — Aural".`,
    },
  ];

  // PDFs de referencia como bloques document (Claude soporta PDF nativo)
  for (const pdf of referencePDFs) {
    userContent.push(
      { type: 'text', text: `↑ Documento de referencia: ${pdf.title} (úsalo como base de conocimiento y estilo)` },
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.data } },
    );
  }

  for (const im of images) {
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: im.mediaType, data: im.data },
    });
    userContent.push({ type: 'text', text: `↑ ${im.kind}` });
  }

  const { data: gold } = await supabase
    .from('medical_reports')
    .select(`title, otoscopy_description, ai_body,
      patient:patient_id (full_name, cedula,
        technology:technology_id (name),
        platform:platform_id (code)
      )`)
    .eq('is_gold_example', true)
    .not('ai_body', 'is', null)
    .is('deleted_at', null)
    .neq('id', reportId)
    .order('created_at', { ascending: false })
    .limit(3);

  const fewShot: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const g of gold ?? []) {
    const p: any = g.patient;
    const summary = [
      `Paciente: ${p?.full_name ?? '—'} (CC ${p?.cedula ?? '—'})`,
      `Otoscopia: ${g.otoscopy_description ?? '—'}`,
      p?.technology?.name ? `Producto cotizado: ${p.technology.name} ${p?.platform?.code ?? ''}`.trim() : 'Sin producto cotizado.',
    ].join('\n');
    fewShot.push({
      role: 'user',
      content: `[EJEMPLO GOLD — usa este mismo tono, estructura y nivel de detalle]\n${summary}\n\nGenera el informe:`,
    });
    fewShot.push({ role: 'assistant', content: g.ai_body ?? '' });
  }

  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 8000,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: [
      ...fewShot,
      { role: 'user', content: userContent },
    ],
  });

  const body = msg.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as any).text)
    .join('\n\n');

  // No guardamos en DB todavía. El admin debe revisar y dar "Guardar cambios"
  // explícitamente. Solo retornamos el borrador al cliente.
  return body;
}
