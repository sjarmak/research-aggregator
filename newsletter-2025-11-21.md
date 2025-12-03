# Research & Engineering Update (2025-11-14 to 2025-11-21)

## TL;DR Highlights
- Researchers introduced [TeaRAG](https://ui.adsabs.harvard.edu/abs/2025arXiv251105385Z/abstract), a token-efficient framework for Retrieval-Augmented Generation (RAG), optimizing retrieval and reasoning processes for better context management.
- [MemoriesDB](https://ui.adsabs.harvard.edu/abs/2025arXiv251106179W/abstract) was unveiled as a temporal-semantic-relational database, enhancing long-term memory and context management in AI agents.
- A new [graph-based RAG](https://ui.adsabs.harvard.edu/abs/2025arXiv251101643C/abstract) system was developed for energy efficiency question answering, improving multilingual capabilities and retrieval accuracy.
- [PathMind](https://ui.adsabs.harvard.edu/abs/2025arXiv251114256L/abstract) enhances knowledge graph reasoning with LLMs by prioritizing important reasoning paths, improving retrieval and context management.
- [Greptile](https://www.greptile.com/blog/semantic-codebase-search) highlighted the challenges of semantic search in codebases, emphasizing the complexity of indexing and retrieval in software development.

## Academic Research

### [TeaRAG: A Token-Efficient Agentic Retrieval-Augmented Generation Framework](https://ui.adsabs.harvard.edu/abs/2025arXiv251105385Z/abstract)
**Source:** Zhang et al.
**Why it matters:** TeaRAG optimizes retrieval-augmented generation, focusing on context management and retrieval efficiency.
**Key Takeaways:**
- Compresses retrieval content using chunk-based semantic retrieval and graph retrieval with concise triplets.
- Reduces reasoning steps with Iterative Process-aware Direct Preference Optimization (IP-DPO).
- Achieves significant token reduction while improving Exact Match scores across datasets.

TeaRAG addresses the token overhead in agentic RAG systems by compressing retrieval content and reasoning steps, enhancing both efficiency and accuracy.

### [MemoriesDB: A Temporal-Semantic-Relational Database for Long-Term Agent Memory](https://ui.adsabs.harvard.edu/abs/2025arXiv251106179W/abstract)
**Source:** Ward, Joel
**Why it matters:** MemoriesDB is crucial for long-term memory and context management in AI agents.
**Key Takeaways:**
- Combines time-series, vector, and graph database properties in a single schema.
- Supports efficient time-bounded retrieval and hybrid semantic search.
- Demonstrates scalable recall and contextual reinforcement using standard relational infrastructure.

MemoriesDB offers a unified architecture for managing long-term computational memory, enhancing retrieval and context management capabilities.

### [A Graph-based RAG for Energy Efficiency Question Answering](https://ui.adsabs.harvard.edu/abs/2025arXiv251101643C/abstract)
**Source:** Campi et al.
**Why it matters:** This system enhances retrieval and context management in multilingual environments.
**Key Takeaways:**
- Extracts a Knowledge Graph from energy documents for accurate multilingual answers.
- Achieves a 75.2% accuracy rate with higher results on general energy efficiency questions.
- Demonstrates promising multilingual capabilities with minimal accuracy loss due to translation.

The graph-based RAG system improves question answering accuracy in the energy domain, supporting multilingual capabilities and efficient retrieval.

### [PathMind: A Retrieve-Prioritize-Reason Framework for Knowledge Graph Reasoning with Large Language Models](https://ui.adsabs.harvard.edu/abs/2025arXiv251114256L/abstract)
**Source:** Liu et al.
**Why it matters:** PathMind enhances retrieval and context management by guiding LLMs with prioritized reasoning paths.
**Key Takeaways:**
- Introduces a path prioritization mechanism using a semantic-aware path priority function.
- Outperforms competitive baselines on complex reasoning tasks with fewer input tokens.
- Uses a dual-phase training strategy for accurate and logically consistent responses.

PathMind improves knowledge graph reasoning by selectively guiding LLMs with important reasoning paths, enhancing retrieval efficiency.

### [RAGSmith: A Framework for Finding the Optimal Composition of Retrieval-Augmented Generation Methods Across Datasets](https://ui.adsabs.harvard.edu/abs/2025arXiv251101386Y/abstract)
**Source:** Kartal et al.
**Why it matters:** RAGSmith optimizes retrieval-augmented generation methods, crucial for codebase indexing and retrieval.
**Key Takeaways:**
- Treats RAG design as an end-to-end architecture search over multiple technique families.
- Consistently outperforms naive RAG baselines across various domains.
- Utilizes evolutionary search for full-pipeline optimization.

RAGSmith provides a modular framework for optimizing RAG methods, enhancing retrieval and generation performance across datasets.

## Industry Updates

### [Bringing RAG to Life with Dify and Weaviate](https://weaviate.io/blog/dify-and-weaviate)
**Source:** Weaviate Blog
**Why it matters:** Directly discusses building RAG applications, relevant to context and retrieval.
**Key Takeaways:**
- Explores integration of Dify and Weaviate for RAG applications.
- Highlights the importance of efficient retrieval in application development.

This article provides insights into building RAG applications using Dify and Weaviate, emphasizing retrieval efficiency.

### [Codebases are uniquely hard to search semantically](https://www.greptile.com/blog/semantic-codebase-search)
**Source:** Greptile
**Why it matters:** Highlights the challenges of semantic search in codebases, relevant to indexing and retrieval.
**Key Takeaways:**
- Discusses the complexity of semantic search in software development.
- Emphasizes the need for advanced retrieval techniques in codebases.

Greptile's article sheds light on the difficulties of semantic search in codebases, underscoring the need for improved retrieval methods.

### [How agents can use filesystems for context engineering](https://blog.langchain.com/how-agents-can-use-filesystems-for-context-engineering/)
**Source:** LangChain Blog
**Why it matters:** Discusses context engineering through filesystem tools, relevant to context management for agents.
**Key Takeaways:**
- Explores the use of filesystem tools for reading, writing, and searching files.
- Highlights the importance of context engineering in agent development.

LangChain's post explores the role of filesystem tools in context engineering, enhancing agent capabilities in managing context.

### [GitLab 18.6: From configuration to control](https://about.gitlab.com/blog/gitlab-18-6-from-configuration-to-control/)
**Source:** GitLab Blog
**Why it matters:** GitLab 18.6 includes updates on agentic workflows and context management.
**Key Takeaways:**
- Introduces enhancements in AI integration for software development.
- Provides greater flexibility in model selection and deployment environments.

GitLab 18.6 offers advancements in AI-driven workflows, improving context management and retrieval in software development.

### [GitLab engineer: How I improved my onboarding experience with AI](https://about.gitlab.com/blog/gitlab-engineer-how-i-improved-my-onboarding-experience-with-ai/)
**Source:** GitLab Blog
**Why it matters:** Discusses GitLab Duo's use in documentation understanding and context retrieval.
**Key Takeaways:**
- Highlights the role of AI in improving onboarding experiences.
- Emphasizes the importance of context retrieval in documentation parsing.

This article details how GitLab Duo enhances onboarding by improving documentation understanding and context retrieval.