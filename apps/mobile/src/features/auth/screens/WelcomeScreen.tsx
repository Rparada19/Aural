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
          <Text style={styles.tagline}>CONÉCTATE A TU VIDA</Text>
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
  brand: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  logo: { width: 340, height: 200 },
  tagline: {
    fontSize: 12, letterSpacing: 4, color: colors.primary,
    fontWeight: '600', marginTop: spacing.sm,
  },
  actions: { width: '100%' },
});
