import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from 'recharts';
import { Calendar } from 'lucide-react';
import type { AnomalyData } from '../types';

interface CustomizedDotProps {
  cx?: number;
  cy?: number;
  payload?: AnomalyData;
}

const CustomizedDot = (props: CustomizedDotProps) => {
  const { cx, cy, payload } = props;
  if (payload && payload.is_anomaly) {
    return <Dot cx={cx} cy={cy} r={6} stroke="#f43f5e" fill="#fb7185" strokeWidth={2} />;
  }
  return <Dot cx={cx} cy={cy} r={0} />;
};

interface DurationChartProps {
  data: AnomalyData[];
}

export const DurationChart: React.FC<DurationChartProps> = ({ data }) => {
  return (
    <div className="lg:col-span-3 glass-panel p-6 rounded-xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-6 flex items-center gap-2">
        <Calendar size={14} />
        Duration Trend (Last 50 Runs)
      </h3>
      <div className="h-full w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#475569" 
              tick={{ fill: '#64748b', fontSize: 12 }} 
              tickLine={false} 
              axisLine={false} 
              minTickGap={30} 
            />
            <YAxis 
              stroke="#475569" 
              tick={{ fill: '#64748b', fontSize: 12 }} 
              tickLine={false} 
              axisLine={false} 
              unit="s" 
              domain={[0, 'auto']} 
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              itemStyle={{ color: '#e2e8f0' }}
              labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
            />
            <Area
              type="monotone"
              dataKey="duration"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorDuration)"
              dot={<CustomizedDot />}
              activeDot={{ r: 6, strokeWidth: 0, fill: '#60a5fa' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
