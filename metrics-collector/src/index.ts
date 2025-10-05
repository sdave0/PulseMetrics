import 'dotenv/config';
import express, { Request, Response } from 'express';
import { Pool } from 'pg';

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

// --- API ENDPOINTS ---

// Health check endpoint
app.get('/', (req: Request, res: Response) => {
  res.send('Metrics Collector is running!');
});

// Endpoint to receive metrics from the GitHub Actions workflow
app.post('/metrics', async (req: Request, res: Response) => {
  const payload = req.body;

  // Basic validation to ensure we have a payload with a workflow object
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
    ON CONFLICT (run_id) DO NOTHING; // Prevents duplicates
  `;

  const values = [
    workflow.run_id,
    workflow.run_number,
    workflow.name,
    workflow.html_url,
    workflow.status,
    workflow.trigger,
    workflow.branch,
    workflow.duration_seconds,
    workflow.created_at,
    workflow.completed_at,
    commit?.sha,
    commit?.message,
    commit?.author,
    JSON.stringify(jobs || []),
    JSON.stringify(test_summary || {}),
    JSON.stringify(build_analysis || {}),
    JSON.stringify(artifacts || []),
  ];

  try {
    await pool.query(insertQuery, values);
    console.log(`Successfully inserted data for workflow run: ${workflow.run_id}`);
    res.status(201).send({ message: 'Metrics received and stored.' });
  } catch (error) {
    console.error('Error inserting data into database:', error);
    res.status(500).send({ error: 'Failed to store metrics.' });
  }
});

// --- START SERVER ---
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});