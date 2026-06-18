import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '@aural/shared';

interface Props {
  label: string;
  value: boolean | null | undefined;
  onChange: (v: boolean | null) => void;
}

export function Toggle({ label, value, onChange }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.group}>
        {[
          { v: true, t: 'Sí' },
          { v: false, t: 'No' },
        ].map((o) => {
          const active = value === o.v;
          return (
            <Pressable
              key={o.t}
              onPress={() => onChange(active ? null : o.v)}
              style={[styles.btn, active && styles.btnActive]}
            >
              <Text style={[styles.btnText, active && styles.btnTextActive]}>{o.t}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  label: { ...typography.body, color: colors.primary },
  group: { flexDirection: 'row', gap: 6 },
  btn: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
    backgroundColor: colors.surface, minWidth: 50, alignItems: 'center',
  },
  btnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  btnTextActive: { color: colors.white },
});
