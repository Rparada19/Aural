import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@aural/shared';
import { useAuth } from '../auth/AuthContext';
import { getVisitorStats, type VisitorStats } from './api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { VisitorStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<VisitorStackParamList, 'VisitorHome'>;

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function VisitorHomeScreen({ navigation }: Props) {
  const { profile, signOut } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? '';
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.linked_visitor_id) { setRefreshing(false); return; }
    try { setStats(await getVisitorStats(profile.linked_visitor_id)); }
    catch {}
    finally { setRefreshing(false); }
  }, [profile?.linked_visitor_id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const ach = stats?.achievement;
  const achColor = ach === null || ach === undefined ? colors.textMuted
    : ach >= 100 ? colors.success
    : ach >= 70 ? colors.warning
    : colors.danger;

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
        <Text style={styles.subtitle}>Visitador médico</Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Cumplimiento del mes</Text>
          <Text style={[styles.heroValue, { color: ach === null ? colors.white : achColor === colors.danger ? '#FCA5A5' : achColor === colors.warning ? '#FED7AA' : '#86EFAC' }]}>
            {ach !== null && ach !== undefined ? `${ach}%` : '—'}
          </Text>
          <View style={styles.heroFooter}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroFooterLabel}>Ventas del mes</Text>
              <Text style={styles.heroFooterValue}>{cop(stats?.monthSales ?? 0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroFooterLabel}>Presupuesto</Text>
              <Text style={styles.heroFooterValue}>{cop(stats?.monthBudget ?? 0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          <Stat label="Médicos asignados" value={String(stats?.doctorsCount ?? 0)} />
          <Stat label="Oportunidades activas" value={String(stats?.opportunitiesCount ?? 0)} accent="warning" />
          <Stat label="Pacientes totales" value={String(stats?.patientsCount ?? 0)} />
          <Stat label="Ventas cerradas" value={String(stats?.salesClosed ?? 0)} accent="success" />
        </View>

        <View style={styles.amountsCard}>
          <Row label="Valor vendido (acum.)" value={cop(stats?.amountSold ?? 0)} strong />
          <Row label="Valor cotizado" value={cop(stats?.amountQuoted ?? 0)} />
          <Row label="Valor oportunidades" value={cop(stats?.opportunitiesAmount ?? 0)} />
        </View>

        <Pressable
          onPress={() => navigation.navigate('VisitorDoctors')}
          style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.tileTitle}>Mis médicos</Text>
          <Text style={styles.tileSubtitle}>Ver detalle de cada médico asignado</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'success' | 'warning' }) {
  const color = accent === 'success' ? colors.success : accent === 'warning' ? colors.warning : colors.primary;
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
  topBar: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  signOutSmall: { color: colors.textMuted, fontSize: 13, textDecorationLine: 'underline', paddingBottom: 6 },
  greeting: { ...typography.display, color: colors.primary },
  subtitle: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' },
  heroCard: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.sm },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, letterSpacing: 1.5, fontWeight: '600', textTransform: 'uppercase' },
  heroValue: { color: colors.white, fontSize: 48, fontWeight: '700', marginTop: spacing.xs },
  heroFooter: {
    flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg,
    paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)',
  },
  heroFooterLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 1, fontWeight: '600' },
  heroFooterValue: { color: colors.white, fontSize: 14, fontWeight: '600', marginTop: 2 },
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
  tileTitle: { ...typography.h2, color: colors.primary },
  tileSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
