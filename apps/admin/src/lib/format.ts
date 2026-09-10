export const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export const pct = (n: number) => `${Math.round(n * 100)}%`;
