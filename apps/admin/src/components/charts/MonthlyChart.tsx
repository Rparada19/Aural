'use client';

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';

interface Row { month: string; sold: number; quoted: number }

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function MonthlyChart({ data }: { data: Row[] }) {
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#706F6F' }} />
          <YAxis tick={{ fontSize: 11, fill: '#706F6F' }} tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(0)}M`} />
          <Tooltip formatter={(v) => cop(Number(v))} cursor={{ fill: 'rgba(4, 30, 66, 0.05)' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="sold" name="Vendido" fill="#041E42" radius={[4, 4, 0, 0]} />
          <Bar dataKey="quoted" name="Cotizado" fill="#D97706" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
