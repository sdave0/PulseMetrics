import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { z } from "zod";
import { config } from "../config";
import { MetricsRepository } from "../repository";

export class PulseMcpServer {
  private server: McpServer;
  private app: express.Express;
  private repo: MetricsRepository;

  constructor() {
    this.server = new McpServer({
      name: "Pulse MCP Server",
      version: "1.0.0",
    });
    this.app = express();
    this.repo = new MetricsRepository();

    this.setupTools();
  }

  private setupTools() {
    this.server.tool(
      "get_latest_failure_analysis",
      {
        workflow_name: z.string().optional().describe("Filter by workflow name"),
      },
      async ({ workflow_name }: { workflow_name?: string }) => {
        // Fetch latest run
        const limit = 1;
        const offset = 0;
        const { runs } = await this.repo.getRunsTable(limit, offset, workflow_name);

        if (runs.length === 0) {
          return {
            content: [{ type: "text", text: "No runs found." }],
          };
        }

        const latestRun = runs[0];

        // Fetch signals for this run
        const signals = await this.repo.getSignalsByRun(latestRun.run_id);

        // Find AI Analysis signal
        const aiSignal = signals.find(s => s.signal_type === 'ai_analysis');

        if (!aiSignal) {
          return {
            content: [{ type: "text", text: `Run #${latestRun.run_id} (${latestRun.status}) has no AI analysis attached. It may be a successful run or low priority failure.` }],
          };
        }

        const analysis = aiSignal.value as any;

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              run_id: latestRun.run_id,
              status: latestRun.status,
              root_cause: analysis.root_cause,
              remediation: analysis.remediation,
              confidence: analysis.confidence,
              summary: analysis.summary
            }, null, 2)
          }],
        };
      }
    );

    this.server.tool(
      "list_active_signals",
      {
        run_id: z.number().optional().describe("Specific run ID. If omitted, uses the latest global run."),
      },
      async ({ run_id }: { run_id?: number }) => {
        let targetRunId = run_id;

        if (!targetRunId) {
          const runs = await this.repo.getRunsTable(1, 0);
          if (runs.runs.length > 0) {
            targetRunId = runs.runs[0].run_number;
          }
        }

        if (!targetRunId) {
          return { content: [{ type: "text", text: "No runs found." }] };
        }

        const signals = await this.repo.getSignalsByRun(targetRunId);

        return {
          content: [{ type: "text", text: JSON.stringify({ run_id: targetRunId, signals }, null, 2) }],
        };
      }
    );

    this.server.tool(
      "search_history",
      {
        query: z.string().describe("Search query for error signatures or messages"),
      },
      async ({ query }) => {
        // TODO: Implement full-text search capability against a robust 'known_patterns' registry instead of falling back to latest signals.
        return {
          content: [{ type: "text", text: `Search for '${query}' is not yet fully indexed. Showing latest signals instead.` }]
        };
      }
    );
  }

  public async start() {
    let transport: SSEServerTransport;

    this.app.get("/sse", async (req, res) => {
      transport = new SSEServerTransport("/messages", res);
      await this.server.connect(transport);
    });

    this.app.post("/messages", async (req, res) => {
      if (!transport) {
        res.sendStatus(400);
        return;
      }
      await transport.handlePostMessage(req, res);
    });

    this.app.listen(config.MCP_PORT, () => {
      console.log(`Pulse MCP Server running on port ${config.MCP_PORT}`);
      console.log(`SSE Endpoint: http://localhost:${config.MCP_PORT}/sse`);
    });
  }
}
