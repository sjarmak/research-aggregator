import { handleToolCall } from '../src/lib/tools/registry.js';
import * as dotenv from 'dotenv';
dotenv.config();
async function main() {
    try {
        console.log("Running generate_newsletter tool...");
        const result = await handleToolCall("generate_newsletter", { days: 7 });
        if (result.isError) {
            console.error("Tool execution failed:", result.content[0].text);
        }
        else {
            console.log("\n--- Newsletter Output ---\n");
            console.log(result.content[0].text);
            console.log("\n-------------------------\n");
        }
    }
    catch (error) {
        console.error("Script error:", error);
    }
}
main();
