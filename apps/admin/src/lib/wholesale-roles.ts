/**
 * Los tres perfiles del canal wholesale.
 *
 *   admin        Rafael. Ve todo el canal y además configura: catálogos,
 *                accesos, y los datos que definen el negocio.
 *   coordinator  Coordinación. Opera el canal completo: asigna carteras,
 *                fija presupuestos y objetivos, publica material.
 *   rep          Comercial. Trabaja su zona: carga ventas, gastos,
 *                préstamos y agenda, y reporta avances.
 *
 * La regla de oro: el comercial mantiene lo que lo describe; coordinación
 * decide lo que lo compromete. Nadie edita su propia meta.
 */
export type WholesaleRole = 'admin' | 'coordinator' | 'rep' | 'assistant';

export interface Permissions {
  /** Ver el canal entero, no solo la zona propia */
  seeWholeChannel: boolean;
  /** Crear y editar centros auditivos, y asignarles comercial */
  manageClients: boolean;
  /** Fijar presupuestos mensuales por cliente */
  setBudgets: boolean;
  /** Crear objetivos y metas de actividad */
  setGoals: boolean;
  /** Crear, editar y dar de baja comerciales */
  manageReps: boolean;
  /** Cambiar zona, cargo, ingreso o estado de un comercial */
  editRepAssignment: boolean;
  /** Publicar documentos para el equipo */
  publishDocuments: boolean;
  /** Administrar catálogos: tipos de actividad, rubros, plataformas */
  manageCatalogs: boolean;
  /** Crear usuarios y vincularlos a una ficha */
  manageAccess: boolean;
  /** Registrar ventas, gastos, préstamos y agenda */
  operate: boolean;
}

const MATRIX: Record<WholesaleRole, Permissions> = {
  admin: {
    seeWholeChannel: true,
    manageClients: true,
    setBudgets: true,
    setGoals: true,
    manageReps: true,
    editRepAssignment: true,
    publishDocuments: true,
    manageCatalogs: true,
    manageAccess: true,
    operate: true,
  },
  coordinator: {
    seeWholeChannel: true,
    manageClients: true,
    setBudgets: true,
    setGoals: true,
    manageReps: true,
    editRepAssignment: true,
    publishDocuments: true,
    manageCatalogs: true,
    // Crear cuentas queda en el administrador: es la llave del sistema
    manageAccess: false,
    operate: true,
  },
  // Servicio al cliente audiológico: atiende a todos los clientes, no tiene
  // cartera ni metas; registra casos, préstamos e interacciones.
  assistant: {
    seeWholeChannel: true,
    manageClients: false,
    setBudgets: false,
    setGoals: false,
    manageReps: false,
    editRepAssignment: false,
    publishDocuments: false,
    manageCatalogs: false,
    manageAccess: false,
    operate: true,
  },
  rep: {
    seeWholeChannel: false,
    manageClients: false,
    setBudgets: false,
    setGoals: false,
    manageReps: false,
    editRepAssignment: false,
    publishDocuments: false,
    manageCatalogs: false,
    manageAccess: false,
    operate: true,
  },
};

export function can(role: WholesaleRole): Permissions {
  return MATRIX[role];
}

export const ROLE_LABEL: Record<WholesaleRole, string> = {
  admin: 'Administrador',
  coordinator: 'Coordinación',
  rep: 'Comercial',
  assistant: 'Servicio al cliente',
};

/** Secciones del portal. Cada perfil trae las suyas; coordinación puede
 *  quitarle o darle secciones a una persona puntual. */
export const MODULES = [
  { key: 'resumen', label: 'Resumen', href: '/wholesale', hint: 'Ventas del mes y del año' },
  { key: 'alertas', label: 'Alertas', href: '/wholesale/alertas', hint: 'Lo que hay que atender hoy' },
  { key: 'agenda', label: 'Mi agenda', href: '/wholesale/mi-agenda', hint: 'Visitas, metas, gastos e informe del mes' },
  { key: 'pendientes', label: 'Mis pendientes', href: '/wholesale/pendientes', hint: 'Tareas y bloc de notas personal' },
  { key: 'clientes', label: 'Clientes', href: '/wholesale/clients', hint: 'Fichas de los centros' },
  { key: 'casos', label: 'Casos de servicio', href: '/wholesale/casos', hint: 'Reparaciones, garantías, pedidos y despachos' },
  { key: 'prestamos', label: 'Préstamos', href: '/wholesale/prestamos', hint: 'Equipos de prueba en los centros' },
  { key: 'oportunidades', label: 'Oportunidades', href: '/wholesale/oportunidades', hint: 'CRM de prospectos y negocios' },
  { key: 'ventas', label: 'Ventas', href: '/wholesale/sales', hint: 'Facturación y mezcla de producto' },
  { key: 'presupuestos', label: 'Presupuestos', href: '/wholesale/budgets', hint: 'Metas por cliente' },
  { key: 'proyectos', label: 'Proyectos', href: '/wholesale/proyectos', hint: 'Eventos, campañas y capacitaciones' },
  { key: 'celebraciones', label: 'Celebraciones', href: '/wholesale/celebraciones', hint: 'Cumpleaños y fechas especiales' },
  { key: 'documentos', label: 'Documentos', href: '/wholesale/documentos', hint: 'Fichas y material de apoyo' },
  { key: 'comerciales', label: 'Comerciales', href: '/wholesale/reps', hint: 'Agenda, metas y gastos del equipo' },
  { key: 'equipo', label: 'Equipo y servicio', href: '/wholesale/equipo', hint: 'Calificación QR, Academia y alarmas' },
  { key: 'accesos', label: 'Accesos', href: '/wholesale/accesos', hint: 'Quién entra y qué ve' },
] as const;
export type ModuleKey = (typeof MODULES)[number]['key'];

/** Secciones que solo coordinación puede tener, nunca se le dan a otros. */
export const COORDINATION_ONLY: ModuleKey[] = ['comerciales', 'equipo', 'accesos'];
/** Secciones que solo tienen sentido para quien tiene ficha de comercial. */
export const REP_ONLY: ModuleKey[] = ['agenda'];

export const DEFAULT_MODULES: Record<WholesaleRole, ModuleKey[]> = {
  admin: MODULES.map((m) => m.key).filter((k) => k !== 'agenda'),
  coordinator: MODULES.map((m) => m.key).filter((k) => k !== 'agenda'),
  rep: ['resumen', 'alertas', 'agenda', 'pendientes', 'clientes', 'casos', 'prestamos', 'oportunidades', 'ventas', 'presupuestos', 'proyectos', 'celebraciones', 'documentos'],
  assistant: ['alertas', 'pendientes', 'clientes', 'casos', 'prestamos', 'oportunidades', 'celebraciones', 'documentos'],
};

export function modulesFor(role: WholesaleRole, custom: string[] | null | undefined): ModuleKey[] {
  if (role === 'admin' || role === 'coordinator' || !custom) return DEFAULT_MODULES[role];
  return MODULES.map((m) => m.key).filter((k) => custom.includes(k) && !COORDINATION_ONLY.includes(k));
}

/** Campos que cada quien puede tocar de una ficha de comercial. */
export const REP_FIELDS = {
  /** Los mantiene la propia persona */
  own: ['photo_url', 'mobile', 'phone', 'email', 'city', 'bio'] as const,
  /** Solo coordinación: definen el rol en el canal */
  assignment: ['zone', 'is_active', 'job_title', 'started_on', 'document_id', 'territory_note'] as const,
};
