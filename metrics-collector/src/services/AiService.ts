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
      model: config.LLM_MODEL || "gemini-2.0-flash-exp",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const prompt = this.constructPrompt(bundle);
    const systemPrompt = `
      You are PulseAI, an autonomous specialized CI/CD Reliability Agent.
      Your goal is to identify the Root Cause of a pipeline failure based ONLY on the provided proprietary signals.
      
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
    let context = `Analyze Run #${bundle.runId} (${bundle.workflowName})\n\n`;

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

  // Legacy method (keep for backward compatibility if needed, or deprecate)
  async generateSummary(prompt: string): Promise<string> {
    // ... implementation ...
    if (!config.GOOGLE_API_KEY) {
      throw new Error('AI service is not configured on the server.');
    }
    const model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
    // ... rest of legacy method logic if needed, but for now we can simplify or just wrap the new one
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
