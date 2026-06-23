import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Stethoscope, Users } from 'lucide-react-native';
import { colors, spacing, typography, radius, shadow, ROLES } from '@aural/shared';
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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Users size={32} color={colors.textSubtle} /></View>
            <Text style={styles.emptyTitle}>Sin médicos asignados</Text>
            <Text style={styles.emptySubtitle}>Contacta al coordinador.</Text>
          </View>
        ) : null}
        renderItem={({ item }) => {
          const roleLabel = ROLES.find((r) => r.slug === item.role)?.label ?? item.role;
          return (
            <View style={styles.card}>
              <View style={styles.iconBox}>
                <Stethoscope size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.meta}>{roleLabel}{item.city ? ` · ${item.city}` : ''}</Text>
              </View>
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
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
    ...shadow.sm,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: radius.sm,
    backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center',
  },
  name: { ...typography.bodyStrong, color: colors.primary },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  emptyTitle: { ...typography.h2, color: colors.primary },
  emptySubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
