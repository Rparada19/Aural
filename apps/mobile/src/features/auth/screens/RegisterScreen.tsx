import { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  colors, spacing, typography, signupSchema, type SignupInput, ROLES, OTORRINO_SPECIALTIES,
} from '@aural/shared';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ route, navigation }: Props) {
  const { role, specialty } = route.params;
  const roleLabel = ROLES.find((r) => r.slug === role)?.label ?? '';
  const specialtyLabel = specialty
    ? OTORRINO_SPECIALTIES.find((s) => s.slug === specialty)?.label
    : undefined;
  const overline = specialtyLabel ? `${roleLabel} · ${specialtyLabel}` : roleLabel;
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role,
      specialty,
      full_name: '',
      cedula: '',
      email: '',
      phone: '',
      city: '',
      profession: specialtyLabel ? `${roleLabel} · ${specialtyLabel}` : roleLabel,
      address: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupInput) => {
    if (!isSupabaseConfigured) {
      Alert.alert(
        'Supabase no configurado',
        'Configura .env con EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY para registrarte.',
      );
      navigation.navigate('Pending', { email: data.email });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          cedula: data.cedula,
          phone: data.phone,
          city: data.city,
          profession: data.profession,
          address: data.address,
          role: data.role,
          specialty: data.specialty,
        },
      },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    navigation.navigate('Pending', { email: data.email });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.overline}>Registro · {overline}</Text>
          <Text style={styles.title}>Crea tu cuenta</Text>

          <View style={styles.form}>
            <FormInput control={control} name="full_name" label="Nombre completo" error={errors.full_name?.message} />
            <FormInput control={control} name="cedula" label="Número de cédula" keyboardType="number-pad" error={errors.cedula?.message} />
            <FormInput control={control} name="email" label="Correo electrónico" keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} />
            <FormInput control={control} name="phone" label="Celular" keyboardType="phone-pad" error={errors.phone?.message} />
            <FormInput control={control} name="city" label="Ciudad" error={errors.city?.message} />
            <FormInput control={control} name="profession" label="Profesión" error={errors.profession?.message} />
            <FormInput control={control} name="address" label="Dirección profesional" error={errors.address?.message} />
            <FormInput control={control} name="password" label="Contraseña" secureTextEntry error={errors.password?.message} />
            <FormInput control={control} name="confirmPassword" label="Confirmar contraseña" secureTextEntry error={errors.confirmPassword?.message} />
          </View>

          <Button label="Crear cuenta" onPress={handleSubmit(onSubmit)} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormInput({ control, name, label, error, ...rest }: any) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <Input
          label={label}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error}
          {...rest}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl },
  overline: { ...typography.overline, color: colors.textMuted, marginTop: spacing.md },
  title: { ...typography.display, color: colors.primary, marginTop: spacing.xs },
  form: { marginTop: spacing.lg, marginBottom: spacing.lg },
});
