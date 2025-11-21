import { generateCompletion } from '../llm/client.js';
import { KnowledgeItem } from '../store/schema.js';
import { logger } from '../logger.js';

export interface ScoredItem {
    id: string;
    score: number; // 0-10
    reasoning: string;
    item: KnowledgeItem;
}

const CURATION_CRITERIA = `
We are interested in a VERY SPECIFIC subset of AI/DevTools.

**PRIMARY INTEREST (Boost Score +++)**:
1. **Context Engineering / Context Management**: How to manage, prune, or optimize context for LLMs.
2. **Codebase Indexing & Retrieval**: Techniques for searching large codebases (RAG, Vector DBs, Knowledge Graphs, BM25, Zoekt, AST-based retrieval).
3. **Memory Systems for Agents**: Long-term memory, state management, and retrieval of past interactions.
4. **Documentation Understanding**: Tools that parse/index docs for RAG.

**SECONDARY INTEREST (Keep but Score Lower)**:
1. **Agentic Coding**: ONLY if it discusses the *retrieval* or *context* aspect. Generic "Agent wrote snake game" is low value.
2. **Competitor Updates**: Major releases from CodeRabbit, Augment, etc.

**EXPLICITLY DOWNGRADE (Score < 5)**:
- **Generic LLM News**: "GPT-5 rumors", "OpenAI governance", "New image model".
- **Generic Agent Demos**: "Computer Use agent booking flights" (unless it discusses how it retrieves info).
- **General Coding Tuts**: "How to use React", "Python tips".

**Examples**:
- "MemoriesDB: A temporal-semantic-relational database" -> **Score 9/10** (Core Context/Memory tech).
- "Learning from Online Videos for Computer-Use Agents" -> **Score 4/10** (Generic agent behavior, not context/retrieval).
- "TeaRAG: Token-Efficient RAG" -> **Score 9/10** (Retrieval optimization).
- "OpenAI launches new Voice Mode" -> **Score 2/10** (Irrelevant feature).
`;

export async function curateContent(items: KnowledgeItem[]): Promise<ScoredItem[]> {
    if (items.length === 0) return [];

    logger.info(`Curating ${items.length} items with LLM...`);

    // Batch items to avoid context limits (e.g., 10-15 items per batch)
    const BATCH_SIZE = 15;
    const batches = [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        batches.push(items.slice(i, i + BATCH_SIZE));
    }

    const results: ScoredItem[] = [];

    for (const batch of batches) {
        const batchInput = batch.map(item => ({
            id: item.id,
            title: item.title,
            summary: item.source === 'ads' ? (item as any).abstract : (item as any).summary || (item as any).content?.slice(0, 300),
            source: item.source,
            origin: item.source === 'rss' ? (item as any).feedName : 'Academic Paper'
        }));

        try {
            const prompt = `
You are a Research Curator for a team building **Code Intelligence & Context Engineering** tools.
Evaluate the following items based on the Strict Criteria below.

${CURATION_CRITERIA}

For each item, assign a relevance score from 0 to 10.
- **9-10**: DIRECTLY about Code Search, RAG, Context Windows, or Knowledge Graphs for Code.
- **7-8**: Strongly related infra (Vector DB updates, Agent Memory architectures).
- **5-6**: Competitor product launches (CodeRabbit, etc.) or major LLM coding benchmarks.
- **0-4**: Everything else (Generic agents, vision models, general tech news).

Return a JSON object with a "ratings" array:
{
  "ratings": [
    { "id": "string", "score": number, "reasoning": "string (1 sentence justification)" }
  ]
}

Items to evaluate:
${JSON.stringify(batchInput, null, 2)}
`;

            const response = await generateCompletion(prompt, "Output ONLY valid JSON.");
            
            // robust parsing
            let parsed: any;
            try {
                // Strip markdown code blocks if present
                const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
                parsed = JSON.parse(cleanJson);
            } catch (e) {
                logger.warn("Failed to parse curation response JSON", { error: String(e), response });
                continue;
            }

            if (parsed?.ratings && Array.isArray(parsed.ratings)) {
                for (const rating of parsed.ratings) {
                    const original = batch.find(i => i.id === rating.id);
                    if (original) {
                        results.push({
                            id: original.id,
                            score: rating.score,
                            reasoning: rating.reasoning,
                            item: original
                        });
                    }
                }
            }

        } catch (error) {
            logger.error("Error curating batch", { error: String(error) });
        }
    }

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
}
