import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  PlusCircle, Users, FileText, Newspaper, Wallet, ArrowRight, ChevronRight,
} from 'lucide-react-native';
import { colors, spacing, typography, radius, shadow } from '@aural/shared';
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
  const fullName = profile?.full_name?.trim();
  const emailUser = session?.user?.email?.split('@')[0] ?? '';
  const firstName = fullName?.split(' ')[0] || emailUser || 'profesional';
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Text style={styles.greeting}>Hola, {firstName}</Text>
          <Pressable onPress={signOut} hitSlop={10} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Salir</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => navigation.navigate('NewLead')}
          style={({ pressed }) => [styles.ctaCard, pressed && { opacity: 0.92 }]}
        >
          <View style={styles.ctaIconWrap}>
            <PlusCircle size={28} color={colors.white} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaTitle}>Nueva oportunidad</Text>
            <Text style={styles.ctaSub}>Refiere un paciente. Aural lo contacta y agenda.</Text>
          </View>
          <ArrowRight size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Saldo pendiente</Text>
          <Text style={styles.heroValue}>{cop(stats?.commissionPending ?? 0)}</Text>
          <View style={styles.heroFooter}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroFooterLabel}>Acumulado</Text>
              <Text style={styles.heroFooterValue}>{cop(stats?.commissionGenerated ?? 0)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={{ flex: 1 }}>
              <Text style={styles.heroFooterLabel}>Pagado</Text>
              <Text style={styles.heroFooterValue}>{cop(stats?.commissionPaid ?? 0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          <Stat label="Pacientes" value={stats?.patientsTotal ?? 0} />
          <Stat label="Ventas cerradas" value={stats?.salesClosed ?? 0} accent="success" />
          <Stat label="En cotización" value={stats?.salesQuoted ?? 0} accent="warning" />
          <Stat label="Próximas citas" value={stats?.upcomingAppointments ?? 0} />
        </View>

        <Text style={styles.sectionLabel}>Diagnósticos de mis pacientes</Text>
        <View style={styles.grid}>
          <Stat label="Por evaluar" value={stats?.casePending ?? 0} />
          <Stat label="Pérdida auditiva" value={stats?.caseHearingLoss ?? 0} accent="warning" />
          <Stat label="Audición normal" value={stats?.caseNormal ?? 0} accent="success" />
          <Stat label="Hipoacusia súbita" value={stats?.caseSudden ?? 0} accent="danger" />
        </View>

        <Text style={styles.sectionLabel}>Lateralidad</Text>
        <View style={styles.panel}>
          <SidesBar
            bilateral={stats?.bilateralCount ?? 0}
            unilateral={stats?.unilateralCount ?? 0}
          />
        </View>

        <Text style={styles.sectionLabel}>Audífonos cotizados vs vendidos</Text>
        <View style={styles.panel}>
          <AidsCompare quoted={stats?.aidsQuoted ?? 0} sold={stats?.aidsSold ?? 0} />
        </View>

        <Text style={styles.sectionLabel}>Tasa de conversión</Text>
        <View style={styles.panel}>
          <Text style={styles.convValue}>{stats?.conversionRate ?? 0}%</Text>
          <Text style={styles.convSubtitle}>
            {stats?.salesClosed ?? 0} ventas de {stats?.patientsTotal ?? 0} pacientes referidos
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Referidos · últimos 6 meses</Text>
        <View style={styles.panel}>
          <MonthlyMini data={stats?.monthlyReferrals ?? []} />
        </View>

        <Text style={styles.sectionLabel}>Mis accesos</Text>
        <View style={{ gap: spacing.sm }}>
          <NavTile
            icon={<Users size={22} color={colors.primary} />}
            title="Mis pacientes"
            subtitle="Trazabilidad y estado de cada paciente"
            onPress={() => navigation.navigate('Patients')}
          />
          <NavTile
            icon={<FileText size={22} color={colors.primary} />}
            title="Informes médicos"
            subtitle={unread > 0 ? `${unread} sin leer` : 'Sin novedades'}
            badge={unread > 0 ? unread : undefined}
            onPress={() => navigation.navigate('Reports')}
          />
          <NavTile
            icon={<Newspaper size={22} color={colors.primary} />}
            title="Noticias"
            subtitle="Blogs, videos, eventos y documentos"
            onPress={() => navigation.navigate('News')}
          />
          <NavTile
            icon={<Wallet size={22} color={colors.primary} />}
            title="Pagos"
            subtitle="Histórico y comprobantes"
            onPress={() => navigation.navigate('Payments')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SidesBar({ bilateral, unilateral }: { bilateral: number; unilateral: number }) {
  const total = bilateral + unilateral;
  if (total === 0) return <Text style={styles.muted}>Sin pacientes con pérdida clasificada.</Text>;
  const pctBi = (bilateral / total) * 100;
  const pctUni = (unilateral / total) * 100;
  return (
    <View>
      <View style={styles.barRow}>
        {bilateral > 0 && <View style={[styles.barSeg, { backgroundColor: colors.primary, width: `${pctBi}%` }]}><Text style={styles.barSegText}>{bilateral}</Text></View>}
        {unilateral > 0 && <View style={[styles.barSeg, { backgroundColor: colors.warning, width: `${pctUni}%` }]}><Text style={styles.barSegText}>{unilateral}</Text></View>}
      </View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Bilateral · {bilateral}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={styles.legendText}>Unilateral · {unilateral}</Text>
        </View>
      </View>
    </View>
  );
}

function AidsCompare({ quoted, sold }: { quoted: number; sold: number }) {
  const max = Math.max(quoted, sold, 1);
  return (
    <View style={{ gap: spacing.sm }}>
      <AidsRow label="Cotizados" value={quoted} pct={(quoted / max) * 100} color={colors.warning} />
      <AidsRow label="Vendidos"  value={sold}   pct={(sold / max) * 100}   color={colors.success} />
    </View>
  );
}

function AidsRow({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) {
  return (
    <View>
      <View style={styles.aidsRowHead}>
        <Text style={styles.aidsRowLabel}>{label}</Text>
        <Text style={styles.aidsRowValue}>{value}</Text>
      </View>
      <View style={styles.aidsBarBg}>
        <View style={[styles.aidsBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function MonthlyMini({ data }: { data: { month: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <View style={styles.monthlyRow}>
      {data.map((d, i) => {
        const h = Math.max(4, (d.total / max) * 80);
        return (
          <View key={i} style={styles.monthlyCol}>
            <Text style={styles.monthlyValue}>{d.total}</Text>
            <View style={[styles.monthlyBar, { height: h, backgroundColor: colors.primary }]} />
            <Text style={styles.monthlyLabel}>{d.month}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: 'success' | 'warning' | 'danger' }) {
  const color =
    accent === 'success' ? colors.success :
    accent === 'warning' ? colors.warning :
    accent === 'danger' ? colors.danger :
    colors.primary;
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function NavTile({
  icon, title, subtitle, onPress, badge,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.navTile, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.navIconBox}>{icon}</View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text style={styles.navTitle}>{title}</Text>
          {badge !== undefined && (
            <View style={styles.navBadge}><Text style={styles.navBadgeText}>{badge}</Text></View>
          )}
        </View>
        <Text style={styles.navSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={18} color={colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },

  topBar: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  eyebrow: { ...typography.overline, color: colors.textSubtle },
  greeting: { ...typography.display, color: colors.primary, marginTop: 4 },
  signOutBtn: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radius.pill, backgroundColor: colors.surface,
  },
  signOutText: { ...typography.caption, color: colors.textMuted },

  ctaCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: '#EEA215',
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.md,
  },
  ctaIconWrap: {
    width: 52, height: 52, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  ctaTitle: { ...typography.h2, color: colors.white },
  ctaSub: { ...typography.caption, color: 'rgba(255,255,255,0.9)', marginTop: 2 },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.md,
  },
  heroLabel: { ...typography.overline, color: 'rgba(255,255,255,0.7)' },
  heroValue: { fontFamily: 'Manrope_800ExtraBold', fontSize: 38, color: colors.white, marginTop: spacing.xs, letterSpacing: -1 },
  heroFooter: {
    flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg,
    paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  divider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroFooterLabel: { ...typography.caption, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
  heroFooterValue: { fontFamily: 'Manrope_700Bold', fontSize: 15, color: colors.white, marginTop: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: {
    flexBasis: '48%', flexGrow: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  statLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.2 },
  statValue: { fontFamily: 'Manrope_800ExtraBold', fontSize: 26, marginTop: 4 },

  sectionLabel: {
    ...typography.overline, color: colors.textSubtle,
    marginTop: spacing.lg, marginBottom: spacing.xs,
  },

  navTile: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  navIconBox: {
    width: 44, height: 44, borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  navTitle: { ...typography.h3, color: colors.primary },
  navSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  navBadge: {
    backgroundColor: colors.danger, borderRadius: radius.pill,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  navBadgeText: { color: colors.white, fontFamily: 'Manrope_700Bold', fontSize: 10 },

  panel: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  muted: { ...typography.caption, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.sm },

  barRow: { flexDirection: 'row', height: 36, borderRadius: radius.sm, overflow: 'hidden' },
  barSeg: { alignItems: 'center', justifyContent: 'center' },
  barSegText: { color: colors.white, fontFamily: 'Manrope_700Bold', fontSize: 12 },

  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { ...typography.caption, color: colors.textMuted },

  aidsRowHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  aidsRowLabel: { ...typography.caption, color: colors.textMuted },
  aidsRowValue: { fontFamily: 'Manrope_700Bold', fontSize: 13, color: colors.primary },
  aidsBarBg: { height: 10, backgroundColor: colors.surface, borderRadius: 4 },
  aidsBarFill: { height: 10, borderRadius: 4 },

  convValue: { fontFamily: 'Manrope_800ExtraBold', fontSize: 40, color: colors.primary, textAlign: 'center', letterSpacing: -1 },
  convSubtitle: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: 2 },

  monthlyRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-end', height: 110 },
  monthlyCol: { flex: 1, alignItems: 'center', gap: 4 },
  monthlyValue: { fontFamily: 'Manrope_700Bold', fontSize: 11, color: colors.primary },
  monthlyBar: { width: '100%', borderRadius: 4, minHeight: 4 },
  monthlyLabel: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
});
