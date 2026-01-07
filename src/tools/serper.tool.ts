import { z } from "zod";
import type { ToolDefinition } from "../types/index.js";
import { getEnvVariable } from "../utils/env.js";

/**
 * Serper API result interface
 */
interface SerperResult {
  link: string;
  title: string;
  snippet: string;
  position: number;
}

/**
 * Serper API response interface
 */
interface SerperResponse {
  organic: SerperResult[];
}

/**
 * Serper Search Tool
 * Performs web searches using the Serper.dev API and returns top N results
 */
export const serperTool: ToolDefinition = {
  name: "non_code_web_search",
  description:
    "Search the web and extract structured data (titles, URLs, snippets) from multiple search results. Use this for discovering sources, researching topics, finding documentation, or exploring options. Ideal for data extraction when you need to identify relevant URLs or gather information from across multiple web sources.",

  inputSchema: z.object({
    query: z.string().min(1).describe("Search query"),
    num: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10)
      .describe("Number of results to return (1-100, default: 10)"),
  }),

  handler: async (args) => {
    try {
      // Get API key from environment
      const apiKey = getEnvVariable("SERPER_API_KEY", true);

      // Make request to Serper API
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: args.query,
          num: args.num,
        }),
      });

      // Handle API errors
      if (!response.ok) {
        let errorMessage = `Serper API error (${response.status})`;

        if (response.status === 401) {
          errorMessage = "Invalid API key";
        } else if (response.status === 429) {
          errorMessage = "API rate limit exceeded";
        } else if (response.status >= 500) {
          errorMessage = "Serper API service error";
        }

        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }

      // Parse response
      const data = (await response.json()) as SerperResponse;

      // Check if we have results
      if (!data.organic || data.organic.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No search results found for "${args.query}"`,
            },
          ],
        };
      }

      // Format results
      const resultsText = data.organic
        .map((result, index) => {
          return `${index + 1}. ${result.title}\n   URL: ${result.link}\n   ${result.snippet}`;
        })
        .join("\n\n");

      const formattedResponse = `Found ${data.organic.length} results for "${args.query}":\n\n${resultsText}`;

      return {
        content: [
          {
            type: "text",
            text: formattedResponse,
          },
        ],
      };
    } catch (error) {
      // Handle missing API key error
      if (error instanceof Error && error.message.includes("SERPER_API_KEY")) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Error: SERPER_API_KEY environment variable not set. Please add it to your .env or .env.local file.",
            },
          ],
        };
      }

      // Handle network and other errors
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
          },
        ],
      };
    }
  },
};
