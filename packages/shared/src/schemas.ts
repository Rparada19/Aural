import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Debe incluir una mayúscula')
  .regex(/[a-z]/, 'Debe incluir una minúscula')
  .regex(/[0-9]/, 'Debe incluir un número');

export const roleSlugSchema = z.enum([
  'otorrino',
  'audiologo',
  'crc',
  'otro_profesional',
  'funcionario_aural',
]);

export const otorrinoSpecialtySchema = z.enum([
  'otologo',
  'neuro_otologo',
  'laringologo',
  'rinologo',
]);

export const signupSchema = z
  .object({
    full_name: z.string().min(3, 'Nombre completo requerido'),
    cedula: z.string().min(5, 'Cédula inválida').regex(/^\d+$/, 'Solo números'),
    email: z.string().email('Correo inválido'),
    phone: z.string().min(7, 'Celular inválido'),
    city: z.string().min(2, 'Ciudad requerida'),
    profession: z.string().min(2, 'Profesión requerida'),
    address: z.string().min(5, 'Dirección requerida'),
    role: roleSlugSchema,
    specialty: otorrinoSpecialtySchema.optional(),
    visitor_id: z.string().uuid('Selecciona un visitador médico'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const patientGeneralSchema = z.object({
  full_name: z.string().min(3, 'Nombre completo requerido'),
  cedula: z.string().min(5, 'Cédula inválida').regex(/^\d+$/, 'Solo números'),
  phone: z.string().min(7, 'Teléfono inválido'),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  city_id: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
});

export type PatientGeneralInput = z.infer<typeof patientGeneralSchema>;

export const appointmentSchema = z.object({
  appointment_at: z.string().nullable().optional(),
  appointment_status: z.enum(['pending', 'confirmed', 'cancelled', 'attended']),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;

export const patientNoteSchema = z.object({
  body: z.string().min(3, 'Mínimo 3 caracteres'),
});

export type PatientNoteInput = z.infer<typeof patientNoteSchema>;

export const patientFollowupSchema = z.object({
  comment: z.string().min(3, 'Comentario requerido'),
  next_action: z.string().optional(),
  next_action_at: z.string().nullable().optional(),
});

export type PatientFollowupInput = z.infer<typeof patientFollowupSchema>;

export const patientCommercialSchema = z.object({
  technology_id: z.string().uuid().nullable().optional(),
  platform_id: z.string().uuid().nullable().optional(),
  rechargeable: z.boolean().nullable().optional(),
  binaural: z.boolean().nullable().optional(),
  location_id: z.string().uuid().nullable().optional(),
  unit_price: z.number().nonnegative().nullable().optional(),
  total_price: z.number().nonnegative().nullable().optional(),
  sale_closed: z.boolean(),
});

export type PatientCommercialInput = z.infer<typeof patientCommercialSchema>;

export const leadSchema = z.object({
  full_name: z.string().min(3, 'Nombre completo requerido'),
  phone: z.string().min(7, 'Teléfono inválido'),
  address: z.string().optional(),
  city_text: z.string().min(2, 'Ciudad requerida'),
  priority: z.enum(['alta', 'media']),
  notes: z.string().optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
