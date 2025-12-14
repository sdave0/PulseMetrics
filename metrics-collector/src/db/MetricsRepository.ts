import { pool } from './index';
import { Workflow, Job, Commit, TestSummary, BuildAnalysis, Artifact, StatsRow, WorkflowRunRow } from '../types';

export class MetricsRepository {
  
  async upsertProject(name: string, repoUrl: string): Promise<number> {
    const query = `
      INSERT INTO projects (name, repo_url)
      VALUES ($1, $2)
      ON CONFLICT (name) DO UPDATE SET repo_url = EXCLUDED.repo_url
      RETURNING id;
    `;
    const res = await pool.query(query, [name, repoUrl]);
    return res.rows[0].id;
  }

  async upsertWorkflowRun(
    run: Workflow, 
    projectId: number, 
    commit: Commit | Record<string, unknown>, 
    jobs: Job[], 
    testSummary: TestSummary | Record<string, unknown>, 
    buildAnalysis: BuildAnalysis | Record<string, unknown>, 
    artifacts: Artifact[] | Record<string, unknown>
  ): Promise<void> {
    const query = `
      INSERT INTO workflow_runs(
        run_id, run_number, workflow_name, project_id, html_url, status, trigger_event, 
        branch, duration_seconds, created_at, completed_at, commit_sha, 
        commit_message, commit_author, jobs, test_summary, build_analysis, artifacts
      )
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (run_id) DO UPDATE SET
        status = EXCLUDED.status,
        completed_at = EXCLUDED.completed_at,
        duration_seconds = EXCLUDED.duration_seconds,
        jobs = EXCLUDED.jobs,
        test_summary = EXCLUDED.test_summary,
        build_analysis = EXCLUDED.build_analysis,
        artifacts = EXCLUDED.artifacts,
        project_id = EXCLUDED.project_id,
        received_at = NOW();
    `;
    
    // Helper to safely access properties if they exist
    const c = commit as any;
    const sha = c?.sha || '0000000';
    const msg = c?.message || 'No message';
    const auth = c?.author || 'Unknown';

    const values = [
      run.run_id, run.run_number, run.name, projectId, run.html_url, 
      run.status, run.trigger, run.branch, run.duration_seconds, 
      run.created_at, run.completed_at, 
      sha, msg, auth,
      JSON.stringify(jobs || []), JSON.stringify(testSummary || {}), 
      JSON.stringify(buildAnalysis || {}), JSON.stringify(artifacts || []),
    ];

    await pool.query(query, values);
  }

  async getPipelines(): Promise<string[]> {
    const query = 'SELECT name FROM projects ORDER BY name ASC;';
    const result = await pool.query(query);
    return result.rows.map((row: { name: string }) => row.name);
  }

  async getStats(pipeline?: string): Promise<StatsRow> {
    let query = `
      SELECT
        COUNT(*) AS total_runs,
        COUNT(*) FILTER (WHERE status = 'success') AS successful_runs,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_seconds) AS median_duration
      FROM workflow_runs
    `;
    const params: (string | null)[] = [];
    if (pipeline) {
      query += ` WHERE workflow_name = $1`;
      params.push(pipeline);
    }
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  async getChartData(): Promise<WorkflowRunRow[]> {
    const query = 'SELECT created_at, run_number, duration_seconds FROM workflow_runs ORDER BY created_at ASC;';
    const result = await pool.query(query);
    return result.rows;
  }

  async getRunsTable(limit: number, offset: number, pipeline?: string): Promise<{ runs: WorkflowRunRow[], totalRuns: number }> {
    let countQuery = 'SELECT COUNT(*) FROM workflow_runs';
    const countParams: (string | null)[] = [];
    if (pipeline) {
        countQuery += ' WHERE workflow_name = $1';
        countParams.push(pipeline);
    }

    const totalResult = await pool.query(countQuery, countParams);
    const totalRuns = parseInt(totalResult.rows[0].count, 10);

    let runsQuery = `
      SELECT 
        run_id, run_number, html_url, status, branch, 
        commit_message, commit_author, duration_seconds, created_at
      FROM workflow_runs
    `;
    
    const runsParams: (string | number | null)[] = [];
    if (pipeline) {
        runsQuery += ` WHERE workflow_name = $1`;
        runsParams.push(pipeline);
    }

    runsQuery += ` ORDER BY created_at DESC LIMIT $${runsParams.length + 1} OFFSET $${runsParams.length + 2}`;
    runsParams.push(limit, offset);

    const runsResult = await pool.query(runsQuery, runsParams);
    return { runs: runsResult.rows, totalRuns };
  }

  async getDurationAnalysis(pipeline?: string): Promise<WorkflowRunRow[]> {
    let query = `
      SELECT run_number, duration_seconds, created_at
      FROM workflow_runs
      WHERE status = 'success'
    `;
    const params: (string | null)[] = [];
    if (pipeline) {
        query += ` AND workflow_name = $1`;
        params.push(pipeline);
    }
    query += ` ORDER BY created_at ASC;`;
    const result = await pool.query(query, params);
    return result.rows;
  }

  async getJobBreakdown(historySize: number, pipeline?: string): Promise<WorkflowRunRow[]> {
    let query = `
      SELECT run_number, jobs, workflow_name, commit_message
      FROM workflow_runs
      WHERE jsonb_array_length(jobs) > 0
    `;
    const params: (string | null)[] = [];
    if (pipeline) {
        query += ` AND workflow_name = $1`;
        params.push(pipeline);
    }
    query += ` ORDER BY created_at DESC LIMIT ${historySize + 1}`;
    const result = await pool.query(query, params);
    return result.rows;
  }

  async getJobTrends(limit: number, pipeline?: string): Promise<WorkflowRunRow[]> {
    let query = `
      SELECT run_number, created_at, jobs
      FROM workflow_runs
      WHERE status = 'success' AND jsonb_array_length(jobs) > 0
    `;
    const params: (string | null)[] = [];
    if (pipeline) {
        query += ` AND workflow_name = $1`;
        params.push(pipeline);
    }
    query += ` ORDER BY created_at ASC LIMIT ${limit}`;
    const result = await pool.query(query, params);
    return result.rows;
  }
}