import { execute } from '@sourcegraph/amp-sdk';
import { config } from './config.js';

async function main() {
  const userPrompt = process.argv[2] || "Hello, are you working?";

  console.log(`User: ${userPrompt}`);
  console.log("Agent starting...");

  // Verify config usage
  if (config.LOG_LEVEL === 'debug') {
      console.log("Debug mode enabled");
  }

  try {
    const iterator = execute({
      prompt: userPrompt,
      options: {
        dangerouslyAllowAll: true
      }
    });

    for await (const message of iterator) {
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
          // console.log("(assistant update)"); 
      }
    }
  } catch (error) {
    console.error("Execution failed:", error);
    process.exit(1);
  }
}

main();
