import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronRight, UserRound } from 'lucide-react-native';
import {
  colors, spacing, typography, radius, shadow,
  FUNNEL_STATUS_LABEL, type PatientFunnelStatus,
  CASE_TYPE_LABEL, type PatientCaseType,
  trafficLight, TRAFFIC_LIGHT_COLOR,
} from '@aural/shared';
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
        <Text style={styles.count}>{rows.length} {rows.length === 1 ? 'paciente' : 'pacientes'}</Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <UserRound size={32} color={colors.textSubtle} />
              </View>
              <Text style={styles.emptyTitle}>Aún no tienes pacientes asignados</Text>
              <Text style={styles.emptySubtitle}>
                Cuando Aural los registre verás el flujo aquí.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const light = trafficLight(item.updated_at ?? item.first_contact_at);
          const badgeLabel = item.case_type !== 'sale_candidate' && item.case_type !== 'pending_evaluation'
            ? CASE_TYPE_LABEL[item.case_type]
            : FUNNEL_STATUS_LABEL[item.funnel_status];
          return (
            <Pressable
              onPress={() => navigation.navigate('PatientTimeline', { id: item.id })}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.dot, { backgroundColor: TRAFFIC_LIGHT_COLOR[light] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.meta}>CC {item.cedula ?? '—'} · {item.phone}</Text>
              </View>
              <View style={styles.right}>
                <View style={[styles.badge, item.sale_closed && styles.badgeClosed]}>
                  <Text style={[styles.badgeText, item.sale_closed && styles.badgeTextClosed]}>{badgeLabel}</Text>
                </View>
                <ChevronRight size={16} color={colors.textSubtle} />
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  count: { ...typography.overline, color: colors.textSubtle },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
    ...shadow.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { ...typography.bodyStrong, color: colors.primary },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  badge: {
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.pill, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderSoft,
  },
  badgeClosed: { backgroundColor: colors.success, borderColor: colors.success },
  badgeText: { fontFamily: 'Manrope_600SemiBold', fontSize: 10, color: colors.primary, letterSpacing: 0.5 },
  badgeTextClosed: { color: colors.white },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: { ...typography.h2, color: colors.primary, textAlign: 'center' },
  emptySubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.lg },
});
