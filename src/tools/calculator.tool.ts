import { z } from "zod";
import type { ToolDefinition } from "../types/index.js";

/**
 * Calculator Tool
 * Performs basic arithmetic operations with proper error handling
 */
export const calculatorTool: ToolDefinition = {
  name: "calculate",
  description: "Perform basic arithmetic operations (add, subtract, multiply, divide)",

  inputSchema: z.object({
    operation: z
      .enum(["add", "subtract", "multiply", "divide"])
      .describe("The arithmetic operation to perform"),
    a: z.number().describe("The first number"),
    b: z.number().describe("The second number"),
  }),

  handler: async (args) => {
    const { operation, a, b } = args;

    // Handle division by zero
    if (operation === "divide" && b === 0) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "Error: Cannot divide by zero",
          },
        ],
      };
    }

    let result: number;

    // Perform the calculation
    switch (operation) {
      case "add":
        result = a + b;
        break;
      case "subtract":
        result = a - b;
        break;
      case "multiply":
        result = a * b;
        break;
      case "divide":
        result = a / b;
        break;
      default:
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: Unknown operation: ${operation}`,
            },
          ],
        };
    }

    return {
      content: [
        {
          type: "text",
          text: `${a} ${operation} ${b} = ${result}`,
        },
      ],
    };
  },
};
