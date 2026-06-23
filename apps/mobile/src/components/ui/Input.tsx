import { forwardRef } from 'react';
import { TextInput, Text, View, StyleSheet, TextInputProps } from 'react-native';
import { colors, radius, spacing, typography } from '@aural/shared';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export const Input = forwardRef<TextInput, Props>(({ label, error, style, ...rest }, ref) => {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.secondary}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});
Input.displayName = 'Input';

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  input: {
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 18,
  },
  inputError: { borderColor: colors.danger },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
