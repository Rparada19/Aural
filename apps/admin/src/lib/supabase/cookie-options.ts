const ROOT = 'auralbusinessintelligence.com';

/** Dominio de la cookie de sesión: en el dominio real se sube al padre
 *  (`.auralbusinessintelligence.com`) para que el login del hub sirva en
 *  vm. y wholesale. En local y en previews de Vercel queda undefined. */
export function cookieDomainFor(host: string | null | undefined): string | undefined {
  if (!host) return undefined;
  const h = host.split(':')[0].toLowerCase();
  return h === ROOT || h.endsWith(`.${ROOT}`) ? `.${ROOT}` : undefined;
}

export function withCookieDomain<T extends object>(
  options: T,
  host: string | null | undefined,
): T & { domain?: string } {
  const domain = cookieDomainFor(host);
  return domain ? { ...options, domain } : options;
}
