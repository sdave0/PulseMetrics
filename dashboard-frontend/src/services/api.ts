import axios from 'axios';
import type { Stats, TableData, AnomalyData, JobBreakdownResponse, AiReport } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const fetchPipelines = async (): Promise<string[]> => {
    const response = await api.get<string[]>('/api/pipelines');
    return response.data;
};

export const fetchStats = async (pipeline?: string): Promise<Stats> => {
    const params = pipeline ? { pipeline } : {};
    const response = await api.get<Stats>('/api/stats', { params });
    return response.data;
};

export const fetchRunsTable = async (page: number, limit: number, pipeline?: string): Promise<TableData> => {
    const params = { page, limit, ...(pipeline && { pipeline }) };
    const response = await api.get<TableData>('/api/runs/table', { params });
    return response.data;
};

export const fetchDurationAnalysis = async (pipeline?: string): Promise<AnomalyData[]> => {
    const params = pipeline ? { pipeline } : {};
    const response = await api.get<AnomalyData[]>('/api/runs/duration-analysis', { params });
    return response.data;
};

export const fetchJobBreakdown = async (pipeline?: string, runId?: number): Promise<JobBreakdownResponse> => {
    const params = {
        ...(pipeline && { pipeline }),
        ...(runId && { run_id: runId })
    };
    const response = await api.get<JobBreakdownResponse>('/api/jobs/breakdown', { params });
    return response.data;
};

export const generateAiSummary = async (prompt: string): Promise<AiReport> => {
    const response = await api.post<{ summary: string }>('/api/generate-summary', { prompt });
    if (response.data && response.data.summary) {
        try {
            return JSON.parse(response.data.summary);
        } catch (e) {
            return { summary: response.data.summary };
        }
    }
    return { summary: "No summary generated." };
};
