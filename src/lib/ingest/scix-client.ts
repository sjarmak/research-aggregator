import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { config } from "../../config.js";
import { logger } from "../logger.js";

export class ScixClient {
    private client: Client;
    private transport: StdioClientTransport;
    private isConnected: boolean = false;

    constructor(command: string = "node", args: string[] = [process.cwd() + "/scix-mcp/build/index.js"]) {
        // Allow overriding via env vars
        const cmd = process.env.SCIX_MCP_COMMAND || command;
        const cmdArgs = process.env.SCIX_MCP_ARGS ? process.env.SCIX_MCP_ARGS.split(' ') : args;

        this.transport = new StdioClientTransport({
            command: cmd,
            args: cmdArgs,
            env: {
                // Pass the ADS token as SCIX_API_TOKEN
                SCIX_API_TOKEN: config.ADS_TOKEN || process.env.SCIX_API_TOKEN || "",
                PATH: process.env.PATH || "" // Ensure npx can be found
            }
        });

        this.client = new Client({
            name: "research-agent-scix-client",
            version: "1.0.0"
        }, {
            capabilities: {}
        });
    }

    async connect() {
        if (this.isConnected) return;
        try {
            logger.info("Connecting to SciX MCP server...");
            await this.client.connect(this.transport);
            this.isConnected = true;
            logger.info("Connected to SciX MCP server.");
        } catch (error) {
            logger.error("Failed to connect to SciX MCP server", { error: String(error) });
            throw error;
        }
    }

    async search(query: string, rows: number = 10) {
        await this.connect();
        return this.client.callTool({
            name: "search",
            arguments: { 
                query, 
                rows, 
                sort: "date desc",
                response_format: "json" 
            }
        });
    }

    async getPaper(bibcode: string) {
        await this.connect();
        return this.client.callTool({
            name: "get_paper",
            arguments: { 
                bibcode, 
                response_format: "json" 
            }
        });
    }

    async close() {
        if (this.isConnected) {
            await this.client.close();
            this.isConnected = false;
        }
    }
}

export const scixClient = new ScixClient();
