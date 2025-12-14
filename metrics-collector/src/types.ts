export interface Job {
  name: string;
  status: string | null;
  duration_seconds: number | null;
  started_at?: string;
  completed_at?: string;
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
}

export interface Workflow {
  run_id: number;
  run_number: number;
  name: string;
  html_url: string;
  status: string | null;
  trigger: string;
  branch: string;
  duration_seconds: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface TestSummary {
  passed: number;
  failed: number;
  total: number;
  suites: number;
}

export interface BuildAnalysis {
  cache_status: string;
  build_size_kb: number;
}

export interface Artifact {
  name: string;
  size_kb: number;
}

export interface MetricsPayload {
  workflow: Workflow;
  commit: Commit | null;
  jobs: Job[];
  test_summary: TestSummary | null;
  build_analysis: BuildAnalysis | null;
  artifacts: Artifact[];
}

export interface WorkflowRunRow {
  run_number: number;
  duration_seconds: number;
  created_at: Date;
  jobs: Job[];
  workflow_name?: string;
  commit_message?: string;
}

export interface StatsRow {
  total_runs: string;
  successful_runs: string;
  median_duration: number;
}
