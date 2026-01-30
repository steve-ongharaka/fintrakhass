'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

interface TopWellsChartProps {
  data: { wellName: string; oil: number; gas: number; water: number }[];
}

export default function TopWellsChart({ data }: TopWellsChartProps) {
  if (!data?.length) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        No well data available
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <XAxis
            type="number"
            tickLine={false}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            type="category"
            dataKey="wellName"
            tickLine={false}
            tick={{ fontSize: 10 }}
            width={75}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: '8px' }}
            formatter={(value: number) => [value?.toLocaleString?.() ?? value, '']}
          />
          <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="oil" fill="#F59E0B" name="Oil (bbl)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
