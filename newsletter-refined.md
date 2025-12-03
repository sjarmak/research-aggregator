## TL;DR Highlights

- Researchers at MIT introduced [TeaRAG](https://ui.adsabs.harvard.edu/abs/2025arXiv251105385Z/abstract), a token-efficient framework for Retrieval-Augmented Generation (RAG) that enhances retrieval content compression and reasoning efficiency, reducing token usage by over 60%.
- [MemoriesDB](https://ui.adsabs.harvard.edu/abs/2025arXiv251106179W/abstract) was developed as a temporal-semantic-relational database, integrating time-series, vector, and graph data to improve long-term agent memory and retrieval efficiency.
- [Greptile](https://www.greptile.com/blog/semantic-codebase-search) highlighted the challenges of semantic search in codebases, emphasizing the complexity of indexing and retrieving code efficiently.
- [Weaviate](https://weaviate.io/blog/dify-and-weaviate) demonstrated the integration of Dify and Weaviate for building RAG applications, showcasing advancements in retrieval and context management.
- [LangChain](https://blog.langchain.com/how-agents-can-use-filesystems-for-context-engineering/) explored how agents can utilize filesystems for context engineering, enhancing the ability of AI agents to manage and retrieve context effectively.

---

## Academic Research

### [TeaRAG: A Token-Efficient Agentic Retrieval-Augmented Generation Framework](https://ui.adsabs.harvard.edu/abs/2025arXiv251105385Z/abstract)
**Source:** Zhang et al.
**Why it matters:** TeaRAG optimizes retrieval-augmented generation, focusing on context management and retrieval efficiency.
**Key Takeaways:**
- Compresses retrieval content using chunk-based semantic retrieval and graph retrieval.
- Utilizes Personalized PageRank to highlight key knowledge, reducing token usage.
- Improves Exact Match by 4% and 2% while reducing output tokens by 61% and 59% on specific models.

TeaRAG addresses the inefficiencies in agentic RAG by compressing both retrieval content and reasoning steps, significantly reducing token overhead while maintaining accuracy.

### [MemoriesDB: A Temporal-Semantic-Relational Database for Long-Term Agent Memory](https://ui.adsabs.harvard.edu/abs/2025arXiv251106179W/abstract)
**Source:** Ward, Joel
**Why it matters:** MemoriesDB enhances agent memory systems by managing temporal-semantic-relational data.
**Key Takeaways:**
- Combines time-series, vector, and graph data within a single schema.
- Supports efficient time-bounded retrieval and hybrid semantic search.
- Demonstrates scalable recall and contextual reinforcement.

MemoriesDB offers a unified architecture to maintain coherence across time, meaning, and relation, crucial for long-term agent memory.

### [A Graph-based RAG for Energy Efficiency Question Answering](https://ui.adsabs.harvard.edu/abs/2025arXiv251101643C/abstract)
**Source:** Campi et al.
**Why it matters:** This system uses graph-based RAG for question answering, enhancing retrieval and context management.
**Key Takeaways:**
- Extracts a Knowledge Graph from energy documents for accurate multilingual answers.
- Achieves 75.2% accuracy in question answering, with higher results in general EE questions.
- Demonstrates promising multilingual capabilities with minimal accuracy loss.

The study highlights the potential of graph-based RAG architectures in providing accurate and multilingual answers in specialized domains.

### [A Compliance-Preserving Retrieval System for Aircraft MRO Task Search](https://ui.adsabs.harvard.edu/abs/2025arXiv251115383J/abstract)
**Source:** Jo, Byungho
**Why it matters:** This system enhances retrieval in MRO environments, directly related to codebase indexing and retrieval.
**Key Takeaways:**
- Constructs revision-robust embeddings from ATA chapter hierarchies.
- Achieves >90% retrieval accuracy and reduces lookup time significantly.
- Operates within strict regulatory constraints, improving operational workload.

The system demonstrates how semantic retrieval can operate within regulatory constraints, significantly improving efficiency in MRO workflows.

### [Rescuing the Unpoisoned: Efficient Defense against Knowledge Corruption Attacks on RAG Systems](https://ui.adsabs.harvard.edu/abs/2025arXiv251101268K/abstract)
**Source:** Kim et al.
**Why it matters:** Discusses defenses for RAG systems, focusing on retrieval-augmented generation and context management.
**Key Takeaways:**
- Introduces RAGDefender, a lightweight defense mechanism against data poisoning.
- Operates post-retrieval to detect and filter adversarial content.
- Reduces attack success rates significantly compared to existing defenses.

RAGDefender offers a resource-efficient solution to protect RAG systems from knowledge corruption attacks, enhancing system reliability.

## Industry Updates

### [Bringing RAG to Life with Dify and Weaviate](https://weaviate.io/blog/dify-and-weaviate)
**Source:** Weaviate Blog
**Why it matters:** Focuses on building RAG applications, relevant to context and retrieval.
**Key Takeaways:**
- Demonstrates integration of Dify and Weaviate for RAG applications.
- Highlights advancements in retrieval and context management.
- Provides practical insights into application development.

This integration showcases how modern tools can enhance the development of RAG applications, improving retrieval capabilities.

### [Codebases are uniquely hard to search semantically](https://www.greptile.com/blog/semantic-codebase-search)
**Source:** Greptile
**Why it matters:** Addresses the challenge of semantic search in codebases, a core interest.
**Key Takeaways:**
- Discusses complexities of indexing and retrieving code efficiently.
- Highlights the unique challenges faced in semantic codebase search.
- Provides insights into improving search capabilities in codebases.

The article emphasizes the need for advanced techniques in semantic search to overcome challenges in codebase indexing and retrieval.

### [How agents can use filesystems for context engineering](https://blog.langchain.com/how-agents-can-use-filesystems-for-context-engineering/)
**Source:** LangChain Blog
**Why it matters:** Discusses filesystem usage for context engineering, relevant to context management for LLMs.
**Key Takeaways:**
- Explores the importance of filesystems for AI agents.
- Highlights tools for reading, writing, and searching files.
- Enhances context management capabilities for AI agents.

This exploration provides valuable insights into how filesystems can improve context engineering for AI agents, enhancing their retrieval capabilities.