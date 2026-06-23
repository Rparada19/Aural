import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Pressable, Modal, FlatList, TextInput, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  colors, spacing, typography, radius, signupSchema, type SignupInput, ROLES, OTORRINO_SPECIALTIES,
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
  const [visitors, setVisitors] = useState<{ id: string; name: string; city: string | null }[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const refs = {
    cedula: useRef<TextInput>(null),
    email: useRef<TextInput>(null),
    phone: useRef<TextInput>(null),
    city: useRef<TextInput>(null),
    profession: useRef<TextInput>(null),
    address: useRef<TextInput>(null),
    password: useRef<TextInput>(null),
    confirmPassword: useRef<TextInput>(null),
  };
  const focusNext = (key: keyof typeof refs) => () => refs[key].current?.focus();

  useEffect(() => {
    supabase.from('visitors').select('id, name, city').eq('is_active', true).order('name')
      .then(({ data, error }) => {
        if (error) console.error('[Register] visitors load error:', error.message);
        console.log('[Register] visitors loaded:', (data ?? []).length);
        setVisitors((data ?? []) as any);
      });
  }, []);

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<SignupInput>({
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
          visitor_id: data.visitor_id,
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
            <FormInput control={control} name="full_name" label="Nombre completo" autoCapitalize="words" returnKeyType="next" onSubmitEditing={focusNext('cedula')} blurOnSubmit={false} error={errors.full_name?.message} />
            <FormInput inputRef={refs.cedula} control={control} name="cedula" label="Número de cédula" keyboardType="number-pad" returnKeyType="next" onSubmitEditing={focusNext('email')} blurOnSubmit={false} error={errors.cedula?.message} />
            <FormInput inputRef={refs.email} control={control} name="email" label="Correo electrónico" keyboardType="email-address" autoCapitalize="none" returnKeyType="next" onSubmitEditing={focusNext('phone')} blurOnSubmit={false} error={errors.email?.message} />
            <FormInput inputRef={refs.phone} control={control} name="phone" label="Celular" keyboardType="phone-pad" returnKeyType="next" onSubmitEditing={focusNext('city')} blurOnSubmit={false} error={errors.phone?.message} />
            <FormInput inputRef={refs.city} control={control} name="city" label="Ciudad" autoCapitalize="words" returnKeyType="next" onSubmitEditing={focusNext('profession')} blurOnSubmit={false} error={errors.city?.message} />
            <FormInput inputRef={refs.profession} control={control} name="profession" label="Profesión" returnKeyType="next" onSubmitEditing={focusNext('address')} blurOnSubmit={false} error={errors.profession?.message} />
            <FormInput inputRef={refs.address} control={control} name="address" label="Dirección profesional" returnKeyType="next" onSubmitEditing={() => setPickerOpen(true)} blurOnSubmit={true} error={errors.address?.message} />

            <View style={{ marginBottom: spacing.md }}>
              <Text style={styles.visitorLabel}>Visitador médico *</Text>
              {visitors.length === 0 ? (
                <Text style={[styles.visitorHelp, { color: colors.danger }]}>
                  No hay visitadores disponibles. Contacta a Aural para que te asignen uno.
                </Text>
              ) : (
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  style={styles.dropdown}
                >
                  <Text style={watch('visitor_id') ? styles.dropdownValue : styles.dropdownPlaceholder}>
                    {(() => {
                      const id = watch('visitor_id');
                      const v = visitors.find((x) => x.id === id);
                      return v ? `${v.name}${v.city ? ` · ${v.city}` : ''}` : 'Selecciona…';
                    })()}
                  </Text>
                  <Text style={styles.dropdownArrow}>⌄</Text>
                </Pressable>
              )}
              {errors.visitor_id?.message && (
                <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>
                  {errors.visitor_id.message}
                </Text>
              )}
            </View>

            <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
              <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
                <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
                  <View style={styles.modalHandle} />
                  <Text style={styles.modalTitle}>Selecciona visitador médico</Text>
                  <FlatList
                    data={visitors}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <Pressable
                        onPress={() => {
                          setValue('visitor_id', item.id, { shouldDirty: true, shouldValidate: true });
                          setPickerOpen(false);
                        }}
                        style={styles.modalItem}
                      >
                        <Text style={styles.modalItemText}>{item.name}</Text>
                        {item.city && <Text style={styles.modalItemMeta}>{item.city}</Text>}
                      </Pressable>
                    )}
                  />
                </Pressable>
              </Pressable>
            </Modal>
            <FormInput inputRef={refs.password} control={control} name="password" label="Contraseña" secureTextEntry returnKeyType="next" onSubmitEditing={focusNext('confirmPassword')} blurOnSubmit={false} error={errors.password?.message} />
            <FormInput inputRef={refs.confirmPassword} control={control} name="confirmPassword" label="Confirmar contraseña" secureTextEntry returnKeyType="done" onSubmitEditing={handleSubmit(onSubmit)} error={errors.confirmPassword?.message} />
          </View>
        </ScrollView>

        <View style={styles.stickyBar}>
          <Button label="Crear cuenta" onPress={handleSubmit(onSubmit)} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormInput({ control, name, label, error, inputRef, ...rest }: any) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <Input
          ref={inputRef}
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
  container: { padding: spacing.xl, paddingBottom: 120 },
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  overline: { ...typography.overline, color: colors.textMuted, marginTop: spacing.md },
  title: { ...typography.display, color: colors.primary, marginTop: spacing.xs },
  form: { marginTop: spacing.lg, marginBottom: spacing.lg },
  visitorLabel: {
    ...typography.caption, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600', marginBottom: spacing.xs,
  },
  visitorHelp: { ...typography.caption, color: colors.textMuted, marginTop: 2, marginBottom: spacing.xs },
  dropdown: {
    height: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dropdownValue: { color: colors.text, fontSize: 16 },
  dropdownPlaceholder: { color: colors.secondary, fontSize: 16 },
  dropdownArrow: { color: colors.secondary, fontSize: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2,
    alignSelf: 'center', marginBottom: spacing.md,
  },
  modalTitle: { ...typography.h2, color: colors.primary, marginBottom: spacing.md },
  modalItem: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItemText: { ...typography.bodyStrong, color: colors.primary },
  modalItemMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
