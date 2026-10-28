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

const PROMESA = S('Te comprometiste con un cliente o especialista a enviar una información hoy y aún no la tienes. ¿Qué haces?',
  ['No respondo hasta tenerla completa', 'Respondo en el plazo, explico en qué va y doy una nueva fecha concreta', 'Le pido a otra persona que responda', 'Envío un mensaje genérico'], 1);

export const SEED = {
  visitadores: [
    ['Conocimiento para conversar con especialistas', [
      S('Un otorrino te pregunta en qué tipo de pérdida auditiva tienen mejor resultado los audífonos. ¿Qué respondes?',
        ['Solo en pérdidas conductivas', 'Principalmente en pérdidas neurosensoriales leves a severas, y que la indicación final la define la valoración audiológica', 'En cualquier pérdida, incluida la cofosis', 'Solo en pérdidas profundas'], 1),
      O('Explica, como se lo dirías a un médico general, por qué es importante tratar a tiempo la pérdida auditiva en adultos mayores.'),
      O('¿Cómo le explicas a un especialista el proceso que vive su paciente remitido en Aural, desde la valoración hasta el seguimiento?'),
      E('mi conocimiento técnico para conversar con especialistas con seguridad.'),
    ]],
    ['Propuesta de valor y objeciones', [
      O('Tienes 3 minutos con un otorrino que no te conoce. Escribe lo que le dirías para que considere remitir pacientes a Aural.'),
      S('El especialista dice: "Mis pacientes no pueden pagar audífonos". ¿Qué haces?',
        ['Le doy la razón y me despido', 'Indago qué tipo de pacientes atiende, le cuento opciones de portafolio y financiación, y le propongo un piloto con pocos pacientes para que vea el proceso', 'Le ofrezco un incentivo por cada paciente', 'Le dejo un folleto y no vuelvo'], 1),
      O('¿Cuáles son las tres objeciones más frecuentes de los especialistas que visitas y cómo respondes a cada una?'),
      S('Un especialista te sugiere un beneficio personal a cambio de remitir pacientes. ¿Qué haces?',
        ['Lo acepto si es pequeño', 'Declino con respeto, explico que trabajamos con transparencia y escalo a mi líder si es necesario', 'Le digo que lo consulto y lo dejo pasar', 'Se lo ofrezco a otros especialistas'], 1),
      E('mi capacidad para presentar la propuesta de valor y manejar objeciones médicas.'),
    ]],
    ['Planeación, registro y seguimiento', [
      O('Describe cómo planeas tu semana de visitas: cómo priorizas a quién visitar, con qué frecuencia y qué preparas antes de cada visita.'),
      M('¿Qué debe quedar registrado después de cada visita? (Todas las que apliquen)',
        ['Especialista, institución y fecha', 'Temas tratados y material entregado', 'Compromisos y próxima acción con fecha', 'Pacientes remitidos o potenciales', 'Solo si la visita "salió bien"'], [0, 1, 2, 3]),
      O('Un especialista remitió a tres pacientes el mes pasado. ¿Cómo cierras el ciclo con él sobre lo que pasó con esos pacientes, cuidando los datos personales?'),
      PROMESA,
      E('mi disciplina de planeación, registro y seguimiento.'),
    ]],
    ['Servicio al especialista', [
      O('¿Qué haces para que un especialista sienta que Aural le presta un servicio a él (no solo que le pide pacientes)?'),
      S('Un especialista se queja porque un paciente remitido esperó mucho para su cita. ¿Qué haces?',
        ['Le digo que eso es de otra área', 'Escucho, me disculpo, reviso el caso con la sede, le informo qué pasó y qué cambiamos, y le doy un canal directo para sus próximos pacientes', 'Le prometo que no volverá a pasar sin revisar nada', 'No hago nada para no empeorar la situación'], 1),
    ]],
    CRECIMIENTO,
  ],

  wholesale: [
    ['Gestión de cuenta B2B', [
      O('Elige uno de tus clientes B2B y describe su negocio: qué vende, a quién, cómo le va con nuestro portafolio y cuál es su principal necesidad hoy.'),
      S('Un cliente compra mucho pero su rotación (sell-out) es baja y acumula inventario. ¿Qué haces?',
        ['Le ofrezco más descuento para que compre más', 'Analizo con él su rotación, identifico qué referencias no salen y armamos un plan (capacitación, exhibición, actividades con pacientes) antes del próximo pedido', 'Espero a que se le acabe', 'Le recojo el inventario sin analizar'], 1),
      O('¿Cómo preparas una visita de seguimiento a un cliente B2B importante? ¿Qué llevas y qué buscas lograr?'),
      E('mi conocimiento del negocio de mis clientes B2B.'),
    ]],
    ['Producto y capacitación', [
      O('Explica cómo capacitarías al equipo de una óptica aliada en la primera adaptación con nuestro software, en una sesión de 45 minutos.'),
      O('Una audióloga de un cliente no logra resolver la retroalimentación en una adaptación. ¿Cómo la acompañas y qué información le pides?'),
      S('El cliente pide comparar nuestro audífono con el de la competencia. ¿Qué haces?',
        ['Hablo mal de la competencia', 'Me enfoco en las necesidades de sus pacientes y en los beneficios demostrables de nuestro producto y servicio, con datos y sin descalificar a nadie', 'Le digo que todos son iguales', 'Evito el tema'], 1),
      E('mi dominio del portafolio y mi capacidad para capacitar.'),
    ]],
    ['Posventa: pedidos, garantías y tiempos', [
      O('El pedido de un cliente llegó incompleto y él tiene un paciente esperando. ¿Qué haces y cómo le comunicas la solución?'),
      S('Un cliente pide una condición comercial (descuento o plazo) que no puedes autorizar. ¿Qué haces?',
        ['La concedo para no perder la relación', 'Le digo que no y cierro el tema', 'Tomo la solicitud, la escalo con argumentos y le doy una fecha de respuesta', 'Le sugiero que compre a otro proveedor'], 2),
      M('Antes de tramitar una garantía de un cliente B2B, ¿qué verificas? (Todas las que apliquen)',
        ['Serial y fecha de compra', 'Descripción y comprobación de la falla', 'Señales de golpe, humedad o manipulación', 'Datos del cliente y del paciente según autorización', 'Solo lo que diga el cliente'], [0, 1, 2, 3]),
      PROMESA,
    ]],
    ['Éxito del cliente', [
      O('¿Qué indicadores usas para saber si un cliente B2B está bien atendido y creciendo? ¿Cómo están tus cuentas hoy?'),
      O('Cuéntanos un caso en que ayudaste a un cliente a crecer. ¿Qué hiciste?'),
      O('¿Cómo haces seguimiento a un cliente B2B que dejó de comprar en los últimos dos meses?'),
      E('mi foco en el éxito y la satisfacción de mis clientes.'),
    ]],
    CRECIMIENTO,
  ],

  lideres: [
    ['Liderazgo y modelo de servicio', [
      O('¿Cómo describirías el servicio de excelencia que esperas de tu equipo? Dalo en tres comportamientos concretos que se puedan observar.'),
      O('¿Qué haces tú, personalmente, cada semana para ser ejemplo de ese servicio frente a tu equipo?'),
      O('¿Cómo te aseguras de que todas las personas a tu cargo den la misma información sobre precios, garantías y procesos?'),
      E('mi coherencia entre lo que pido y lo que hago en servicio.'),
    ]],
    ['Indicadores y seguimiento', [
      M('¿Qué indicadores revisas al menos cada semana? (Todas las que uses)',
        ['Citas agendadas y asistencia', 'Conversión de valoración a adaptación', 'Devoluciones y garantías', 'Quejas y PQRS', 'Satisfacción o recomendación de pacientes', 'Cumplimiento de metas de venta']),
      O('Uno de tus indicadores de servicio empeoró dos semanas seguidas. Describe paso a paso qué haces.'),
      S('Una persona de tu equipo cumple la meta de ventas pero recibe quejas frecuentes por trato. ¿Qué haces?',
        ['Nada, lo importante es la meta', 'Lo hablo en un uno a uno con ejemplos concretos, acordamos acciones y hago seguimiento, porque el servicio también es parte del resultado', 'Le llamo la atención frente al equipo', 'Lo cambio de sede'], 1),
      S('Faltando 10 días para el cierre del mes, el equipo va en 60% de la meta. ¿Qué haces?',
        ['Presiono el cierre de ventas sin importar la experiencia del paciente', 'Reviso el embudo con el equipo, priorizamos las oportunidades reales, acompaño los casos clave y cuido que no se sacrifique el servicio', 'Ofrezco descuentos a todos los pacientes', 'Espero el siguiente mes'], 1),
      E('mi uso de indicadores para tomar decisiones.'),
    ]],
    ['Coaching y desarrollo del equipo', [
      O('¿Cómo estructuras una sesión uno a uno con una persona de tu equipo? Indica frecuencia, duración, temas y cómo haces seguimiento.'),
      O('Escribe, tal como la dirías, una retroalimentación a alguien que atendió mal a un paciente ayer.'),
      S('¿Cuál es la mejor forma de reconocer un buen servicio?',
        ['Esperar a la evaluación anual', 'De forma oportuna y específica: qué hizo, por qué importa y su impacto en el paciente', 'Solo con incentivos económicos', 'No hace falta reconocer lo que es su obligación'], 1),
      E('mi capacidad de acompañar y desarrollar a mi equipo.'),
    ]],
    ['Casos escalados y clima', [
      O('Te escalan la queja de un paciente muy molesto que ya habló con dos personas de tu equipo. ¿Cómo la manejas y qué haces después con tu equipo?'),
      O('¿Cómo identificas que el clima de tu equipo se está deteriorando y qué haces cuando lo notas?'),
      PROMESA,
    ]],
    CRECIMIENTO,
  ],
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

};
