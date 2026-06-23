import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Stethoscope, Ear, ClipboardList, User, Briefcase } from 'lucide-react-native';
import { colors, spacing, typography, radius, shadow, ROLES, type RoleSlug } from '@aural/shared';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleSelect'>;

const ICONS: Record<RoleSlug, React.ComponentType<{ size?: number; color?: string }>> = {
  otorrino: Stethoscope,
  audiologo: Ear,
  crc: ClipboardList,
  otro_profesional: User,
  funcionario_aural: Briefcase,
};

export function RoleSelectScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.overline}>Registro</Text>
        <Text style={styles.title}>¿Cuál es tu perfil?</Text>
        <Text style={styles.subtitle}>
          Selecciona la opción que mejor te describe para personalizar tu experiencia.
        </Text>

        <View style={styles.list}>
          {ROLES.map((role) => {
            const Icon = ICONS[role.slug];
            return (
              <Pressable
                key={role.slug}
                onPress={() =>
                  role.slug === 'otorrino'
                    ? navigation.navigate('SubSpecialtySelect', { role: role.slug })
                    : navigation.navigate('Register', { role: role.slug })
                }
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.6 }]}
              >
                <View style={styles.iconBox}>
                  <Icon size={22} color={colors.primary} />
                </View>
                <Text style={styles.cardLabel}>{role.label}</Text>
                <ChevronRight size={18} color={colors.textSubtle} />
              </Pressable>
            );
          })}
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
