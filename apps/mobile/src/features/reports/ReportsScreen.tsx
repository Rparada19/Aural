import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { FileText, ChevronRight } from 'lucide-react-native';
import { colors, spacing, typography, radius, shadow } from '@aural/shared';
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
    if (!session?.user) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await listReports(session.user.id);
      setRows(r);
    } catch (e) {
      console.error('[Reports] load error:', e);
    } finally { setLoading(false); }
  }, [session?.user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
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
                <FileText size={32} color={colors.textSubtle} />
              </View>
              <Text style={styles.emptyTitle}>Sin informes médicos</Text>
              <Text style={styles.emptySubtitle}>Cuando se publique uno aparecerá aquí.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('ReportDetail', { id: item.id })}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.iconBox}><FileText size={20} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                {!item.is_read && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NUEVO</Text>
                  </View>
                )}
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              </View>
              <Text style={styles.meta}>
                {item.patient?.full_name ?? 'Paciente'} ·{' '}
                {new Date(item.generated_at ?? item.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <ChevronRight size={16} color={colors.textSubtle} />
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
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, ...shadow.sm,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  newBadge: { backgroundColor: colors.danger, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { color: colors.white, fontFamily: 'Manrope_700Bold', fontSize: 9, letterSpacing: 1 },
  title: { ...typography.bodyStrong, color: colors.primary, flexShrink: 1 },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: { ...typography.h2, color: colors.primary },
  emptySubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.lg },
});
