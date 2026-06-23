import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Stethoscope } from 'lucide-react-native';
import { colors, spacing, typography, radius, shadow, OTORRINO_SPECIALTIES } from '@aural/shared';
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
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.6 }]}
            >
              <View style={styles.iconBox}>
                <Stethoscope size={22} color={colors.primary} />
              </View>
              <Text style={styles.cardLabel}>{sp.label}</Text>
              <ChevronRight size={18} color={colors.textSubtle} />
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
  overline: { ...typography.overline, color: colors.textSubtle, marginTop: spacing.md },
  title: { ...typography.display, color: colors.primary, marginTop: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  list: { marginTop: spacing.xl, gap: spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md,
    ...shadow.sm,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { ...typography.bodyStrong, color: colors.primary, flex: 1 },
});
