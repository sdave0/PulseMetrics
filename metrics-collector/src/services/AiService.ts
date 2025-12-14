import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from '../config/env';

export class AiService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!config.GOOGLE_API_KEY) {
      console.warn("WARNING: GOOGLE_API_KEY environment variable is not set. AI endpoint will not work.");
    }
    this.genAI = new GoogleGenerativeAI(config.GOOGLE_API_KEY || "");
  }

  async generateSummary(prompt: string): Promise<string> {
    if (!config.GOOGLE_API_KEY) {
      throw new Error('AI service is not configured on the server.');
    }
    const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }
}
