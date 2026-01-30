'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

interface ProductionTrendChartProps {
  data: { date: string; oil: number; gas: number; water: number }[];
}

export default function ProductionTrendChart({ data }: ProductionTrendChartProps) {
  if (!data?.length) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        No production data available
      </div>
    );
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
          <XAxis
            dataKey="date"
            tickLine={false}
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={50}
            tickFormatter={(val) => val?.slice?.(5) ?? val}
          />
          <YAxis
            tickLine={false}
            tick={{ fontSize: 10 }}
            label={{ value: 'Volume', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11 } }}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: '8px' }}
            formatter={(value: number) => [value?.toLocaleString?.() ?? value, '']}
          />
          <Legend
            verticalAlign="top"
            wrapperStyle={{ fontSize: 11 }}
          />
          <Line
            type="monotone"
            dataKey="oil"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={false}
            name="Oil (bbl)"
          />
          <Line
            type="monotone"
            dataKey="gas"
            stroke="#EF4444"
            strokeWidth={2}
            dot={false}
            name="Gas (Mcf)"
          />
          <Line
            type="monotone"
            dataKey="water"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            name="Water (bbl)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
