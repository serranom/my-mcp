# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A custom Model Context Protocol (MCP) server with an extensible tool architecture for Claude Code. This server enables adding custom tools that Claude can use during conversations.

## Common Commands

```bash
# Build the project (compiles TypeScript to JavaScript in build/)
npm run build

# Build and run in development mode (shows startup logs)
npm run dev

# Test server directly (should start without errors)
node build/index.js
```

## Adding New MCP Tools

Adding a new tool involves these steps:
1. Create tool implementation file in `src/tools/`
2. Register tool in `src/tools/index.ts`
3. Add any required dependencies to `package.json`
4. Update `.env.example` if environment variables are needed
5. Build and verify with `npm run build`

### Naming Convention

- **File name**: `{tool-name}.tool.ts` (kebab-case)
- **Export name**: `{toolName}Tool` (camelCase + "Tool" suffix)
- **Tool name** (in schema): `"{tool_name}"` (snake_case)

Examples:
- File: `serper.tool.ts` → Export: `serperTool` → Name: `"serper_search"`
- File: `weather-api.tool.ts` → Export: `weatherApiTool` → Name: `"weather_api"`

### Tool Structure

All tools implement the `ToolDefinition` interface:

```typescript
{
  name: string;              // Tool identifier (snake_case)
  description: string;       // What the tool does
  inputSchema: z.ZodSchema;  // Zod schema for validation
  handler: async (args) => ToolResponse;  // Async execution function
}
```

### Tool Implementation Template

```typescript
import { z } from "zod";
import type { ToolDefinition } from "../types/index.js";

export const yourTool: ToolDefinition = {
  name: "your_tool",
  description: "User-facing description of what the tool does",

  inputSchema: z.object({
    param1: z.string().describe("Description of param1"),
    param2: z.number().optional().default(10).describe("Optional param2"),
  }),

  handler: async (args) => {
    try {
      // 1. Validate/prepare inputs
      const { param1, param2 } = args;

      // 2. Perform the tool's main logic
      const result = await doSomething(param1, param2);

      // 3. Return formatted response
      return {
        content: [{
          type: "text",
          text: formatResult(result),
        }],
      };
    } catch (error) {
      // 4. Handle errors
      return {
        isError: true,
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        }],
      };
    }
  },
};
```

### Common Zod Patterns

```typescript
// Required string
z.string().min(1).describe("Description")

// Optional string with default
z.string().optional().default("default").describe("Description")

// Number with constraints
z.number().int().min(1).max(100).describe("Description")

// Enum (limited choices)
z.enum(["option1", "option2", "option3"]).describe("Description")

// Boolean
z.boolean().default(false).describe("Description")

// Array
z.array(z.string()).describe("Description")

// Optional parameter
z.string().optional().describe("Description")
```

**Key Points**:
- Always use `.describe()` - it becomes the parameter description in MCP
- Use `.optional()` and `.default()` for optional parameters
- Add validation constraints (`.min()`, `.max()`, `.int()`, etc.)
- The Zod schema provides both runtime validation and TypeScript types

### Tool Response Format

```typescript
// Success response
return {
  content: [{
    type: "text",
    text: "Your formatted result here",
  }],
};

// Error response
return {
  isError: true,
  content: [{
    type: "text",
    text: "Error: Something went wrong",
  }],
};
```

### Registering a Tool

Edit `src/tools/index.ts`:

```typescript
// 1. Add import
import { yourTool } from "./your-tool.tool.js";

// 2. Add to tools array
export const tools: ToolDefinition[] = [
  echoTool,
  calculatorTool,
  serperTool,
  yourTool,  // ← Add here
];
```

**Important**: Use `.js` extension in imports (not `.ts`), even though source files are `.ts`. This is required for ES modules.

## Architecture

### Module System

This project uses **ES Modules** (not CommonJS):
- All imports MUST use `.js` extensions even for `.ts` files
- `package.json` has `"type": "module"`
- TypeScript config uses `"module": "Node16"` with `"moduleResolution": "Node16"`

### Server Flow

1. `src/index.ts` - Entry point that:
   - Creates server via `createServer()`
   - Sets up StdioServerTransport for Claude Code communication
   - Connects server to transport

2. `src/server.ts` - Server configuration with two main handlers:
   - `ListToolsRequestSchema` - Returns all registered tools with JSON schemas
   - `CallToolRequestSchema` - Validates input and executes requested tool

3. `src/tools/index.ts` - Central registry of all available tools

### Environment Variables

Environment variables are managed through `src/utils/env.ts`:
- Loads from `.env` and `.env.local` files (uses dotenv)
- Use `getEnvVariable(key, required)` to access variables
- Required variables throw errors if missing

Example:
```typescript
import { getEnvVariable } from "../utils/env.js";

const apiKey = getEnvVariable("API_KEY", true);
```

## Critical Rules

### Logging

**NEVER use `console.log()`** - it corrupts JSON-RPC messages over stdio.

**ALWAYS use `console.error()`** for all logging in this server.

### Error Handling

Always handle these error cases:

1. **Missing configuration** (API keys, etc.)
   ```typescript
   const apiKey = getEnvVariable("API_KEY", true);
   // Will throw if missing - caught by try/catch
   ```

2. **API/Network errors**
   ```typescript
   if (!response.ok) {
     return {
       isError: true,
       content: [{ type: "text", text: `API error: ${response.status}` }],
     };
   }
   ```

3. **Invalid responses**
   ```typescript
   if (!data.results || data.results.length === 0) {
     return {
       content: [{ type: "text", text: "No results found" }],
     };
   }
   ```

4. **Unexpected errors**
   ```typescript
   catch (error) {
     return {
       isError: true,
       content: [{
         type: "text",
         text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
       }],
     };
   }
   ```

### Best Practices

**Input Validation**:
- Use Zod for all input validation
- Add constraints (min, max, enum) where appropriate
- Provide clear descriptions for all parameters
- Use sensible defaults for optional parameters

**Response Formatting**:
- Format responses to be readable and useful
- Use consistent formatting (numbered lists, sections, etc.)
- Include context (e.g., "Found 10 results for 'query'")
- Don't return raw JSON unless specifically needed

**Code Organization**:
- Define interfaces for external API responses
- Keep handler logic clean and readable
- Extract complex formatting to helper functions
- Add JSDoc comments for tool purpose
- Use `.js` extension in all imports

**Performance**:
- Use native Node.js APIs when possible (fetch, fs, crypto)
- Avoid unnecessary dependencies
- Handle timeouts for external API calls

## Configuration

After building, configure in `~/.claude.json`:

```json
{
  "mcpServers": {
    "my-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/my-mcp/build/index.js"]
    }
  }
}
```

**Important**: Use absolute path, not relative. Restart Claude Code after updating configuration.
