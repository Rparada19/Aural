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
export type WholesaleRole = 'admin' | 'coordinator' | 'rep';

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
};

/** Campos que cada quien puede tocar de una ficha de comercial. */
export const REP_FIELDS = {
  /** Los mantiene la propia persona */
  own: ['photo_url', 'mobile', 'phone', 'email', 'city', 'bio'] as const,
  /** Solo coordinación: definen el rol en el canal */
  assignment: ['zone', 'is_active', 'job_title', 'started_on', 'document_id', 'territory_note'] as const,
};
