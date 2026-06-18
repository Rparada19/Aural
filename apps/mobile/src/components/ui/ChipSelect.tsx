import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors, radius, spacing, typography } from '@aural/shared';

interface Option { id: string; label: string }

interface Props {
  label: string;
  options: Option[];
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  horizontal?: boolean;
}

export function ChipSelect({ label, options, value, onChange, horizontal }: Props) {
  const inner = (
    <View style={[styles.row, horizontal && { flexWrap: 'nowrap' }]}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(active ? null : o.id)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {horizontal ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: {
    ...typography.caption, color: colors.textMuted,
    marginBottom: spacing.xs, textTransform: 'uppercase',
    letterSpacing: 1, fontWeight: '600',
  },
  scroll: { paddingRight: spacing.lg },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 6, backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.primary, fontSize: 13 },
  chipTextActive: { color: colors.white, fontWeight: '600' },
});
