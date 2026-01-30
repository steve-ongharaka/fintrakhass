'use client';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

const COLORS = ['#60B5FF', '#FF9149', '#FF9898', '#FF90BB', '#80D8C3', '#A19AD3', '#72BF78', '#FF6363'];

interface FieldDistributionChartProps {
  data: { field: string; value: number }[];
}

export default function FieldDistributionChart({ data }: FieldDistributionChartProps) {
  if (!data?.length) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        No field data available
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="field"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ field, percent }) => `${field}: ${(percent * 100)?.toFixed?.(1) ?? 0}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: '8px' }}
            formatter={(value: number) => [value?.toLocaleString?.() ?? value, 'Oil (bbl)']}
          />
          <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
