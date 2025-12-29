import { useState, useEffect, useMemo } from 'react';
import {
  fetchPipelines,
  fetchStats,
  fetchRunsTable,
  fetchDurationAnalysis,
  fetchJobBreakdown,
  generateAiSummary
} from '../services/api';

import type {
  Stats,
  TableData,
  AnomalyData,
  JobBreakdownResponse,
  AiReport,
  TableRun
} from '../types';

export const useDashboardData = () => {
  const [pipelines, setPipelines] = useState<string[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

  const [stats, setStats] = useState<Stats | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [analysisData, setAnalysisData] = useState<AnomalyData[]>([]);
  const [jobBreakdownData, setJobBreakdownData] = useState<JobBreakdownResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI State
  const [aiReport, setAiReport] = useState<AiReport | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);

  useEffect(() => {
    const loadPipelines = async () => {
      try {
        const data = await fetchPipelines();
        if (Array.isArray(data)) {
          setPipelines(data);
          if (data.length > 0) setSelectedPipeline(data[0]);
        } else {
          console.error("fetchPipelines returned non-array data:", data);
          setPipelines([]);
        }
      } catch (e) {
        console.error("Failed to fetch pipelines", e);
        setError("Failed to load pipelines.");
      }
    };
    loadPipelines();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (pipelines.length > 0 && !selectedPipeline) return;

      try {
        setLoading(true);

        const [statsData, tableRes, chartData, jobsData] = await Promise.all([
          fetchStats(selectedPipeline),
          fetchRunsTable(currentPage, 50, selectedPipeline),
          fetchDurationAnalysis(selectedPipeline),
          fetchJobBreakdown(selectedPipeline, selectedRunId || undefined)
        ]);

        setStats(statsData);
        setTableData(tableRes);
        setAnalysisData(chartData);
        setJobBreakdownData(jobsData);
        setError(null);
      } catch (e) {
        console.error("Failed to fetch dashboard data", e);
        setError("Failed to load dashboard data. Please check the backend connection.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedPipeline, currentPage, pipelines.length, selectedRunId]);

  const filteredRuns = useMemo(() => {
    if (!tableData || !tableData.runs) return [];
    if (dateRange === 'all') return tableData.runs;

    const now = new Date();
    const cutoff = new Date();
    if (dateRange === '24h') cutoff.setHours(now.getHours() - 24);
    if (dateRange === '7d') cutoff.setDate(now.getDate() - 7);
    if (dateRange === '30d') cutoff.setDate(now.getDate() - 30);

    return tableData.runs.filter(run => new Date(run.created_at) >= cutoff);
  }, [tableData, dateRange]);

  // Derived State: Anomalies
  const hasAnomaly = jobBreakdownData?.jobs?.some(j => j.is_anomaly) || false;
  const anomalyJob = jobBreakdownData?.jobs?.find(j => j.is_anomaly);

  // Handlers
  const handleRunClick = (run: TableRun) => {
    setSelectedRunId(run.run_id);
    // Also scroll to top or insight card?
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnalyzeClick = async () => {
    if (!jobBreakdownData) return;

    setIsAiLoading(true);
    setAiError('');

    const prompt = `
      You are a Senior DevOps Engineer analyzing a CI/CD pipeline regression.
      
      Context:
      - Pipeline: "${jobBreakdownData.pipeline_name}"
      - Commit: "${jobBreakdownData.commit_message}"
      
      Job Breakdown & Heuristics:
      ${JSON.stringify(jobBreakdownData.jobs, null, 2)}

      Task:
      1. Root Cause: Start with a single, punchy summary sentence. Then, list contributing factors as bullet points (-).
      2. Remediation: Provide a bulleted list (-) of specific actions.
      3. Style: Be concise. Use short bullets. No fluff.
      4. Heuristics:
         - If lockfile changed + slow build -> Suggest dependency cache miss.
         - If test count up -> Suggest new tests are slow.
    `;

    try {
      const result = await generateAiSummary(prompt);
      setAiReport(result);
    } catch (err: unknown) {
      console.error("AI Analysis Error:", err);
      let msg = 'Failed to generate AI analysis.';
      if (err instanceof Error) {
        msg = err.message;
      }
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const resp = (err as { response: { data?: { error?: string } } }).response;
        if (resp?.data?.error) {
          msg = resp.data.error;
        }
      }
      setAiError(msg);
    } finally {
      setIsAiLoading(false);
    }
  };

  return {
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
    currentPage,
    setCurrentPage,
    handleRunClick,
    selectedRunId
  };
};
