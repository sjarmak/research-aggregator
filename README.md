# Research Agent

A tool-using research agent specializing in software engineering and AI agents. This agent leverages Sourcegraph for code search and local knowledge stores (RSS feeds, papers) to provide comprehensive answers to technical queries.

## Features

- **Code Search**: deeply search repositories using Sourcegraph (`sg_search`, `sg_read_file`).
- **AI/Agent Research**: Search local papers and RSS feeds in parallel (`multi_source_research`).
- **Knowledge Store**: Ingest and query RSS feeds and local papers (`get_recent_articles`, `lookup_personal_papers`).
- **Research Loop**: Follows a structured Query Analysis -> Search -> Reflection -> Answer loop.

## Prerequisites

- Node.js (v18+ recommended)
- A Sourcegraph account (and access token).
- `npm` or `pnpm`.

## Setup

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Configure Environment:**

    Create a `.env` file in the root directory (see `.env.example`):

    ```env
    SOURCEGRAPH_URL=https://sourcegraph.com
    SOURCEGRAPH_TOKEN=your_sourcegraph_access_token
    # Optional
    LOG_LEVEL=info
    ```

3.  **Build the project:**

    ```bash
    npm run build
    ```

## Usage

### Running the Agent

To ask the agent a question:

```bash
node dist/index.js "Your research query here"
```

**Examples:**
- `node dist/index.js "How does Sourcegraph handle search contexts?"`
- `node dist/index.js "What are the latest trends in autonomous coding agents?"`

### Data Ingestion

The agent uses a local knowledge store for RSS feeds and papers.

**Ingest RSS feeds:**
```bash
node dist/lib/ingest/run-sync.js rss
```

**View Stats:**
```bash
node dist/lib/ingest/run-sync.js stats
```

## Available Tools

The agent has access to the following tools (via `tools-server`):

-   `sg_search`: Search for code, repositories, or files on Sourcegraph.
-   `sg_read_file`: Read file content from a repository.
-   `multi_source_research`: Run parallel queries against local papers and RSS feeds.
-   `get_recent_articles`: Get recent articles from ingested RSS feeds.
-   `lookup_personal_papers`: Search the local papers database.

## Development

-   **Build**: `npm run build`
-   **Lint**: `npm run lint`
-   **Smoke Tests**: `scripts/smoke-test.sh`

## Architecture

-   **Entrypoint**: `src/index.ts` (initializes the agent loop).
-   **MCP Server**: `src/servers/tools-server.ts` (exposes tools to the agent).
-   **Ingestion**: `src/lib/ingest/run-sync.ts` (handles data synchronization).
