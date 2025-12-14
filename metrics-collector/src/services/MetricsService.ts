import { MetricsRepository } from '../db/MetricsRepository';
import { MetricsPayload, Workflow } from '../types';
import { safeDuration, safeString, safeDate } from '../utils/dataUtils';

const repo = new MetricsRepository();

export class MetricsService {
  
  // --- Ingestion Logic ---

  async processMetrics(payload: MetricsPayload): Promise<void> {
    const { workflow, commit, jobs, test_summary, build_analysis, artifacts } = payload;
    
    // 1. Auto-provision Project
    const projectId = await repo.upsertProject(workflow.name, workflow.html_url);

    // 2. Normalize Data
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

    // 3. Save Run
    await repo.upsertWorkflowRun(
        normWorkflow, 
        projectId, 
        normCommit, 
        jobs, 
        test_summary, 
        build_analysis, 
        artifacts
    );
  }

  // --- Read Logic ---

  async getPipelines(): Promise<string[]> {
    return await repo.getPipelines();
  }

  async getStats(pipeline?: string) {
    const stats = await repo.getStats(pipeline);
    const successRate = (stats.total_runs > 0) ? (stats.successful_runs / stats.total_runs) * 100 : 0;
    
    return {
      total_runs: parseInt(stats.total_runs, 10),
      success_rate: parseFloat(successRate.toFixed(1)),
      median_duration: stats.median_duration ? parseFloat(stats.median_duration) : 0,
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
    const windowSize = 5;
    const anomalyThreshold = 1.3;

    return runs.map((run, index, allRuns) => {
      let rollingAvg = null;
      let is_anomaly = false;

      const window = allRuns.slice(0, index + 1);
      const sum = window.reduce((acc: number, cur: any) => acc + cur.duration_seconds, 0);
      rollingAvg = sum / (index + 1);

      if (index >= windowSize) {
        const anomalyWindow = allRuns.slice(index - windowSize, index);
        const anomalySum = anomalyWindow.reduce((acc: number, cur: any) => acc + cur.duration_seconds, 0);
        const anomalyAvg = anomalySum / windowSize;

        if (run.duration_seconds > anomalyAvg * anomalyThreshold) {
          is_anomaly = true;
        }
      }
      
      return {
        ...run,
        name: new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` (#${run.run_number})`,
        duration: run.duration_seconds,
        rolling_avg: rollingAvg ? parseFloat(rollingAvg.toFixed(2)) : null,
        is_anomaly: is_anomaly,
      };
    });
  }

  async getJobBreakdown(pipeline?: string) {
    const historySize = 5;
    const runs = await repo.getJobBreakdown(historySize, pipeline);
    const anomalyThreshold = 1.25;

    if (runs.length === 0) {
      return { pipeline_name: 'N/A', commit_message: 'N/A', jobs: [] };
    }
    
    if (runs.length < 2) {
      const mostRecentRun = runs[0];
      const jobs = mostRecentRun.jobs.map((job: any) => ({
        job_name: job.name,
        status: job.status,
        current_duration: job.duration_seconds,
        historical_avg: null,
        historical_durations: [],
        percent_change: null,
        is_anomaly: false,
      }));
      return {
        pipeline_name: mostRecentRun.workflow_name,
        commit_message: mostRecentRun.commit_message,
        jobs: jobs,
      };
    }

    const mostRecentRun = runs[0];
    const historicalRuns = runs.slice(1);
    const historicalData: { [key: string]: { durations: number[] } } = {};

    for (const run of historicalRuns) {
      for (const job of run.jobs) {
        if (!historicalData[job.name]) {
          historicalData[job.name] = { durations: [] };
        }
        if (job.status === 'success') {
            historicalData[job.name].durations.push(job.duration_seconds);
        }
      }
    }

    const breakdown = mostRecentRun.jobs.map((job: any) => {
      const history = historicalData[job.name];
      const historicalDurations = history ? history.durations.reverse() : [];
      
      let historicalAvg = null;
      if (historicalDurations.length > 0) {
        historicalAvg = historicalDurations.reduce((a: number, b: number) => a + b, 0) / historicalDurations.length;
      }
      
      let percentChange = null;
      let isAnomaly = false;

      if (historicalAvg && historicalAvg > 0 && job.status === 'success') {
        percentChange = ((job.duration_seconds - historicalAvg) / historicalAvg) * 100;
        if (percentChange > (anomalyThreshold - 1) * 100) {
          isAnomaly = true;
        }
      } else if (job.status === 'failure') {
        isAnomaly = true;
      }

      return {
        job_name: job.name,
        status: job.status,
        current_duration: job.duration_seconds,
        historical_avg: historicalAvg ? parseFloat(historicalAvg.toFixed(2)) : null,
        historical_durations: historicalDurations,
        percent_change: percentChange ? parseFloat(percentChange.toFixed(1)) : null,
        is_anomaly: isAnomaly,
      };
    });

    return {
      pipeline_name: mostRecentRun.workflow_name,
      commit_message: mostRecentRun.commit_message,
      jobs: breakdown,
    };
  }

  async getJobTrends(pipeline?: string) {
    const limit = 30;
    const runs = await repo.getJobTrends(limit, pipeline);
    const jobNames = new Set<string>();
    const chartData = runs.map((run: any) => {
      const runData: { [key: string]: string | number } = {
        name: new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` (#${run.run_number})`,
      };

      for (const job of run.jobs) {
        if (job.status === 'success') {
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
