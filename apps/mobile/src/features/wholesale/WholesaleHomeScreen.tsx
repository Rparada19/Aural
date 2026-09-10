import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, radius, fonts } from '@aural/shared';
import { useAuth } from '../auth/AuthContext';
import { fetchChannelSummary, type ChannelSummary } from './api';

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const pct = (n: number) => `${Math.round(n * 100)}%`;

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function WholesaleHomeScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { profile } = useAuth();
  const [data, setData] = useState<ChannelSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await fetchChannelSummary());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const ratio = data && data.budget > 0 ? data.revenue / data.budget : null;
  const mes = MESES[new Date().getMonth()];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.overline}>Wholesale · {mes}</Text>
          <Text style={styles.title}>Canal mayorista</Text>
          <Text style={styles.subtitle}>
            Hola {profile?.full_name?.split(' ')[0] ?? ''} · {data?.clients ?? 0} centros activos
          </Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {data && (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>Venta del mes</Text>
              <Text style={styles.heroValue}>{cop(data.revenue)}</Text>
              <Text style={styles.heroFoot}>
                {data.count} facturas · {data.units} unidades
                {ratio !== null && ` · ${Math.round(ratio * 100)}% del presupuesto`}
              </Text>
              {ratio !== null && (
                <View style={styles.meter}>
                  <View
                    style={[
                      styles.meterFill,
                      {
                        width: `${Math.min(ratio * 100, 100)}%`,
                        backgroundColor: ratio >= 1 ? colors.success : colors.white,
                      },
                    ]}
                  />
                </View>
              )}
            </View>

            <View style={styles.statRow}>
              <Stat label="ASP" value={data.asp > 0 ? cop(data.asp) : '—'} />
              <Stat label="Binaural" value={pct(data.binauralRate)} />
              <Stat label="Recargable" value={pct(data.rechargeableRate)} />
            </View>

            {data.overdueLoans.length > 0 && (
              <Section title="Préstamos vencidos" count={data.overdueLoans.length} tone="danger">
                {data.overdueLoans.map((l) => (
                  <View key={l.id} style={styles.row}>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowTitle}>{l.client}</Text>
                      <Text style={styles.rowSub}>{l.serials.join(' · ')}</Text>
                    </View>
                    <Text style={[styles.rowMeta, { color: colors.danger }]}>
                      {l.days}d
                    </Text>
                  </View>
                ))}
              </Section>
            )}

            {data.topClients.length > 0 && (
              <Section title="Más compran este mes">
                {data.topClients.map((c, i) => (
                  <View key={c.id} style={styles.row}>
                    <Text style={styles.rank}>{String(i + 1).padStart(2, '0')}</Text>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowTitle}>{c.name}</Text>
                    </View>
                    <Text style={styles.rowValue}>{cop(c.amount)}</Text>
                  </View>
                ))}
              </Section>
            )}

            {data.noPurchase.length > 0 && (
              <Section title={`Sin compra en ${mes}`} count={data.noPurchase.length} tone="warning">
                {data.noPurchase.map((c) => (
                  <View key={c.id} style={styles.row}>
                    <View style={styles.rowMain}>
                      <Text style={styles.rowTitle}>{c.name}</Text>
                      <Text style={styles.rowSub}>
                        {c.lastSale ? `Última compra ${c.lastSale}` : 'Nunca ha comprado'}
                      </Text>
                    </View>
                  </View>
                ))}
              </Section>
            )}

            <Text style={styles.footNote}>
              Para registrar ventas, gastos o presupuestos, entra a
              {'\n'}wholesale.auralbusinessintelligence.com
            </Text>
          </>
        )}

        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Volver</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Section({
  title, count, tone, children,
}: {
  title: string;
  count?: number;
  tone?: 'danger' | 'warning';
  children: React.ReactNode;
}) {
  const color = tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.primary;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {count !== undefined && <Text style={[styles.sectionCount, { color }]}>{count}</Text>}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },

  header: { marginBottom: spacing.lg },
  overline: { ...typography.caption, color: colors.secondary, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { ...typography.h1, marginTop: 4 },
  subtitle: { ...typography.caption, color: colors.secondary, marginTop: 4 },

  error: { ...typography.body, color: colors.danger, marginBottom: spacing.md },

  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroLabel: { ...typography.caption, color: colors.white, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.2 },
  heroValue: { fontFamily: fonts.bold, fontSize: 32, color: colors.white, marginTop: 6, letterSpacing: -0.5 },
  heroFoot: { ...typography.caption, color: colors.white, opacity: 0.75, marginTop: 6 },
  meter: { height: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: spacing.md, borderRadius: 2, overflow: 'hidden' },
  meterFill: { height: '100%' },

  statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  statLabel: { ...typography.caption, color: colors.secondary, textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 },
  statValue: { fontFamily: fonts.bold, fontSize: 16, marginTop: 4 },

  section: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionTitle: { ...typography.h3 },
  sectionCount: { fontFamily: fonts.bold, fontSize: 18 },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  rank: { fontFamily: fonts.medium, fontSize: 11, color: colors.secondary, width: 20 },
  rowMain: { flex: 1 },
  rowTitle: { ...typography.body, fontSize: 14 },
  rowSub: { ...typography.caption, color: colors.secondary, marginTop: 2 },
  rowMeta: { fontFamily: fonts.bold, fontSize: 13 },
  rowValue: { fontFamily: fonts.bold, fontSize: 13 },

  footNote: { ...typography.caption, color: colors.secondary, textAlign: 'center', marginTop: spacing.md, lineHeight: 18 },
  back: { alignItems: 'center', paddingVertical: spacing.lg },
  backText: { ...typography.body, color: colors.secondary },
});
