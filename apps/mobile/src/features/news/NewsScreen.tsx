import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Newspaper, Video, Calendar, FileText } from 'lucide-react-native';
import { colors, spacing, typography, radius, shadow } from '@aural/shared';
import { listNews, type NewsRow } from './api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'News'>;

const TYPE_LABEL: Record<NewsRow['type'], string> = {
  news: 'Blog', video: 'Video', event: 'Evento', document: 'Documento',
};

function TypeIcon({ type, size = 16, color }: { type: NewsRow['type']; size?: number; color: string }) {
  if (type === 'video') return <Video size={size} color={color} />;
  if (type === 'event') return <Calendar size={size} color={color} />;
  if (type === 'document') return <FileText size={size} color={color} />;
  return <Newspaper size={size} color={color} />;
}

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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Newspaper size={32} color={colors.textSubtle} /></View>
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
              : (
                <View style={[styles.thumb, styles.thumbEmpty]}>
                  <TypeIcon type={item.type} size={36} color="rgba(255,255,255,0.4)" />
                </View>
              )
            }
            <View style={styles.cardBody}>
              <View style={styles.typeRow}>
                <TypeIcon type={item.type} size={12} color={colors.textSubtle} />
                <Text style={styles.type}>{TYPE_LABEL[item.type]}</Text>
              </View>
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
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, overflow: 'hidden', ...shadow.sm,
  },
  thumb: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.surface },
  thumbEmpty: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: spacing.md, gap: spacing.xs },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  type: { ...typography.overline, color: colors.textSubtle },
  title: { ...typography.h2, color: colors.primary },
  date: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  emptyTitle: { ...typography.h2, color: colors.primary },
  emptySubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.lg },
});
