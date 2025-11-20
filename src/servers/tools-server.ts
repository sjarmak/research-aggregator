import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "../lib/logger.js";
import { toolDefinitions, handleToolCall } from "../lib/tools/registry.js";

// Create server instance
const server = new Server(
  {
    name: "research-tools",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.debug("Received ListToolsRequest");
  return {
    tools: toolDefinitions,
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const requestId = Math.random().toString(36).substring(7);
  return handleToolCall(name, args, requestId);
});

// Connect transport
const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
  logger.error("Server connection error", { error });
  process.exit(1);
});
