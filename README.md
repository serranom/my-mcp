# My MCP Server

A custom Model Context Protocol (MCP) server with an extensible tool architecture for Claude Code. This server makes it easy to add custom tools that Claude can use during conversations.

## Features

- **Extensible Architecture**: Easy-to-use pattern for adding new tools
- **TypeScript**: Full type safety with TypeScript
- **Example Tools Included**: Calculator and Echo tools to demonstrate the pattern
- **Production-Ready**: Proper error handling and validation with Zod
- **Well-Documented**: Clear examples and documentation for adding new tools

## Available Tools

### 1. Calculate
Perform basic arithmetic operations (add, subtract, multiply, divide).

**Example usage:**
- "Calculate 15 + 27"
- "What's 100 divided by 4?"
- "Multiply 8 by 9"

### 2. Echo
Echo a message back, with optional text transformation (uppercase/lowercase).

**Example usage:**
- "Echo 'Hello World'"
- "Echo 'test message' in uppercase"
- "Echo 'LOUD TEXT' in lowercase"

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

This will compile the TypeScript code to JavaScript in the `build/` directory.

### 3. Configure Claude Code

Add the following configuration to your `~/.claude.json` file:

```json
{
  "mcpServers": {
    "my-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/martin/src/my-mcp/build/index.js"]
    }
  }
}
```

**Important:** Make sure to use the absolute path to your `build/index.js` file.

### 4. Restart Claude Code

After updating the configuration, restart Claude Code to load the MCP server.

## Adding New Tools

Adding a new tool is simple and follows a consistent pattern:

### Step 1: Create a New Tool File

Create a new file in `src/tools/` with the naming convention `your-tool.tool.ts`:

```typescript
import { z } from "zod";
import type { ToolDefinition } from "../types/index.js";

export const yourTool: ToolDefinition = {
  name: "your_tool_name",
  description: "Description of what your tool does",

  inputSchema: z.object({
    param1: z.string().describe("Description of parameter 1"),
    param2: z.number().optional().describe("Optional parameter 2"),
  }),

  handler: async (args) => {
    // Your tool logic here
    const result = `Processed: ${args.param1}`;

    return {
      content: [{
        type: "text",
        text: result
      }]
    };
  }
};
```

### Step 2: Register the Tool

Add your tool to the registry in `src/tools/index.ts`:

```typescript
import { yourTool } from "./your-tool.tool.js";

export const tools: ToolDefinition[] = [
  echoTool,
  calculatorTool,
  yourTool,  // Add your tool here
];
```

### Step 3: Rebuild

```bash
npm run build
```

### Step 4: Restart Claude Code

Restart Claude Code to load the new tool.

### Step 5: Test

Try using your new tool in a conversation with Claude!

## Tool Examples

### Simple Text Processing Tool

```typescript
import { z } from "zod";
import type { ToolDefinition } from "../types/index.js";

export const reverseTool: ToolDefinition = {
  name: "reverse",
  description: "Reverse a string",

  inputSchema: z.object({
    text: z.string().describe("The text to reverse"),
  }),

  handler: async (args) => {
    const reversed = args.text.split("").reverse().join("");

    return {
      content: [{
        type: "text",
        text: reversed
      }]
    };
  }
};
```

### API Call Tool

```typescript
import { z } from "zod";
import type { ToolDefinition } from "../types/index.js";

export const weatherTool: ToolDefinition = {
  name: "get_weather",
  description: "Get current weather for a location",

  inputSchema: z.object({
    location: z.string().describe("City name or zip code"),
  }),

  handler: async (args) => {
    try {
      // Make API call (example)
      const response = await fetch(
        `https://api.weather.example.com/current?location=${args.location}`
      );
      const data = await response.json();

      return {
        content: [{
          type: "text",
          text: `Weather in ${args.location}: ${data.temperature}°F, ${data.conditions}`
        }]
      };
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: `Failed to fetch weather: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
};
```

## Project Structure

```
my-mcp/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── server.ts                   # Server initialization and request handlers
│   ├── tools/
│   │   ├── index.ts                # Tool registry (add new tools here)
│   │   ├── calculator.tool.ts      # Calculator tool implementation
│   │   └── echo.tool.ts            # Echo tool implementation
│   └── types/
│       └── index.ts                # TypeScript type definitions
├── build/                          # Compiled JavaScript (generated)
├── package.json                    # Project dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── .gitignore                      # Git ignore rules
├── .env.example                    # Environment variable template
└── README.md                       # This file
```

## Development

### Build the Project

```bash
npm run build
```

### Run in Development Mode

```bash
npm run dev
```

This will build and run the server, showing any startup logs.

## Error Handling

All tools should handle errors gracefully and return structured error responses:

```typescript
// Success response
return {
  content: [{
    type: "text",
    text: "Operation successful"
  }]
};

// Error response
return {
  isError: true,
  content: [{
    type: "text",
    text: "Error: Something went wrong"
  }]
};
```

## Important Notes

- **Logging**: Always use `console.error()` for logging, never `console.log()`. The latter corrupts JSON-RPC messages over stdio.
- **Input Validation**: All inputs are automatically validated using Zod schemas
- **Error Messages**: Provide clear, helpful error messages for debugging
- **Async Handlers**: All tool handlers are async functions

## Troubleshooting

### Server Not Appearing in Claude Code

1. Check that the path in `~/.claude.json` is absolute and correct
2. Verify the build succeeded: `npm run build`
3. Restart Claude Code completely
4. Check for errors: `node build/index.js` (should start without errors)

### Tool Not Working

1. Verify the tool is added to the registry in `src/tools/index.ts`
2. Rebuild the project: `npm run build`
3. Restart Claude Code
4. Check the Zod schema matches your expected input format

### TypeScript Errors

1. Make sure all imports use `.js` extensions (required for ES modules)
2. Run `npm run build` to see detailed error messages
3. Check that types are correctly imported from `../types/index.js`

## License

MIT

## Contributing

Feel free to add more tools and share them! The modular architecture makes it easy to create and share tool implementations.
