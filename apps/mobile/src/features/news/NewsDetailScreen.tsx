import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Linking, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { colors, spacing, typography, radius } from '@aural/shared';
import { getNews } from './api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'NewsDetail'>;

const TYPE_LABEL: Record<string, string> = {
  news: 'Blog', video: 'Video', event: 'Evento', document: 'Documento',
};

export function NewsDetailScreen({ route }: Props) {
  const { id } = route.params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNews(id).then(setData).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <View style={[styles.safe, styles.center]}><ActivityIndicator color={colors.primary} /></View>;
  }
  if (!data) {
    return <View style={[styles.safe, styles.center]}><Text style={{ color: colors.textMuted }}>No encontrado.</Text></View>;
  }

  const videoUrl = data.video?.video_url;
  const eventStarts = data.event?.starts_at;
  const eventLocation = data.event?.location;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        {data.thumbnail_url && <Image source={{ uri: data.thumbnail_url }} style={styles.hero} />}
        <View style={{ padding: spacing.xl }}>
          <Text style={styles.type}>{TYPE_LABEL[data.type] ?? data.type}</Text>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.date}>
            {new Date(data.publish_at ?? data.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>

          {eventStarts && (
            <View style={styles.eventCard}>
              <Text style={styles.eventLabel}>Fecha y hora</Text>
              <Text style={styles.eventValue}>{new Date(eventStarts).toLocaleString('es-CO')}</Text>
              {eventLocation && (
                <>
                  <Text style={[styles.eventLabel, { marginTop: spacing.sm }]}>Lugar</Text>
                  <Text style={styles.eventValue}>{eventLocation}</Text>
                </>
              )}
            </View>
          )}

          {videoUrl && (
            <Pressable onPress={() => Linking.openURL(videoUrl)} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>▶  Ver video</Text>
            </Pressable>
          )}
          {data.media_url && data.type === 'document' && (
            <Pressable onPress={() => Linking.openURL(data.media_url)} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>📄  Abrir documento</Text>
            </Pressable>
          )}

          {data.body && (
            <View style={{ marginTop: spacing.lg }}>
              <Markdown style={markdownStyles}>{data.body}</Markdown>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  container: { paddingBottom: spacing.xxl },
  hero: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.surface },
  type: { ...typography.overline, color: colors.textMuted },
  title: { ...typography.display, color: colors.primary, marginTop: spacing.xs },
  date: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  body: { ...typography.body, color: colors.primary, lineHeight: 24, marginTop: spacing.lg },
  eventCard: {
    marginTop: spacing.lg, padding: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  eventLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  eventValue: { ...typography.bodyStrong, color: colors.primary, marginTop: 2 },
  actionBtn: {
    marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  actionBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});

const markdownStyles = StyleSheet.create({
  body: { color: colors.primary, fontSize: 16, lineHeight: 24 },
  heading1: { color: colors.primary, fontSize: 24, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm },
  heading2: { color: colors.primary, fontSize: 20, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.xs },
  heading3: { color: colors.primary, fontSize: 17, fontWeight: '600', marginTop: spacing.sm, marginBottom: spacing.xs },
  strong: { fontWeight: '700', color: colors.primary },
  em: { fontStyle: 'italic' },
  paragraph: { marginTop: 0, marginBottom: spacing.sm, color: colors.primary, fontSize: 16, lineHeight: 24 },
  list_item: { color: colors.primary, fontSize: 16, lineHeight: 22 },
  bullet_list: { marginBottom: spacing.sm },
  ordered_list: { marginBottom: spacing.sm },
  hr: { backgroundColor: colors.border, height: 1, marginVertical: spacing.md },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  code_inline: { backgroundColor: colors.surface, color: colors.primary, padding: 2, borderRadius: 3 },
  blockquote: { backgroundColor: colors.surface, borderLeftWidth: 3, borderLeftColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginVertical: spacing.sm },
});
