export interface Job {
  name: string;
  status: string | null;
  duration_seconds: number | null;
  started_at?: string;
  completed_at?: string;
  runner_type?: string;
}

export interface CommitAnalysis {
  total_files: number;
  lockfile_changed: boolean;
  test_files_count: number;
  src_files_count: number;
}

export interface Commit {
  sha: string;
  parent_sha?: string;
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
  commit_analysis?: CommitAnalysis | null;
  artifacts: Artifact[];
}

export interface WorkflowRunRow {
  run_number: number;
  duration_seconds: number | null;
  cost_usd?: number;
  created_at: Date;
  jobs: Job[];
  workflow_name?: string;
  commit_message?: string;
  commit_sha?: string;
  commit_parent_sha?: string;
  commit_analysis?: CommitAnalysis;
  test_summary?: TestSummary;
}

export interface StatsRow {
  total_runs: string;
  successful_runs: string;
  median_duration: number | null;
  total_cost: string | null;
}
