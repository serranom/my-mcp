import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";
import { tools } from "./tools/index.js";

/**
 * Create and configure the MCP server
 */
export function createServer() {
  const server = new Server(
    {
      name: "my-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  /**
   * Handler for listing available tools
   * Returns metadata for all registered tools
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map((tool) => {
        // Convert Zod schema to JSON Schema format
        const zodSchema = tool.inputSchema as any;
        const shape = zodSchema._def?.shape?.() || {};
        const properties: Record<string, any> = {};
        const required: string[] = [];

        for (const [key, value] of Object.entries(shape)) {
          const fieldSchema = value as any;
          properties[key] = {
            type: "string", // Simplified - could be enhanced
            description: fieldSchema._def?.description || "",
          };

          // Check if field is optional
          if (fieldSchema._def?.typeName !== "ZodOptional") {
            required.push(key);
          }
        }

        return {
          name: tool.name,
          description: tool.description,
          inputSchema: {
            type: "object",
            properties,
            required,
          },
        };
      }),
    };
  });

  /**
   * Handler for executing tool calls
   * Validates input and executes the requested tool
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;

    // Find the requested tool
    const tool = tools.find((t) => t.name === toolName);

    if (!tool) {
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${toolName}`,
          },
        ],
        isError: true,
      };
    }

    try {
      // Validate and parse arguments using Zod schema
      const args = tool.inputSchema.parse(request.params.arguments || {});

      // Execute the tool handler
      const result = await tool.handler(args);

      return {
        content: result.content,
        isError: result.isError || false,
      };
    } catch (error) {
      // Handle validation errors
      if (error instanceof ZodError) {
        return {
          content: [
            {
              type: "text",
              text: `Invalid arguments: ${error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      // Handle other errors
      return {
        content: [
          {
            type: "text",
            text: `Error executing tool: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
