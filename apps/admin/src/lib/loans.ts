/** Plazo estándar de un préstamo de prueba. */
export const LOAN_DAYS = 14;

export interface Loan {
  id: string;
  client_id: string;
  rep_id: string | null;
  loaned_on: string;
  due_on: string;
  returned_on: string | null;
  platform: string | null;
  tech_level: string | null;
  style: string | null;
  units: number;
  binaural: boolean;
  rechargeable: boolean;
  serials: string[];
  patient_name: string | null;
  notes: string | null;
  status: 'active' | 'returned' | 'sold' | 'lost';
}

/** Días que faltan (positivo) o que lleva vencido (negativo).
 *  Vive fuera del componente porque el servidor también la usa. */
export function daysLeft(dueOn: string): number {
  const today = new Date().toISOString().slice(0, 10);
  return Math.round(
    (Date.parse(`${dueOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
}

export function dueDateFrom(loanedOn: string): string {
  return new Date(Date.parse(`${loanedOn}T00:00:00Z`) + LOAN_DAYS * 86_400_000)
    .toISOString().slice(0, 10);
}
