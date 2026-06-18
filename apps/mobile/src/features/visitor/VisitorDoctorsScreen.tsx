import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, radius, ROLES } from '@aural/shared';
import { useAuth } from '../auth/AuthContext';
import { listMyDoctors } from './api';

export function VisitorDoctorsScreen() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.linked_visitor_id) { setLoading(false); return; }
    setLoading(true);
    try { setRows(await listMyDoctors(profile.linked_visitor_id)); }
    finally { setLoading(false); }
  }, [profile?.linked_visitor_id]);

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
              <Text style={styles.emptyTitle}>Sin médicos asignados</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const roleLabel = ROLES.find((r) => r.slug === item.role)?.label ?? item.role;
          return (
            <View style={styles.card}>
              <Text style={styles.name}>{item.full_name}</Text>
              <Text style={styles.meta}>{roleLabel} · {item.city}</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  name: { ...typography.bodyStrong, color: colors.primary },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyTitle: { ...typography.h2, color: colors.primary },
});
