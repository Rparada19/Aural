import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, radius, ROLES } from '@aural/shared';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleSelect'>;

export function RoleSelectScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>¿Cuál es tu perfil?</Text>
        <Text style={styles.subtitle}>
          Selecciona la opción que mejor te describe para personalizar tu experiencia.
        </Text>

        <View style={styles.list}>
          {ROLES.map((role) => (
            <Pressable
              key={role.slug}
              onPress={() =>
                role.slug === 'otorrino'
                  ? navigation.navigate('SubSpecialtySelect', { role: role.slug })
                  : navigation.navigate('Register', { role: role.slug })
              }
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <Text style={styles.cardLabel}>{role.label}</Text>
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
  title: { ...typography.display, color: colors.primary, marginTop: spacing.lg },
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
