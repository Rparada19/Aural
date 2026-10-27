// Banco inicial por área. Se carga una sola vez; luego se edita desde /admin/preguntas.
// type: single | multi | scale | open. correct: índice (single) o lista (multi); null si es de criterio.

const SCALE = ['Muy bajo', 'Bajo', 'Aceptable', 'Bueno', 'Excelente'];
const O = (text) => ({ type: 'open', text });
const E = (text) => ({ type: 'scale', text: `Autoevalúate: ${text}`, options: SCALE });
const S = (text, options, correct = null) => ({ type: 'single', text, options, correct });
const M = (text, options, correct = null) => ({ type: 'multi', text, options, correct });

const CRECIMIENTO = ['Organización, equipo y crecimiento', [
  S('Notas que un compañero da información distinta a la tuya sobre un mismo proceso. ¿Qué haces?',
    ['Nada, cada quien trabaja a su manera', 'Lo hablo con él en privado, verificamos el procedimiento correcto y, si no está claro, lo consultamos con el líder', 'Le aviso al jefe sin hablar con él', 'Lo corrijo delante del paciente o cliente'], 1),
  E('mi disposición para recibir retroalimentación y aplicarla.'),
  O('¿Cuáles son hoy tus dos principales fortalezas y tus dos principales aspectos por mejorar en tu trabajo? Sé concreto.'),
  O('¿Qué necesitas de la empresa o de tu líder (formación, herramientas, información, acompañamiento) para hacer mejor tu trabajo?'),
]];

const PERDIDA_SUBITA = S('Un paciente cuenta que desde ayer oye mucho peor por un oído, de forma repentina. ¿Qué haces?',
  ['Le digo que limpie el audífono y espere unos días', 'Lo agendo en la próxima cita disponible, aunque sea en un mes', 'Lo comunico de inmediato con la audióloga y se le recomienda valoración médica pronta, porque una pérdida súbita puede ser urgente', 'Le cambio el domo y lo despido'], 2);

const HABEAS = S('El hijo de un paciente adulto pide los resultados de la audiometría de su papá. ¿Qué haces?',
  ['Se los envío porque es familiar', 'Verifico que exista autorización del paciente (titular de los datos) antes de compartir información', 'Se los leo pero no los envío', 'Le pido que los busque en internet'], 1);

export const SEED = {
  audiologia: [
    ['Valoración y criterio clínico', [
      O('Describe tu protocolo de valoración en la primera consulta de un paciente adulto: qué haces, en qué orden y qué registras.'),
      S('En la otoscopia previa a la audiometría encuentras un tapón de cerumen oclusivo. ¿Qué haces?',
        ['Realizo la audiometría igual y lo anoto', 'No realizo la audiometría hasta resolver el tapón: se gestiona la extracción según el protocolo y se reprograma la prueba', 'Le recomiendo audífonos de una vez', 'Le pido que se limpie con copitos y vuelva'], 1),
      S('En la valoración encuentras una asimetría importante entre oídos sin causa conocida. ¿Qué haces?',
        ['La adapto igual, es frecuente', 'Le explico al paciente el hallazgo y lo remito a otorrinolaringología para descartar otras causas, dejando claro el plan de adaptación', 'Le adapto solo el oído mejor', 'Repito la prueba hasta que salga simétrica'], 1),
      M('¿Cuáles de estos hallazgos ameritan remitir a valoración médica? (Todas las que apliquen)',
        ['Otorrea o dolor de oído activo', 'Pérdida auditiva súbita o que progresa rápido', 'Vértigo agudo', 'Asimetría importante no explicada', 'Paciente estable que viene a su control anual'], [0, 1, 2, 3]),
      E('mi rigor clínico y el cumplimiento del protocolo de valoración.'),
    ]],
    ['Comunicación de resultados y decisión del paciente', [
      O('Explica, tal como lo dirías, el resultado de una pérdida auditiva moderada bilateral a un paciente de 70 años que viene con su hija.'),
      S('El paciente dice: "No estoy tan mal, todavía no los necesito". ¿Qué haces?',
        ['Le insisto hasta que acepte', 'Exploro cómo le afecta en su vida diaria, involucro a su familiar si él lo permite, explico qué pasa si no se trata y acordamos un seguimiento, respetando su decisión', 'Le doy la razón y lo despido', 'Le ofrezco un descuento para convencerlo'], 1),
      O('¿Cómo presentas las opciones de solución y su valor (incluido el precio y la financiación) para ayudar al paciente a decidir sin presionarlo?'),
      S('Un paciente pide el audífono más económico, aunque por su pérdida y estilo de vida otra opción le serviría mucho mejor. ¿Qué haces?',
        ['Le vendo el más económico sin comentar nada', 'Le explico con ejemplos de su vida diaria la diferencia entre opciones, le recomiendo lo que necesita, respeto su decisión y la dejo documentada', 'Le digo que el económico no le va a servir', 'Le ofrezco solo la gama más alta'], 1),
      O('¿Cuáles son las tres objeciones más frecuentes de tus pacientes y cómo respondes a cada una?'),
      E('mi capacidad para acompañar al paciente en su decisión con empatía y propósito.'),
    ]],
    ['Adaptación y verificación', [
      S('Un paciente con domo cerrado dice que escucha su propia voz "como dentro de un barril". ¿Qué es lo más probable y qué haces?',
        ['Es un daño del audífono; lo envío a reparación', 'Es efecto de oclusión; reviso la ventilación o el tipo de domo y, si aplica, ajusto la ganancia en graves', 'Es normal y desaparece sin hacer nada', 'Subo la ganancia general'], 1),
      S('¿Cuál es el propósito principal de la medición en oído real (REM)?',
        ['Medir la pérdida auditiva del paciente', 'Verificar que la ganancia entregada en el oído del paciente se acerque al objetivo prescriptivo', 'Revisar el nivel de la batería', 'Comprobar la conexión Bluetooth'], 1),
      O('Un paciente refiere que en restaurantes no entiende las conversaciones. ¿Qué revisas, qué ajustes o programas consideras y qué expectativas le das?'),
      S('Un paciente usa el audífono 2 horas al día y dice que "no le sirve". ¿Qué haces primero?',
        ['Le cambio el equipo por uno de mayor gama', 'Reviso el registro de uso, indago la razón y acordamos un plan de uso progresivo con ajustes de aclimatación', 'Le subo el volumen', 'Le explico que el problema es su falta de constancia'], 1),
      E('mi dominio del software de adaptación y de los ajustes finos.'),
    ]],
    ['Seguimiento y experiencia del paciente', [
      O('¿Cómo estructuras el seguimiento de un paciente en sus primeros 30 días de adaptación? Indica momentos, objetivos y qué registras.'),
      O('Explica, como se lo dirías a un paciente nuevo, los cuidados diarios de su audífono y qué esperar en las primeras semanas.'),
      S('Un paciente adaptado hace dos meses no ha vuelto a su control. ¿Qué haces?',
        ['Espero a que regrese cuando lo necesite', 'Lo contacto (o coordino con el call center), indago cómo le va y reagendamos el control', 'Lo doy por perdido', 'Le escribo solo si tiene saldo pendiente'], 1),
      HABEAS,
    ]],
    CRECIMIENTO,
  ],
  recepcion: [
    ['Primera impresión y atención en sede', [
      O('Describe paso a paso cómo recibes a un paciente que llega por primera vez a la sede, desde que cruza la puerta hasta que queda atendido o agendado.'),
      S('Un paciente adulto mayor llega sin cita, angustiado porque "no oye nada" con su audífono. La agenda de la audióloga está llena. ¿Qué haces primero?',
        ['Le explico que sin cita no se puede atender y le doy el próximo turno', 'Lo recibo, reviso lo básico (carga o pila, cera, domo o tubo) y, si no se resuelve, coordino con la audióloga un espacio prioritario', 'Le pido que deje el audífono para revisión técnica', 'Le sugiero que llame al call center'], 1),
      M('¿Qué prácticas mejoran la comunicación en recepción con un paciente con pérdida auditiva? (Todas las que apliquen)',
        ['Hablar de frente, con buena luz sobre la cara', 'Subir mucho la voz y exagerar la vocalización', 'Reducir el ruido de fondo antes de hablar', 'Confirmar lo acordado pidiéndole que lo repita', 'Hablar rápido para no hacerle perder tiempo', 'Entregar por escrito fecha, hora e indicaciones'], [0, 2, 3, 5]),
      E('mi capacidad para hacer sentir bienvenido y bien atendido a cada paciente desde el primer momento.'),
      O('Cuéntanos una situación real en la que diste una atención excepcional en recepción. ¿Qué hiciste distinto?'),
    ]],
    ['Sala de espera y situaciones difíciles', [
      S('La audióloga va 40 minutos atrasada y hay tres pacientes esperando. ¿Qué haces?',
        ['Espero a que alguien pregunte', 'Informo a cada paciente el tiempo estimado, ofrezco alternativas (esperar, reagendar) y mantengo contacto mientras esperan', 'Les digo que la audióloga ya viene', 'Le pido a la audióloga que acorte las citas'], 1),
      O('Un paciente levanta la voz en la sala porque su audífono lleva tres semanas en reparación sin respuesta. Escribe, tal como lo dirías, cómo manejas la situación.'),
      O('Un familiar exige la devolución del dinero de unos audífonos comprados hace cuatro meses porque "no le sirven". ¿Cómo manejas la conversación y a quién involucras?'),
      E('mi manejo de pacientes molestos sin perder la calma ni el respeto.'),
    ]],
    ['Recepción y entrega de equipos', [
      M('Al recibir un audífono para reparación, ¿qué debes dejar registrado? (Todas las que apliquen)',
        ['Número de serie y modelo', 'Descripción de la falla según el paciente', 'Estado físico y accesorios entregados', 'Datos de contacto y fecha de recepción', 'Tu opinión sobre si vale la pena repararlo'], [0, 1, 2, 3]),
      S('Un paciente reporta que su audífono recargable no carga. ¿Cuál es el primer paso?',
        ['Enviarlo de inmediato a laboratorio', 'Verificar que esté bien ubicado en el cargador, que el cargador tenga corriente y que los contactos estén limpios', 'Recomendarle un audífono nuevo', 'Agendarle cita con otorrinolaringología'], 1),
      O('Al entregar un audífono reparado, ¿qué verificas y qué le explicas al paciente antes de que se vaya?'),
      PERDIDA_SUBITA,
    ]],
    ['Agenda, caja y documentos', [
      HABEAS,
      O('Describe cómo registras y das trámite a una queja o PQRS que llega por recepción: qué información tomas, qué le informas al paciente y cómo haces seguimiento.'),
      E('orden y precisión en agenda, caja, facturas y documentos.'),
      M('¿Cuáles de estos errores has visto que afectan más la experiencia del paciente en sede? (Hasta tres)',
        ['Citas mal agendadas o duplicadas', 'Datos de contacto incompletos', 'Garantías sin registrar o sin soporte', 'Demoras en facturación o cotizaciones', 'Falta de seguimiento a reparaciones', 'Información distinta según quién atienda']),
      O('Si pudieras cambiar un solo proceso de la recepción para atender mejor, ¿cuál sería y cómo lo harías?'),
    ]],
    CRECIMIENTO,
  ],

  call_center: [
    ['Atención telefónica y digital', [
      O('Escribe, tal como lo dirías, cómo contestas una llamada entrante de alguien que llama por primera vez: saludo, preguntas que haces y cómo cierras.'),
      M('¿Qué prácticas ayudan cuando hablas por teléfono con una persona con pérdida auditiva? (Todas las que apliquen)',
        ['Hablar más despacio y con frases cortas', 'Gritar para que escuche', 'Confirmar datos clave pidiéndole que los repita', 'Enviar por WhatsApp la confirmación por escrito', 'Ofrecer hablar con un familiar si el paciente lo autoriza', 'Colgar y volver a llamar más tarde sin avisar'], [0, 2, 3, 4]),
      S('Llega un mensaje de WhatsApp a las 7:40 p. m., fuera del horario. ¿Qué es lo más adecuado?',
        ['Dejarlo sin responder hasta que vuelva a escribir', 'Que exista una respuesta automática con el horario y responderlo como prioridad al inicio de la jornada siguiente', 'Responderlo cuando haya tiempo durante la semana', 'Pedirle que llame en horario'], 1),
      E('la calidad y rapidez de mis respuestas por teléfono y WhatsApp.'),
    ]],
    ['Conversión de interesados a cita', [
      O('Una persona escribe por un anuncio en redes: "¿Cuánto valen los audífonos?". Escribe tu respuesta completa, tal como la enviarías.'),
      S('El interesado responde "está muy caro, lo voy a pensar". ¿Qué haces?',
        ['Le ofrezco un descuento de inmediato', 'Respeto su decisión, indago qué le preocupa (precio, necesidad, confianza), le explico opciones como la valoración y la financiación, y acordamos una fecha de seguimiento', 'Le digo que en otro lado será más caro', 'Lo dejo así y no vuelvo a escribir'], 1),
      O('¿Cuáles son las tres objeciones más frecuentes que escuchas de los interesados y cómo respondes a cada una?'),
      S('¿Cuál es la mejor forma de reducir las inasistencias a citas?',
        ['Agendar más citas de las disponibles', 'Confirmar el día anterior, enviar recordatorio con dirección e indicaciones y reagendar de inmediato si no puede asistir', 'Cobrar una multa por inasistencia', 'Llamar solo a quienes ya han faltado antes'], 1),
      E('mi capacidad para convertir un interesado en una cita sin presionarlo.'),
    ]],
    ['Seguimiento y posventa', [
      O('Describe cómo haces el seguimiento a un paciente que acaba de recibir sus audífonos: cuándo lo contactas, qué le preguntas y qué haces con lo que responde.'),
      O('Un paciente llama molesto porque su audífono lleva tres semanas en reparación y nadie le da razón. Escribe tu respuesta en esa llamada.'),
      S('Prometiste devolver una llamada hoy con información que aún no tienes. ¿Qué haces?',
        ['No llamo hasta tener la información completa', 'Llamo en el plazo prometido, explico en qué va el caso y doy una nueva fecha concreta', 'Le pido a un compañero que llame', 'Envío un mensaje genérico de "estamos trabajando en ello"'], 1),
      PERDIDA_SUBITA,
    ]],
    ['Registro, datos y procesos', [
      S('Alguien llama diciendo ser el paciente y pide cambiar el número de contacto y conocer su próxima cita. ¿Qué haces?',
        ['Hago el cambio de inmediato', 'Verifico su identidad con datos registrados antes de dar información o modificar datos', 'Le pido que vaya a la sede', 'Le doy la cita pero no cambio el número'], 1),
      M('¿Qué debe quedar registrado de cada contacto con un interesado? (Todas las que apliquen)',
        ['Nombre y medio de contacto', 'Canal de origen (anuncio, referido, web)', 'Necesidad o motivo de consulta', 'Resultado del contacto y próxima acción con fecha', 'Tu impresión de si "va a comprar o no" como único dato'], [0, 1, 2, 3]),
      E('mi disciplina para registrar cada contacto y cumplir los seguimientos.'),
      O('¿Qué indicadores crees que deberían medir tu trabajo y cómo te ha ido en ellos el último mes?'),
    ]],
    CRECIMIENTO,
  ],

  audiologico: [
    ['Criterio clínico y seguridad del paciente', [
      PERDIDA_SUBITA,
      M('¿Cuáles de estos hallazgos ameritan remitir a valoración médica (otorrinolaringología)? (Todas las que apliquen)',
        ['Otorrea o dolor de oído activo', 'Pérdida auditiva súbita o que progresa rápido', 'Vértigo agudo', 'Asimetría importante no explicada entre oídos', 'Paciente satisfecho que solo pide limpieza del audífono'], [0, 1, 2, 3]),
      O('Describe cómo realizas una otoscopia antes de una adaptación o un ajuste, y qué hallazgos te harían detener el proceso.'),
      E('mi criterio clínico para identificar cuándo un caso supera el servicio y debe remitirse.'),
    ]],
    ['Adaptación, verificación y ajustes', [
      S('Un paciente con domo cerrado dice que escucha su propia voz "como dentro de un barril". ¿Qué es lo más probable y qué haces?',
        ['Es un daño del audífono; lo envío a reparación', 'Es efecto de oclusión; reviso la ventilación o el tipo de domo y, si aplica, ajusto la ganancia en graves', 'Es normal y desaparece en una semana sin hacer nada', 'Subo la ganancia general'], 1),
      S('¿Cuál es el propósito principal de la medición en oído real (REM)?',
        ['Medir la pérdida auditiva del paciente', 'Verificar que la ganancia entregada en el oído del paciente se acerque al objetivo prescriptivo', 'Revisar el nivel de la batería', 'Comprobar la conexión Bluetooth'], 1),
      S('Un paciente que usa el audífono 2 horas al día dice que "no le sirve". ¿Qué haces primero?',
        ['Le cambio el equipo por uno de mayor gama', 'Reviso el registro de uso (data logging), indago la razón y acordamos un plan de uso progresivo con ajustes de aclimatación', 'Le subo el volumen', 'Le explico que el problema es su falta de constancia'], 1),
      O('Un paciente refiere que en restaurantes no entiende las conversaciones. Explica qué revisarías, qué ajustes o programas considerarías y qué expectativas le darías.'),
      E('mi dominio del software de adaptación y de los ajustes finos.'),
    ]],
    ['Educación y seguimiento del paciente', [
      O('Explica, como se lo dirías a un paciente nuevo, los cuidados diarios básicos de su audífono y qué esperar en las primeras semanas de uso.'),
      O('¿Cómo estructuras el seguimiento de un paciente durante sus primeros 30 días de adaptación? Indica momentos, objetivos y qué registras.'),
      S('Un paciente reporta que su audífono "pita" constantemente. ¿Qué revisas primero?',
        ['Que esté bien insertado y que el domo o molde no tenga cera ni esté deteriorado', 'El nivel de batería', 'La configuración del celular', 'Nada: siempre es un daño de fábrica'], 0),
      E('mi capacidad para explicar temas técnicos de forma sencilla.'),
    ]],
    ['Soporte al canal mayorista', [
      O('Una audióloga de una óptica aliada te escribe porque no logra resolver la retroalimentación en una adaptación. ¿Cómo la acompañas y qué información le pides?'),
      S('Un aliado pide una condición comercial (descuento o plazo) que no puedes autorizar. ¿Qué haces?',
        ['La concedo para no perder la relación', 'Le digo que no es posible y cierro el tema', 'Tomo la solicitud, la escalo al área comercial y le doy una fecha de respuesta', 'Le sugiero que compre a otro proveedor'], 2),
      O('¿Qué formación o material crees que necesitan nuestros aliados para adaptar mejor y depender menos del soporte?'),
      HABEAS,
    ]],
    CRECIMIENTO,
  ],

  audiologico_operativo: [
    ['Reparaciones y garantías', [
      M('Antes de tramitar una garantía, ¿qué verificas? (Todas las que apliquen)',
        ['Número de serie y fecha de compra o factura', 'Que la falla esté descrita y, si aplica, comprobada', 'Señales de golpe, humedad o manipulación (con registro fotográfico)', 'Que el paciente o aliado firme la recepción', 'Solo lo que diga el paciente'], [0, 1, 2, 3]),
      O('Describe el recorrido completo de un audífono en reparación, desde que se recibe en sede hasta que vuelve al paciente: pasos, responsables, registros y tiempos.'),
      S('Una reparación va a superar el tiempo comprometido por una demora del laboratorio. ¿Qué haces?',
        ['Espero a que llegue y luego explico', 'Informo de forma proactiva a la sede o al paciente, doy una nueva fecha y evalúo alternativas (equipo de préstamo)', 'Le pido a la sede que no diga nada', 'Cancelo la reparación'], 1),
      O('Cuéntanos un caso en que una garantía fue rechazada o generó conflicto. ¿Qué pasó y qué aprendiste?'),
      E('mi rigor en trazabilidad y registro de reparaciones y garantías.'),
    ]],
    ['Pedidos, despachos y aliados', [
      O('Un aliado reporta que su pedido llegó incompleto y tiene un paciente esperando. ¿Qué haces y cómo le comunicas la solución?'),
      S('Tienes al mismo tiempo: un despacho urgente a un aliado, un reclamo de garantía y un reporte de inventario solicitado por tu jefe. ¿Cómo priorizas?',
        ['Por orden de llegada', 'Por impacto en el paciente y en el cliente: primero lo que deja a alguien sin oír o sin atender, informando a cada parte el tiempo de respuesta', 'Primero lo que pidió el jefe', 'Lo más fácil primero'], 1),
      M('¿Qué debe verificarse antes de despachar un pedido? (Todas las que apliquen)',
        ['Referencias y cantidades contra la orden', 'Seriales registrados', 'Estado del empaque y accesorios', 'Documentos (remisión o factura) y datos de envío', 'Que el transportador sea el más barato sin importar el tiempo'], [0, 1, 2, 3]),
      E('mi conocimiento de los procesos de pedidos y despachos.'),
    ]],
    ['Inventario y control', [
      S('¿Cuál es la práctica correcta con las pilas zinc-aire en inventario?',
        ['Retirar el adhesivo para verificar que funcionen', 'Mantener el adhesivo hasta su uso, rotar por fecha de vencimiento y almacenar en lugar fresco y seco', 'Guardarlas en nevera', 'Venderlas sin importar la fecha'], 1),
      O('Encuentras una diferencia entre el inventario físico y el del sistema en dos audífonos. ¿Qué haces paso a paso?'),
      O('¿Qué indicadores usas o deberías usar para medir la operación (tiempos de reparación, garantías, despachos, inventario)? ¿Cómo están hoy?'),
      E('mi control del inventario y la exactitud de los registros.'),
    ]],
    ['Comunicación con sedes y pacientes', [
      O('Un paciente llama molesto porque su audífono lleva tres semanas en reparación sin respuesta. Escribe, tal como lo dirías, tu respuesta.'),
      S('Prometiste a una sede una respuesta hoy sobre una reparación y aún no la tienes. ¿Qué haces?',
        ['No respondo hasta tener la información', 'Respondo en el plazo, explico en qué va y doy una nueva fecha concreta', 'Le pido a otra persona que responda', 'Envío un mensaje genérico'], 1),
      O('Si pudieras cambiar un solo proceso operativo para que el paciente reciba su equipo más rápido, ¿cuál sería y cómo lo harías?'),
    ]],
    CRECIMIENTO,
  ],
};
