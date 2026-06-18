import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { colors, spacing, typography, radius } from '@aural/shared';
import { useAuth } from '../auth/AuthContext';
import { getReport, markReportAsRead, signedImageUrl } from './api';
import { generateReportPdf } from './pdf';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'ReportDetail'>;

export function ReportDetailScreen({ route }: Props) {
  const { id } = route.params;
  const { session } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    const r = await getReport(id);
    setReport(r);
    if (r?.audiometry_url) setAudioUrl(await signedImageUrl(r.audiometry_url));
    if (r?.logoaudiometry_url) setLogoUrl(await signedImageUrl(r.logoaudiometry_url));
    setLoading(false);
    if (session?.user) markReportAsRead(id, session.user.id).catch(() => {});
  }, [id, session?.user]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!report) {
    return (
      <View style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.textMuted }}>Informe no encontrado.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.overline}>Informe médico</Text>
        <Text style={styles.title}>{report.title}</Text>
        <Text style={styles.meta}>
          {report.patient?.full_name ? `${report.patient.full_name} · ` : ''}
          {new Date(report.generated_at ?? report.created_at).toLocaleString('es-CO')}
        </Text>

        <Pressable
          disabled={generating}
          onPress={async () => {
            setGenerating(true);
            try {
              await generateReportPdf({
                title: report.title,
                patientName: report.patient?.full_name ?? 'Paciente',
                patientCedula: report.patient?.cedula,
                doctorName: report.patient?.professional?.full_name ?? null,
                audiologistName: report.patient?.audiologist?.name ?? null,
                visitorName: report.patient?.visitor?.name ?? null,
                generatedAt: report.generated_at ?? report.created_at,
                audiometryUrl: audioUrl,
                logoaudiometryUrl: logoUrl,
                body: report.ai_body,
              });
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'No se pudo generar el PDF.');
            } finally {
              setGenerating(false);
            }
          }}
          style={({ pressed }) => [styles.pdfBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.pdfBtnText}>
            {generating ? 'Generando PDF…' : '📄  Descargar PDF'}
          </Text>
        </Pressable>

        {audioUrl && (
          <Section title="Audiometría">
            <Image source={{ uri: audioUrl }} style={styles.image} resizeMode="contain" />
          </Section>
        )}
        {logoUrl && (
          <Section title="Logoaudiometría">
            <Image source={{ uri: logoUrl }} style={styles.image} resizeMode="contain" />
          </Section>
        )}

        {report.ai_body && (
          <Section title="Informe">
            <Markdown style={mdStyles}>{report.ai_body}</Markdown>
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, paddingBottom: spacing.xxl },
  overline: { ...typography.overline, color: colors.textMuted },
  title: { ...typography.display, color: colors.primary, marginTop: spacing.xs },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  section: { marginTop: spacing.xl },
  sectionTitle: { ...typography.h2, color: colors.primary, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  body: { ...typography.body, color: colors.primary, lineHeight: 22 },
  image: { width: '100%', aspectRatio: 16 / 10, borderRadius: radius.sm, backgroundColor: colors.white },
  pdfBtn: {
    marginTop: spacing.lg, backgroundColor: colors.primary,
    paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center',
  },
  pdfBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});

const mdStyles = StyleSheet.create({
  body: { color: colors.primary, fontSize: 15, lineHeight: 22 },
  heading1: { color: colors.primary, fontSize: 22, fontWeight: '700', marginTop: spacing.sm, marginBottom: spacing.xs },
  heading2: { color: colors.primary, fontSize: 18, fontWeight: '700', marginTop: spacing.sm, marginBottom: spacing.xs },
  heading3: { color: colors.primary, fontSize: 16, fontWeight: '600', marginTop: spacing.xs, marginBottom: spacing.xs },
  strong: { fontWeight: '700', color: colors.primary },
  em: { fontStyle: 'italic' },
  paragraph: { marginTop: 0, marginBottom: spacing.sm, color: colors.primary, fontSize: 15, lineHeight: 22 },
  list_item: { color: colors.primary, fontSize: 15, lineHeight: 22 },
  bullet_list: { marginBottom: spacing.sm },
  ordered_list: { marginBottom: spacing.sm },
  hr: { backgroundColor: colors.border, height: 1, marginVertical: spacing.sm },
});
