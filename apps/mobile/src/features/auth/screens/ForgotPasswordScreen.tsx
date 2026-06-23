import { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyRound, CheckCircle } from 'lucide-react-native';
import { colors, spacing, typography, radius } from '@aural/shared';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    if (!email.trim()) return;
    if (!isSupabaseConfigured) {
      Alert.alert('No configurado', 'Supabase aún no está configurado.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'https://admin.auralbusinessintelligence.com/reset-password',
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setSent(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.iconWrap}>
            {sent ? <CheckCircle size={32} color={colors.success} /> : <KeyRound size={32} color={colors.primary} />}
          </View>
          <Text style={styles.title}>Recuperar contraseña</Text>
          <Text style={styles.subtitle}>
            Te enviaremos un correo con un enlace para restablecer tu contraseña.
          </Text>

          {sent ? (
            <View style={styles.success}>
              <Text style={styles.successTitle}>Correo enviado</Text>
              <Text style={styles.successBody}>
                Revisa tu bandeja de entrada en{'\n'}<Text style={{ fontWeight: '700' }}>{email}</Text>.
              </Text>
              <Button label="Volver" variant="secondary" onPress={() => navigation.goBack()} style={{ marginTop: spacing.lg }} />
            </View>
          ) : (
            <View style={styles.form}>
              <Input
                label="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <Button label="Enviar enlace" onPress={onSubmit} loading={loading} />
              <Button
                label="Cancelar"
                variant="ghost"
                onPress={() => navigation.goBack()}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, flexGrow: 1 },
  iconWrap: {
    width: 72, height: 72, borderRadius: radius.pill,
    backgroundColor: colors.primaryTint, alignSelf: 'flex-start',
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg,
  },
  title: { ...typography.display, color: colors.primary, marginTop: spacing.md },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 22 },
  form: { marginTop: spacing.xl },
  success: { marginTop: spacing.xl, alignItems: 'center', paddingHorizontal: spacing.md },
  successTitle: { ...typography.h2, color: colors.success, textAlign: 'center' },
  successBody: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },
});
