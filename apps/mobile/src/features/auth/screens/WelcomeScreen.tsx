import { View, Image, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@aural/shared';
import { Button } from '../../../components/ui/Button';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.brand}>
          <Image
            source={require('../../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.welcomeMsg}>
            Conectamos el mundo con el sonido.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button label="Iniciar sesión" onPress={() => navigation.navigate('Login')} />
          <View style={{ height: spacing.sm }} />
          <Button
            label="Crear cuenta"
            variant="secondary"
            onPress={() => navigation.navigate('RoleSelect')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  brand: { alignItems: 'center', flex: 1, justifyContent: 'center', gap: spacing.lg },
  logo: { width: 360, height: 220 },
  welcomeMsg: {
    ...typography.h2, color: colors.primary,
    textAlign: 'center', maxWidth: 300,
  },
  actions: { width: '100%' },
});
