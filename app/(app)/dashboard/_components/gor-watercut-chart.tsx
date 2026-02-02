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

interface GORWaterCutChartProps {
  data: { date: string; gor: number; waterCut: number }[];
}

export default function GORWaterCutChart({ data }: GORWaterCutChartProps) {
  if (!data?.length) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        No GOR/Water Cut data available
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
            yAxisId="left"
            tickLine={false}
            tick={{ fontSize: 10 }}
            label={{ value: 'GOR (Mcf/bbl)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11 } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickLine={false}
            tick={{ fontSize: 10 }}
            label={{ value: 'Water Cut (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 11 } }}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: '8px' }}
            formatter={(value: number) => [value?.toFixed?.(2) ?? value, '']}
          />
          <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="gor"
            stroke="#8B5CF6"
            strokeWidth={2}
            dot={false}
            name="GOR (Mcf/bbl)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="waterCut"
            stroke="#EC4899"
            strokeWidth={2}
            dot={false}
            name="Water Cut (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
