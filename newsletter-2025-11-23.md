# Research and Industry Updates (2025-11-16 to 2025-11-23)

## TL;DR Highlights
- [InfCode-C++: Intent-Guided Semantic Retrieval and AST-Structured Search for C++ Issue Resolution](https://ui.adsabs.harvard.edu/abs/2025arXiv251116005D/abstract): A new system for C++ issue resolution that outperforms existing agents by leveraging semantic retrieval and AST-structured search.
- [Search Is Not Retrieval: Decoupling Semantic Matching from Contextual Assembly in RAG](https://ui.adsabs.harvard.edu/abs/2025arXiv251104939N/abstract): Introduces the SINR framework to enhance retrieval systems by separating semantic matching from contextual assembly.
- [PathMind: A Retrieve-Prioritize-Reason Framework for Knowledge Graph Reasoning with Large Language Models](https://ui.adsabs.harvard.edu/abs/2025arXiv251114256L/abstract): A framework that improves knowledge graph reasoning by prioritizing important reasoning paths.
- [Rescuing the Unpoisoned: Efficient Defense against Knowledge Corruption Attacks on RAG Systems](https://ui.adsabs.harvard.edu/abs/2025arXiv251101268K/abstract): RAGDefender offers a resource-efficient defense mechanism against adversarial attacks in RAG systems.
- [Ground-Truth Subgraphs for Better Training and Evaluation of Knowledge Graph Augmented LLMs](https://ui.adsabs.harvard.edu/abs/2025arXiv251104473C/abstract): SynthKGQA framework generates datasets for better training and evaluation of knowledge graph retrieval systems.

## Deep Dives

### InfCode-C++: Intent-Guided Semantic Retrieval and AST-Structured Search for C++ Issue Resolution
**Source:** Academic Paper  
**Why it matters:** This paper introduces INFCODE-C++, a C++-aware system that significantly improves issue resolution in C++ projects, addressing the challenges of overloaded identifiers and deep control-flow structures.  
**Key Takeaways:** 
- INFCODE-C++ combines semantic code-intent retrieval with deterministic AST-structured querying.
- Achieves a resolution rate of 25.58% on the MultiSWE-bench-CPP benchmark, outperforming previous agents.
- Highlights the importance of language-aware reasoning in multi-language software agents.  
**Summary:** The paper presents a novel approach to C++ issue resolution by integrating semantic retrieval and AST-structured search, which allows for precise localization and robust patch synthesis in large C++ repositories.

### Search Is Not Retrieval: Decoupling Semantic Matching from Contextual Assembly in RAG
**Source:** Academic Paper  
**Why it matters:** The SINR framework redefines retrieval systems by decoupling semantic matching from contextual assembly, enhancing composability and scalability.  
**Key Takeaways:** 
- SINR connects semantically accurate search chunks to contextually complete retrieve chunks.
- Transforms retrieval from a passive to an active step, mirroring human information processing.  
**Summary:** This paper introduces a dual-layer architecture that improves retrieval systems by distinguishing between fine-grained search and coarse-grained retrieval contexts, paving the way for more efficient AI systems.

### PathMind: A Retrieve-Prioritize-Reason Framework for Knowledge Graph Reasoning with Large Language Models
**Source:** Academic Paper  
**Why it matters:** PathMind enhances knowledge graph reasoning by prioritizing reasoning paths, reducing noise, and optimizing LLM calls.  
**Key Takeaways:** 
- Implements a "Retrieve-Prioritize-Reason" paradigm.
- Outperforms baselines on complex reasoning tasks by identifying essential reasoning paths.  
**Summary:** PathMind introduces a framework that selectively guides LLMs with important reasoning paths, improving the accuracy and interpretability of knowledge graph reasoning.

### Rescuing the Unpoisoned: Efficient Defense against Knowledge Corruption Attacks on RAG Systems
**Source:** Academic Paper  
**Why it matters:** RAGDefender offers an efficient solution to defend against knowledge corruption attacks in RAG systems without high computational costs.  
**Key Takeaways:** 
- Operates during the post-retrieval phase to detect and filter adversarial content.
- Reduces attack success rates significantly compared to existing defenses.  
**Summary:** The paper presents RAGDefender, a lightweight defense mechanism that effectively mitigates adversarial attacks in RAG systems, enhancing their robustness and reliability.

### Ground-Truth Subgraphs for Better Training and Evaluation of Knowledge Graph Augmented LLMs
**Source:** Academic Paper  
**Why it matters:** SynthKGQA provides a framework for generating datasets that improve the training and evaluation of knowledge graph retrieval systems.  
**Key Takeaways:** 
- Generates high-quality synthetic datasets with ground-truth facts for graph retrieval.
- Enables better benchmarking and model training for KG-augmented LLMs.  
**Summary:** This paper introduces SynthKGQA, a framework that creates datasets to enhance the factuality and performance of knowledge graph retrieval systems, facilitating better training and evaluation.

## Additional Reads

- **[Retrieval Quality at Context Limit](https://ui.adsabs.harvard.edu/abs/2025arXiv251105850M/abstract)**: The paper addresses retrieval quality at context limits, directly relevant to context management and optimization for LLMs.
- **[A Graph-based RAG for Energy Efficiency Question Answering](https://ui.adsabs.harvard.edu/abs/2025arXiv251101643C/abstract)**: This work involves a graph-based RAG architecture, directly related to codebase indexing and retrieval.
- **[A Multimodal Manufacturing Safety Chatbot: Knowledge Base Design, Benchmark Development, and Evaluation of Multiple RAG Approaches](https://ui.adsabs.harvard.edu/abs/2025arXiv251111847S/abstract)**: The paper discusses a multimodal chatbot using RAG, directly relevant to retrieval and context management.
- **[RAGSmith: A Framework for Finding the Optimal Composition of Retrieval-Augmented Generation Methods Across Datasets](https://ui.adsabs.harvard.edu/abs/2025arXiv251101386Y/abstract)**: RAGSmith focuses on optimizing RAG methods, directly relevant to retrieval and context management.
- **[A Compliance-Preserving Retrieval System for Aircraft MRO Task Search](https://ui.adsabs.harvard.edu/abs/2025arXiv251115383J/abstract)**: This paper discusses a retrieval system for aircraft MRO tasks, which aligns with our interest in retrieval systems and context management.
- **[MARC: Multimodal and Multi-Task Agentic Retrieval-Augmented Generation for Cold-Start Recommender System](https://ui.adsabs.harvard.edu/abs/2025arXiv251108181C/abstract)**: The paper discusses a recommender system using Agentic Retrieval-Augmented Generation, relevant to retrieval and context management.
- **[Trove: A Flexible Toolkit for Dense Retrieval](https://ui.adsabs.harvard.edu/abs/2025arXiv251101857E/abstract)**: Trove is a toolkit for dense retrieval, relevant to codebase indexing and retrieval, providing efficient data management and retrieval features.
- **[Thinking Forward and Backward: Multi-Objective Reinforcement Learning for Retrieval-Augmented Reasoning](https://ui.adsabs.harvard.edu/abs/2025arXiv251109109W/abstract)**: Bi-RAR is a retrieval-augmented reasoning framework, directly related to retrieval optimization and context management in RAG systems.
- **[TabRAG: Tabular Document Retrieval via Structured Language Representations](https://ui.adsabs.harvard.edu/abs/2025arXiv251106582S/abstract)**: TabRAG addresses retrieval in table-heavy documents, relevant to retrieval-augmented generation and context management.
- **[InteracSPARQL: An Interactive System for SPARQL Query Refinement Using Natural Language Explanations](https://ui.adsabs.harvard.edu/abs/2025arXiv251102002J/abstract)**: The paper discusses SPARQL query refinement using natural language explanations, which relates to documentation understanding and context management.
- **[ItemRAG: Item-Based Retrieval-Augmented Generation for LLM-Based Recommendation](https://ui.adsabs.harvard.edu/abs/2025arXiv251115141K/abstract)**: ItemRAG focuses on item-based retrieval-augmented generation, relevant to retrieval and context management for recommendations.
- **[Beyond Elicitation: Provision-based Prompt Optimization for Knowledge-Intensive Tasks](https://ui.adsabs.harvard.edu/abs/2025arXiv251110465X/abstract)**: The paper discusses prompt optimization for knowledge-intensive tasks, which may have some relevance to context management.