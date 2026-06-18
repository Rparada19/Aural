import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, RefreshControl, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, typography, radius } from '@aural/shared';
import { listMyPayments, type PaymentRow } from './api';

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function isImage(path: string | null) {
  if (!path) return false;
  return /\.(png|jpe?g|webp|gif)$/i.test(path);
}

export function PaymentsScreen() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listMyPayments();
      setRows(r);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudieron cargar los pagos.');
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total recibido</Text>
        <Text style={styles.summaryValue}>{cop(total)}</Text>
        <Text style={styles.summaryMeta}>{rows.length} pago{rows.length === 1 ? '' : 's'}</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Aún no tienes pagos</Text>
              <Text style={styles.emptySubtitle}>Cuando Aural registre un pago aparecerá aquí.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.amount}>{cop(item.amount)}</Text>
                <Text style={styles.meta}>
                  {new Date(item.paid_at).toLocaleDateString('es-CO')} · {item.channel}
                </Text>
              </View>
            </View>
            {item.transaction_ref && (
              <Text style={styles.ref}>Ref: {item.transaction_ref}</Text>
            )}
            {item.notes && <Text style={styles.notes}>{item.notes}</Text>}

            {item.receipt_signed_url && (
              isImage(item.attachment_url) ? (
                <Pressable onPress={() => item.receipt_signed_url && Linking.openURL(item.receipt_signed_url)}>
                  <Image source={{ uri: item.receipt_signed_url }} style={styles.receipt} resizeMode="cover" />
                  <Text style={styles.receiptHint}>Toca para ampliar</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => item.receipt_signed_url && Linking.openURL(item.receipt_signed_url)}
                  style={styles.fileBtn}
                >
                  <Text style={styles.fileBtnText}>📄  Ver comprobante</Text>
                </Pressable>
              )
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  summary: {
    margin: spacing.lg, marginBottom: 0,
    backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg,
  },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, letterSpacing: 1.5, fontWeight: '600', textTransform: 'uppercase' },
  summaryValue: { color: colors.white, fontSize: 32, fontWeight: '700', marginTop: spacing.xs },
  summaryMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },

  list: { padding: spacing.lg, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  amount: { ...typography.h2, color: colors.primary, fontWeight: '700' },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  ref: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  notes: { ...typography.body, color: colors.primary, marginTop: spacing.xs },
  receipt: {
    width: '100%', aspectRatio: 16 / 10,
    borderRadius: radius.sm, marginTop: spacing.sm, backgroundColor: colors.white,
  },
  receiptHint: {
    ...typography.caption, color: colors.textMuted,
    textAlign: 'center', marginTop: 4,
  },
  fileBtn: {
    marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', backgroundColor: colors.white,
  },
  fileBtnText: { ...typography.bodyStrong, color: colors.primary },

  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyTitle: { ...typography.h2, color: colors.primary },
  emptySubtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
});
