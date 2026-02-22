import app from './app';
import { config } from './config';
import { PulseMcpServer } from './mcp/McpServer';

const port = config.PORT;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

const mcpServer = new PulseMcpServer();
mcpServer.start().catch(err => {
  console.error("Failed to start MCP Server:", err);
});
