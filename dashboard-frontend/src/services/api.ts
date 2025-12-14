import axios from 'axios';
import { z } from 'zod';
import { config } from '../config';
import { 
  Stats, TableData, AnomalyData, JobBreakdownResponse, JobTrendsData 
} from '../types';

const apiClient = axios.create({
  baseURL: config.API_URL,
});

// --- Zod Schemas ---

const StatsSchema = z.object({
  total_runs: z.number().nullable().transform(v => v || 0),
  success_rate: z.number().nullable().transform(v => v || 0),
  median_duration: z.number().nullable().transform(v => v || 0),
});

const TableRunSchema = z.object({
  run_id: z.union([z.number(), z.string()]).transform(Number), // Handles bigint as string
  run_number: z.number(),
  html_url: z.string().nullable().transform(v => v || '#'),
  status: z.string().nullable().transform(v => v || 'unknown'),
  duration_seconds: z.number().nullable().transform(v => v || -1),
  created_at: z.string(),
  commit_author: z.string().nullable().transform(v => v || 'Unknown'),
  commit_message: z.string().nullable().transform(v => v || 'No message'),
});

const TableDataSchema = z.object({
  runs: z.array(TableRunSchema),
  totalPages: z.number().nullable().transform(v => v || 0),
  currentPage: z.number().nullable().transform(v => v || 1),
});

const AnomalyDataSchema = z.object({
  name: z.string(),
  duration: z.number(),
  rolling_avg: z.number().nullable(),
  is_anomaly: z.boolean(),
});

const JobBreakdownSchema = z.object({
  job_name: z.string(),
  status: z.string().nullable().transform(v => v || 'unknown'),
  current_duration: z.number().nullable().transform(v => v || -1),
  historical_avg: z.number().nullable(),
  historical_durations: z.array(z.number()),
  percent_change: z.number().nullable(),
  is_anomaly: z.boolean(),
});

const JobBreakdownResponseSchema = z.object({
  pipeline_name: z.string().nullable().transform(v => v || 'Unknown Project'),
  commit_message: z.string().nullable().transform(v => v || ''),
  jobs: z.array(JobBreakdownSchema),
});

const JobTrendsDataSchema = z.object({
  chartData: z.array(z.record(z.union([z.string(), z.number()]))),
  jobNames: z.array(z.string()),
});

// --- Service Methods ---

export const apiService = {
  
  async getPipelines(): Promise<string[]> {
    const res = await apiClient.get('/api/pipelines');
    return res.data || [];
  },

  async getStats(pipeline?: string): Promise<Stats> {
    const params = pipeline ? { pipeline } : {};
    const res = await apiClient.get('/api/stats', { params });
    return res.data as Stats;
  },

  async getRunsTable(page: number, limit: number, pipeline?: string): Promise<TableData> {
    const params = { page, limit, ...(pipeline ? { pipeline } : {}) };
    const res = await apiClient.get('/api/runs/table', { params });
    return res.data as TableData;
  },

  async getDurationAnalysis(pipeline?: string): Promise<AnomalyData[]> {
    const params = pipeline ? { pipeline } : {};
    const res = await apiClient.get('/api/runs/duration-analysis', { params });
    return res.data || [];
  },

  async getJobBreakdown(pipeline?: string): Promise<JobBreakdownResponse> {
    const params = pipeline ? { pipeline } : {};
    const res = await apiClient.get('/api/jobs/breakdown', { params });
    return res.data as JobBreakdownResponse;
  },

  async getJobTrends(limit: number, pipeline?: string): Promise<JobTrendsData> {
    const params = { limit, ...(pipeline ? { pipeline } : {}) };
    const res = await apiClient.get('/api/jobs/trends', { params });
    return res.data as JobTrendsData;
  },

  async generateAiSummary(prompt: string): Promise<string> {
    const res = await apiClient.post('/api/generate-summary', { prompt });
    return res.data.summary;
  }
};