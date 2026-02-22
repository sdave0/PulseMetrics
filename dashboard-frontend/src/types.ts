export interface Stats {
    total_runs: number;
    success_rate: number;
    median_duration: number | null;
    total_cost: number | null;
}

export interface TableRun {
    run_id: number;
    run_number: number;
    html_url: string;
    status: string;
    duration_seconds: number;
    cost_usd: number | null;
    created_at: string;
    commit_author: string;
    commit_message: string;
    branch: string;
    trigger_event?: string;
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
    job_category: string;
    status: string;
    current_duration: number;
    historical_avg: number | null;
    historical_durations: number[];
    percent_change: number | null;
    is_anomaly: boolean;
    last_healthy_run_sha: string | null;
    heuristic_summary?: string | null;
    attribution_confidence?: "high" | "medium" | null;
}

export interface JobBreakdownResponse {
    pipeline_name: string;
    commit_message: string;
    commit_sha: string;
    jobs: JobBreakdown[];
}

export interface AiReport {
    root_cause?: string;
    confidence?: string;
    remediation?: string;
    relevant_files?: string[];
    summary?: string;
}
