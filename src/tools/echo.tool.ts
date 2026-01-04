import { z } from "zod";
import type { ToolDefinition } from "../types/index.js";

/**
 * Echo Tool
 * Simple example tool that echoes back a message with optional text transformation
 */
export const echoTool: ToolDefinition = {
  name: "echo",
  description: "Echo a message back, optionally transforming it to uppercase or lowercase",

  inputSchema: z.object({
    message: z.string().describe("The message to echo back"),
    transform: z
      .enum(["uppercase", "lowercase", "none"])
      .optional()
      .default("none")
      .describe("Optional text transformation to apply"),
  }),

  handler: async (args) => {
    let result = args.message;

    // Apply transformation if specified
    switch (args.transform) {
      case "uppercase":
        result = result.toUpperCase();
        break;
      case "lowercase":
        result = result.toLowerCase();
        break;
      case "none":
      default:
        // No transformation
        break;
    }

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  },
};
