import { Router } from 'express';
import { MetricsController } from './controllers';

const router = Router();
const controller = new MetricsController();

// Ingestion
router.post('/metrics', (req, res) => controller.receiveMetrics(req, res));

// Read API
router.get('/api/pipelines', (req, res) => controller.getPipelines(req, res));
router.get('/api/stats', (req, res) => controller.getStats(req, res));
router.get('/api/runs/chart', (req, res) => controller.getChartData(req, res));
router.get('/api/runs/table', (req, res) => controller.getRunsTable(req, res));
router.get('/api/runs/duration-analysis', (req, res) => controller.getDurationAnalysis(req, res));
router.get('/api/jobs/breakdown', (req, res) => controller.getJobBreakdown(req, res));
router.get('/api/jobs/trends', (req, res) => controller.getJobTrends(req, res));

// AI
router.post('/api/generate-summary', (req, res) => controller.generateAiSummary(req, res));

export const metricsRoutes = router;
