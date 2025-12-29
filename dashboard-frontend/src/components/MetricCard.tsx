import React from 'react';
import { ArrowUpRight, ArrowDownRight, Activity, Clock, Hash, DollarSign } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    subtext?: string;
    trend?: string;
    trendUp?: boolean;
    type?: 'success' | 'warning' | 'error' | 'neutral' | 'cost' | 'duration';
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtext, trend, trendUp, type = 'neutral' }) => {
    let Icon = Activity;
    if (title.includes('Duration')) Icon = Clock;
    if (title.includes('Runs')) Icon = Hash;
    if (title.includes('Cost')) Icon = DollarSign;

    const colorMap = {
        success: { border: 'from-emerald-500/50 to-teal-500/50', icon: 'text-emerald-500' },
        warning: { border: 'from-amber-500/50 to-orange-500/50', icon: 'text-amber-500' },
        error: { border: 'from-rose-500/50 to-red-500/50', icon: 'text-rose-500' },
        neutral: { border: 'from-blue-500/50 to-indigo-500/50', icon: 'text-blue-500' },
        cost: { border: 'from-emerald-400/50 to-green-500/50', icon: 'text-emerald-400' },
        duration: { border: 'from-blue-400/50 to-cyan-500/50', icon: 'text-blue-400' },
    };

    const colors = colorMap[type] || colorMap.neutral;

    return (
        <div className="glass-panel rounded-xl p-5 relative overflow-hidden group hover:bg-slate-800/50 transition-colors">
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${colors.border} opacity-50 group-hover:opacity-100 transition-opacity`} />

            <div className="flex justify-between items-start mb-2">
                <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
                    <Icon size={14} className={colors.icon} />
                    {title}
                </h3>
                {trend && (
                    <span className={`flex items-center text-xs font-bold px-1.5 py-0.5 rounded ${trendUp
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                        {trendUp ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
                        {trend}
                    </span>
                )}
            </div>

            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white tracking-tight tabular-nums">
                    {value}
                </span>
                {subtext && (
                    <span className="text-slate-500 text-xs font-medium">
                        {subtext}
                    </span>
                )}
            </div>
        </div>
    );
};
