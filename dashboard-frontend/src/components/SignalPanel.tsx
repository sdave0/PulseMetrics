import { Activity, TrendingUp, GitCommit, AlertTriangle } from 'lucide-react';
import type { Signal, PatternSignal, DriftSignal, ChangeSignal, AiAnalysisResult } from '../types';

interface SignalPanelProps {
    runId: number;
    signals: {
        patterns: PatternSignal[];
        drift: DriftSignal[];
        changes: ChangeSignal[];
        decision?: {
            shouldInvokeLLM: boolean;
            reason: string;
            priority: number;
            context: string[];
        };
        aiAnalysis?: AiAnalysisResult;
    };
}

export function SignalPanel({ runId, signals }: SignalPanelProps) {
    if (!signals || !runId) return null;

    const allSignals: Signal[] = [
        ...(signals.patterns || []),
        ...(signals.drift || []),
        ...(signals.changes || []),
    ];

    const signalCount = allSignals.length;
    const highConfidenceCount = allSignals.filter(s => s.confidence >= 0.8).length;

    return (
        <div className="glass-panel rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-slate-900 font-semibold text-lg flex items-center gap-2">
                    <Activity size={18} className="text-blue-500" />
                    Signal Extraction
                </h3>
                <div className="flex gap-2">
                    {signals.decision && (
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${signals.decision.shouldInvokeLLM
                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                            : 'bg-white/40 border-white/50 text-slate-600'
                            }`}>
                            {signals.decision.shouldInvokeLLM ? 'AI Active' : 'AI Skipped'}
                        </span>
                    )}
                    <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400 font-medium">
                        {signalCount} signals
                    </span>
                    <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-400 font-medium">
                        {highConfidenceCount} high confidence
                    </span>
                </div>
            </div>

            <div className="space-y-4">
                {/* Decision Insight */}
                {signals.decision && (
                    <div className={`p-3 rounded-lg border ${signals.decision.shouldInvokeLLM
                        ? 'bg-purple-900/20 border-purple-500/30'
                        : 'bg-white/50 border-white/50'
                        }`}>
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                                Decision Engine
                            </span>
                            <span className="text-xs font-mono text-slate-500">
                                Priority: {signals.decision.priority}/100
                            </span>
                        </div>
                        <p className={`text-sm ${signals.decision.shouldInvokeLLM ? 'text-purple-200' : 'text-slate-600'}`}>
                            {signals.decision.reason}
                        </p>
                    </div>
                )}

                {/* Agentic AI Analysis */}
                {signals.aiAnalysis && (
                    <div className="p-4 rounded-xl border border-purple-500/40 bg-purple-500/5 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-blue-500"></div>
                        <div className="mb-3">
                            <h4 className="text-sm font-semibold text-purple-200 flex items-center gap-2">
                                <Activity size={16} className="text-purple-400 animate-pulse" />
                                Agent Analysis
                                <span className="ml-auto text-xs py-0.5 px-2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                                    {signals.aiAnalysis.confidence.toUpperCase()} CONFIDENCE
                                </span>
                            </h4>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Root Cause</span>
                                <p className="text-slate-800 text-sm mt-0.5 leading-relaxed">
                                    {signals.aiAnalysis.root_cause}
                                </p>
                            </div>

                            <div className="bg-white/50 rounded p-2 border border-white/50">
                                <span className="text-xs font-bold text-emerald-500/80 uppercase tracking-wide flex items-center gap-1">
                                    <GitCommit size={12} /> Suggested Remediation
                                </span>
                                <p className="text-emerald-100/90 text-sm mt-0.5 font-mono">
                                    {signals.aiAnalysis.remediation}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Pattern Signals */}
                {signals.patterns.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-slate-600 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            Pattern Signals ({signals.patterns.length})
                        </h4>
                        <div className="space-y-2">
                            {signals.patterns.map((signal, idx) => (
                                <PatternSignalCard key={idx} signal={signal} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Drift Signals */}
                {signals.drift.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-slate-600 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            Drift Signals ({signals.drift.length})
                        </h4>
                        <div className="space-y-2">
                            {signals.drift.map((signal, idx) => (
                                <DriftSignalCard key={idx} signal={signal} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Change Signals */}
                {signals.changes.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-slate-600 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                            Change Signals ({signals.changes.length})
                        </h4>
                        <div className="space-y-2">
                            {signals.changes.map((signal, idx) => (
                                <ChangeSignalCard key={idx} signal={signal} />
                            ))}
                        </div>
                    </div>
                )}

                {signalCount === 0 && (
                    <div className="text-center py-8 text-slate-500">
                        <Activity size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No signals extracted for this run</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function PatternSignalCard({ signal }: { signal: PatternSignal }) {
    const categoryColors: Record<string, string> = {
        test: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        build: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        lint: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        deploy: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        dependency: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        unknown: 'text-slate-600 bg-slate-500/10 border-slate-500/20',
    };

    return (
        <div className="bg-white/50 border border-white/50 rounded-lg p-3 hover:border-purple-500/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${categoryColors[signal.category]}`}>
                            {signal.category}
                        </span>
                        {signal.failureType && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium border border-rose-500/20 bg-rose-500/10 text-rose-400">
                                {signal.failureType}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-700 font-mono truncate">{signal.jobName}</p>
                </div>
                <ConfidenceBadge confidence={signal.confidence} />
            </div>
        </div>
    );
}

function DriftSignalCard({ signal }: { signal: DriftSignal }) {
    const isRegression = signal.percentChange > 0;

    return (
        <div className="bg-white/50 border border-white/50 rounded-lg p-3 hover:border-amber-500/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={14} className={isRegression ? 'text-rose-400' : 'text-emerald-400'} />
                        <span className="text-sm text-slate-700 font-medium">
                            {signal.jobName || 'Workflow'} Duration
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <div>
                            <span className="text-slate-500">Current:</span>{' '}
                            <span className="text-slate-700 font-mono">{signal.currentValue.toFixed(1)}s</span>
                        </div>
                        <div>
                            <span className="text-slate-500">Baseline:</span>{' '}
                            <span className="text-slate-700 font-mono">{signal.baselineValue.toFixed(1)}s</span>
                        </div>
                        <div className={isRegression ? 'text-rose-400' : 'text-emerald-400'}>
                            {isRegression ? '+' : ''}{signal.percentChange.toFixed(1)}%
                        </div>
                    </div>
                </div>
                <ConfidenceBadge confidence={signal.confidence} />
            </div>
        </div>
    );
}

function ChangeSignalCard({ signal }: { signal: ChangeSignal }) {
    const impactColors: Record<string, string> = {
        low: 'text-slate-600 bg-slate-500/10 border-slate-500/20',
        medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        high: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    };

    const getIcon = () => {
        switch (signal.changeType) {
            case 'lockfile':
                return <GitCommit size={14} className="text-cyan-400" />;
            case 'test_count':
                return <Activity size={14} className="text-cyan-400" />;
            case 'code_churn':
                return <AlertTriangle size={14} className="text-cyan-400" />;
            default:
                return <GitCommit size={14} className="text-cyan-400" />;
        }
    };

    return (
        <div className="bg-white/50 border border-white/50 rounded-lg p-3 hover:border-cyan-500/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        {getIcon()}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${impactColors[signal.impact]}`}>
                            {signal.impact} impact
                        </span>
                    </div>
                    <p className="text-sm text-slate-700">{signal.description}</p>
                </div>
                <ConfidenceBadge confidence={signal.confidence} />
            </div>
        </div>
    );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
    const percentage = Math.round(confidence * 100);
    const color = confidence >= 0.8 ? 'text-emerald-400' : confidence >= 0.6 ? 'text-amber-400' : 'text-slate-600';

    return (
        <div className={`text-xs font-mono ${color} flex-shrink-0`}>
            {percentage}%
        </div>
    );
}
