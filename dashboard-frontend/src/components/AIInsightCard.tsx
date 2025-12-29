import React from 'react';
import { mapConfidenceToPercentage, getConfidenceColor } from '../utils';
import { Sparkles, Loader2, FileCode, Wrench, AlertOctagon } from 'lucide-react';

interface AIInsightCardProps {
    hasAnomaly: boolean;
    confidenceLevel?: string | null;
    report?: string | null; // Kept for backward compatibility or raw text
    rootCause?: string | null;
    remediation?: string | null;
    relevantFiles?: string[] | null;
    heuristicSummary?: string | null;
    onAnalyze?: () => void;
    isAnalyzing?: boolean;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
    hasAnomaly,
    confidenceLevel,
    report,
    rootCause,
    remediation,
    relevantFiles,
    heuristicSummary,
    onAnalyze,
    isAnalyzing = false
}) => {
    const confidencePercent = mapConfidenceToPercentage(confidenceLevel);
    const barColor = getConfidenceColor(confidencePercent);

    const [rcSummary, ...rcDetailParts] = (rootCause || '').split('. ');
    const rcDetail = rcDetailParts.join('. ');

    const remediationSteps = (remediation || '')
        .split(/\n|- /)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    if (!hasAnomaly) {
        return (
            <div className="glass-panel rounded-xl p-6 flex flex-col items-center justify-center h-full text-center border border-emerald-900/30 bg-emerald-900/5">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <span className="text-emerald-400 text-xl">✓</span>
                </div>
                <h3 className="text-emerald-400 font-medium text-lg">System Nominal</h3>
                <p className="text-slate-500 text-sm mt-2">No significant anomalies detected in this run.</p>
            </div>
        );
    }

    const hasAiData = rootCause || remediation || (report && report.length > 0);

    return (
        <div className="glass-panel rounded-xl p-6 relative overflow-hidden flex flex-col h-full border-rose-900/30">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                    </div>
                    <div>
                        <h3 className="text-rose-400 font-bold text-lg leading-none">Anomaly Detected</h3>
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider font-medium mt-1">
                            {hasAiData ? 'AI Investigation' : 'Heuristic Scan'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800">
                    <div className="text-right">
                        <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Confidence</div>
                        <div className="text-sm font-bold text-white tabular-nums leading-none">{confidencePercent}%</div>
                    </div>
                    <div className="h-8 w-1 rounded-full bg-slate-800 overflow-hidden">
                        <div className={`w-full ${barColor} transition-all duration-1000 ease-out`} style={{ height: `${confidencePercent}%` }} />
                    </div>
                </div>
            </div>

            <div className="space-y-6 flex-grow overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '400px' }}>

                {heuristicSummary && (
                    <div>
                        <span className="text-xs text-slate-500 uppercase tracking-wider block mb-2 font-semibold">Key Signals</span>
                        <div className="flex flex-wrap gap-2">
                            {heuristicSummary.split('. ').map((signal, idx) => (
                                signal.trim() && (
                                    <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                        {signal.trim().replace(/\.$/, '')}
                                    </span>
                                )
                            ))}
                        </div>
                    </div>
                )}

                {hasAiData ? (
                    <div className="space-y-6 animate-in fade-in duration-500">

                        {rootCause && (
                            <div className="bg-rose-950/10 border border-rose-900/20 rounded-lg p-4">
                                <h4 className="text-rose-400 text-sm font-semibold mb-2 flex items-center gap-2">
                                    <AlertOctagon size={14} /> Root Cause
                                </h4>
                                <div className="space-y-2">
                                    <p className="text-slate-200 text-sm font-medium">{rcSummary}.</p>
                                    {rcDetail && (
                                        <ul className="space-y-1 mt-2">
                                            {rcDetail.replace(/([.!?])\s+-/g, '$1\n-').split(/\n/).map((line, idx) => {
                                                const cleanLine = line.trim();
                                                if (!cleanLine) return null;
                                                const isBullet = cleanLine.startsWith('-');
                                                const content = isBullet ? cleanLine.substring(1).trim() : cleanLine;

                                                return (
                                                    <li key={idx} className={`text-xs text-slate-400 leading-relaxed ${isBullet ? 'flex items-start gap-2' : ''}`}>
                                                        {isBullet && (
                                                            <span className="mt-1.5 w-1 h-1 rounded-full bg-rose-500/50 flex-shrink-0" />
                                                        )}
                                                        <span>{content}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        )}

                        {remediation && (
                            <div className="bg-blue-950/10 border border-blue-900/20 rounded-lg p-4">
                                <h4 className="text-blue-400 text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Wrench size={14} /> Action Plan
                                </h4>
                                <ul className="space-y-2">
                                    {remediationSteps.map((step, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                                            <div className="mt-0.5 min-w-[16px] h-4 rounded border border-blue-500/30 flex items-center justify-center">
                                                <div className="w-2 h-2 bg-blue-500 rounded-[1px]" />
                                            </div>
                                            <span className="leading-snug">{step}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {relevantFiles && relevantFiles.length > 0 && (
                            <div>
                                <h4 className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <FileCode size={12} /> Relevant Files
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {relevantFiles.map((file, idx) => (
                                        <span key={idx} className="text-slate-300 text-xs font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800 flex items-center gap-1">
                                            {file}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!rootCause && !remediation && report && (
                            <p className="text-slate-300 text-sm leading-relaxed">{report}</p>
                        )}
                    </div>
                ) : (
                    <div className="mt-4 p-6 border border-dashed border-slate-800 rounded-lg bg-slate-900/20 text-center">
                        <p className="text-slate-400 text-sm mb-4">
                            Deep analysis required to pinpoint root cause.
                        </p>
                        {onAnalyze && (
                            <button
                                onClick={onAnalyze}
                                disabled={isAnalyzing}
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-500/20 hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:cursor-not-allowed w-full justify-center"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={14} />
                                        Generate Deep Analysis
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
