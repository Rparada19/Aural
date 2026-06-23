import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { UserPlus, Phone, Calendar, Stethoscope, ClipboardCheck, FileText, Coins, PartyPopper } from 'lucide-react-native';
import {
  colors, spacing, typography, radius, shadow, FUNNEL_STATUS_LABEL, type PatientFunnelStatus,
  CASE_TYPE_LABEL, type PatientCaseType,
} from '@aural/shared';
import { supabase } from '../../lib/supabase';
import { getPatient, listNotes, listFollowups } from './api';
import { Button } from '../../components/ui/Button';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'PatientTimeline'>;

type EventType = 'create' | 'contact' | 'appointment' | 'note' | 'followup' | 'report' | 'commission' | 'sale';
interface TimelineEvent {
  at: string;
  type: EventType;
  title: string;
  body?: string;
  color: string;
}

const EVENT_ICONS: Record<EventType, React.ComponentType<{ size?: number; color?: string }>> = {
  create: UserPlus, contact: Phone, appointment: Calendar, note: Stethoscope,
  followup: ClipboardCheck, report: FileText, commission: Coins, sale: PartyPopper,
};

export function PatientTimelineScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [patient, setPatient] = useState<any>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, notes, fups, reports, commissions] = await Promise.all([
        getPatient(id),
        listNotes(id),
        listFollowups(id),
        supabase.from('medical_reports').select('id, title, created_at, generated_at').eq('patient_id', id).is('deleted_at', null),
        supabase.from('commissions').select('id, amount, status, generated_at, paid_at').eq('patient_id', id),
      ]);
      setPatient(p);

      const evs: TimelineEvent[] = [];
      evs.push({
        at: p.created_at, type: 'create',
        title: 'Paciente registrado en CRM', color: colors.primary,
      });
      // No mostramos "Primer contacto" porque first_contact_at se setea por defecto al crear el paciente.
      // El contacto real se refleja al cambiar funnel_status a "contacted" o agregar un seguimiento.
      if (p.appointment_at) {
        evs.push({
          at: p.appointment_at, type: 'appointment',
          title: ({
            pending: 'Cita agendada',
            confirmed: 'Cita agendada',
            attended: 'Paciente asistió a la cita',
            cancelled: 'Paciente no asistió',
          } as Record<string, string>)[p.appointment_status] ?? 'Cita agendada',
          color: p.appointment_status === 'attended' ? colors.success
            : p.appointment_status === 'cancelled' ? colors.danger
            : colors.warning,
        });
      }
      for (const n of notes as any[]) {
        evs.push({ at: n.created_at, type: 'note', title: 'Evolución clínica', body: n.body, color: colors.primary });
      }
      for (const f of fups as any[]) {
        const c = (f.comment ?? '') as string;
        let title = 'Seguimiento';
        let color: string = colors.primarySoft;
        let body: string | undefined = f.comment;
        if (c.startsWith('Cita re-agendada')) { title = 'Cita re-agendada'; color = colors.warning; body = c.replace(/^Cita re-agendada\s*/, '').trim() || undefined; }
        else if (c.startsWith('Cita agendada')) { title = 'Cita agendada'; color = colors.primary; body = c.replace(/^Cita agendada\s*/, '').trim() || undefined; }
        else if (c.startsWith('Paciente asistió')) { title = 'Paciente asistió a la cita'; color = colors.success; body = undefined; }
        else if (c.startsWith('Paciente no asistió')) { title = 'Paciente no asistió'; color = colors.danger; body = undefined; }
        evs.push({ at: f.created_at, type: 'followup', title, body, color });
      }
      for (const r of (reports.data ?? [])) {
        evs.push({ at: r.generated_at ?? r.created_at, type: 'report', title: `Informe: ${r.title}`, color: colors.success });
      }
      for (const c of (commissions.data ?? [])) {
        evs.push({
          at: c.generated_at, type: 'commission',
          title: `Comisión generada`,
          body: c.status === 'paid' ? `Pagada el ${new Date(c.paid_at).toLocaleDateString('es-CO')}` : 'Pendiente',
          color: c.status === 'paid' ? colors.success : colors.warning,
        });
      }
      if (p.sale_closed_at) {
        evs.push({ at: p.sale_closed_at, type: 'sale', title: 'Venta cerrada', color: colors.success });
      }
      evs.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setEvents(evs);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const caseLabel = patient.case_type && patient.case_type !== 'sale_candidate'
    ? CASE_TYPE_LABEL[patient.case_type as PatientCaseType]
    : FUNNEL_STATUS_LABEL[patient.funnel_status as PatientFunnelStatus];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <View style={styles.hero}>
          <Text style={styles.heroOverline}>Trazabilidad</Text>
          <Text style={styles.heroName}>{patient.full_name}</Text>
          <View style={[styles.badge, patient.sale_closed && styles.badgeClosed]}>
            <Text style={[styles.badgeText, patient.sale_closed && styles.badgeTextClosed]}>{caseLabel}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCell label="Evoluciones" value={events.filter((e) => e.type === 'note').length} />
          <SummaryCell label="Seguimientos" value={events.filter((e) => e.type === 'followup').length} />
          <SummaryCell label="Informes" value={events.filter((e) => e.type === 'report').length} />
        </View>

        <Text style={styles.sectionLabel}>Línea de tiempo</Text>
        <View style={styles.timeline}>
          {events.length === 0 && (
            <Text style={styles.muted}>Aún no hay actividad registrada.</Text>
          )}
          {events.map((e, idx) => {
            const Icon = EVENT_ICONS[e.type];
            return (
            <View key={idx} style={styles.eventRow}>
              <View style={styles.eventLeft}>
                <View style={[styles.eventDot, { backgroundColor: e.color }]}>
                  <Icon size={16} color={colors.white} />
                </View>
                {idx < events.length - 1 && <View style={styles.eventLine} />}
              </View>
              <View style={styles.eventBody}>
                <Text style={styles.eventDate}>
                  {new Date(e.at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                </Text>
                <Text style={styles.eventTitle}>{e.title}</Text>
                {e.body && <Text style={styles.eventText}>{e.body}</Text>}
              </View>
            </View>
            );
          })}
        </View>

        <Button
          label="Ver ficha completa →"
          onPress={() => navigation.navigate('PatientDetail', { id })}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCell({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, paddingBottom: spacing.xxl },
  hero: { marginBottom: spacing.lg },
  heroOverline: { ...typography.overline, color: colors.textMuted },
  heroName: { ...typography.display, color: colors.primary, marginTop: spacing.xs },
  badge: {
    alignSelf: 'flex-start', marginTop: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 4,
  },
  badgeClosed: { backgroundColor: colors.success },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.primary, letterSpacing: 1 },
  badgeTextClosed: { color: colors.white },

  summaryRow: {
    flexDirection: 'row', gap: spacing.sm,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  summaryCell: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 26, fontWeight: '700', color: colors.primary },
  summaryLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  sectionLabel: {
    ...typography.caption, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600',
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },

  timeline: { gap: 0 },
  muted: { ...typography.caption, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
  eventRow: { flexDirection: 'row', gap: spacing.md },
  eventLeft: { alignItems: 'center', width: 36 },
  eventDot: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  eventIcon: { fontSize: 16 },
  eventLine: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  eventBody: { flex: 1, paddingBottom: spacing.lg },
  eventDate: { ...typography.caption, color: colors.textMuted },
  eventTitle: { ...typography.bodyStrong, color: colors.primary, marginTop: 2 },
  eventText: { ...typography.body, color: colors.primary, marginTop: 4, lineHeight: 20 },
});
