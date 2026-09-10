import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { DocumentList, type DocRow } from '@/components/wholesale/DocumentList';
import { requireWholesaleMe } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const me = await requireWholesaleMe();
  const supabase = await createSupabaseServerClient();

  // La RLS ya filtra: el comercial solo recibe los públicos y los suyos.
  const [{ data: docs }, { data: audience }, { data: reps }] = await Promise.all([
    supabase
      .from('wholesale_documents')
      .select('id, title, description, file_path, file_name, file_size, mime_type, is_public, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('wholesale_document_audience').select('document_id, rep_id'),
    supabase.from('wholesale_reps').select('id, name').is('deleted_at', null).eq('is_active', true).order('name'),
  ]);

  const audienceByDoc = new Map<string, string[]>();
  for (const a of audience ?? []) {
    if (!audienceByDoc.has(a.document_id)) audienceByDoc.set(a.document_id, []);
    audienceByDoc.get(a.document_id)!.push(a.rep_id);
  }

  const rows: DocRow[] = (docs ?? []).map((d) => ({
    ...d,
    audience: audienceByDoc.get(d.id) ?? [],
  }));

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline="Wholesale"
        title="Documentos"
        subtitle={
          me.isCoordination
            ? 'Material para el equipo comercial. Puedes publicarlo para todos o para comerciales puntuales.'
            : 'Material que coordinación publicó para ti.'
        }
      />
      <DocumentList docs={rows} reps={reps ?? []} canManage={me.isCoordination} />
    </WholesaleLayout>
  );
}
