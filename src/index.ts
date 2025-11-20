import { execute } from '@sourcegraph/amp-sdk';
import { config } from './config.js';
import { RESEARCHER_SYSTEM_PROMPT } from './agent/prompt.js';
import { logger } from './lib/logger.js';

async function main() {
  const userQuery = process.argv[2];
  if (!userQuery) {
      console.error("Usage: node dist/index.js <query>");
      process.exit(1);
  }

  // Use logger instead of raw console
  logger.info(`User Query: ${userQuery}`);
  logger.info("Agent starting...");

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
          logger.debug("Available tools initialized", { tools: (message as any).tools.map((t: any) => t.name) });
      }
      if (message.type === 'result') {
        if (message.is_error) {
             logger.error("Execution Error", { error: message.error });
             process.exit(1);
        } else {
             logger.info("Final Result", { result: message.result });
             // Also print to stdout for user visibility if they are piping output
             console.log("\n--- Result ---");
             console.log(message.result);
        }
      }
      // Check for assistant text to show progress
      if (message.type === 'assistant') {
        const msg = message as any;
        if (msg.message?.content) {
          for (const content of msg.message.content) {
            if (content.type === 'tool_use') {
              logger.info(`Tool Use: ${content.name}`, { input: content.input });
            } else if (content.type === 'text') {
               // Streaming thoughts - maybe log as debug or just output to stdout
               // logger.debug("Thought", { text: content.text });
            }
          }
        }
      }
    }
  } catch (error) {
    logger.error("Execution failed", { error });
    process.exit(1);
  }
}

main();
