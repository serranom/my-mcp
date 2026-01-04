#!/usr/bin/env node

/**
 * MCP Server Entry Point
 *
 * This file sets up the MCP server and connects it to stdio transport
 * for communication with Claude Code.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

/**
 * Main function to start the MCP server
 */
async function main() {
  // Use console.error for logging - console.log corrupts JSON-RPC messages over stdio
  console.error("Starting MCP server...");

  try {
    // Create the MCP server instance
    const server = createServer();

    // Set up stdio transport for communication with Claude Code
    const transport = new StdioServerTransport();

    // Connect the server to the transport
    await server.connect(transport);

    console.error("MCP server started successfully");
    console.error("Available tools:", server);
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

// Start the server
main();
