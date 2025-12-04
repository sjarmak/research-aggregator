/**
 * Heuristics-based term scorer for newsletter curation
 * 
 * Combines weighted keyword matching with LLM scores to identify articles
 * relevant to: code search, context management, information retrieval, 
 * agentic workflows, and enterprise codebase management.
 */

import { logger } from '../logger.js';

export interface TermScorerResult {
    termScore: number;        // 0-10 score based on term matches
    matchedTerms: string[];   // Terms that matched
    termCategory: string;     // Primary category matched
    boostFactor: number;      // Multiplier for LLM score (0.5-1.5)
}

// ============================================================================
// TERM DEFINITIONS BY CATEGORY
// ============================================================================

const TERM_CATEGORIES = {
    // Information Retrieval & Search (Primary focus)
    information_retrieval: {
        weight: 1.5,
        terms: [
            'semantic search', 'semantic code search', 'vector search', 'embedding',
            'retrieval', 'retrieval-augmented', 'rag', 'dense retrieval', 'sparse retrieval',
            'hybrid search', 'bm25', 'vector database', 'embedding model', 'similarity search',
            'nearest neighbor', 'knn', 'approximate nearest neighbor', 'ann',
            'full-text search', 'information retrieval', 'ir system', 'search quality',
            'ranking algorithm', 'relevance ranking', 'information need', 'query understanding',
            'passage retrieval', 'document retrieval', 'reranking', 'cross-encoder',
            'milvus', 'weaviate', 'qdrant', 'pinecone', 'elasticsearch', 'vector store',
            'knowledge base', 'knowledge retrieval', 'fact retrieval'
        ]
    },

    // Context Management (Critical for code understanding)
    context_management: {
        weight: 1.5,
        terms: [
            'context window', 'context management', 'context length', 'long context',
            'context compression', 'prompt compression', 'context-aware', 'context expansion',
            'sliding window', 'context windowing', 'conversation history', 'session management',
            'state management', 'context retention', 'context overflow', 'context limit',
            'token budget', 'token limit', 'attention window', 'context padding',
            'multi-document context', 'context synthesis', 'information fusion', 'context fusion',
            'memory management', 'memory augmented', 'memory-augmented generation', 'mag',
            'working memory', 'external memory'
        ]
    },

    // Code Search & Discovery (Core to the newsletter)
    code_search: {
        weight: 1.6,
        terms: [
            'code search', 'semantic code search', 'codebase search', 'code discovery',
            'code navigation', 'code understanding', 'code comprehension', 'code indexing',
            'code analysis', 'code intelligence', 'code insight', 'code search engine',
            'code-to-code search', 'cross-repo search', 'cross-repository search',
            'code similarity', 'code clone detection', 'code matching', 'code retrieval',
            'api discovery', 'library discovery', 'dependency discovery', 'code reuse',
            'code mining', 'source code analysis', 'program analysis', 'static analysis',
            'codebase understanding', 'codebase exploration', 'developer assistant',
            'code copilot', 'ai coding assistant', 'code completion', 'code suggestion'
        ]
    },

    // Agentic Workflows in Development
    agentic_systems: {
        weight: 1.4,
        terms: [
            'agent', 'agentic', 'multi-agent', 'agent framework', 'agent system',
            'tool use', 'tool calling', 'function calling', 'agent action', 'agent reasoning',
            'workflow', 'workflow orchestration', 'orchestration', 'autonomous agent',
            'agent planning', 'planning algorithm', 'decision making', 'action selection',
            'observation', 'reward', 'agent evaluation', 'agent benchmark',
            'react framework', 'think-act-observe', 'agent loop', 'execution loop',
            'agent architecture', 'agent design', 'tool integration', 'skill',
            'tool composition', 'multi-step reasoning', 'chain-of-thought', 'reasoning',
            'agent collaboration', 'multi-agent system', 'agent communication',
            'code agent', 'software engineering agent', 'ai programmer', 'code generator',
            'bug fixer', 'code reviewer agent', 'refactoring agent'
        ]
    },

    // Enterprise Codebase Management
    enterprise_codebases: {
        weight: 1.3,
        terms: [
            'large codebase', 'enterprise codebase', 'monorepo', 'polyrepo',
            'multi-repo', 'repository management', 'code organization', 'code structure',
            'modular code', 'component-based', 'microservices', 'service-oriented',
            'large-scale system', 'scalable architecture', 'distributed system',
            'codebase scale', 'code dependency', 'dependency graph', 'dependency management',
            'version control', 'version control at scale', 'git', 'git workflow',
            'merge conflict', 'code review', 'code review process', 'pull request',
            'continuous integration', 'ci/cd', 'build system', 'large team collaboration',
            'enterprise architecture', 'architectural pattern', 'design pattern',
            'cross-team coordination', 'knowledge sharing', 'code documentation'
        ]
    },

    // Developer Tools & Productivity
    developer_tools: {
        weight: 1.2,
        terms: [
            'developer tools', 'developer experience', 'developer productivity', 'devex',
            'ide', 'integrated development environment', 'code editor', 'editor plugin',
            'developer environment', 'development environment', 'dev environment',
            'debugging', 'debugger', 'profiler', 'performance analysis',
            'testing tool', 'test framework', 'test automation', 'testing automation',
            'linting', 'code quality', 'static analyzer', 'type checker',
            'refactoring tool', 'code refactoring', 'code transformation',
            'build tool', 'package manager', 'dependency resolver',
            'documentation tool', 'doc generation', 'api documentation',
            'developer workflow', 'development workflow', 'developer adoption',
            'ai coding', 'copilot', 'code assistant', 'intelligent assistance'
        ]
    },

    // LLM & AI Architecture for Code
    llm_code_architecture: {
        weight: 1.2,
        terms: [
            'large language model', 'llm', 'foundation model', 'pre-trained model',
            'code model', 'code llm', 'specialized code model', 'programming language model',
            'model architecture', 'transformer', 'attention mechanism', 'multi-head attention',
            'prompt engineering', 'prompt design', 'few-shot learning', 'in-context learning',
            'fine-tuning', 'instruction tuning', 'reinforcement learning from feedback', 'rlhf',
            'reasoning', 'chain-of-thought reasoning', 'step-by-step reasoning',
            'knowledge distillation', 'model compression', 'quantization', 'pruning',
            'context length extension', 'long context modeling', 'efficient attention',
            'retrieval-augmented', 'knowledge-augmented', 'fact grounding',
            'hallucination detection', 'hallucination mitigation', 'uncertainty quantification'
        ]
    },

    // Software Development Lifecycle
    sdlc_processes: {
        weight: 1.0,
        terms: [
            'software development', 'development lifecycle', 'sdlc', 'development process',
            'development methodology', 'agile', 'scrum', 'kanban', 'ci/cd',
            'requirement analysis', 'design phase', 'implementation', 'testing phase',
            'deployment', 'maintenance', 'documentation', 'knowledge management',
            'issue tracking', 'bug tracking', 'task management', 'project management',
            'code review', 'peer review', 'code quality assurance', 'qa',
            'software engineering', 'software quality', 'software reliability',
            'software architecture', 'architectural decision', 'design review'
        ]
    },

    // Adjacent: Security & Code Quality
    security_quality: {
        weight: 0.9,
        terms: [
            'code security', 'secure coding', 'security analysis', 'vulnerability detection',
            'static security analysis', 'sast', 'dynamic analysis', 'dast',
            'code quality', 'quality metrics', 'code smell', 'technical debt',
            'maintainability', 'readability', 'test coverage', 'code coverage',
            'performance optimization', 'efficiency', 'resource efficiency',
            'compliance', 'regulatory', 'audit', 'governance'
        ]
    }
};

// ============================================================================
// SCORING LOGIC
// ============================================================================

/**
 * Normalize text for term matching
 */
function normalizeText(text: string): string {
    return text.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
}

/**
 * Check if a term appears in normalized text (whole-word match preferred)
 * Handles multi-word terms that may appear in different orders
 */
function termAppearsIn(text: string, term: string): number {
    const normalizedText = normalizeText(text);
    const normalizedTerm = normalizeText(term);
    
    // Exact phrase match (highest confidence)
    if (normalizedText.includes(normalizedTerm)) {
        return 1.0;
    }
    
    const termWords = normalizedTerm.split(/\s+/).filter(w => w.length > 0);
    const textWords = normalizedText.split(/\s+/).filter(w => w.length > 0);
    
    // For single-word terms, check if word exists
    if (termWords.length === 1) {
        if (textWords.includes(termWords[0])) {
            return 0.9;
        }
        return 0;
    }
    
    // For multi-word terms:
    // 1. Try consecutive match first (exact phrase structure)
    const termRegex = new RegExp(`\\b${termWords.join('\\s+')}\\b`);
    if (termRegex.test(normalizedText)) {
        return 0.95;
    }
    
    // 2. Check if all words are present in order (allowing gaps)
    let matchCount = 0;
    let textIndex = 0;
    for (const word of termWords) {
        const foundIndex = textWords.indexOf(word, textIndex);
        if (foundIndex >= 0) {
            matchCount++;
            textIndex = foundIndex + 1;
        }
    }
    
    // If all words present in order, it's a match (high confidence)
    if (matchCount === termWords.length) {
        return 0.8;
    }
    
    // 3. Check if all words present (in any order, lower confidence)
    const allWordsPresent = termWords.every(w => textWords.includes(w));
    if (allWordsPresent) {
        return 0.6;
    }
    
    return 0;
}

/**
 * Calculate score based on term matches across categories
 */
function calculateTermScore(
    title: string,
    summary: string,
    tags: string[] = []
): TermScorerResult {
    const fullText = `${title} ${summary} ${tags.join(' ')}`.toLowerCase();
    
    const categoryMatches: Array<{
        category: string;
        weight: number;
        score: number;
        matches: string[];
    }> = [];

    // Scan all categories
    for (const [category, categoryData] of Object.entries(TERM_CATEGORIES)) {
        const categoryMatches_inner: string[] = [];
        let categoryScore = 0;

        for (const term of categoryData.terms) {
            const matchStrength = termAppearsIn(fullText, term);
            if (matchStrength > 0) {
                categoryMatches_inner.push(term);
                categoryScore += matchStrength;
            }
        }

        if (categoryMatches_inner.length > 0) {
            categoryMatches.push({
                category,
                weight: categoryData.weight,
                score: Math.min(10, (categoryScore / categoryData.terms.length) * 10),
                matches: categoryMatches_inner
            });
        }
    }

    // If no matches, return neutral score
    if (categoryMatches.length === 0) {
        return {
            termScore: 5, // Neutral baseline
            matchedTerms: [],
            termCategory: 'none',
            boostFactor: 1.0
        };
    }

    // Score = weighted average of category scores
    // Boost score based on strength of matches (deeper matching gets higher base)
    const totalWeight = categoryMatches.reduce((sum, c) => sum + c.weight, 0);
    const rawWeightedScore = categoryMatches.reduce((sum, c) => sum + (c.score * c.weight), 0) / totalWeight;
    
    // Apply minimum floor based on match count: even 1 match in relevant category = 4+
    const matchFloor = Math.min(10, 3.0 + (categoryMatches.length * 1.5) + (categoryMatches.reduce((sum, c) => sum + c.matches.length, 0) * 0.5));
    const weightedScore = Math.max(matchFloor, rawWeightedScore);

    // Determine primary category (highest score)
    const primaryCategory = categoryMatches.reduce((best, current) =>
        current.score > best.score ? current : best
    );

    // Calculate boost factor based on how many categories matched
    // More categories = higher confidence this is truly relevant
    const boostFactor = Math.min(1.5, 1.0 + (categoryMatches.length * 0.1));

    // Collect all matched terms
    const allMatches = categoryMatches.flatMap(c => c.matches);

    return {
        termScore: Math.min(10, Math.max(0, weightedScore)),
        matchedTerms: allMatches.slice(0, 10), // Top 10 matches
        termCategory: primaryCategory.category,
        boostFactor
    };
}

/**
 * Hybrid scorer: combines LLM score with heuristic term score
 * 
 * Strategy:
 * - Term score acts as a confidence signal about relevance
 * - High term score boosts LLM score (positive signal)
 * - Low term score slightly penalizes (but doesn't eliminate)
 * - Prevents high scores for articles with no domain term presence
 */
export function hybridScore(
    llmScore: number,
    title: string,
    summary: string,
    tags: string[] = []
): { finalScore: number; breakdown: TermScorerResult } {
    const termResult = calculateTermScore(title, summary, tags);

    // Hybrid scoring formula:
    // - If both LLM and terms agree: boost the score
    // - If only LLM is high: moderate boost
    // - If only terms are high: boost significantly (terms might catch what LLM missed)
    // - If both are low: penalize slightly (likely not relevant)
    
    const llmConfidence = llmScore / 10;
    const termConfidence = termResult.termScore / 10;
    
    // Weighted combination: 70% LLM, 30% terms
    let finalScore = (llmScore * 0.7) + (termResult.termScore * 0.3);

    // Apply boost factor if high confidence in terms
    if (termConfidence > 0.6) {
        finalScore = finalScore * termResult.boostFactor;
    }

    // Penalize if strong term presence contradicts weak LLM score
    if (termConfidence > 0.7 && llmConfidence < 0.4) {
        // Terms see relevance but LLM didn't - this is interesting, keep it
        finalScore = Math.max(5, finalScore); // At least 5/10
    }

    // Penalize if no term presence despite LLM claiming high relevance
    if (termConfidence < 0.3 && llmConfidence > 0.7) {
        finalScore = finalScore * 0.9; // 10% penalty
    }

    return {
        finalScore: Math.min(10, Math.max(0, finalScore)),
        breakdown: termResult
    };
}

/**
 * Filter items using both heuristic and LLM scores
 * Items must have reasonable term presence (>2.5) to pass unless LLM is very high (8+)
 */
export function shouldIncludeItem(
    llmScore: number,
    termScore: number,
    minThreshold: number = 5
): boolean {
    // LLM alone (if very confident 8+, include despite weak terms)
    if (llmScore >= 8) return true;

    // Hybrid: need reasonable term presence for lower LLM scores
    const termConfidence = termScore / 10;
    
    if (llmScore >= 6 && termScore >= 4) return true;
    if (llmScore >= minThreshold && termScore >= 3) return true;
    if (termScore >= 7) return true; // Strong terms even with weak LLM

    return false;
}

/**
 * Logging helper for debugging term scoring
 */
export function logTermScoreDebug(
    itemId: string,
    title: string,
    llmScore: number,
    hybrid: ReturnType<typeof hybridScore>
) {
    logger.info(
        `Term scoring for ${itemId}: "${title.substring(0, 60)}..."`,
        {
            llmScore,
            termScore: hybrid.breakdown.termScore,
            finalScore: hybrid.finalScore,
            boostFactor: hybrid.breakdown.boostFactor,
            category: hybrid.breakdown.termCategory,
            matchCount: hybrid.breakdown.matchedTerms.length,
            topMatches: hybrid.breakdown.matchedTerms.slice(0, 3).join(', ')
        }
    );
}
