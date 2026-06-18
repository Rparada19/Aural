import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@aural/shared';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../AuthContext';

export function WaitingScreen() {
  const { profile, signOut, refresh } = useAuth();
  const rejected = profile?.status === 'rejected';
  const suspended = profile?.status === 'suspended';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Text style={styles.iconText}>
            {rejected ? '✕' : suspended ? '⏸' : '⏳'}
          </Text>
        </View>
        <Text style={styles.title}>
          {rejected ? 'Solicitud rechazada' : suspended ? 'Cuenta suspendida' : 'En revisión'}
        </Text>
        <Text style={styles.body}>
          {rejected
            ? 'Tu solicitud no fue aprobada. Contacta al administrador para más información.'
            : suspended
            ? 'Tu cuenta fue suspendida temporalmente. Contacta al administrador.'
            : 'Tu cuenta aún está pendiente de aprobación. Recibirás una notificación cuando esté lista.'}
        </Text>
        <View style={{ flex: 1 }} />
        <Button label="Reintentar" variant="secondary" onPress={refresh} />
        <Button label="Cerrar sesión" variant="ghost" onPress={signOut} style={{ marginTop: spacing.sm }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.xl, alignItems: 'center' },
  iconWrap: {
    width: 96, height: 96, borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.xxl,
  },
  iconText: { fontSize: 44 },
  title: { ...typography.display, color: colors.primary, marginTop: spacing.lg, textAlign: 'center' },
  body: {
    ...typography.body, color: colors.textMuted, textAlign: 'center',
    marginTop: spacing.md, lineHeight: 24, paddingHorizontal: spacing.sm,
  },
});
