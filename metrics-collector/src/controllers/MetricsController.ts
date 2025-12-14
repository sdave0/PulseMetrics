import { Request, Response } from 'express';
import { MetricsService } from '../services/MetricsService';
import { AiService } from '../services/AiService';
import { MetricsPayload } from '../types';

const metricsService = new MetricsService();
const aiService = new AiService();

export class MetricsController {
  
  async receiveMetrics(req: Request, res: Response) {
    const payload = req.body as MetricsPayload;

    if (!payload || !payload.workflow) {
      return res.status(400).send({ error: 'Invalid payload: Missing workflow data.' });
    }

    try {
      await metricsService.processMetrics(payload);
      console.log(`Successfully processed metrics for run: ${payload.workflow.run_id}`);
      res.status(201).send({ message: 'Metrics received and stored.' });
    } catch (error: unknown) {
      const runId = payload?.workflow?.run_id || 'unknown';
      const commitSha = payload?.commit?.sha || 'unknown';
      const context = `[Run: ${runId}, Commit: ${commitSha}]`;
      
      let failureReason = 'Unknown internal error';
      if (error instanceof Error) {
        failureReason = error.message;
        if ('code' in error && (error as any).code) {
             failureReason = `Database error (Code: ${(error as any).code}): ${(error as any).detail || error.message}`;
        }
      }

      const descriptiveError = `Error processing metrics ${context}: ${failureReason}`;
      console.error(descriptiveError);
      res.status(500).send({ error: descriptiveError });
    }
  }

  async getPipelines(req: Request, res: Response) {
    try {
      const pipelines = await metricsService.getPipelines();
      res.status(200).json(pipelines);
    } catch (error: unknown) {
      const msg = `Error fetching pipelines: ${error instanceof Error ? error.message : String(error)}`;
      console.error(msg);
      res.status(500).send({ error: msg });
    }
  }

  async getStats(req: Request, res: Response) {
    try {
      const stats = await metricsService.getStats(req.query.pipeline as string);
      res.status(200).json(stats);
    } catch (error: unknown) {
      const msg = `Error fetching stats: ${error instanceof Error ? error.message : String(error)}`;
      console.error(msg);
      res.status(500).send({ error: msg });
    }
  }

  async getRunsTable(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const data = await metricsService.getRunsTable(page, limit, req.query.pipeline as string);
      res.status(200).json(data);
    } catch (error: unknown) {
      const msg = `Error fetching table data: ${error instanceof Error ? error.message : String(error)}`;
      console.error(msg);
      res.status(500).send({ error: msg });
    }
  }

  async getDurationAnalysis(req: Request, res: Response) {
    try {
      const data = await metricsService.getDurationAnalysis(req.query.pipeline as string);
      res.status(200).json(data);
    } catch (error: unknown) {
      const msg = `Error fetching duration analysis data: ${error instanceof Error ? error.message : String(error)}`;
      console.error(msg);
      res.status(500).send({ error: msg });
    }
  }

  async getJobBreakdown(req: Request, res: Response) {
    try {
      const data = await metricsService.getJobBreakdown(req.query.pipeline as string);
      res.status(200).json(data);
    } catch (error: unknown) {
      const msg = `Error fetching rich job breakdown data: ${error instanceof Error ? error.message : String(error)}`;
      console.error(msg);
      res.status(500).send({ error: msg });
    }
  }

  async getJobTrends(req: Request, res: Response) {
    try {
      const data = await metricsService.getJobTrends(req.query.pipeline as string);
      res.status(200).json(data);
    } catch (error: unknown) {
      const msg = `Error fetching job trends data: ${error instanceof Error ? error.message : String(error)}`;
      console.error(msg);
      res.status(500).send({ error: msg });
    }
  }

  async getChartData(req: Request, res: Response) {
    try {
      const data = await metricsService.getChartData();
      res.status(200).json(data);
    } catch (error: unknown) {
      const msg = `Error fetching chart data: ${error instanceof Error ? error.message : String(error)}`;
      console.error(msg);
      res.status(500).send({ error: msg });
    }
  }

  async generateAiSummary(req: Request, res: Response) {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).send({ error: 'Prompt is required.' });
    }

    try {
      const summary = await aiService.generateSummary(prompt);
      res.status(200).json({ summary });
    } catch (error: unknown) {
      const msg = `Error calling AI service: ${error instanceof Error ? error.message : String(error)}`;
      console.error(msg);
      res.status(500).send({ error: 'Failed to generate summary from AI service.' });
    }
  }
}
