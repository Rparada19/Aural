import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, RefreshControl, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Wallet, FileText, Receipt } from 'lucide-react-native';
import { colors, spacing, typography, radius, shadow } from '@aural/shared';
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
    try { setRows(await listMyPayments()); }
    catch (e: any) { Alert.alert('Error', e?.message ?? 'No se pudieron cargar los pagos.'); }
    finally { setLoading(false); }
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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Wallet size={32} color={colors.textSubtle} /></View>
            <Text style={styles.emptyTitle}>Aún no tienes pagos</Text>
            <Text style={styles.emptySubtitle}>Cuando Aural registre un pago aparecerá aquí.</Text>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <View style={styles.iconBox}><Wallet size={20} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.amount}>{cop(item.amount)}</Text>
                <Text style={styles.meta}>
                  {new Date(item.paid_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })} · {item.channel}
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
                  <Receipt size={16} color={colors.primary} />
                  <Text style={styles.fileBtnText}>Ver comprobante</Text>
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
    ...shadow.md,
  },
  summaryLabel: { ...typography.overline, color: 'rgba(255,255,255,0.7)' },
  summaryValue: { fontFamily: 'Manrope_800ExtraBold', fontSize: 32, color: colors.white, marginTop: spacing.xs, letterSpacing: -0.5 },
  summaryMeta: { ...typography.caption, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, gap: spacing.xs,
    ...shadow.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 44, height: 44, borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  amount: { ...typography.h2, color: colors.primary },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  ref: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  notes: { ...typography.body, color: colors.primary, marginTop: spacing.xs },
  receipt: {
    width: '100%', aspectRatio: 16 / 10,
    borderRadius: radius.sm, marginTop: spacing.sm, backgroundColor: colors.white,
  },
  receiptHint: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  fileBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.sm, backgroundColor: colors.white,
  },
  fileBtnText: { ...typography.bodyStrong, color: colors.primary },

  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  emptyTitle: { ...typography.h2, color: colors.primary },
  emptySubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.lg },
});
