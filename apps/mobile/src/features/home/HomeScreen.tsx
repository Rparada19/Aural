import { useCallback, useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@aural/shared';
import { useAuth } from '../auth/AuthContext';
import { getProfessionalStats, type ProfessionalStats } from './api';
import { countUnreadReports } from '../reports/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'Home'>;

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function HomeScreen({ navigation }: Props) {
  const { profile, session, signOut } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? '';
  const [stats, setStats] = useState<ProfessionalStats | null>(null);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user) return;
    try {
      const [s, u] = await Promise.all([
        getProfessionalStats(),
        countUnreadReports(session.user.id),
      ]);
      setStats(s);
      setUnread(u);
    } catch {}
    finally { setRefreshing(false); }
  }, [session?.user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        <View style={styles.topBar}>
          <Text style={styles.greeting}>Hola, {firstName}</Text>
          <Pressable onPress={signOut} hitSlop={10}>
            <Text style={styles.signOutSmall}>Salir</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => navigation.navigate('NewLead')}
          style={({ pressed }) => [styles.tile, styles.tileAccent, pressed && { opacity: 0.85 }]}
        >
          <Text style={[styles.tileTitle, { color: colors.white }]}>+ Nueva oportunidad</Text>
          <Text style={[styles.tileSubtitle, { color: 'rgba(255,255,255,0.85)' }]}>
            Refiere un paciente. Aural lo contacta y agenda.
          </Text>
        </Pressable>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Saldo pendiente</Text>
          <Text style={styles.heroValue}>{cop(stats?.commissionPending ?? 0)}</Text>
          <View style={styles.heroFooter}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroFooterLabel}>Acumulado</Text>
              <Text style={styles.heroFooterValue}>{cop(stats?.commissionGenerated ?? 0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroFooterLabel}>Pagado</Text>
              <Text style={styles.heroFooterValue}>{cop(stats?.commissionPaid ?? 0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          <Stat label="Pacientes" value={String(stats?.patientsTotal ?? 0)} />
          <Stat label="Ventas cerradas" value={String(stats?.salesClosed ?? 0)} accent="success" />
          <Stat label="En cotización" value={String(stats?.salesQuoted ?? 0)} accent="warning" />
          <Stat label="Próximas citas" value={String(stats?.upcomingAppointments ?? 0)} />
        </View>

        <Text style={styles.sectionLabel}>Diagnósticos de mis pacientes</Text>
        <View style={styles.grid}>
          <Stat label="Por evaluar" value={String(stats?.casePending ?? 0)} />
          <Stat label="Pérdida auditiva" value={String(stats?.caseHearingLoss ?? 0)} accent="warning" />
          <Stat label="Audición normal" value={String(stats?.caseNormal ?? 0)} accent="success" />
          <Stat label="Hipoacusia súbita" value={String(stats?.caseSudden ?? 0)} accent="danger" />
        </View>

        <Pressable
          onPress={() => navigation.navigate('Payments')}
          style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.tileTitle}>Pagos</Text>
          <Text style={styles.tileSubtitle}>Histórico de pagos y comprobantes</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('News')}
          style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.tileTitle}>Noticias</Text>
          <Text style={styles.tileSubtitle}>Blogs, videos, eventos y documentos de Aural</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('Reports')}
          style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={styles.tileTitle}>Informes médicos</Text>
            {unread > 0 && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>{unread} NUEVO{unread > 1 ? 'S' : ''}</Text>
              </View>
            )}
          </View>
          <Text style={styles.tileSubtitle}>
            {unread > 0 ? `Tienes ${unread} informe(s) por revisar` : 'Sin novedades'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('Patients')}
          style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.tileTitle}>Mis pacientes</Text>
          <Text style={styles.tileSubtitle}>Consulta el flujo y estado de cada paciente</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'success' | 'warning' | 'danger' }) {
  const color = accent === 'success' ? colors.success : accent === 'warning' ? colors.warning : accent === 'danger' ? colors.danger : colors.primary;
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && { ...typography.bodyStrong }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  topBar: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  signOutSmall: { color: colors.textMuted, fontSize: 13, textDecorationLine: 'underline', paddingBottom: 6 },
  greeting: { ...typography.display, color: colors.primary },

  heroCard: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.sm },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, letterSpacing: 1.5, fontWeight: '600', textTransform: 'uppercase' },
  heroValue: { color: colors.white, fontSize: 36, fontWeight: '700', marginTop: spacing.xs },
  heroFooter: {
    flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg,
    paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)',
  },
  heroFooterLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 1, fontWeight: '600' },
  heroFooterValue: { color: colors.white, fontSize: 16, fontWeight: '600', marginTop: 2 },

  sectionLabel: {
    ...typography.caption, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600',
    marginTop: spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: {
    flexBasis: '48%', flexGrow: 1,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  statLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  statValue: { fontSize: 28, fontWeight: '700', marginTop: spacing.xs },

  amountsCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  rowLabel: { ...typography.body, color: colors.textMuted },
  rowValue: { ...typography.body, color: colors.primary },

  tile: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.lg,
  },
  tileAccent: { backgroundColor: colors.primary, borderColor: colors.primary },
  tileTitle: { ...typography.h2, color: colors.primary },
  tileSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },

  newBadge: { backgroundColor: colors.danger, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { color: colors.white, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

});
