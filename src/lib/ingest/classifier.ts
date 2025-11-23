import { ExternalArticle, Paper } from '../store/schema.js';

export type FeedCategory = 'competitor_blog' | 'platform_blog' | 'infra_blog' | 'curated_ai' | 'engineering_blog' | 'general';
export type ContentType = 'product_launch' | 'feature_update' | 'pricing_business' | 'security_incident' | 'funding_mna' | 'benchmark_eval' | 'thought_leadership' | 'general';

export const KEYWORD_HEURISTICS: Record<Exclude<ContentType, 'general'>, string[]> = {
    product_launch: ['launch', 'introducing', 'announcing', 'now ga', 'public preview', 'beta', 'generally available', 'now available', 'released'],
    feature_update: ['new integration', 'support for', 'now supports', 'mcp', 'langgraph', 'agents', 'multi-repo', 'context window', 'code graph', 'self-hosted', 'update'],
    pricing_business: ['pricing', 'plans', 'credits', 'free tier', 'enterprise', 'seat', 'per-user', 'license', 'billing', 'usage based'],
    security_incident: ['security', 'vulnerability', 'cve-', 'incident', 'breach', 'exploit', 'remote code execution', ' rce ', 'supply chain', 'security advisory'],
    funding_mna: ['raises', 'series a', 'series b', 'seed round', 'acquired', 'acquisition', 'joins', 'merger'],
    benchmark_eval: ['benchmark', 'throughput', 'latency', 'tokens/sec', 'quality evaluation', 'win-rate', 'comparison', 'beat', 'outperforms'],
    thought_leadership: ['future of', 'why x matters', 'guide to', 'best practices', 'lessons learned', 'deep dive']
};

export const DOMAIN_TAGS_MAPPING: Record<string, string[]> = {
    code_review: ['pr', 'pull request', 'merge request', 'code review', 'review agent'],
    documentation: ['documentation', 'docs', 'docstrings', 'api reference'],
    retrieval: ['rag', 'retrieval', 'vector', 'embedding', 'index', 'pinecone', 'weaviate', 'qdrant'],
    agents: ['agent', 'agentic', 'langgraph', 'mcp', 'autonomous'],
    ide: ['ide', 'vscode', 'jetbrains', 'editor', 'plugin', 'extension'],
    testing: ['testing', 'unit test', 'integration test', 'test coverage'],
    observability: ['observability', 'monitoring', 'tracing', 'metrics'],
    governance: ['governance', 'compliance', 'audit', 'policy'],
};

export const WEIGHTS = {
    source_type: {
        competitor_blog: 3,
        engineering_blog: 3,
        platform_blog: 2,
        infra_blog: 1.5,
        curated_ai: 1,
        general: 0.5,
        // Adding for papers
        paper: 2.5 
    },
    content_type: {
        product_launch: 4,
        security_incident: 4,
        feature_update: 3,
        pricing_business: 3,
        funding_mna: 3,
        benchmark_eval: 2,
        thought_leadership: 0.5,
        general: 1
    },
    axis: {
        code_review: 3,
        context_engine: 3,
        documentation: 2,
        agents: 2,
        governance: 2,
        retrieval: 1.5,
        testing: 1.5,
        vector_db: 1,
        ide: 1,
        observability: 1
    }
};

export const KEYWORD_BOOSTS: { patterns: string[], boost: number }[] = [
    { patterns: ['launch', 'announcing', 'now ga', 'public preview', 'beta', 'integration', 'mcp', 'agents', 'langgraph', 'self-hosted', 'on-prem', 'air-gapped'], boost: 3 },
    { patterns: ['context window', 'code graph', 'multi-repo', 'governance', 'sdlc', 'sast', 'compliance', 'policy', 'test coverage'], boost: 2 },
    { patterns: ['pricing', 'credits', 'seat', 'per-user', 'enterprise', 'unlimited'], boost: 2 },
    { patterns: ['security', 'vulnerability', 'cve-', 'data exfiltration', 'prompt injection'], boost: 2 }
];

export function classifyContent(title: string, content: string): { contentType: ContentType, tags: string[] } {
    const text = `${title} ${content}`.toLowerCase();
    
    // 1. Content Type
    let primaryType: ContentType = 'general';
    
    for (const [type, keywords] of Object.entries(KEYWORD_HEURISTICS)) {
        if (keywords.some(kw => text.includes(kw))) {
            primaryType = type as ContentType;
            break; 
        }
    }
    
    if (primaryType === 'general' && (text.includes('how to') || text.includes('tutorial'))) {
        primaryType = 'thought_leadership';
    }

    // 2. Domain Tags (Axis)
    const tags: string[] = [];
    for (const [tag, keywords] of Object.entries(DOMAIN_TAGS_MAPPING)) {
        if (keywords.some(kw => text.includes(kw))) {
            tags.push(tag);
        }
    }

    return { contentType: primaryType, tags };
}

export function calculateScore(
    item: Partial<ExternalArticle> | Partial<Paper>,
    sourceCategory: FeedCategory | 'paper' = 'general', 
    contentType: ContentType, 
    tags: string[]
): number {
    let score = 0;
    
    // Base weights
    const sourceWeight = (WEIGHTS.source_type as any)[sourceCategory] || 1;
    score += sourceWeight;
    score += WEIGHTS.content_type[contentType] || 1;
    
    for (const tag of tags) {
        const w = (WEIGHTS.axis as any)[tag] || 0;
        score += w;
    }
    
    // Keyword Boosts
    const anyItem = item as any;
    const text = `${anyItem.title || ''} ${anyItem.abstract || anyItem.summary || ''}`.toLowerCase();
    for (const group of KEYWORD_BOOSTS) {
        if (group.patterns.some(p => text.includes(p))) {
            score += group.boost;
        }
    }
    
    // Recency Decay
    const dateStr = (item as any).publishedAt || (item as any).year + '-01-01'; // Fallback for paper year
    if (dateStr) {
        const published = new Date(dateStr);
        if (!isNaN(published.getTime())) {
            const ageDays = (Date.now() - published.getTime()) / (1000 * 60 * 60 * 24);
            if (ageDays > 0) {
                const decay = Math.exp(-ageDays / 14);
                score *= decay;
            }
        }
    }
    
    return score;
}
