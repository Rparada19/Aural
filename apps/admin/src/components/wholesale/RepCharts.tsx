'use client';

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { cop } from '@/lib/format';

// Slots 1 y 2 de la paleta categórica, validados contra superficie clara.
const BUDGET = '#eb6834';
const ACTUAL = '#2a78d6';

export interface RepChartRow {
  name: string;
  budgetAmount: number;
  actualAmount: number;
  budgetUnits: number;
  actualUnits: number;
}

const millions = (n: number) =>
  n >= 1_000_000_000 ? `$${(n / 1_000_000_000).toFixed(1)}MM`
  : n >= 1_000_000 ? `$${Math.round(n / 1_000_000)}M`
  : `$${n}`;

function ChartTooltip({
  active, payload, label, unit,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  unit: 'cop' | 'units';
}) {
  if (!active || !payload?.length) return null;
  const fmt = (v: number) => (unit === 'cop' ? cop(v) : `${v} und`);
  const budget = payload.find((p) => p.name === 'Presupuesto')?.value ?? 0;
  const actual = payload.find((p) => p.name === 'Real')?.value ?? 0;
  return (
    <div className="bg-white border border-border rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-secondary">
          <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
          {p.name}: <span className="text-foreground font-medium">{fmt(p.value)}</span>
        </p>
      ))}
      {budget > 0 && (
        <p className="mt-1 pt-1 border-t border-border text-secondary">
          Cumplimiento:{' '}
          <span className="text-foreground font-semibold">{Math.round((actual / budget) * 100)}%</span>
        </p>
      )}
    </div>
  );
}

function ComparisonChart({
  data, unit, budgetKey, actualKey,
}: {
  data: RepChartRow[];
  unit: 'cop' | 'units';
  budgetKey: 'budgetAmount' | 'budgetUnits';
  actualKey: 'actualAmount' | 'actualUnits';
}) {
  return (
    <div style={{ width: '100%', height: Math.max(data.length * 78, 160) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 4 }} barGap={2}>
          <CartesianGrid horizontal={false} stroke="#E5E7EB" strokeDasharray="3 3" />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#706F6F' }}
            tickFormatter={(v) => (unit === 'cop' ? millions(v) : String(v))}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fontSize: 12, fill: '#041E42' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: 'rgba(4, 30, 66, 0.04)' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" />
          <Bar dataKey={budgetKey} name="Presupuesto" fill={BUDGET} radius={[0, 4, 4, 0]} barSize={14} />
          <Bar dataKey={actualKey} name="Real" fill={ACTUAL} radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RepCharts({ data }: { data: RepChartRow[] }) {
  if (data.length === 0) return null;
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="font-semibold">Presupuesto vs. real · valor</h2>
        <p className="text-secondary text-xs mt-1 mb-4">Acumulado del año por comercial.</p>
        <ComparisonChart data={data} unit="cop" budgetKey="budgetAmount" actualKey="actualAmount" />
      </section>

      <section className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="font-semibold">Presupuesto vs. real · unidades</h2>
        <p className="text-secondary text-xs mt-1 mb-4">Las unidades cuentan aparte: otra escala, otra gráfica.</p>
        <ComparisonChart data={data} unit="units" budgetKey="budgetUnits" actualKey="actualUnits" />
      </section>
    </div>
  );
}
