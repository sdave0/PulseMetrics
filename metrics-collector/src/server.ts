import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { MetricsController } from './controllers/MetricsController';

const app = express();
const port = config.PORT;

// Middleware
app.use(express.json());
app.use(cors());

// Controller
const controller = new MetricsController();

// --- Routes ---

app.get('/', (req, res) => res.send('Metrics Collector is running!'));

// Ingestion
app.post('/metrics', (req, res) => controller.receiveMetrics(req, res));

// Read API
app.get('/api/pipelines', (req, res) => controller.getPipelines(req, res));
app.get('/api/stats', (req, res) => controller.getStats(req, res));
app.get('/api/runs/chart', (req, res) => controller.getChartData(req, res));
app.get('/api/runs/table', (req, res) => controller.getRunsTable(req, res));
app.get('/api/runs/duration-analysis', (req, res) => controller.getDurationAnalysis(req, res));
app.get('/api/jobs/breakdown', (req, res) => controller.getJobBreakdown(req, res));
app.get('/api/jobs/trends', (req, res) => controller.getJobTrends(req, res));

// AI
app.post('/api/generate-summary', (req, res) => controller.generateAiSummary(req, res));

// Start Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
