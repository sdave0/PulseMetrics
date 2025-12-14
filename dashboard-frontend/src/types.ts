export interface Stats {
  total_runs: number;
  success_rate: number;
  median_duration: number;
}

export interface TableRun {
  run_id: number;
  run_number: number;
  html_url: string;
  status: string;
  duration_seconds: number;
  created_at: string;
  commit_author: string;
  commit_message: string;
}

export interface TableData {
  runs: TableRun[];
  totalPages: number;
  currentPage: number;
}

export interface AnomalyData {
  name: string;
  duration: number;
  rolling_avg: number | null;
  is_anomaly: boolean;
}

export interface JobBreakdown {
  job_name: string;
  status: string;
  current_duration: number;
  historical_avg: number | null;
  historical_durations: number[];
  percent_change: number | null;
  is_anomaly: boolean;
}

export interface JobBreakdownResponse {
  pipeline_name: string;
  commit_message: string;
  jobs: JobBreakdown[];
}

export interface JobTrendsData {
  chartData: Array<Record<string, string | number>>;
  jobNames: string[];
}
