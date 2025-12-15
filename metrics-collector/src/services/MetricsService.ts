import { MetricsRepository } from '../db/MetricsRepository';
import { MetricsPayload, Workflow, WorkflowRunRow, Job } from '../types';
import { safeDuration, safeString, safeDate } from '../utils/dataUtils';

const repo = new MetricsRepository();

const ANOMALY_WINDOW_SIZE = 5;
const ANOMALY_THRESHOLD_DURATION = 1.3; // 30% increase
const ANOMALY_THRESHOLD_JOB = 1.25;      // 25% increase

const RUNNER_COSTS_PER_MINUTE: Record<string, number> = {
  'ubuntu-latest': 0.008,
  'windows-latest': 0.016,
  'macos-latest': 0.08,
  'self-hosted': 0,
  'unknown': 0.008 
};

function inferJobCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('test') || n.includes('spec') || n.includes('e2e')) return 'test';
  if (n.includes('build') || n.includes('compile') || n.includes('pack')) return 'build';
  if (n.includes('lint') || n.includes('format') || n.includes('check')) return 'lint';
  if (n.includes('deploy') || n.includes('publish') || n.includes('release')) return 'deploy';
  if (n.includes('install') || n.includes('setup') || n.includes('dep')) return 'dependency';
  return 'unknown';
}

export class MetricsService {
  
  async processMetrics(payload: MetricsPayload): Promise<void> {
    const { workflow, commit, jobs, test_summary, build_analysis, artifacts } = payload;
    
    const projectId = await repo.upsertProject(workflow.name, workflow.html_url);

    const normWorkflow: Workflow = {
      ...workflow,
      status: safeString(workflow.status, 'unknown'),
      trigger: safeString(workflow.trigger, 'manual'),
      branch: safeString(workflow.branch, 'HEAD'),
      duration_seconds: safeDuration(workflow.duration_seconds),
      completed_at: safeDate(workflow.completed_at, workflow.created_at),
      created_at: safeDate(workflow.created_at, new Date().toISOString())
    };

    const normCommit = {
        sha: safeString(commit?.sha, '0000000'),
        message: safeString(commit?.message, 'No message'),
        author: safeString(commit?.author, 'Unknown')
    };

    let totalCost = 0;
    if (jobs) {
        jobs.forEach(j => {
            const dur = j.duration_seconds || 0;
            const type = j.runner_type || 'unknown';
            const rate = RUNNER_COSTS_PER_MINUTE[type] ?? RUNNER_COSTS_PER_MINUTE['unknown'];
            totalCost += (dur / 60) * rate;
        });
    }

    await repo.upsertWorkflowRun(
        normWorkflow, 
        projectId, 
        normCommit, 
        jobs, 
        test_summary || {}, 
        build_analysis || {}, 
        artifacts || [],
        totalCost
    );
  }

  async getPipelines(): Promise<string[]> {
    return await repo.getPipelines();
  }

  async getStats(pipeline?: string) {
    const stats = await repo.getStats(pipeline);
    const successRate = (parseInt(stats.total_runs, 10) > 0) ? (parseInt(stats.successful_runs, 10) / parseInt(stats.total_runs, 10)) * 100 : 0;
    
    return {
      total_runs: parseInt(stats.total_runs, 10),
      success_rate: parseFloat(successRate.toFixed(1)),
      median_duration: stats.median_duration ? parseFloat(String(stats.median_duration)) : 0,
      total_cost: stats.total_cost ? parseFloat(stats.total_cost) : 0,
    };
  }

  async getChartData() {
    return await repo.getChartData();
  }

  async getRunsTable(page: number, limit: number, pipeline?: string) {
    const offset = (page - 1) * limit;
    const { runs, totalRuns } = await repo.getRunsTable(limit, offset, pipeline);
    const totalPages = Math.ceil(totalRuns / limit);
    
    return {
      runs,
      totalPages,
      currentPage: page,
    };
  }

  async getDurationAnalysis(pipeline?: string) {
    const runs = await repo.getDurationAnalysis(pipeline);

    return runs.map((run, index, allRuns) => {
      let cumulativeAvg = null;
      let is_anomaly = false;

      // Cumulative average (Lifetime)
      const window = allRuns.slice(0, index + 1);
      const sum = window.reduce((acc: number, cur: WorkflowRunRow) => acc + cur.duration_seconds, 0);
      cumulativeAvg = sum / (index + 1);

      // Anomaly detection using Sliding Window (Previous N runs)
      if (index >= ANOMALY_WINDOW_SIZE) {
        const anomalyWindow = allRuns.slice(index - ANOMALY_WINDOW_SIZE, index);
        const anomalySum = anomalyWindow.reduce((acc: number, cur: WorkflowRunRow) => acc + cur.duration_seconds, 0);
        const slidingWindowAvg = anomalySum / ANOMALY_WINDOW_SIZE;

        if (run.duration_seconds > slidingWindowAvg * ANOMALY_THRESHOLD_DURATION) {
          is_anomaly = true;
        }
      }
      
      return {
        ...run,
        name: new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` (#${run.run_number})`,
        duration: run.duration_seconds,
        rolling_avg: cumulativeAvg ? parseFloat(cumulativeAvg.toFixed(2)) : null,
        is_anomaly: is_anomaly,
      };
    });
  }

  async getJobBreakdown(pipeline?: string) {
    const historySize = ANOMALY_WINDOW_SIZE;
    const runs = await repo.getJobBreakdown(historySize, pipeline);

    if (runs.length === 0) {
      return { pipeline_name: 'N/A', commit_message: 'N/A', commit_sha: 'N/A', jobs: [] };
    }
    
    if (runs.length < 2) {
      const mostRecentRun = runs[0];
      const jobs = mostRecentRun.jobs.map((job: Job) => ({
        job_name: job.name,
        job_category: inferJobCategory(job.name),
        status: job.status,
        current_duration: job.duration_seconds,
        historical_avg: null,
        historical_durations: [],
        percent_change: null,
        is_anomaly: false,
        last_healthy_run_sha: null
      }));
      return {
        pipeline_name: mostRecentRun.workflow_name,
        commit_message: mostRecentRun.commit_message,
        commit_sha: mostRecentRun.commit_sha,
        jobs: jobs,
      };
    }

    const mostRecentRun = runs[0];
    const historicalRuns = runs.slice(1);
    const historicalData: { [key: string]: { durations: number[], lastHealthySha: string | null } } = {};

    for (const run of historicalRuns) {
      for (const job of run.jobs) {
        if (!historicalData[job.name]) {
          historicalData[job.name] = { durations: [], lastHealthySha: null };
        }
        if (job.status === 'success') {
            const dur = job.duration_seconds;
            if (dur !== null) {
                historicalData[job.name].durations.push(dur);
            }
            if (!historicalData[job.name].lastHealthySha && run.commit_sha) {
                historicalData[job.name].lastHealthySha = run.commit_sha;
            }
        }
      }
    }

    const breakdown = mostRecentRun.jobs.map((job: Job) => {
      const history = historicalData[job.name];
      const historicalDurations = history ? history.durations.reverse() : [];
      
      let historicalAvg = null;
      if (historicalDurations.length > 0) {
        historicalAvg = historicalDurations.reduce((a: number, b: number) => a + b, 0) / historicalDurations.length;
      }
      
      let percentChange = null;
      let isAnomaly = false;

      if (historicalAvg && historicalAvg > 0 && job.status === 'success' && job.duration_seconds !== null) {
        percentChange = ((job.duration_seconds - historicalAvg) / historicalAvg) * 100;
        if (percentChange > (ANOMALY_THRESHOLD_JOB - 1) * 100) {
          isAnomaly = true;
        }
      } else if (job.status === 'failure') {
        isAnomaly = true;
      }

      return {
        job_name: job.name,
        job_category: inferJobCategory(job.name),
        status: job.status,
        current_duration: job.duration_seconds,
        historical_avg: historicalAvg ? parseFloat(historicalAvg.toFixed(2)) : null,
        historical_durations: historicalDurations,
        percent_change: percentChange ? parseFloat(percentChange.toFixed(1)) : null,
        is_anomaly: isAnomaly,
        last_healthy_run_sha: history ? history.lastHealthySha : null
      };
    });

    return {
      pipeline_name: mostRecentRun.workflow_name,
      commit_message: mostRecentRun.commit_message,
      commit_sha: mostRecentRun.commit_sha,
      jobs: breakdown,
    };
  }

  async getJobTrends(pipeline?: string) {
    const limit = 30;
    const runs = await repo.getJobTrends(limit, pipeline);
    const jobNames = new Set<string>();
    const chartData = runs.map((run: WorkflowRunRow) => {
      const runData: Record<string, string | number> = {
        name: new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` (#${run.run_number})`,
      };

      for (const job of run.jobs) {
        if (job.status === 'success' && job.duration_seconds !== null) {
          jobNames.add(job.name);
          runData[job.name] = job.duration_seconds;
        }
      }
      return runData;
    });

    return { 
      chartData,
      jobNames: Array.from(jobNames)
    };
  }
}
