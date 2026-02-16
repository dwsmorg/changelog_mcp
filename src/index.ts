#!/usr/bin/env node

/**
 * Entry point for the @dwsm/changelog-mcp server.
 *
 * Starts the MCP server with stdio transport for communication
 * with MCP-compatible clients (Claude Code, Cursor, etc.).
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`Fatal: Server konnte nicht gestartet werden: ${error}\n`);
  process.exit(1);
});
