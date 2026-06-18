import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  colors, spacing, typography, radius, FUNNEL_STATUS_LABEL, type PatientFunnelStatus,
  CASE_TYPE_LABEL, type PatientCaseType,
} from '@aural/shared';
import { getPatient, listNotes, listFollowups } from './api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'PatientDetail'>;

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function PatientDetailScreen({ route }: Props) {
  const { id } = route.params;
  const [patient, setPatient] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, ns, fs] = await Promise.all([
        getPatient(id), listNotes(id), listFollowups(id),
      ]);
      setPatient(p); setNotes(ns); setFollowups(fs);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo cargar el paciente.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <View style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!patient) {
    return (
      <View style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.textMuted }}>Paciente no encontrado.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <Text style={styles.overline}>Paciente</Text>
        <Text style={styles.name}>{patient.full_name}</Text>
        <View style={[styles.badge, patient.sale_closed && styles.badgeClosed]}>
          <Text style={[styles.badgeText, patient.sale_closed && styles.badgeTextClosed]}>
            {patient.case_type && patient.case_type !== 'sale_candidate'
              ? CASE_TYPE_LABEL[patient.case_type as PatientCaseType]
              : FUNNEL_STATUS_LABEL[patient.funnel_status as PatientFunnelStatus]}
          </Text>
        </View>

        <Section title="Información general">
          <Field label="Cédula" value={patient.cedula} />
          <Field label="Teléfono" value={patient.phone} />
          <Field label="Correo" value={patient.email ?? '—'} />
          <Field label="Ciudad" value={patient.city?.name ?? '—'} />
          <Field label="Observaciones" value={patient.notes ?? '—'} />
        </Section>

        <Section title="Información clínica">
          <Text style={styles.body}>{patient.clinical_findings || '—'}</Text>

          <View style={styles.divider} />
          <Text style={styles.subLabel}>Evoluciones</Text>
          {notes.length === 0 ? (
            <Text style={styles.muted}>Sin evoluciones registradas.</Text>
          ) : (
            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              {notes.map((n) => (
                <View key={n.id} style={styles.noteItem}>
                  <Text style={styles.noteMeta}>
                    {new Date(n.created_at).toLocaleString('es-CO')}
                    {n.author?.full_name ? ` · ${n.author.full_name}` : ''}
                  </Text>
                  <Text style={styles.noteBody}>{n.body}</Text>
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section title="Información de adaptación">
          <Field label="Tecnología" value={patient.technology?.name ?? '—'} />
          <Field label="Plataforma" value={patient.platform?.code ?? '—'} />
          <Field label="Recargable" value={patient.rechargeable === null ? '—' : patient.rechargeable ? 'Sí' : 'No'} />
          <Field label="Binauralidad" value={patient.binaural === null ? '—' : patient.binaural ? 'Sí' : 'No'} />
          <Field label="Sede" value={patient.location?.name ?? '—'} />
          <Field label="Estado" value={patient.sale_closed ? 'Venta cerrada' : 'En cotización'} />
        </Section>

        <Section title={`Seguimientos (${followups.length})`}>
          {followups.length === 0 ? (
            <Text style={styles.muted}>Sin seguimientos.</Text>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {followups.map((f) => (
                <View key={f.id} style={styles.noteItem}>
                  <Text style={styles.noteMeta}>
                    {new Date(f.created_at).toLocaleString('es-CO')}
                    {f.author?.full_name ? ` · ${f.author.full_name}` : ''}
                  </Text>
                  <Text style={styles.noteBody}>{f.comment}</Text>
                  {f.next_action && <Text style={styles.muted}>→ {f.next_action}</Text>}
                </View>
              ))}
            </View>
          )}
        </Section>
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
function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, paddingBottom: spacing.xxl },
  overline: { ...typography.overline, color: colors.textMuted },
  name: { ...typography.display, color: colors.primary, marginTop: spacing.xs },
  badge: {
    alignSelf: 'flex-start', marginTop: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 4,
  },
  badgeClosed: { backgroundColor: colors.success },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.primary, letterSpacing: 1 },
  badgeTextClosed: { color: colors.white },
  section: { marginTop: spacing.xl },
  sectionTitle: { ...typography.h2, color: colors.primary, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingVertical: spacing.xs, gap: spacing.md,
  },
  fieldLabel: {
    ...typography.caption, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600',
  },
  fieldValue: { ...typography.body, color: colors.primary, flex: 1, textAlign: 'right' },
  body: { ...typography.body, color: colors.primary },
  subLabel: {
    ...typography.caption, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600',
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  noteItem: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.sm,
  },
  noteMeta: { ...typography.caption, color: colors.textMuted },
  noteBody: { ...typography.body, color: colors.primary, marginTop: 2 },
  muted: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
