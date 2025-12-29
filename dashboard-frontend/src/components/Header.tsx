import React from 'react';
import { GitBranch } from 'lucide-react';
import type { Stats } from '../types';

interface HeaderProps {
    pipelines: string[];
    selectedPipeline: string;
    onPipelineChange: (pipeline: string) => void;
    stats: Stats | null;
    dateRange: '24h' | '7d' | '30d' | 'all';
    onDateRangeChange: (range: '24h' | '7d' | '30d' | 'all') => void;
    hasAnomaly?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ pipelines, selectedPipeline, onPipelineChange, stats, dateRange, onDateRangeChange, hasAnomaly }) => {
    return (
        <header className="sticky top-0 z-50 glass-panel border-b-0 mb-6">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-3">
                        <div className="bg-blue-600/20 rounded-lg shadow-lg shadow-blue-900/20 border border-blue-500/30">
                            <img src="/icon-p1.png" alt="Pulse Logo" className="w-8 h-8 object-contain" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">Pulse</span>
                        <span className="text-slate-600">/</span>
                        <div className="flex items-center gap-2 text-slate-300 font-medium">
                            <GitBranch size={16} className="text-slate-500" />
                            <select
                                value={selectedPipeline}
                                onChange={(e) => onPipelineChange(e.target.value)}
                                className="bg-transparent border-none focus:ring-0 text-slate-200 font-medium cursor-pointer hover:text-white transition-colors"
                            >
                                {pipelines.map((p) => (
                                    <option key={p} value={p} className="bg-slate-900 text-slate-200">
                                        {p}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {stats && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${!hasAnomaly && stats.success_rate > 90
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${!hasAnomaly && stats.success_rate > 90 ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            {!hasAnomaly && stats.success_rate > 90 ? 'System Nominal' : 'Degraded Performance'}
                        </span>
                    )}
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg px-3 py-1.5 border border-slate-800">
                        <span className="text-xs text-slate-500 font-medium">Period:</span>
                        <select
                            value={dateRange}
                            onChange={(e) => onDateRangeChange(e.target.value as any)}
                            className="bg-transparent border-none focus:ring-0 text-xs font-medium text-slate-300 cursor-pointer hover:text-white transition-colors p-0 pr-6"
                        >
                            <option value="24h" className="bg-slate-900">Last 24 Hours</option>
                            <option value="7d" className="bg-slate-900">Last 7 Days</option>
                            <option value="30d" className="bg-slate-900">Last 30 Days</option>
                            <option value="all" className="bg-slate-900">Any time</option>
                        </select>
                    </div>
                </div>
            </div>
        </header>
    );
};
