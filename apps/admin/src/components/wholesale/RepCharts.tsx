'use client';

import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { cop } from '@/lib/format';

// Slots 1-3 de la paleta categórica, validados para daltonismo y contraste.
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a'];
const BUDGET = '#eb6834';
const ACTUAL = '#2a78d6';

export interface RepChartRow {
  name: string;
  budgetAmount: number;
  actualAmount: number;
  budgetUnits: number;
  actualUnits: number;
  asp: number;
  avgDiscount: number;
  binauralRate: number;
  rechargeableRate: number;
  expense: number;
  expenseRate: number;
}

export interface MonthPoint {
  month: string;
  [rep: string]: string | number;
}

export interface PacePoint {
  month: string;
  real: number;
  presupuesto: number;
}

const MONEY_TICK = (n: number) =>
  n >= 1_000_000_000 ? `$${(n / 1_000_000_000).toFixed(1)}MM`
  : n >= 1_000_000 ? `$${Math.round(n / 1_000_000)}M`
  : `$${n}`;

const AXIS = { fontSize: 11, fill: '#706F6F' };
const GRID = '#E5E7EB';

function Card({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-border p-6 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-secondary text-xs mt-1 mb-4">{hint}</p>
      {children}
    </section>
  );
}

function Box({ children, height = 260 }: { children: React.ReactElement; height?: number }) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>{children}</ResponsiveContainer>
    </div>
  );
}

function TipShell({ label, rows, footer }: { label?: string; rows: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-lg shadow-sm px-3 py-2 text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {rows}
      {footer && <p className="mt-1 pt-1 border-t border-border text-secondary">{footer}</p>}
    </div>
  );
}

type TipProps = {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
};

function makeTooltip(fmt: (v: number) => string, withCompliance = false) {
  return function Tip({ active, payload, label }: TipProps) {
    if (!active || !payload?.length) return null;
    const budget = payload.find((p) => p.name === 'Presupuesto')?.value ?? 0;
    const actual = payload.find((p) => p.name === 'Real')?.value ?? 0;
    return (
      <TipShell
        label={label}
        rows={payload.map((p) => (
          <p key={p.name} className="flex items-center gap-2 text-secondary">
            <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
            {p.name}: <span className="text-foreground font-medium">{fmt(p.value)}</span>
          </p>
        ))}
        footer={
          withCompliance && budget > 0 ? (
            <>Cumplimiento: <span className="text-foreground font-semibold">{Math.round((actual / budget) * 100)}%</span></>
          ) : undefined
        }
      />
    );
  };
}

const TipCop = makeTooltip((v) => cop(v), true);
const TipUnits = makeTooltip((v) => `${v} und`, true);
const TipCopPlain = makeTooltip((v) => cop(v));
const TipPct = makeTooltip((v) => `${v.toFixed(1)}%`);

function Comparison({
  data, unit, budgetKey, actualKey,
}: {
  data: RepChartRow[];
  unit: 'cop' | 'units';
  budgetKey: 'budgetAmount' | 'budgetUnits';
  actualKey: 'actualAmount' | 'actualUnits';
}) {
  return (
    <Box height={Math.max(data.length * 78, 160)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }} barGap={2}>
        <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis
          type="number"
          tick={AXIS}
          tickFormatter={(v) => (unit === 'cop' ? MONEY_TICK(v) : String(v))}
          axisLine={false}
          tickLine={false}
        />
        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: '#041E42' }} axisLine={false} tickLine={false} />
        <Tooltip content={unit === 'cop' ? <TipCop /> : <TipUnits />} cursor={{ fill: 'rgba(4, 30, 66, 0.04)' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" />
        <Bar dataKey={budgetKey} name="Presupuesto" fill={BUDGET} radius={[0, 4, 4, 0]} barSize={14} />
        <Bar dataKey={actualKey} name="Real" fill={ACTUAL} radius={[0, 4, 4, 0]} barSize={14} />
      </BarChart>
    </Box>
  );
}

function SingleBar({
  data, dataKey, color, fmt, tip,
}: {
  data: RepChartRow[];
  dataKey: 'asp' | 'avgDiscount' | 'expense' | 'expenseRate';
  color: string;
  fmt: (v: number) => string;
  tip: React.ReactElement;
}) {
  return (
    <Box height={Math.max(data.length * 56, 160)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis type="number" tick={AXIS} tickFormatter={fmt} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: '#041E42' }} axisLine={false} tickLine={false} />
        <Tooltip content={tip} cursor={{ fill: 'rgba(4, 30, 66, 0.04)' }} />
        <Bar
          dataKey={dataKey}
          fill={color}
          radius={[0, 4, 4, 0]}
          barSize={18}
          name={
            dataKey === 'asp' ? 'ASP'
            : dataKey === 'avgDiscount' ? 'Descuento'
            : dataKey === 'expense' ? 'Inversión'
            : 'Inversión sobre venta'
          }
        />
      </BarChart>
    </Box>
  );
}

export function RepCharts({
  data, monthly, expenseMonthly, pace, repNames, periodLabel,
}: {
  data: RepChartRow[];
  monthly: MonthPoint[];
  expenseMonthly: MonthPoint[];
  pace: PacePoint[];
  repNames: string[];
  periodLabel: string;
}) {
  if (data.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Presupuesto vs. real · valor" hint={`${periodLabel}, por comercial.`}>
          <Comparison data={data} unit="cop" budgetKey="budgetAmount" actualKey="actualAmount" />
        </Card>
        <Card title="Presupuesto vs. real · unidades" hint="Las unidades cuentan aparte: otra escala, otra gráfica.">
          <Comparison data={data} unit="units" budgetKey="budgetUnits" actualKey="actualUnits" />
        </Card>
      </div>

      <Card title="Ventas mes a mes" hint="Cómo se mueve cada zona a lo largo del año.">
        <Box height={300}>
          <LineChart data={monthly} margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS} tickFormatter={MONEY_TICK} axisLine={false} tickLine={false} />
            <Tooltip content={<TipCopPlain />} cursor={{ stroke: '#041E42', strokeOpacity: 0.15 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" />
            {repNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={SERIES[i % SERIES.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </Box>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Ritmo del canal" hint="Acumulado real contra acumulado presupuestado. Si la línea azul va debajo, el año se está quedando corto.">
          <Box>
            <LineChart data={pace} margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} tickFormatter={MONEY_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={<TipCopPlain />} cursor={{ stroke: '#041E42', strokeOpacity: 0.15 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" />
              <Line type="monotone" dataKey="presupuesto" name="Presupuesto" stroke={BUDGET} strokeWidth={2} strokeDasharray="5 4" dot={false} />
              <Line type="monotone" dataKey="real" name="Real" stroke={ACTUAL} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
            </LineChart>
          </Box>
        </Card>

        <Card title="Mix de producto" hint="Qué porcentaje de las ventas de cada zona es binaural y recargable.">
          <Box>
            <BarChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 4 }} barGap={2}>
              <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#706F6F' }} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} tickFormatter={(v) => `${v}%`} domain={[0, 100]} axisLine={false} tickLine={false} />
              <Tooltip content={<TipPct />} cursor={{ fill: 'rgba(4, 30, 66, 0.04)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" />
              <Bar dataKey="binauralRate" name="Binaural" fill={SERIES[0]} radius={[4, 4, 0, 0]} barSize={22} />
              <Bar dataKey="rechargeableRate" name="Recargable" fill={SERIES[2]} radius={[4, 4, 0, 0]} barSize={22} />
            </BarChart>
          </Box>
        </Card>
      </div>

      <Card title="Inversión mes a mes" hint="Cuánto gasta cada zona a lo largo del año.">
        <Box height={280}>
          <LineChart data={expenseMonthly} margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS} tickFormatter={MONEY_TICK} axisLine={false} tickLine={false} />
            <Tooltip content={<TipCopPlain />} cursor={{ stroke: '#041E42', strokeOpacity: 0.15 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" />
            {repNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={SERIES[i % SERIES.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </Box>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Inversión por comercial" hint={`Gasto comercial imputado · ${periodLabel}.`}>
          <SingleBar data={data} dataKey="expense" color={SERIES[1]} fmt={MONEY_TICK} tip={<TipCopPlain />} />
        </Card>
        <Card title="Inversión sobre venta" hint="Cuántos pesos de gasto por cada 100 vendidos. Ojo con los que se disparan.">
          <SingleBar data={data} dataKey="expenseRate" color={SERIES[2]} fmt={(v) => `${v}%`} tip={<TipPct />} />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="ASP por comercial" hint={`Precio promedio por unidad · ${periodLabel}.`}>
          <SingleBar data={data} dataKey="asp" color={SERIES[0]} fmt={MONEY_TICK} tip={<TipCopPlain />} />
        </Card>
        <Card title="Descuento promedio" hint="Ponderado por valor de lista. Un descuento alto se come el ASP.">
          <SingleBar data={data} dataKey="avgDiscount" color={SERIES[1]} fmt={(v) => `${v}%`} tip={<TipPct />} />
        </Card>
      </div>
    </div>
  );
}
