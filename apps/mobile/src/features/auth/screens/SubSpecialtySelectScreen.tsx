import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, OTORRINO_SPECIALTIES } from '@aural/shared';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SubSpecialtySelect'>;

export function SubSpecialtySelectScreen({ navigation, route }: Props) {
  const { role } = route.params;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.overline}>Otorrinolaringólogo</Text>
        <Text style={styles.title}>¿Cuál es tu sub-especialidad?</Text>
        <Text style={styles.subtitle}>
          Elige la sub-especialidad que mejor refleje tu práctica clínica.
        </Text>

        <View style={styles.list}>
          {OTORRINO_SPECIALTIES.map((sp) => (
            <Pressable
              key={sp.slug}
              onPress={() => navigation.navigate('Register', { role, specialty: sp.slug })}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <Text style={styles.cardLabel}>{sp.label}</Text>
              <Text style={styles.cardArrow}>→</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl },
  overline: { ...typography.overline, color: colors.textMuted, marginTop: spacing.md },
  title: { ...typography.display, color: colors.primary, marginTop: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 22 },
  list: { marginTop: spacing.xl, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPressed: { opacity: 0.6 },
  cardLabel: { ...typography.bodyStrong, color: colors.primary },
  cardArrow: { ...typography.h2, color: colors.primary },
});
