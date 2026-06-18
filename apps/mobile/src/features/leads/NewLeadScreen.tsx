import { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { colors, spacing, typography, radius, leadSchema, type LeadInput } from '@aural/shared';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { createLead } from './api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'NewLead'>;

export function NewLeadScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: { full_name: '', phone: '', address: '', city_text: '', priority: 'media', notes: '' },
  });
  const priority = watch('priority');

  const onSubmit = async (data: LeadInput) => {
    setLoading(true);
    try {
      await createLead(data);
      Alert.alert(
        'Oportunidad enviada',
        'Aural recibió la oportunidad. Nos contactaremos con el paciente.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo enviar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.overline}>Nueva oportunidad</Text>
          <Text style={styles.title}>Refiere un paciente</Text>
          <Text style={styles.subtitle}>
            Aural se encargará de contactar al paciente y agendar la cita.
          </Text>

          <View style={styles.form}>
            <Controller control={control} name="full_name" render={({ field: { onChange, value, onBlur } }) => (
              <Input label="Nombre del paciente" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.full_name?.message} />
            )} />
            <Controller control={control} name="phone" render={({ field: { onChange, value, onBlur } }) => (
              <Input label="Teléfono" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" error={errors.phone?.message} />
            )} />
            <Controller control={control} name="address" render={({ field: { onChange, value, onBlur } }) => (
              <Input label="Dirección (opcional)" value={value ?? ''} onChangeText={onChange} onBlur={onBlur} error={errors.address?.message} />
            )} />
            <Controller control={control} name="city_text" render={({ field: { onChange, value, onBlur } }) => (
              <Input label="Ciudad" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.city_text?.message} />
            )} />

            <Text style={styles.fieldLabel}>Importancia</Text>
            <View style={styles.row}>
              {[{ v: 'media', l: 'Media', c: colors.warning }, { v: 'alta', l: 'Alta', c: colors.danger }].map((o) => {
                const active = priority === o.v;
                return (
                  <Pressable
                    key={o.v}
                    onPress={() => setValue('priority', o.v as 'media' | 'alta')}
                    style={[styles.priorityChip, active && { backgroundColor: o.c, borderColor: o.c }]}
                  >
                    <Text style={[styles.priorityText, active && { color: colors.white }]}>{o.l}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Controller control={control} name="notes" render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Notas (opcional)"
                value={value ?? ''} onChangeText={onChange} onBlur={onBlur}
                multiline numberOfLines={3} style={{ height: 80, paddingTop: spacing.sm }}
              />
            )} />
          </View>

          <Button label="Enviar oportunidad" onPress={handleSubmit(onSubmit)} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl },
  overline: { ...typography.overline, color: colors.textMuted },
  title: { ...typography.display, color: colors.primary, marginTop: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 22 },
  form: { marginTop: spacing.lg, marginBottom: spacing.lg },
  fieldLabel: {
    ...typography.caption, color: colors.textMuted,
    marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600',
  },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  priorityChip: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    alignItems: 'center',
  },
  priorityText: { color: colors.primary, fontWeight: '700' },
});
