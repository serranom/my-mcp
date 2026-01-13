import { z } from "zod";
import TurndownService from "turndown";
import * as cheerio from "cheerio";
import type { ToolDefinition } from "../types/index.js";

/**
 * Clean HTML by removing unwanted elements and attributes
 */
function cleanHtml(html: string): string {
  const $ = cheerio.load(html);

  // Remove script and style elements
  $("script").remove();
  $("style").remove();
  $("noscript").remove();
  $("iframe").remove();

  // Remove navigation elements
  $("nav").remove();
  $('[role="navigation"]').remove();

  // Remove common UI chrome
  $("header").remove();
  $("footer").remove();
  $("aside").remove();

  // Remove ads and social widgets
  $('[class*="ad-"]').remove();
  $('[id*="ad-"]').remove();
  $('[class*="advertisement"]').remove();
  $('[class*="social"]').remove();
  $('[class*="share"]').remove();

  // Remove comments sections
  $('[class*="comment"]').remove();
  $('[id*="comment"]').remove();

  // Remove unwanted attributes from all remaining elements
  $("*").each((_, element) => {
    const $el = $(element);
    $el.removeAttr("style");
    $el.removeAttr("class");
    $el.removeAttr("id");
    // Remove event handlers
    $el.removeAttr("onclick");
    $el.removeAttr("onload");
    $el.removeAttr("onerror");
    $el.removeAttr("onmouseover");
    $el.removeAttr("onmouseout");
  });

  return $.html();
}

/**
 * Tight Web Fetch Tool
 *
 * Fetches a URL and converts HTML content to clean markdown format.
 * Removes scripts, styles, navigation, ads, and other unwanted elements.
 * Uses Cheerio for HTML cleaning and Turndown for markdown conversion.
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

      // Clean the HTML by removing unwanted elements and attributes
      const cleanedHtml = cleanHtml(html);

      // Convert cleaned HTML to markdown using Turndown
      const turndownService = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        bulletListMarker: "-",
        emDelimiter: "*",
      });

      const markdown = turndownService.turndown(cleanedHtml);

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
