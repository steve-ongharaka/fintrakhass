'use client';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  inactive: '#F59E0B',
  shut_in: '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  shut_in: 'Shut-in',
};

interface WellStatusChartProps {
  data: { status: string; count: number }[];
}

export default function WellStatusChart({ data }: WellStatusChartProps) {
  if (!data?.length) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        No well status data available
      </div>
    );
  }

  const formattedData = data.map((item) => ({
    ...item,
    name: STATUS_LABELS[item?.status] ?? item?.status,
  }));

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={formattedData}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
          >
            {formattedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={STATUS_COLORS[entry?.status] ?? '#8884d8'}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: '8px' }}
            formatter={(value: number) => [value, 'Wells']}
          />
          <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
