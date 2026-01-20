import { serperTool } from "./serper.tool.js";
import { supabaseBulkTool } from "./supabase-bulk.tool.js";
import { tightWebFetchTool } from "./tight-web-fetch.tool.js";
import type { ToolDefinition } from "../types/index.js";

/**
 * Tool Registry
 *
 * This is the central registry of all available tools.
 * To add a new tool:
 * 1. Create a new file: src/tools/your-tool.tool.ts
 * 2. Import it here: import { yourTool } from "./your-tool.tool.js";
 * 3. Add it to the tools array below
 * 4. Rebuild the project: npm run build
 */
export const tools: ToolDefinition[] = [
  serperTool,
  supabaseBulkTool,
  tightWebFetchTool,
];
