'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setAppointment, markAttendance } from '@/app/actions/patients';

interface Props {
  patientId: string;
  professionalId: string;
  appointmentAt: string | null;
  appointmentStatus: string;
  children: React.ReactNode;
}

export function AppointmentGate({ patientId, professionalId, appointmentAt, appointmentStatus, children }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [when, setWhen] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const apptDate = appointmentAt ? new Date(appointmentAt) : null;
  const now = new Date();
  const apptInPast = apptDate ? apptDate.getTime() < now.getTime() : false;
  const attended = appointmentStatus === 'attended';
  const cancelled = appointmentStatus === 'cancelled';

  function schedule() {
    setError(null);
    if (!when) { setError('Selecciona fecha y hora.'); return; }
    startTransition(async () => {
      try {
        await setAppointment(patientId, professionalId, when);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error al agendar.');
      }
    });
  }

  function mark(attended: boolean) {
    startTransition(async () => {
      try {
        await markAttendance(patientId, professionalId, attended);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error.');
      }
    });
  }

  // Estado: ya asistió → desbloquea todo
  if (attended) {
    return (
      <div>
        <div className="bg-success/10 border border-success/30 rounded-lg px-4 py-2 mb-4 flex items-center gap-2">
          <span className="text-success">✓</span>
          <p className="text-sm text-success font-semibold">
            Paciente asistió el {apptDate?.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })} — datos comerciales y clínicos habilitados.
          </p>
        </div>
        {children}
      </div>
    );
  }

  // Estado: paciente no asistió
  if (cancelled) {
    return (
      <div className="bg-danger/10 border border-danger/30 rounded-2xl p-6">
        <h3 className="font-semibold text-danger">Paciente no asistió a la cita</h3>
        <p className="text-sm text-danger/80 mt-1">
          Re-agenda una nueva fecha para continuar.
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
          <label className="block flex-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Nueva fecha y hora</span>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary text-sm"
            />
          </label>
          <button
            onClick={schedule} disabled={isPending}
            className="px-5 h-11 rounded-md bg-primary text-white font-semibold disabled:opacity-50"
          >
            {isPending ? 'Agendando…' : 'Re-agendar'}
          </button>
        </div>
        {error && <p className="text-danger text-sm mt-2">{error}</p>}
      </div>
    );
  }

  // Estado: cita pasada, pendiente de marcar asistencia
  if (apptDate && apptInPast) {
    return (
      <div className="bg-warning/10 border border-warning/30 rounded-2xl p-6">
        <h3 className="font-semibold text-warning">La cita ya pasó</h3>
        <p className="text-sm text-warning/90 mt-1">
          Estaba agendada para el {apptDate.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}. ¿El paciente asistió?
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => mark(true)} disabled={isPending}
            className="px-5 h-11 rounded-md bg-success text-white font-semibold hover:opacity-90 disabled:opacity-50"
          >
            Sí, asistió
          </button>
          <button
            onClick={() => mark(false)} disabled={isPending}
            className="px-5 h-11 rounded-md border border-danger text-danger font-semibold hover:bg-danger/10 disabled:opacity-50"
          >
            No asistió
          </button>
        </div>
        {error && <p className="text-danger text-sm mt-2">{error}</p>}
      </div>
    );
  }

  // Estado: cita en futuro
  if (apptDate && !apptInPast) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
        <h3 className="font-semibold text-primary">Cita agendada</h3>
        <p className="text-sm text-secondary mt-1">
          {apptDate.toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => mark(true)} disabled={isPending}
            className="px-4 h-10 rounded-md bg-success text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            Asistió
          </button>
          <button
            onClick={() => mark(false)} disabled={isPending}
            className="px-4 h-10 rounded-md border border-danger text-danger text-sm font-semibold hover:bg-danger/10 disabled:opacity-50"
          >
            No asistió
          </button>
          <button
            onClick={() => setRescheduleOpen((v) => !v)}
            className="px-4 h-10 rounded-md border border-border text-primary text-sm font-semibold hover:bg-surface"
          >
            Re-agendar
          </button>
        </div>

        {rescheduleOpen && (
          <div className="mt-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
            <label className="block flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Nueva fecha y hora</span>
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary text-sm"
              />
            </label>
            <button
              onClick={schedule} disabled={isPending}
              className="px-5 h-11 rounded-md bg-primary text-white font-semibold disabled:opacity-50"
            >
              {isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        )}
        {error && <p className="text-danger text-sm mt-2">{error}</p>}

        <p className="text-xs text-secondary mt-4">
          Los datos comerciales, hallazgos clínicos e informes se desbloquearán cuando marques que el paciente asistió.
        </p>
      </div>
    );
  }

  // Estado: sin cita
  return (
    <div className="bg-warning/5 border-2 border-dashed border-warning/40 rounded-2xl p-6">
      <h3 className="font-semibold text-primary text-lg">Agenda la cita primero</h3>
      <p className="text-sm text-secondary mt-1">
        Para registrar datos comerciales, hallazgos clínicos o informes médicos, primero define la fecha de la cita y confirma la asistencia del paciente.
      </p>
      <div className="mt-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
        <label className="block flex-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Fecha y hora</span>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary text-sm"
          />
        </label>
        <button
          onClick={schedule} disabled={isPending}
          className="px-5 h-11 rounded-md bg-primary text-white font-semibold disabled:opacity-50"
        >
          {isPending ? 'Agendando…' : 'Agendar cita'}
        </button>
      </div>
      {error && <p className="text-danger text-sm mt-2">{error}</p>}
    </div>
  );
}
