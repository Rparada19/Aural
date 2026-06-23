import { useRef, useState } from 'react';
import {
  View, Text, Image, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
  TextInput, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { colors, spacing, typography, loginSchema, type LoginInput } from '@aural/shared';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const { control, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    if (!isSupabaseConfigured) {
      Alert.alert('Supabase no configurado', 'Aún no se han añadido las credenciales.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(data);
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
              <Image source={require('../../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.title}>Bienvenido</Text>

              <View style={styles.form}>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Correo electrónico"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                      blurOnSubmit={false}
                      error={errors.email?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      ref={passwordRef}
                      label="Contraseña"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry
                      autoComplete="password"
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit(onSubmit)}
                      error={errors.password?.message}
                    />
                  )}
                />
              </View>

              <Button
                label="¿Olvidaste tu contraseña?"
                variant="ghost"
                onPress={() => navigation.navigate('ForgotPassword')}
              />
              <Button
                label="¿No tienes cuenta? Regístrate"
                variant="ghost"
                onPress={() => navigation.navigate('RoleSelect')}
              />
            </ScrollView>

            <View style={styles.stickyBar}>
              <Button label="Entrar" onPress={handleSubmit(onSubmit)} loading={loading} />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, paddingBottom: 120, flexGrow: 1, alignItems: 'stretch' },
  logo: { width: 220, height: 110, alignSelf: 'center', marginTop: spacing.xl },
  title: { ...typography.display, color: colors.primary, marginTop: spacing.lg, textAlign: 'center' },
  form: { marginTop: spacing.xl, marginBottom: spacing.lg },
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
});
