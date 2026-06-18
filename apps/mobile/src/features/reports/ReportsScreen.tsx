import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@aural/shared';
import { useAuth } from '../auth/AuthContext';
import { listReports, type ReportRow } from './api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'Reports'>;

export function ReportsScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const r = await listReports(session.user.id);
      setRows(r);
    } finally { setLoading(false); }
  }, [session?.user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Sin informes médicos</Text>
              <Text style={styles.emptySubtitle}>Cuando se publique uno aparecerá aquí.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('ReportDetail', { id: item.id })}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                {!item.is_read && (
                  <View style={styles.newBadge}><Text style={styles.newBadgeText}>NUEVO</Text></View>
                )}
                <Text style={styles.title}>{item.title}</Text>
              </View>
              <Text style={styles.meta}>
                {item.patient?.full_name ?? 'Paciente'} ·{' '}
                {new Date(item.generated_at ?? item.created_at).toLocaleDateString('es-CO')}
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, gap: spacing.sm,
  },
  newBadge: { backgroundColor: colors.danger, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { color: colors.white, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  title: { ...typography.bodyStrong, color: colors.primary, flexShrink: 1 },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  arrow: { fontSize: 24, color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyTitle: { ...typography.h2, color: colors.primary },
  emptySubtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
});
