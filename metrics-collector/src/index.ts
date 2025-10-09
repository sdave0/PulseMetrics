import 'dotenv/config';
import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import cors from 'cors';

// --- DATABASE CONNECTION ---
// Uses environment variables for configuration
// These will be set to match the docker-compose.yml file
const pool = new Pool({
  user: process.env.PG_USER || 'user',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'metrics_db',
  password: process.env.PG_PASSWORD || 'password',
  port: parseInt(process.env.PG_PORT || '5432', 10),
});

// --- EXPRESS APP SETUP ---
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors());

// --- API ENDPOINTS ---

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.send('Metrics Collector is running!');
});

// Endpoint to receive metrics from the GitHub Actions workflow
app.post('/metrics', async (req: Request, res: Response) => {
  const payload = req.body;

  if (!payload || !payload.workflow) {
    return res.status(400).send({ error: 'Invalid payload: Missing workflow data.' });
  }

  const { 
    workflow, commit, jobs, test_summary, build_analysis, artifacts 
  } = payload;

  const insertQuery = `
    INSERT INTO workflow_runs(
      run_id, run_number, workflow_name, html_url, status, trigger_event, 
      branch, duration_seconds, created_at, completed_at, commit_sha, 
      commit_message, commit_author, jobs, test_summary, build_analysis, artifacts
    )
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    ON CONFLICT (run_id) DO UPDATE SET
      status = EXCLUDED.status,
      completed_at = EXCLUDED.completed_at,
      duration_seconds = EXCLUDED.duration_seconds,
      jobs = EXCLUDED.jobs,
      test_summary = EXCLUDED.test_summary,
      build_analysis = EXCLUDED.build_analysis,
      artifacts = EXCLUDED.artifacts,
      received_at = NOW();
  `;

  const values = [
    workflow.run_id, workflow.run_number, workflow.name, workflow.html_url, 
    workflow.status, workflow.trigger, workflow.branch, workflow.duration_seconds, 
    workflow.created_at, workflow.completed_at, commit?.sha, commit?.message, 
    commit?.author, JSON.stringify(jobs || []), JSON.stringify(test_summary || {}), 
    JSON.stringify(build_analysis || {}), JSON.stringify(artifacts || []),
  ];

  try {
    await pool.query(insertQuery, values);
    console.log(`Successfully inserted/updated data for workflow run: ${workflow.run_id}`);
    res.status(201).send({ message: 'Metrics received and stored.' });
  } catch (error) {
    console.error('Error inserting data into database:', error);
    res.status(500).send({ error: 'Failed to store metrics.' });
  }
});

// --- DATA AGGREGATION AND ANALYSIS ENDPOINTS ---

// Endpoint for high-level summary stats
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT
        COUNT(*) AS total_runs,
        COUNT(*) FILTER (WHERE status = 'success') AS successful_runs,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_seconds) AS median_duration
      FROM workflow_runs;
    `;
    const result = await pool.query(query);
    const stats = result.rows[0];
    const successRate = (stats.total_runs > 0) ? (stats.successful_runs / stats.total_runs) * 100 : 0;

    res.status(200).json({
      total_runs: parseInt(stats.total_runs, 10),
      success_rate: parseFloat(successRate.toFixed(1)),
      median_duration: stats.median_duration ? parseFloat(stats.median_duration) : 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).send({ error: 'Failed to fetch stats.' });
  }
});

// Endpoint for the duration trend chart
app.get('/api/runs/chart', async (req: Request, res: Response) => {
  try {
    const query = 'SELECT created_at, run_number, duration_seconds FROM workflow_runs ORDER BY created_at ASC;';
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).send({ error: 'Failed to fetch chart data.' });
  }
});

// Endpoint for the paginated runs table
app.get('/api/runs/table', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const offset = (page - 1) * limit;

  try {
    const totalResult = await pool.query('SELECT COUNT(*) FROM workflow_runs;');
    const totalRuns = parseInt(totalResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalRuns / limit);

    const runsQuery = `
      SELECT 
        run_id, run_number, html_url, status, branch, 
        commit_message, commit_author, duration_seconds, created_at
      FROM workflow_runs 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2;
    `;
    const runsResult = await pool.query(runsQuery, [limit, offset]);

    res.status(200).json({
      runs: runsResult.rows,
      totalPages: totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('Error fetching table data:', error);
    res.status(500).send({ error: 'Failed to fetch table data.' });
  }
});

// Endpoint for pipeline duration analysis with anomaly detection
app.get('/api/runs/duration-analysis', async (req: Request, res: Response) => {
  const windowSize = 5; // Rolling window for the average
  const anomalyThreshold = 1.3; // 30% above the average

  try {
    // 1. Fetch recent successful runs
    const query = `
      SELECT run_number, duration_seconds, created_at
      FROM workflow_runs
      WHERE status = 'success'
      ORDER BY created_at ASC;
    `;
    const result = await pool.query(query);
    const runs = result.rows;

    // 2. Calculate rolling average and detect anomalies
    const analysisResults = runs.map((run, index, allRuns) => {
      let rollingAvg = null;
      let is_anomaly = false;

      // Calculate rolling average from the start of the runs
      const window = allRuns.slice(0, index + 1);
      const sum = window.reduce((acc, cur) => acc + cur.duration_seconds, 0);
      rollingAvg = sum / (index + 1);

      // We need at least `windowSize` previous runs to check for anomaly
      if (index >= windowSize) {
        const anomalyWindow = allRuns.slice(index - windowSize, index);
        const anomalySum = anomalyWindow.reduce((acc, cur) => acc + cur.duration_seconds, 0);
        const anomalyAvg = anomalySum / windowSize;

        // Check for anomaly
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

    res.status(200).json(analysisResults);

  } catch (error) {
    console.error('Error fetching duration analysis data:', error);
    res.status(500).send({ error: 'Failed to fetch duration analysis data.' });
  }
});

interface Job {
  name: string;
  status: string;
  duration_seconds: number;
}

// Endpoint for job duration breakdown of the most recent run
app.get('/api/jobs/breakdown', async (req: Request, res: Response) => {
  const historySize = 5;
  const anomalyThreshold = 1.25; // 25% slower

  try {
    // 1. Fetch the last N successful runs (most recent + history)
    const query = `
      SELECT run_number, jobs
      FROM workflow_runs
      WHERE status = 'success' AND jsonb_array_length(jobs) > 0
      ORDER BY created_at DESC
      LIMIT ${historySize + 1};
    `;
    const result = await pool.query(query);
    const runs = result.rows;

    if (runs.length < 2) {
      return res.status(200).json([]); // Not enough data to compare
    }

    // 2. Separate the most recent run from historical runs
    const mostRecentRun = runs[0];
    const historicalRuns = runs.slice(1);

    // 3. Calculate historical average for each job name
    const historicalAverages: { [key: string]: number } = {};
    const jobCounts: { [key: string]: number } = {};

    for (const run of historicalRuns) {
      for (const job of run.jobs) {
        if (job.status === 'success') {
          historicalAverages[job.name] = (historicalAverages[job.name] || 0) + job.duration_seconds;
          jobCounts[job.name] = (jobCounts[job.name] || 0) + 1;
        }
      }
    }

    for (const jobName in historicalAverages) {
      historicalAverages[jobName] /= jobCounts[jobName];
    }

    // 4. Build the breakdown for the most recent run
    const breakdown = mostRecentRun.jobs.map((job: Job) => {
      const historicalAvg = historicalAverages[job.name];
      let percentChange = null;
      let isAnomaly = false;

      if (historicalAvg && historicalAvg > 0) {
        percentChange = ((job.duration_seconds - historicalAvg) / historicalAvg) * 100;
        if (percentChange > (anomalyThreshold - 1) * 100) {
          isAnomaly = true;
        }
      }

      return {
        job_name: job.name,
        current_duration: job.duration_seconds,
        historical_avg: historicalAvg ? parseFloat(historicalAvg.toFixed(2)) : null,
        percent_change: percentChange ? parseFloat(percentChange.toFixed(1)) : null,
        is_anomaly: isAnomaly,
      };
    });

    res.status(200).json(breakdown);

  } catch (error) {
    console.error('Error fetching job breakdown data:', error);
    res.status(500).send({ error: 'Failed to fetch job breakdown data.' });
  }
});

// Endpoint for historical job performance trends
app.get('/api/jobs/trends', async (req: Request, res: Response) => {
  const limit = 30; // Fetch last 30 runs

  try {
    const query = `
      SELECT run_number, created_at, jobs
      FROM workflow_runs
      WHERE status = 'success' AND jsonb_array_length(jobs) > 0
      ORDER BY created_at ASC
      LIMIT ${limit};
    `;
    const result = await pool.query(query);
    const runs = result.rows;

    const jobNames = new Set<string>();
    const chartData = runs.map(run => {
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

    res.status(200).json({ 
      chartData,
      jobNames: Array.from(jobNames)
    });

  } catch (error) {
    console.error('Error fetching job trends data:', error);
    res.status(500).send({ error: 'Failed to fetch job trends data.' });
  }
});

// --- START SERVER ---
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
