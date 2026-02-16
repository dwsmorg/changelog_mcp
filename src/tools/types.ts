/**
 * Shared types for MCP tool handlers.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/** Re-export the SDK's CallToolResult as our standard tool response type */
export type ToolResponse = CallToolResult;
