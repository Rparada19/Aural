'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface Row { month: string; count: number }

export function MonthlyCount({ data }: { data: Row[] }) {
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#706F6F' }} />
          <YAxis tick={{ fontSize: 11, fill: '#706F6F' }} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'rgba(4, 30, 66, 0.05)' }} />
          <Bar dataKey="count" name="Pacientes" fill="#041E42" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
