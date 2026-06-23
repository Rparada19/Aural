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
  const { supabase } = await ensureAdmin();
  const { error } = await supabase
    .from('medical_reports')
    .update({ ai_body: body, generated_at: new Date().toISOString() })
    .eq('id', reportId);
  if (error) throw error;
  revalidatePath(`/users/${professionalId}/patients/${patientId}`);
}

export async function deleteReport(reportId: string) {
  const { supabase } = await ensureAdmin();
  const { error } = await supabase
    .from('medical_reports')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', reportId);
  if (error) throw error;
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
      technology:technology_id (name),
      platform:platform_id (code),
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

  // Catálogo de productos Aural — usado por la IA para describir con propiedad
  const TECH_SPECS: Record<string, string> = {
    'Evoke': 'Audífono con procesamiento SoundSense Learn que aprende de las preferencias del usuario en distintos entornos. Sistema TruAcoustics para naturalidad de voz. Indicado en hipoacusias leves a moderadas-severas.',
    'Magnify': 'Audífono con procesamiento integral basado en redes neuronales (BrainHearing). Excelente desempeño en ruido. Indicado en hipoacusias leves a severas que requieren claridad de voz en ambientes complejos.',
    'Moment': 'Audífono ultra-discreto con tecnología SoundSense Adapt y procesamiento de sonido natural. Ideal para usuarios primerizos. Indicado en hipoacusias leves a moderadas-severas.',
    'Smart-RIC': 'Receptor en canal (RIC) compacto con conectividad inalámbrica avanzada (Bluetooth) y streaming directo a iPhone/Android. Indicado para pacientes activos con hipoacusias leves a severas.',
    'Allure': 'Última generación: procesador PureSound 3.0 con reducción de ruido 35% superior, Bluetooth LE Audio + Auracast, recarga inalámbrica 30h, diseño RIC ultra-discreto 22% más pequeño. Indicado en hipoacusias leves a severas (15–90 dB HL), pacientes activos que requieren conectividad y simplicidad.',
  };
  const PLATFORM_SPECS: Record<string, string> = {
    '30':  'plataforma básica: 4 canales, programa único, ideal para ambientes tranquilos.',
    '50':  'plataforma básica+: 6 canales, 2 programas, manejo básico de ruido.',
    '100': 'plataforma media: 8 canales, direccionalidad adaptativa, reducción de ruido.',
    '110': 'plataforma media+: 10 canales, antifeedback dinámico, conectividad básica.',
    '220': 'plataforma media-alta: 12 canales, direccionalidad inteligente, streaming.',
    '330': 'plataforma alta: 16 canales, escenarios automáticos, aprendizaje contextual.',
    '440': 'plataforma premium: 20+ canales, IA acústica, todos los programas avanzados, máxima personalización.',
  };

  const techSpec = techName && TECH_SPECS[techName] ? TECH_SPECS[techName] : null;
  const platformSpec = platformCode && PLATFORM_SPECS[platformCode] ? PLATFORM_SPECS[platformCode] : null;

  const recommendationBlock = techName
    ? `\n\n## Producto cotizado al paciente\n- **Tecnología:** ${techName}${techSpec ? `\n  Características: ${techSpec}` : ''}\n- **Plataforma:** ${platformCode || '—'}${platformSpec ? `\n  Características: ${platformSpec}` : ''}\n- **Adaptación:** ${binaural ? 'binaural (2 audífonos)' : 'monoaural (1 audífono)'}\n- **Energía:** ${rechargeable ? 'recargable' : 'pilas'}\n\nEn la sección **Recomendaciones** del informe debes:\n1. Justificar clínicamente por qué los audífonos **${techName} ${platformCode}** son apropiados para el diagnóstico audiológico del paciente.\n2. Describir explícitamente las características técnicas listadas arriba (no inventes funciones que no figuren).\n3. Explicar el beneficio de la adaptación ${binaural ? 'binaural' : 'monoaural'} y de la opción ${rechargeable ? 'recargable' : 'con pilas'} en este caso.\n4. Sugerir programas de uso y expectativas realistas de adaptación.`
    : `\n\nEn la sección **Recomendaciones**, dado que aún no se ha cotizado producto, sugiere tecnología y plataforma adecuadas al diagnóstico audiológico, justificando la elección.`;

  const userContent: any[] = [
    {
      type: 'text',
      text: `Redacta un informe audiológico profesional, personalizado y firme, en español, para el paciente **${patient?.full_name ?? ''}** (CC ${patient?.cedula ?? ''}).

Estructúralo con estos encabezados (## en markdown):
## Identificación del paciente
## Resumen otoscópico
## Audiometría tonal liminar
## Logoaudiometría
## Diagnóstico audiológico
## Recomendaciones

Importante:
- Dirígete al **Dr(a). ${doctorName || 'profesional tratante'}** mencionando su nombre como receptor del informe (no como autor).
- El informe es elaborado por la audióloga tratante **${audiologistName || 'a definir'}** (firma al final).
- Resume la otoscopia en máximo 2 frases con lenguaje clínico, sin transcribir literalmente lo escrito por el operador.
- Usa lenguaje técnico audiológico colombiano (umbrales, PTA, SRT, discriminación, configuración audiométrica).
- Si una imagen no es legible, dilo y sugiere repetir el examen.

Datos de input:
- Otoscopia (texto del operador): ${report.otoscopy_description ?? '(no proporcionada)'}
${recommendationBlock}

Cierra con una línea: "Atentamente, ${audiologistName || 'Audióloga tratante'} — Aural".`,
    },
  ];

  for (const im of images) {
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: im.mediaType, data: im.data },
    });
    userContent.push({ type: 'text', text: `↑ ${im.kind}` });
  }

  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 8000,
    messages: [{ role: 'user', content: userContent }],
  });

  const body = msg.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as any).text)
    .join('\n\n');

  const { error: upErr } = await supabase
    .from('medical_reports')
    .update({ ai_body: body, generated_at: new Date().toISOString() })
    .eq('id', reportId);
  if (upErr) throw upErr;

  revalidatePath(`/users/${professionalId}/patients/${patientId}`);
  return body;
}
