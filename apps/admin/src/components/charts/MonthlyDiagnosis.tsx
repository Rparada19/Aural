'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

interface Row { month: string; total: number; hearing_loss: number; normal: number; sudden: number }

export function MonthlyDiagnosis({ data }: { data: Row[] }) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#706F6F' }} />
          <YAxis tick={{ fontSize: 11, fill: '#706F6F' }} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'rgba(4, 30, 66, 0.05)' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="total" name="Total" stackId="t" fill="#041E42" />
          <Bar dataKey="hearing_loss" name="Pérdida auditiva" stackId="a" fill="#D97706" />
          <Bar dataKey="normal" name="Audición normal" stackId="a" fill="#16A34A" />
          <Bar dataKey="sudden" name="Hipoacusia súbita" stackId="a" fill="#DC2626" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
