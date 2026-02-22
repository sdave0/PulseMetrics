import React from 'react';
import { GitCommit, Calendar, PlayCircle } from 'lucide-react';
import { formatDuration, formatTrigger } from '../utils/formatters';
import type { TableRun } from '../types';

interface RunsTableProps {
    runs: TableRun[];
    onRunClick: (run: TableRun) => void;
    selectedRunId?: number;
}

export const RunsTable: React.FC<RunsTableProps> = ({ runs, onRunClick, selectedRunId }) => {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm whitespace-nowrap">
                <thead className="uppercase tracking-wider border-b border-slate-800 bg-slate-900/50 text-slate-500 font-semibold text-xs">
                    <tr>
                        <th scope="col" className="px-6 py-4">Run ID</th>
                        <th scope="col" className="px-6 py-4">Date</th>
                        <th scope="col" className="px-6 py-4">Status</th>
                        <th scope="col" className="px-6 py-4">Duration</th>
                        <th scope="col" className="px-6 py-4">Trigger</th>
                        <th scope="col" className="px-6 py-4">Commit</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                    {runs.map((run) => {
                        const isSelected = selectedRunId === run.run_id;
                        return (
                            <tr
                                key={run.run_id}
                                onClick={() => onRunClick(run)}
                                className={`
                  cursor-pointer transition-all duration-200 hover:bg-slate-800/40
                  ${isSelected ? 'bg-blue-900/10 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}
                `}
                            >
                                <td className="px-6 py-4 font-mono text-slate-300">
                                    <span className="text-slate-500">#</span>{run.run_number}
                                </td>
                                <td className="px-6 py-4 text-slate-400 flex items-center gap-2">
                                    <Calendar size={12} />
                                    {new Date(run.created_at).toLocaleDateString()}
                                    <span className="text-slate-600 text-xs">{new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`
                    inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize shadow-sm
                    ${run.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' :
                                            run.status === 'failure' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]' :
                                                'bg-slate-700/50 text-slate-300 border border-slate-600'}
                  `}>
                                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${run.status === 'success' ? 'bg-emerald-400' :
                                            run.status === 'failure' ? 'bg-rose-400' : 'bg-slate-400'
                                            }`} />
                                        {run.status || 'unknown'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-300 font-mono text-xs">
                                    {formatDuration(run.duration_seconds)}
                                </td>
                                <td className="px-6 py-4 text-slate-400">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs">
                                        <PlayCircle size={10} />
                                        {formatTrigger(run.trigger_event)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-500 max-w-xs truncate font-mono text-xs">
                                    <div className="flex items-center gap-2">
                                        <GitCommit size={12} />
                                        <span className="text-slate-300">{run.branch}</span>
                                        <span className="text-slate-600">|</span>
                                        <span className="truncate">{run.commit_message || '-'}</span>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
