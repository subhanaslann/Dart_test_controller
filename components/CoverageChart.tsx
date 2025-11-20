import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface CoverageChartProps {
  covered: number;
  total: number;
}

export const CoverageChart: React.FC<CoverageChartProps> = ({ covered, total }) => {
  const missing = total - covered;
  const data = [
    { name: 'Covered', value: covered },
    { name: 'Missing', value: missing },
  ];

  // Dark Mode Colors: Emerald-500 vs Red-500 but slightly desaturated/matte
  const COLORS = ['#10b981', '#ef4444']; 

  if (total === 0) return <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-600">N/A</div>;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={22}
          outerRadius={30}
          fill="#8884d8"
          paddingAngle={4}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5', fontSize: '10px', borderRadius: '4px' }}
            itemStyle={{ color: '#e4e4e7' }}
            cursor={false}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};