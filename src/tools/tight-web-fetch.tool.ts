import { z } from "zod";
import TurndownService from "turndown";
import type { ToolDefinition } from "../types/index.js";

/**
 * Tight Web Fetch Tool
 *
 * Fetches a URL and converts HTML content to clean markdown format.
 * Uses the Turndown library for HTML to markdown conversion.
 */
export const tightWebFetchTool: ToolDefinition = {
  name: "tight_web_fetch",
  description: "Extract complete content from a specific URL by fetching and converting HTML to clean markdown. Use this for deep data extraction from a single source - perfect for pulling full text from documentation pages, articles, blog posts, or any web page. Returns structured markdown suitable for parsing, analysis, or reading the entire page content.",

  inputSchema: z.object({
    url: z.string().url().describe("The URL to fetch and convert to markdown"),
  }),

  handler: async (args) => {
    try {
      const { url } = args;

      // Fetch the URL
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MCPBot/1.0)",
        },
        redirect: "follow",
      });

      if (!response.ok) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to fetch URL: HTTP ${response.status} ${response.statusText}`,
            },
          ],
        };
      }

      // Get the HTML content
      const html = await response.text();

      // Convert HTML to markdown using Turndown
      const turndownService = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        bulletListMarker: "-",
        emDelimiter: "*",
      });

      const markdown = turndownService.turndown(html);

      // Return the markdown content
      return {
        content: [
          {
            type: "text",
            text: `# Fetched from: ${url}\n\n${markdown}`,
          },
        ],
      };
    } catch (error) {
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
