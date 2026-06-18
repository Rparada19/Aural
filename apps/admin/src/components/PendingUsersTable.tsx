'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES, OTORRINO_SPECIALTIES, type RoleSlug, type OtorrinoSpecialty } from '@aural/shared';
import { approveUser, rejectUser } from '@/app/actions/users';

interface PendingUser {
  id: string;
  full_name: string;
  email: string;
  cedula: string;
  city: string;
  profession: string;
  role: RoleSlug;
  specialty: OtorrinoSpecialty | null;
  created_at: string;
}

export function PendingUsersTable({ users }: { users: PendingUser[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (users.length === 0) {
    return (
      <div className="bg-white border border-border rounded-2xl p-10 text-center text-secondary">
        No hay solicitudes pendientes 🎉
      </div>
    );
  }

  function onApprove(id: string) {
    startTransition(async () => {
      await approveUser(id);
      router.refresh();
    });
  }
  function onReject(id: string) {
    const reason = window.prompt('Motivo del rechazo (opcional):') ?? '';
    startTransition(async () => {
      await rejectUser(id, reason);
      router.refresh();
    });
  }

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface text-secondary text-xs uppercase tracking-wider">
          <tr>
            <Th>Nombre</Th>
            <Th>Correo</Th>
            <Th>Cédula</Th>
            <Th>Ciudad</Th>
            <Th>Perfil</Th>
            <Th>Fecha</Th>
            <Th className="text-right pr-6">Acciones</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u) => {
            const roleLabel = ROLES.find((r) => r.slug === u.role)?.label ?? u.role;
            const specialty = u.specialty
              ? OTORRINO_SPECIALTIES.find((s) => s.slug === u.specialty)?.label
              : null;
            return (
              <tr key={u.id} className="hover:bg-surface/60">
                <Td className="font-medium text-primary">{u.full_name}</Td>
                <Td>{u.email}</Td>
                <Td>{u.cedula}</Td>
                <Td>{u.city}</Td>
                <Td>
                  {roleLabel}
                  {specialty && <span className="text-secondary"> · {specialty}</span>}
                </Td>
                <Td>{new Date(u.created_at).toLocaleDateString('es-CO')}</Td>
                <Td className="text-right pr-6">
                  <div className="inline-flex gap-2">
                    <button
                      onClick={() => onApprove(u.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-md bg-success text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => onReject(u.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-md border border-danger text-danger text-xs font-semibold hover:bg-danger/10 disabled:opacity-40"
                    >
                      Rechazar
                    </button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-semibold px-6 py-3 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-4 text-foreground ${className}`}>{children}</td>;
}
