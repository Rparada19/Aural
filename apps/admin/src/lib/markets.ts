export type Market = 'hub' | 'vm' | 'wholesale' | 'open';

const ROOT = 'auralbusinessintelligence.com';

/** Resuelve el mercado a partir del hostname. Fuera del dominio real
 *  (localhost, previews de Vercel) no se restringe nada. */
export function marketFromHost(host: string | null | undefined): Market {
  if (!host) return 'open';
  const h = host.split(':')[0].toLowerCase();
  if (!h.endsWith(ROOT)) return 'open';
  if (h.startsWith('wholesale.')) return 'wholesale';
  if (h.startsWith('vm.')) return 'vm';
  return 'hub';
}

export const MARKET_URL: Record<'vm' | 'wholesale', string> = {
  vm: `https://vm.${ROOT}`,
  wholesale: `https://wholesale.${ROOT}`,
};
