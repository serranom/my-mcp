import { z } from "zod";

/**
 * Tool response content item
 */
export interface ToolResponseContent {
  type: "text";
  text: string;
}

/**
 * Tool response format required by MCP
 */
export interface ToolResponse {
  content: ToolResponseContent[];
  isError?: boolean;
}

/**
 * Tool definition interface
 * Each tool must implement this structure
 */
export interface ToolDefinition {
  /** Unique name for the tool (snake_case recommended) */
  name: string;

  /** Human-readable description of what the tool does */
  description: string;

  /** Zod schema for input validation */
  inputSchema: z.ZodSchema<any>;

  /** Handler function that processes the tool call */
  handler: (args: any) => Promise<ToolResponse>;
}
