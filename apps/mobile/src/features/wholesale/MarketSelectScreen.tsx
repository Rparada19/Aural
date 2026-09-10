import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, fonts } from '@aural/shared';
import { useAuth } from '../auth/AuthContext';

/** Puerta de entrada para quien atiende los dos mercados. */
export function MarketSelectScreen({
  navigation,
}: {
  navigation: { navigate: (screen: string) => void };
}) {
  const { profile, signOut } = useAuth();

  const markets = [
    {
      key: 'MainStack',
      name: 'Visita médica',
      detail: 'Médicos, remisiones, pacientes e informes',
    },
    {
      key: 'WholesaleHome',
      name: 'Wholesale',
      detail: 'Canal mayorista: centros auditivos y su desempeño',
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.overline}>Selecciona un mercado</Text>
        <Text style={styles.hello}>Hola, {profile?.full_name?.split(' ')[0] ?? ''}</Text>

        <View style={styles.list}>
          {markets.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => navigation.navigate(m.key)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <Text style={styles.cardName}>{m.name}</Text>
              <Text style={styles.cardDetail}>{m.detail}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={signOut} style={styles.signOut}>
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  logo: { width: 150, height: 46, alignSelf: 'center', marginBottom: spacing.xl },
  overline: {
    ...typography.caption, color: colors.secondary, textAlign: 'center',
    textTransform: 'uppercase', letterSpacing: 1.4,
  },
  hello: { ...typography.h2, textAlign: 'center', marginTop: 6 },
  list: { marginTop: spacing.xl, gap: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardPressed: { borderColor: colors.primary, opacity: 0.9 },
  cardName: { fontFamily: fonts.bold, fontSize: 18 },
  cardDetail: { ...typography.caption, color: colors.secondary, marginTop: 4 },
  signOut: { alignItems: 'center', marginTop: spacing.xl },
  signOutText: { ...typography.caption, color: colors.secondary },
});
