import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, radius, FUNNEL_STATUS_LABEL, type PatientFunnelStatus, CASE_TYPE_LABEL, type PatientCaseType, trafficLight, TRAFFIC_LIGHT_COLOR } from '@aural/shared';
import { listPatients } from './api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'Patients'>;

interface PatientRow {
  id: string;
  full_name: string;
  cedula: string;
  phone: string;
  funnel_status: PatientFunnelStatus;
  case_type: PatientCaseType;
  sale_closed: boolean;
  created_at: string;
  updated_at: string;
  first_contact_at: string;
}

export function PatientsListScreen({ navigation }: Props) {
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listPatients();
      setRows(r as PatientRow[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Text style={styles.count}>{rows.length} pacientes</Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Aún no tienes pacientes asignados</Text>
              <Text style={styles.emptySubtitle}>Cuando Aural los registre verás el flujo aquí.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('PatientTimeline', { id: item.id })}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
          >
            <View style={[styles.dot, { backgroundColor: TRAFFIC_LIGHT_COLOR[trafficLight(item.updated_at ?? item.first_contact_at)] }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.full_name}</Text>
              <Text style={styles.meta}>CC {item.cedula} · {item.phone}</Text>
            </View>
            <View style={[styles.badge, item.sale_closed && styles.badgeClosed]}>
              <Text style={[styles.badgeText, item.sale_closed && styles.badgeTextClosed]}>
                {item.case_type !== 'sale_candidate'
                  ? CASE_TYPE_LABEL[item.case_type]
                  : FUNNEL_STATUS_LABEL[item.funnel_status]}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  count: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  newBtn: { height: 38, paddingHorizontal: spacing.md },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { ...typography.bodyStrong, color: colors.primary },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  badge: {
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.pill, backgroundColor: colors.border,
  },
  badgeClosed: { backgroundColor: colors.success },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  badgeTextClosed: { color: colors.white },
  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyTitle: { ...typography.h2, color: colors.primary },
  emptySubtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
});
