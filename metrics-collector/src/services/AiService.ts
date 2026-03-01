import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from '../config';
import { SignalBundle, AiAnalysisResult } from '../signals/SignalTypes';

export class AiService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!config.GOOGLE_API_KEY) {
      console.warn("WARNING: GOOGLE_API_KEY is not configured.");
    }
    this.genAI = new GoogleGenerativeAI(config.GOOGLE_API_KEY || "");
  }

  /**
   * Generates a structured analysis of the failure using the Signal Bundle.
   * This is the "Selective Reasoning" agent mode.
   */
  async analyzeFailure(bundle: SignalBundle): Promise<AiAnalysisResult | null> {
    if (!config.GOOGLE_API_KEY) {
      console.warn('Skipping AI analysis: No API Key');
      return null;
    }

    const model = this.genAI.getGenerativeModel({
      model: config.LLM_MODEL,
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const prompt = this.constructPrompt(bundle);
    const systemPrompt = `
      You are PulseAI, an autonomous specialized CI/CD Reliability Agent.
      Your goal is to identify the Root Cause of a pipeline anomaly or failure based ONLY on the provided proprietary signals.
      
      Output strictly JSON:
      {
        "root_cause": "Technical explanation of the failure.",
        "confidence": "high" | "medium" | "low",
        "remediation": "Exact steps to fix (e.g., 'Revert commit', 'Increase timeout').",
        "relevant_files": ["list", "of", "suspect", "files"],
        "summary": "A 1-sentence executive summary."
      }
    `;

    try {
      const result = await model.generateContent(systemPrompt + "\n\n" + prompt);
      const responseText = result.response.text();
      return JSON.parse(responseText) as AiAnalysisResult;
    } catch (err) {
      console.error("AI Agent failed to reason:", err);
      return null;
    }
  }

  private constructPrompt(bundle: SignalBundle): string {
    const isSuccess = bundle.status === 'success';
    let context = `Analyze Run #${bundle.runId} (${bundle.workflowName})\n`;
    context += `STATUS: ${isSuccess ? 'SUCCESS (But Anomalous/Slow)' : 'FAILED'}\n\n`;

    if (isSuccess) {
      context += "NOTE: This pipeline PASSED successfully, but was flagged for anomalies (like extreme slowness).\n" +
        "Do NOT say the pipeline failed. Explain why it was anomalous/slow.\n\n";
    }

    // 1. Patterns
    if (bundle.patterns.length > 0) {
      context += "FAILURE PATTERNS:\n";
      bundle.patterns.forEach(p => {
        context += `- [${p.category.toUpperCase()}] ${p.jobName}: ${p.failureType || 'Unknown Error'} (Conf: ${p.confidence})\n`;
      });
    }

    // 2. Drift
    const anomalies = bundle.drift.filter(d => d.isAnomaly);
    if (anomalies.length > 0) {
      context += "\nPERFORMANCE ANOMALIES:\n";
      anomalies.forEach(d => {
        context += `- ${d.jobName || 'Workflow'}: ${d.percentChange}% regression (${d.currentValue.toFixed(1)}s vs baseline ${d.baselineValue.toFixed(1)}s)\n`;
      });
    }

    // 3. Changes
    if (bundle.changes.length > 0) {
      context += "\nRECENT CHANGES:\n";
      bundle.changes.forEach(c => {
        context += `- [${c.impact.toUpperCase()}] ${c.description}\n`;
      });
    }

    // 4. Decision Context
    if (bundle.decision) {
      context += `\nDECISION ENGINE CONTEXT: Priority ${bundle.decision.priority}/100. Reason: ${bundle.decision.reason}\n`;
    }

    return context;
  }


}
