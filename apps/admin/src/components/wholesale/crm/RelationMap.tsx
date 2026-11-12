type Node = { id: string; label: string; sub?: string; tone?: 'good' | 'bad' | 'neutral'; strong?: boolean; href?: string };
type Edge = { from: string; to: string; n: number; last?: string };

const TONE: Record<string, string> = { good: 'var(--positive)', bad: 'var(--alert)', neutral: 'var(--ink-faint)' };

/** Mapa de quién habla con quién: Aural a la izquierda, el centro a la
 *  derecha. El grosor de la línea es el número de interacciones. */
export function RelationMap({
  left, right, edges, leftTitle, rightTitle,
}: { left: Node[]; right: Node[]; edges: Edge[]; leftTitle: string; rightTitle: string }) {
  if (left.length === 0 || right.length === 0) return null;
  const W = 760, bw = 210, gap = 46, y0 = 44;
  const rows = Math.max(left.length, right.length);
  const H = y0 + rows * gap + 10;
  const ly = (i: number) => y0 + i * gap + (rows - left.length) * gap / 2;
  const ry = (i: number) => y0 + i * gap + (rows - right.length) * gap / 2;
  const li = new Map(left.map((n, i) => [n.id, i]));
  const ri = new Map(right.map((n, i) => [n.id, i]));
  const touched = new Set(edges.flatMap((e) => [e.from, e.to]));
  const max = Math.max(1, ...edges.map((e) => e.n));
  const x1 = 16 + bw, x2 = W - 16 - bw;

  const box = (n: Node, x: number, y: number, side: 'l' | 'r') => {
    const quiet = !touched.has(n.id);
    const body = (
      <g key={n.id}>
        <rect x={x} y={y} width={bw} height={34} rx={4}
          fill={n.strong ? 'rgba(180,85,31,0.08)' : 'var(--paper-raised)'}
          stroke={quiet ? 'var(--alert)' : 'var(--rule-strong, #c9c2b3)'} strokeDasharray={quiet ? '4 3' : undefined} />
        {side === 'r' && <circle cx={x + 12} cy={y + 17} r={4} fill={TONE[n.tone ?? 'neutral']} />}
        <text x={side === 'r' ? x + 22 : x + 10} y={y + 15} fontSize={12} fill="var(--ink)" fontWeight={n.strong ? 600 : 400}>
          {n.label.length > 26 ? `${n.label.slice(0, 25)}…` : n.label}
        </text>
        <text x={side === 'r' ? x + 22 : x + 10} y={y + 28} fontSize={10} fill={quiet ? 'var(--alert)' : 'var(--ink-faint)'}>
          {quiet ? 'Sin contacto' : (n.sub ?? '').slice(0, 34)}
        </text>
      </g>
    );
    return n.href ? <a key={n.id} href={n.href}>{body}</a> : body;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Mapa de relaciones">
      <text x={16} y={24} fontSize={10} letterSpacing={1.5} fill="var(--ink-faint)">{leftTitle.toUpperCase()}</text>
      <text x={W - 16} y={24} fontSize={10} letterSpacing={1.5} fill="var(--ink-faint)" textAnchor="end">{rightTitle.toUpperCase()}</text>
      {edges.map((e) => {
        const a = li.get(e.from), b = ri.get(e.to);
        if (a === undefined || b === undefined) return null;
        const ya = ly(a) + 17, yb = ry(b) + 17, mx = (x1 + x2) / 2;
        return (
          <g key={`${e.from}-${e.to}`}>
            <path d={`M${x1} ${ya} C${mx} ${ya} ${mx} ${yb} ${x2} ${yb}`} fill="none"
              stroke="var(--accent)" strokeOpacity={0.25 + 0.6 * e.n / max} strokeWidth={1 + 5 * e.n / max}>
              <title>{`${e.n} interacción${e.n === 1 ? '' : 'es'}${e.last ? ` · última ${e.last}` : ''}`}</title>
            </path>
          </g>
        );
      })}
      {left.map((n, i) => box(n, 16, ly(i), 'l'))}
      {right.map((n, i) => box(n, x2, ry(i), 'r'))}
    </svg>
  );
}
