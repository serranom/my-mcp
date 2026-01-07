# How to Add New MCP Tools

This guide provides a step-by-step template for adding new tools to the my-mcp server.

## Quick Overview

Adding a new tool involves:
1. Create tool implementation file in `src/tools/`
2. Register tool in `src/tools/index.ts`
3. Add any required dependencies to `package.json`
4. Update `.env.example` if environment variables are needed
5. Build and verify

## Tool Architecture

### File Structure

```
src/
├── tools/
│   ├── your-tool.tool.ts  ← New tool implementation
│   └── index.ts           ← Tool registry (modify)
├── types/
│   └── index.ts           ← Shared type definitions
└── utils/
    └── env.ts             ← Environment variable helper (if needed)
```

### Naming Convention

- **File name**: `{tool-name}.tool.ts` (kebab-case)
- **Export name**: `{toolName}Tool` (camelCase + "Tool" suffix)
- **Tool name** (in schema): `"{tool_name}"` (snake_case)

**Examples**:
- File: `serper.tool.ts` → Export: `serperTool` → Name: `"serper_search"`
- File: `weather-api.tool.ts` → Export: `weatherApiTool` → Name: `"weather_api"`

## Step-by-Step Implementation

### Step 1: Create Tool File

Create `src/tools/your-tool.tool.ts`:

```typescript
import { z } from "zod";
import type { ToolDefinition } from "../types/index.js";

/**
 * Your Tool
 * Brief description of what this tool does
 */
export const yourTool: ToolDefinition = {
  name: "your_tool",
  description: "User-facing description of what the tool does",

  inputSchema: z.object({
    // Define your input parameters here
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
        content: [
          {
            type: "text",
            text: formatResult(result),
          },
        ],
      };
    } catch (error) {
      // 4. Handle errors
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }
  },
};
```

### Step 2: Define Input Schema (Zod)

The `inputSchema` uses Zod for runtime validation and auto-generates the JSON schema for MCP.

**Common Zod Patterns**:

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

### Step 3: Implement Handler

The handler is an async function that:
1. Receives validated arguments (typed by Zod schema)
2. Performs the tool's logic
3. Returns a `ToolResponse`

**Return Format**:

```typescript
// Success response
return {
  content: [
    {
      type: "text",
      text: "Your formatted result here",
    },
  ],
};

// Error response
return {
  isError: true,
  content: [
    {
      type: "text",
      text: "Error: Something went wrong",
    },
  ],
};
```

**Handler Patterns**:

```typescript
handler: async (args) => {
  try {
    // Pattern 1: Simple computation
    const result = computeSomething(args.input);
    return { content: [{ type: "text", text: result }] };

    // Pattern 2: API call
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify(args),
    });
    const data = await response.json();
    return { content: [{ type: "text", text: formatData(data) }] };

    // Pattern 3: File system operation
    const fileContent = await readFile(args.filePath);
    return { content: [{ type: "text", text: fileContent }] };

  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error: ${error.message}` }],
    };
  }
};
```

### Step 4: Error Handling Strategy

**Always Handle These Error Cases**:

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

**Error Response Pattern**:
- Set `isError: true`
- Provide user-friendly error message
- Include context when helpful (status codes, missing vars, etc.)
- Never expose sensitive information (API keys, internal paths)

### Step 5: Register Tool

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

### Step 6: Add Dependencies (if needed)

If your tool needs external packages:

1. **Modify `package.json`**:
   ```json
   "dependencies": {
     "@modelcontextprotocol/sdk": "^1.0.4",
     "dotenv": "^16.4.5",
     "zod": "^3.24.1",
     "your-package": "^1.0.0"  // ← Add here
   }
   ```

2. **Run npm install**:
   ```bash
   npm install
   ```

**Note**: Prefer native Node.js APIs when possible:
- Use native `fetch()` instead of axios/node-fetch (Node 18+)
- Use `fs/promises` for file operations
- Use `crypto` for hashing/encryption

### Step 7: Environment Variables (if needed)

If your tool requires API keys or configuration:

1. **Use the env utility**:
   ```typescript
   import { getEnvVariable } from "../utils/env.js";

   // In handler:
   const apiKey = getEnvVariable("YOUR_API_KEY", true);
   ```

2. **Update `.env.example`**:
   ```bash
   # Your API key from https://your-service.com
   YOUR_API_KEY=your-api-key-here
   ```

3. **Document in tool description**:
   ```typescript
   description: "Does something cool (requires YOUR_API_KEY environment variable)"
   ```

### Step 8: Build and Verify

```bash
# Build the project
npm run build

# Should output: "tsc && chmod 755 build/index.js"
# No errors = successful build
```

**Common Build Errors**:
- Missing `.js` extension in imports → Add `.js` to import paths
- Type errors → Check Zod schema matches handler usage
- Module not found → Check file paths and names

## Complete Example: GitHub Stars Tool

Here's a complete example of a tool that fetches GitHub repo stars:

```typescript
import { z } from "zod";
import type { ToolDefinition } from "../types/index.js";

interface GitHubRepo {
  stargazers_count: number;
  name: string;
  description: string;
}

export const githubStarsTool: ToolDefinition = {
  name: "github_stars",
  description: "Get the number of stars for a GitHub repository",

  inputSchema: z.object({
    owner: z.string().min(1).describe("Repository owner (username or org)"),
    repo: z.string().min(1).describe("Repository name"),
  }),

  handler: async (args) => {
    try {
      const url = `https://api.github.com/repos/${args.owner}/${args.repo}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent": "MCP-Server",
          "Accept": "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: `Repository ${args.owner}/${args.repo} not found`,
            }],
          };
        }
        return {
          isError: true,
          content: [{
            type: "text",
            text: `GitHub API error: ${response.status}`,
          }],
        };
      }

      const data = (await response.json()) as GitHubRepo;

      return {
        content: [{
          type: "text",
          text: `${args.owner}/${args.repo}\n${data.description}\n⭐ ${data.stargazers_count.toLocaleString()} stars`,
        }],
      };
    } catch (error) {
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

Then register it:
```typescript
// src/tools/index.ts
import { githubStarsTool } from "./github-stars.tool.js";

export const tools: ToolDefinition[] = [
  echoTool,
  calculatorTool,
  serperTool,
  githubStarsTool,
];
```

## Best Practices

### Input Validation
- ✅ Use Zod for all input validation
- ✅ Add constraints (min, max, enum) where appropriate
- ✅ Provide clear descriptions for all parameters
- ✅ Use sensible defaults for optional parameters

### Error Handling
- ✅ Always wrap handler in try/catch
- ✅ Return `isError: true` for all error cases
- ✅ Provide user-friendly error messages
- ✅ Handle specific error cases (404, 401, etc.) explicitly
- ❌ Don't expose internal errors or sensitive data

### Response Formatting
- ✅ Format responses to be readable and useful
- ✅ Use consistent formatting (numbered lists, sections, etc.)
- ✅ Include context (e.g., "Found 10 results for 'query'")
- ❌ Don't return raw JSON unless specifically needed

### Code Organization
- ✅ Define interfaces for external API responses
- ✅ Keep handler logic clean and readable
- ✅ Extract complex formatting to helper functions
- ✅ Add JSDoc comments for tool purpose
- ✅ Use `.js` extension in all imports

### Performance
- ✅ Use native Node.js APIs when possible (fetch, fs, crypto)
- ✅ Avoid unnecessary dependencies
- ✅ Handle timeouts for external API calls
- ✅ Cache results if appropriate (using variables, not files)

## Testing Your Tool

### Manual Testing
1. Build: `npm run build`
2. Verify no TypeScript errors
3. Test through Claude Code interface
4. Test error cases (missing env vars, invalid inputs, API failures)

### Test Checklist
- [ ] Tool appears in tool list
- [ ] Required parameters are validated
- [ ] Optional parameters use defaults correctly
- [ ] Success case returns formatted results
- [ ] Missing API key returns clear error
- [ ] Invalid input returns clear error
- [ ] API failures are handled gracefully
- [ ] Empty results return informative message

## Common Patterns

### Pattern 1: API Tool
- Get API key from environment
- Make HTTP request with fetch()
- Handle response status codes
- Parse and format response
- Return formatted text

### Pattern 2: Computation Tool
- Validate inputs with Zod
- Perform calculation/transformation
- Format result
- No external dependencies needed

### Pattern 3: Data Aggregation Tool
- Make multiple API calls (if needed)
- Aggregate results
- Format as readable summary
- Handle partial failures

## Troubleshooting

**Build fails with "Cannot find module"**
→ Check import paths use `.js` extension

**Tool doesn't appear in Claude Code**
→ Verify tool is added to `src/tools/index.ts` array

**"Environment variable not set" error**
→ Create `.env.local` and add required variables

**TypeScript errors about args type**
→ Zod schema should match handler usage - check property names

**Response not showing in Claude Code**
→ Ensure response has `content: [{ type: "text", text: "..." }]` structure

## Quick Start Checklist

To add a new tool:
- [ ] Create `src/tools/{name}.tool.ts`
- [ ] Define tool with name, description, inputSchema, handler
- [ ] Add error handling in handler
- [ ] Import and register in `src/tools/index.ts`
- [ ] Add dependencies to `package.json` (if needed)
- [ ] Update `.env.example` (if using env vars)
- [ ] Run `npm install` (if added dependencies)
- [ ] Run `npm run build`
- [ ] Test through Claude Code

## Template Files

### Minimal Tool Template
```typescript
import { z } from "zod";
import type { ToolDefinition } from "../types/index.js";

export const templateTool: ToolDefinition = {
  name: "tool_name",
  description: "What this tool does",

  inputSchema: z.object({
    input: z.string().describe("Input description"),
  }),

  handler: async (args) => {
    try {
      const result = `Processed: ${args.input}`;
      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error) {
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

### API Tool Template
```typescript
import { z } from "zod";
import type { ToolDefinition } from "../types/index.js";
import { getEnvVariable } from "../utils/env.js";

interface ApiResponse {
  // Define response shape
}

export const apiTool: ToolDefinition = {
  name: "api_tool",
  description: "Calls external API",

  inputSchema: z.object({
    query: z.string().min(1).describe("Query parameter"),
    limit: z.number().int().min(1).max(100).default(10).describe("Result limit"),
  }),

  handler: async (args) => {
    try {
      const apiKey = getEnvVariable("API_KEY", true);

      const response = await fetch("https://api.example.com/endpoint", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: args.query,
          limit: args.limit,
        }),
      });

      if (!response.ok) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `API error: ${response.status}`,
          }],
        };
      }

      const data = (await response.json()) as ApiResponse;

      // Format and return results
      return {
        content: [{
          type: "text",
          text: formatResults(data),
        }],
      };
    } catch (error) {
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

function formatResults(data: ApiResponse): string {
  // Format the response data
  return "Formatted results";
}
```

## Resources

- **MCP SDK Docs**: https://github.com/modelcontextprotocol/sdk
- **Zod Documentation**: https://zod.dev
- **Node.js fetch API**: https://nodejs.org/docs/latest/api/globals.html#fetch
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

---

**Last Updated**: 2026-01-04
**Project**: my-mcp-server
