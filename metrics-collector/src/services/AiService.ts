import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from '../config';

export class AiService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!config.GOOGLE_API_KEY) {
      console.warn("WARNING: GOOGLE_API_KEY is not configured.");
    }
    this.genAI = new GoogleGenerativeAI(config.GOOGLE_API_KEY || "");
  }

  async generateSummary(prompt: string): Promise<string> {
    if (!config.GOOGLE_API_KEY) {
      throw new Error('AI service is not configured on the server.');
    }
    const model = this.genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const systemPrompt = `
      You are an expert CI/CD reliability engineer. Analyze the provided job failure context and return a JSON object with the following structure:
      {
        "root_cause": "A concise, technical explanation of why the job failed or regressed.",
        "confidence": "high" | "medium" | "low",
        "remediation": "Specific, actionable steps to fix the issue.",
        "relevant_files": ["file1.ext", "file2.ext"]
      }
      
      Focus on the provided commit diffs and error logs. If the cause is unclear, set confidence to "low".
      Do not include markdown formatting in the JSON values.
    `;

    const result = await model.generateContent(systemPrompt + "\n\n" + prompt);
    const response = await result.response;
    return response.text();
  }
}
