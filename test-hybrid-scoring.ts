/**
 * Test script to demonstrate hybrid scoring on sample articles
 */

import { hybridScore } from './src/lib/newsletter/term-scorer.js';

// Sample articles with different characteristics
const testArticles = [
    {
        title: "Semantic Code Search at Scale: Building a Vector Database for Large Codebases",
        summary: "Discusses how to implement semantic code search using embeddings and vector databases for enterprise repositories. Covers retrieval-augmented generation for code understanding and context management.",
        llmScore: 7,
        expected: "HIGH - direct relevance to code search and context management"
    },
    {
        title: "Nvidia and Microsoft Invest $15 Billion in Anthropic",
        summary: "Major funding announcement for AI startup Anthropic, highlighting the growing importance of AI in various sectors.",
        llmScore: 7,
        expected: "LOW - generic investment news without code/dev tooling relevance"
    },
    {
        title: "Building Multi-Agent Systems for Software Development",
        summary: "Explores agentic workflows for automating development tasks. Covers agent planning, tool use, and orchestration in software engineering pipelines.",
        llmScore: 6,
        expected: "HIGH - strong agentic systems + software dev relevance"
    },
    {
        title: "Context Windows in Large Language Models",
        summary: "Technical deep dive into context window mechanisms, token budgets, and attention mechanisms in transformers.",
        llmScore: 5,
        expected: "MEDIUM - good term coverage but generic LLM focus"
    },
    {
        title: "The Evolution of JavaScript Frameworks",
        summary: "Survey of React, Vue, Angular and other frontend frameworks. Discusses component architecture and state management.",
        llmScore: 6,
        expected: "LOW - no direct relevance to code tooling or development intelligence"
    },
    {
        title: "RAG for Code: Retrieval-Augmented Code Generation",
        summary: "How to use retrieval to augment code generation models. Uses knowledge bases to improve context and relevance.",
        llmScore: 4,
        expected: "HIGH - strong term presence (RAG, code, retrieval) despite lower LLM score"
    },
    {
        title: "Enterprise Codebase Management at Uber Scale",
        summary: "How Uber manages monorepo with millions of lines of code. Covers dependency management, code organization, and CI/CD at scale.",
        llmScore: 8,
        expected: "HIGH - high LLM score + enterprise codebase relevance"
    },
    {
        title: "API Design Best Practices",
        summary: "Guidelines for designing REST APIs, GraphQL schemas, and protocol buffers. Covers versioning, backward compatibility.",
        llmScore: 6,
        expected: "MEDIUM-LOW - some development relevance but no domain-specific terms"
    }
];

console.log('\n='.repeat(100));
console.log('HYBRID SCORING DEMONSTRATION');
console.log('='.repeat(100));
console.log('\nTesting hybrid scoring that combines LLM ratings with domain-specific term presence.\n');

testArticles.forEach((article, idx) => {
    const result = hybridScore(article.llmScore, article.title, article.summary);
    
    console.log(`\n${'─'.repeat(100)}`);
    console.log(`ARTICLE ${idx + 1}: ${article.title}`);
    console.log(`${'─'.repeat(100)}`);
    console.log(`LLM Score:       ${article.llmScore.toFixed(1)}/10`);
    console.log(`Term Score:      ${result.breakdown.termScore.toFixed(1)}/10  (Category: ${result.breakdown.termCategory})`);
    console.log(`Final Score:     ${result.finalScore.toFixed(1)}/10  (Boost factor: ${result.breakdown.boostFactor.toFixed(2)}x)`);
    console.log(`Matched Terms:   ${result.breakdown.matchedTerms.slice(0, 5).join(', ')}`);
    console.log(`Expected Impact: ${article.expected}`);
    
    // Show impact
    const scoreDiff = result.finalScore - article.llmScore;
    if (scoreDiff > 0.5) {
        console.log(`✅ BOOSTED: Strong term relevance detected, score increased by +${scoreDiff.toFixed(1)}`);
    } else if (scoreDiff < -0.5) {
        console.log(`⚠️  PENALIZED: Weak term relevance, score decreased by ${scoreDiff.toFixed(1)}`);
    } else {
        console.log(`→ UNCHANGED: Term presence aligns with LLM rating`);
    }
});

console.log('\n' + '='.repeat(100));
console.log('SUMMARY');
console.log('='.repeat(100));
console.log(`
Hybrid Scoring Strategy:
1. Term Score (30%): Keyword matching across 8 domain categories
   - Information Retrieval (1.5x weight)
   - Context Management (1.5x weight)
   - Code Search (1.6x weight)
   - Agentic Systems (1.4x weight)
   - Enterprise Codebases (1.3x weight)
   - Developer Tools (1.2x weight)
   - LLM Code Architecture (1.2x weight)
   - SDLC Processes (1.0x weight)

2. LLM Score (70%): Direct relevance evaluation via Claude

3. Final Score = (LLM × 0.7) + (Terms × 0.3) × BoostFactor
   - BoostFactor increases with category matches (1.0-1.5x)
   - Catches articles LLM might miss (high terms, low LLM)
   - Penalizes generic articles claiming code relevance

Benefits:
✓ Domain expertise encoded in term weights
✓ Catches articles LLM misses (no term presence but high rating = suspect)
✓ Boosts highly relevant niche content
✓ Reduces false positives on generic investment news
✓ Transparent scoring breakdown for debugging
`);
