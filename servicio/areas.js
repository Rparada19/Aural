export const AREAS = {
  audiologia: {
    label: 'Audiología · Atención a pacientes',
    rol: 'Audiólogas y audiólogos de las sedes que atienden directamente al paciente: valoración audiológica, explicación de resultados, recomendación de la solución auditiva y acompañamiento de la decisión de compra, adaptación y verificación, controles y seguimiento de la adaptación, y registro clínico.',
    criterios: 'rigor clínico y seguridad del paciente (protocolo de valoración, criterios de remisión); claridad y empatía al comunicar resultados al paciente y su familia; capacidad de acompañar la decisión con propósito, recomendando según la necesidad real y sin presionar; dominio de adaptación, verificación y ajustes; disciplina de seguimiento y adherencia al uso; calidad del registro clínico y manejo de datos personales.',
  },
  recepcion: {
    label: 'Servicio al cliente · Recepción',
    rol: 'Recibe a los pacientes en la sede: primera impresión, agendamiento presencial, manejo de la sala de espera, caja y facturación, recepción y entrega de audífonos en reparación, y coordinación con la audióloga.',
    criterios: 'calidez y trato en la primera impresión; manejo de tiempos y expectativas en sala; orden en registros, agenda, caja y documentos; recepción correcta de equipos (trazabilidad); manejo de datos personales; criterio para escalar a la audióloga.',
  },
  call_center: {
    label: 'Servicio al cliente · Call center',
    rol: 'Atiende llamadas, WhatsApp y mensajes de redes: convierte interesados (leads de pauta) en citas, confirma y reagenda, hace recordatorios y seguimiento posventa, y canaliza PQRS por canales remotos.',
    criterios: 'velocidad y calidad de respuesta; capacidad de conversión de leads a cita sin presionar; claridad al comunicarse con personas con pérdida auditiva por teléfono; manejo de objeciones (precio, tiempo, desconfianza); disciplina de seguimiento y registro; verificación de identidad y datos personales.',
  },
  audiologico: {
    label: 'Servicio al cliente audiológico',
    rol: 'Brinda soporte audiológico a pacientes y aliados del canal mayorista (ópticas, IPS, audiólogos): orientación técnica, ajustes y seguimiento de la adaptación, educación en el uso de los audífonos, apoyo en el software de adaptación y resolución de casos clínicos de servicio.',
    criterios: 'criterio clínico y seguridad del paciente (identificar urgencias y derivar); dominio técnico de adaptación, verificación y ajustes; capacidad pedagógica con pacientes y aliados; seguimiento de la adaptación y adherencia al uso; calidad del soporte al canal mayorista; registro clínico.',
  },
  audiologico_operativo: {
    label: 'Servicio al cliente audiológico operativo',
    rol: 'Gestiona la operación detrás del servicio: reparaciones y garantías con laboratorio y fábrica, pedidos y despachos a sedes y aliados, inventario de audífonos, accesorios y pilas, trazabilidad y cumplimiento de tiempos.',
    criterios: 'trazabilidad y exactitud de registros; cumplimiento de tiempos y comunicación proactiva de novedades; criterio para garantías y escalamientos; control de inventario; capacidad de priorizar; manejo de indicadores y mejora de procesos.',
  },
  visitadores: {
    label: 'Comercial · Visitadores médicos',
    rol: 'Visitan a otorrinolaringólogos, otólogos, fonoaudiólogos, geriatras y médicos generales para posicionar a Aural y Widex, generar remisiones de pacientes y mantener una relación de confianza con los especialistas: planean su ruta, presentan evidencia y servicios, hacen seguimiento a los pacientes remitidos y registran su gestión.',
    criterios: 'conocimiento técnico suficiente para conversar con especialistas (tipos de pérdida, indicación de audífonos, proceso de adaptación); calidad de la propuesta de valor y manejo de objeciones médicas; ética en la relación con los profesionales de la salud; disciplina de planeación, frecuencia de visita y registro; cierre del ciclo con el especialista (retroalimentación sobre los pacientes remitidos); servicio al especialista como cliente.',
  },
  wholesale: {
    label: 'Comercial · Wholesale (especialistas de producto B2B)',
    rol: 'Especialistas de producto que atienden a los clientes B2B (ópticas, IPS, audiólogos independientes y distribuidores): gestionan la cuenta, capacitan en producto y software, acompañan pedidos, garantías y condiciones comerciales, impulsan la rotación (sell-out) y resuelven casos técnicos del cliente.',
    criterios: 'gestión de cuenta y conocimiento del negocio del cliente; dominio de portafolio y capacidad de capacitar; servicio posventa (pedidos, garantías, tiempos) y comunicación proactiva; negociación dentro de las políticas y escalamiento correcto; foco en el sell-out y en el éxito del cliente; registro y seguimiento de oportunidades.',
  },
  lideres: {
    label: 'Comercial · Líderes comerciales',
    rol: 'Lideran equipos comerciales y de sede: definen metas y siguen indicadores, acompañan y retroalimentan a su equipo con sesiones uno a uno, sostienen el modelo de servicio, resuelven casos escalados y quejas complejas, y son ejemplo del servicio que esperan.',
    criterios: 'liderazgo por ejemplo en el servicio; uso de indicadores de servicio y comerciales para decidir; capacidad de coaching y retroalimentación (uno a uno, reconocimiento, corrección oportuna); manejo de casos escalados; planeación y seguimiento de metas; cuidado del clima del equipo y desarrollo de las personas.',
  },
};

export const AREA_KEYS = Object.keys(AREAS);
export const areaLabel = (k) => AREAS[k]?.label || 'Sin área';
