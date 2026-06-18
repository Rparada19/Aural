import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@aural/shared';
import { listNews, type NewsRow } from './api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'News'>;

const TYPE_LABEL: Record<NewsRow['type'], string> = {
  news: 'Blog', video: 'Video', event: 'Evento', document: 'Documento',
};

export function NewsScreen({ navigation }: Props) {
  const [rows, setRows] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await listNews()); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin noticias por ahora</Text>
            <Text style={styles.emptySubtitle}>Cuando publiquemos contenido aparecerá aquí.</Text>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('NewsDetail', { id: item.id })}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            {item.thumbnail_url
              ? <Image source={{ uri: item.thumbnail_url }} style={styles.thumb} />
              : <View style={[styles.thumb, styles.thumbEmpty]}><Text style={styles.thumbEmptyText}>{TYPE_LABEL[item.type]}</Text></View>
            }
            <View style={styles.cardBody}>
              <Text style={styles.type}>{TYPE_LABEL[item.type]}</Text>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.date}>
                {new Date(item.publish_at ?? item.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
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
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, overflow: 'hidden',
  },
  thumb: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.white },
  thumbEmpty: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  thumbEmptyText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 2, fontSize: 12 },
  cardBody: { padding: spacing.md },
  type: { ...typography.overline, color: colors.textMuted },
  title: { ...typography.h2, color: colors.primary, marginTop: spacing.xs },
  date: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyTitle: { ...typography.h2, color: colors.primary },
  emptySubtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
});
