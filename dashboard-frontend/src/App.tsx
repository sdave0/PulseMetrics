import { useState } from 'react';
import { MetricCard } from './components/MetricCard';
import { JobVisualization } from './components/JobVisualization';
import { AIInsightCard } from './components/AIInsightCard';
import { RunsTable } from './components/RunsTable';
import { Header } from './components/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DurationChart } from './components/DurationChart';
import { useDashboardData } from './hooks/useDashboardData';
import { Calendar, GitBranch } from 'lucide-react';
import {
  formatDuration,
  formatCost,
  formatPercentage,
  formatCount,
  formatCommit
} from './utils/formatters';
import './index.css';

function Dashboard() {
  const {
    pipelines,
    selectedPipeline,
    setSelectedPipeline,
    dateRange,
    setDateRange,
    stats,
    analysisData,
    jobBreakdownData,
    loading,
    error,
    aiReport,
    isAiLoading,
    aiError,
    filteredRuns,
    hasAnomaly,
    anomalyJob,
    handleAnalyzeClick,
    handleRunClick,
    selectedRunId
  } = useDashboardData();

  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">

      <Header
        pipelines={pipelines}
        selectedPipeline={selectedPipeline}
        onPipelineChange={setSelectedPipeline}
        stats={stats}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        hasAnomaly={hasAnomaly}
      />

      <main className="max-w-7xl mx-auto px-6 pb-12 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <div className="text-slate-500 font-medium animate-pulse">Loading Pulse Data...</div>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-rose-400 bg-rose-500/10 px-6 py-4 rounded-xl border border-rose-500/20 shadow-lg">
              <span className="font-semibold mr-2">Error:</span> {error}
            </div>
          </div>
        ) : (
          <>
            {/* ZONE 2: Hero (Metrics + Chart) */}
            <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Col 1: Metrics (1fr) */}
              <div className="lg:col-span-1 grid grid-cols-1 gap-4">
                <MetricCard
                  title="Success Rate"
                  value={formatPercentage(stats?.success_rate)}
                  type="success"
                />
                <MetricCard
                  title="Median Duration"
                  value={formatDuration(stats?.median_duration)}
                  type="duration"
                />
                <MetricCard
                  title="Total Runs"
                  value={formatCount(stats?.total_runs)}
                  type="neutral"
                />
                <MetricCard
                  title="Est. Cost"
                  value={formatCost(stats?.total_cost)}
                  type="cost"
                />
              </div>

              {/* Col 2: Chart (3fr) */}
              <DurationChart data={analysisData} />
            </section>

            {/* ZONE 3: Active Run (Job Viz + AI) */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Job Viz (2fr) */}
              <div className="lg:col-span-2">
                <div className="glass-panel rounded-xl p-6">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                      <GitBranch size={18} className="text-blue-500" />
                      Recent Run Execution
                    </h3>
                    <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 font-mono border border-slate-700">
                      {formatCommit(jobBreakdownData?.commit_sha)}
                    </span>
                  </div>
                  {jobBreakdownData && (
                    <JobVisualization
                      jobs={jobBreakdownData.jobs}
                      selectedJob={selectedJob}
                      onJobClick={setSelectedJob}
                    />
                  )}
                </div>
              </div>

              {/* AI Insight (1fr) */}
              <div className="space-y-6">
                {aiError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg text-sm">
                    {aiError}
                  </div>
                )}

                {(hasAnomaly || aiReport) && (
                  <AIInsightCard
                    hasAnomaly={hasAnomaly}
                    confidenceLevel={aiReport?.confidence || anomalyJob?.attribution_confidence}
                    report={aiReport?.summary}
                    rootCause={aiReport?.root_cause}
                    remediation={aiReport?.remediation}
                    relevantFiles={aiReport?.relevant_files}
                    heuristicSummary={anomalyJob?.heuristic_summary}
                    onAnalyze={handleAnalyzeClick}
                    isAnalyzing={isAiLoading}
                  />
                )}
              </div>
            </section>

            {/* ZONE 4: History */}
            <section className="glass-panel rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Calendar size={16} className="text-slate-500" />
                  Run History
                </h3>
                <div className="text-xs text-slate-500 font-medium bg-slate-800 px-2 py-1 rounded">
                  Showing {filteredRuns.length} runs
                </div>
              </div>
              <RunsTable
                runs={filteredRuns}
                onRunClick={handleRunClick}
                selectedRunId={selectedRunId || undefined}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}

export default App;