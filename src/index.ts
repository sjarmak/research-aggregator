import { execute } from '@sourcegraph/amp-sdk';
import { config } from './config.js';
import { RESEARCHER_SYSTEM_PROMPT } from './agent/prompt.js';

async function main() {
  const userQuery = process.argv[2];
  if (!userQuery) {
      console.error("Usage: node dist/index.js <query>");
      process.exit(1);
  }

  console.log(`User: ${userQuery}`);
  console.log("Agent starting...");

  // Verify config usage
  if (config.LOG_LEVEL === 'debug') {
      console.log("Debug mode enabled");
  }

  // Prepare environment for MCP server
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([_, v]) => v !== undefined)
  ) as Record<string, string>;

  const fullPrompt = `${RESEARCHER_SYSTEM_PROMPT}\n\nUser Query: "${userQuery}"`;

  try {
    const iterator = execute({
      prompt: fullPrompt,
      options: {
        dangerouslyAllowAll: true,
        mcpConfig: {
          "tools-server": {
            command: "node",
            args: ["dist/servers/tools-server.js"],
            env: env
          }
        }
      }
    });

    for await (const message of iterator) {
      if (message.type === 'system' && (message as any).subtype === 'init') {
          console.log("Available tools:", (message as any).tools);
      }
      if (message.type === 'result') {
        if (message.is_error) {
             console.error("\n--- Error ---");
             console.error(message.error);
             process.exit(1);
        } else {
             console.log("\n--- Result ---");
             console.log(message.result);
        }
      }
      // Check for assistant text to show progress, but avoid duplication if it sends full state
      // For now, we can just log that we received an update
      if (message.type === 'assistant') {
        const msg = message as any;
        if (msg.message?.content) {
             for (const content of msg.message.content) {
                 if (content.type === 'tool_use') {
                     console.log(`[Tool Use] ${content.name}(${JSON.stringify(content.input)})`);
                 }
             }
        }
      }
    }
  } catch (error) {
    console.error("Execution failed:", error);
    process.exit(1);
  }
}

main();
