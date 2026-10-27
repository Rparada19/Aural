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
};

export const AREA_KEYS = Object.keys(AREAS);
export const areaLabel = (k) => AREAS[k]?.label || 'Sin área';
