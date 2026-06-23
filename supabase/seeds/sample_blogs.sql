-- 4 blogs de muestra para el feed de noticias (Aural)
-- Ejecuta en Supabase SQL Editor con tu user admin.

insert into public.content (type, title, body, status, publish_at, created_by) values
(
  'news',
  'Cómo identificar una pérdida auditiva temprana en consulta médica general',
  E'Muchos pacientes llegan al especialista años después de los primeros síntomas. El médico de cabecera puede acelerar el diagnóstico con tres preguntas:\n\n1. ¿Le piden con frecuencia que repita lo que dice?\n2. ¿Sube el volumen del televisor más que antes?\n3. ¿Le cuesta seguir conversaciones en lugares con ruido?\n\nDos respuestas afirmativas justifican una audiometría. La detección temprana reduce el riesgo de aislamiento social, deterioro cognitivo y caídas en adultos mayores.\n\nDesde Aural, agendamos audiometría gratuita para los pacientes que el médico refiera por la app.',
  'published',
  now() - interval '2 days',
  (select id from auth.users where email = 'rparada@auralcolombia.com' limit 1)
),
(
  'news',
  'Hipoacusia súbita: por qué es una urgencia audiológica',
  E'La hipoacusia neurosensorial súbita (pérdida de ≥30 dB en 3 frecuencias contiguas en menos de 72 h) es una urgencia. La ventana terapéutica con corticoides es de aproximadamente 14 días.\n\nSíntomas frecuentes:\n- Pérdida unilateral al despertar.\n- Sensación de oído tapado que no cede.\n- Tinnitus agudo de aparición brusca.\n\nManejo recomendado:\n1. Audiometría tonal el mismo día.\n2. Corticoide sistémico (prednisolona 1 mg/kg/día) si no hay contraindicación.\n3. Remisión a otorrino dentro de 48 h.\n\nSi tienes un paciente con este cuadro, refierelo por la app y Aural coordina la audiometría el mismo día.',
  'published',
  now() - interval '5 days',
  (select id from auth.users where email = 'rparada@auralcolombia.com' limit 1)
),
(
  'news',
  'Audífonos recargables vs. con pilas: ¿qué recomendar?',
  E'Con la llegada de plataformas como Widex Allure y la línea Smart-RIC, la batería de litio se volvió mainstream. Pero la elección depende del paciente.\n\nRecargables (recomendados para):\n- Pacientes con destreza manual reducida (artritis, Parkinson temprano).\n- Adultos jóvenes y activos con rutina diaria estable.\n- Usuarios que valoran la conectividad Bluetooth permanente.\n\nPilas zinc-aire (recomendados para):\n- Viajeros frecuentes a zonas sin acceso a tomas de corriente.\n- Pacientes mayores con cuidador que prefiere la simplicidad del cambio.\n- Presupuestos ajustados (audífono base más económico).\n\nAural cubre ambas opciones en todas las plataformas (30 a 440).',
  'published',
  now() - interval '7 days',
  (select id from auth.users where email = 'rparada@auralcolombia.com' limit 1)
),
(
  'news',
  'Adaptación binaural: por qué dos audífonos no son un lujo',
  E'La indicación clínica de adaptación binaural está sustentada en evidencia desde hace más de dos décadas. Aun así, muchos pacientes adquieren un solo audífono "para probar".\n\nBeneficios de la binauralidad:\n- **Localización espacial**: el cerebro necesita ambos oídos para ubicar la fuente del sonido.\n- **Inteligibilidad en ruido**: efecto squelch + sumación binaural mejoran la SNR efectiva en 3-6 dB.\n- **Reducción del esfuerzo auditivo**: menor fatiga al final del día.\n- **Prevención de deprivación auditiva**: el oído no adaptado pierde discriminación con el tiempo.\n\nExcepciones razonables: hipoacusia profunda asimétrica con discriminación nula en el peor oído, o limitaciones presupuestales severas (en cuyo caso se adapta el mejor oído y se planifica el segundo).\n\nAural ofrece descuento por adaptación binaural en todas las plataformas.',
  'published',
  now() - interval '10 days',
  (select id from auth.users where email = 'rparada@auralcolombia.com' limit 1)
);
