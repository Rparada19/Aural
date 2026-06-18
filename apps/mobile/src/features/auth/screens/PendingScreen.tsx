import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius } from '@aural/shared';
import { Button } from '../../../components/ui/Button';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Pending'>;

export function PendingScreen({ route, navigation }: Props) {
  const { email } = route.params;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Text style={styles.iconText}>⏳</Text>
        </View>
        <Text style={styles.title}>Solicitud enviada</Text>
        <Text style={styles.body}>
          Gracias por registrarte. Tu solicitud será revisada por un administrador. Recibirás un
          correo en{' '}
          <Text style={styles.bodyStrong}>{email}</Text> cuando tu cuenta haya sido aprobada.
        </Text>
        <View style={{ flex: 1 }} />
        <Button
          label="Volver al inicio"
          variant="secondary"
          onPress={() => navigation.popToTop()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.xl, alignItems: 'center' },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  iconText: { fontSize: 44 },
  title: { ...typography.display, color: colors.primary, marginTop: spacing.lg, textAlign: 'center' },
  body: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
  },
  bodyStrong: { color: colors.primary, fontWeight: '600' },
});
