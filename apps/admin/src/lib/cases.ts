export const CASE_KIND: Record<string, { label: string; days: number }> = {
  reparacion: { label: 'Reparación', days: 15 },
  garantia: { label: 'Garantía', days: 10 },
  soporte: { label: 'Soporte técnico', days: 2 },
  pedido: { label: 'Pedido', days: 3 },
  despacho: { label: 'Despacho', days: 2 },
  devolucion: { label: 'Devolución', days: 5 },
  otro: { label: 'Otro', days: 5 },
};

export const CASE_STATUS: Record<string, string> = {
  abierto: 'Nuevo',
  en_proceso: 'En proceso',
  esperando_cliente: 'Esperando al cliente',
  esperando_fabrica: 'Esperando fábrica',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
};

export const OPEN_STATUS = ['abierto', 'en_proceso', 'esperando_cliente', 'esperando_fabrica'];

export const PRIORITY: Record<string, string> = { alta: 'Urgente', media: 'Normal', baja: 'Puede esperar' };
