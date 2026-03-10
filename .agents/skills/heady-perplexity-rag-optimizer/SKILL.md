---
name: heady-perplexity-rag-optimizer
description: Designs, audits, and optimizes Retrieval-Augmented Generation (RAG) pipelines for the Heady platform including document chunking, embedding strategy, vector store configuration, retrieval tuning, and answer quality improvement. Use when the user asks to improve RAG quality, fix retrieval failures, design a knowledge base, optimize embeddings, tune chunk sizes, or debug RAG pipelines. Triggers on phrases like "RAG pipeline", "improve retrieval", "vector search quality", "knowledge base setup", "chunking strategy", "embedding model", "retrieval not working", "hallucinating from documents", or "RAG optimization".
license: MIT
metadata:
  author: heady-connection
  version: '1.0'
  platform: heady
  category: ai-infrastructure
---

# Heady Perplexity RAG Optimizer

## When to Use This Skill

Use this skill when the user asks to:

- Design a new RAG pipeline for Heady's knowledge base or product catalog
- Diagnose poor retrieval quality (irrelevant chunks, missing context)
- Optimize chunk size and overlap for better semantic coherence
- Choose and configure embedding models
- Tune vector store parameters (similarity threshold, top-k)
- Implement advanced RAG patterns (HyDE, multi-query, re-ranking)
- Reduce hallucination by improving grounding quality
- Set up hybrid search (vector + keyword/BM25)
- Evaluate and benchmark RAG pipeline performance

## RAG Architecture Overview

```
[Documents] → [Preprocessing] → [Chunking] → [Embedding] → [Vector Store]
                                                                    ↑
[User Query] → [Query Transform] → [Retrieval] → [Re-ranking] → [Context]
                                                                    ↓
                                                        [LLM] → [Answer]
```

## Platform Stack for Heady

| Component | Recommended Option | Alternative |
|---|---|---|
| **Vector Store** | Pinecone | Firestore Vector Search, Chroma |
| **Embeddings** | text-embedding-3-large (OpenAI) | Cohere embed-english-v3.0 |
| **Reranker** | Cohere Rerank | BGE Reranker |
| **LLM** | Perplexity Sonar Pro | GPT-4o |
| **Orchestration** | LangChain | LlamaIndex |

## Instructions

### 1. Document Preprocessing

Before chunking, clean and normalize source documents:

1. **Format extraction**: Convert PDF/DOCX/HTML to plain text; preserve headings as markers.
2. **Noise removal**: Strip boilerplate (headers, footers, page numbers, nav menus).
3. **Normalization**: Decode HTML entities, normalize whitespace, fix encoding issues.
4. **Metadata extraction**: Capture document title, source URL, author, date, content type.
5. **Deduplication**: Hash document content; skip if already indexed (compare by SHA-256).

```python
def preprocess_document(raw_text: str, metadata: dict) -> dict:
    text = strip_boilerplate(raw_text)
    text = normalize_whitespace(text)
    return {
        "content": text,
        "metadata": {
            **metadata,
            "char_count": len(text),
            "hash": hashlib.sha256(text.encode()).hexdigest()
        }
    }
```

### 2. Chunking Strategy

**Default recommendation**: Recursive character splitting with semantic boundary awareness.

| Content Type | Chunk Size | Overlap | Strategy |
|---|---|---|---|
| Product descriptions | 256–512 tokens | 50 tokens | Sentence-aware split |
| Blog articles | 512–768 tokens | 100 tokens | Paragraph-aware split |
| FAQs | 1 Q&A per chunk | 0 | Semantic unit (keep Q+A together) |
| Legal/policy docs | 512 tokens | 128 tokens | Heading-anchored split |
| Code snippets | Function-level | 0 | AST-aware split |

**Implementation:**
```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=100,
    separators=["\n\n", "\n", ". ", " ", ""],
    length_function=token_count  # Use tokenizer, not char count
)
chunks = splitter.split_text(document_text)
```

**Advanced: Semantic chunking** (group by embedding similarity rather than fixed size):
```python
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

chunker = SemanticChunker(
    embeddings=OpenAIEmbeddings(model="text-embedding-3-large"),
    breakpoint_threshold_type="percentile",
    breakpoint_threshold_amount=95
)
```

### 3. Embedding Strategy

Prepend descriptive context to each chunk before embedding to improve retrieval:

```python
def embed_chunk(chunk: str, doc_metadata: dict) -> list[float]:
    # Context prefix improves semantic alignment
    prefixed = f"Source: {doc_metadata['title']} | Type: {doc_metadata['type']}\n\n{chunk}"
    return embeddings.embed_query(prefixed)
```

**Query embedding**: Use the same model for both indexing and query embedding. Mismatch = poor results.

**Batch embedding:**
```python
# Embed 100 chunks at a time to stay within API limits
for batch in chunks_batched(chunks, size=100):
    vectors = embeddings.embed_documents([c.content for c in batch])
    upsert_to_vector_store(batch, vectors)
```

### 4. Vector Store Configuration

**Pinecone setup:**
```python
import pinecone

index = pinecone.Index("heady-knowledge")
# Dimensions: 3072 for text-embedding-3-large; 1536 for text-embedding-3-small
# Metric: cosine (default and recommended for text)

# Upsert
index.upsert(vectors=[
    {
        "id": chunk.id,
        "values": vector,
        "metadata": {
            "text": chunk.content,
            "source": chunk.metadata["source"],
            "type": chunk.metadata["type"],
            "date": chunk.metadata["date"]
        }
    }
    for chunk, vector in zip(chunks, vectors)
])
```

**Metadata filtering** (restrict retrieval to relevant document types):
```python
results = index.query(
    vector=query_embedding,
    top_k=10,
    filter={"type": {"$in": ["product", "faq"]}},
    include_metadata=True
)
```

### 5. Retrieval Tuning

**Baseline parameters:**
- `top_k = 5` (retrieve 5 chunks, pass top 3 to LLM after reranking)
- `similarity_threshold = 0.72` (discard chunks below this score)

**Tuning process:**
1. Build a test set of 50 representative queries with known-correct answers.
2. Run retrieval at top_k = 3, 5, 10, 20; measure Recall@k (fraction of queries where correct doc is in top k).
3. Measure MRR (Mean Reciprocal Rank): higher is better.
4. Set top_k to the point where Recall@k plateaus (diminishing returns + cost tradeoff).
5. Adjust similarity_threshold: lower threshold = more recall, lower precision; raise to reduce noise.

### 6. Advanced Retrieval Patterns

**HyDE (Hypothetical Document Embeddings):**
```python
# Generate a hypothetical answer to improve query embedding alignment
hypothetical_doc = llm.generate(f"Write a concise answer to: {user_query}")
query_embedding = embeddings.embed_query(hypothetical_doc)
results = vector_store.similarity_search_by_vector(query_embedding, k=5)
```

**Multi-query retrieval:**
```python
# Generate 3 rephrased queries; union results for broader coverage
queries = llm.generate_variants(user_query, n=3)
all_results = []
for q in queries:
    all_results.extend(vector_store.similarity_search(q, k=3))
deduplicated = deduplicate_by_content(all_results)
```

**Re-ranking with Cohere:**
```python
import cohere
co = cohere.Client()

reranked = co.rerank(
    query=user_query,
    documents=[r.page_content for r in retrieved_chunks],
    top_n=3,
    model="rerank-english-v3.0"
)
top_chunks = [retrieved_chunks[r.index] for r in reranked.results]
```

**Hybrid search (vector + BM25):**
```python
from langchain.retrievers import EnsembleRetriever

hybrid = EnsembleRetriever(
    retrievers=[bm25_retriever, vector_retriever],
    weights=[0.4, 0.6]  # 60% semantic, 40% keyword
)
```

### 7. RAG Quality Evaluation

Run these evaluations periodically:

| Metric | Description | Tool |
|---|---|---|
| Context Precision | % of retrieved chunks actually relevant | RAGAs |
| Context Recall | % of needed context retrieved | RAGAs |
| Answer Faithfulness | Answer supported by retrieved context | RAGAs |
| Answer Relevancy | Answer addresses the question | RAGAs |
| Hallucination Rate | Claims not grounded in context | Custom NLI check |

```python
from ragas import evaluate
from ragas.metrics import precision, recall, faithfulness, answer_relevancy

results = evaluate(
    dataset=eval_dataset,
    metrics=[precision, recall, faithfulness, answer_relevancy]
)
print(results)
```

### 8. Optimization Checklist

- [ ] Chunk size tuned to content type (not one-size-fits-all)
- [ ] Chunks include metadata context prefix before embedding
- [ ] Same embedding model used for indexing and retrieval
- [ ] top_k tuned using Recall@k analysis on test set
- [ ] Reranker applied to reduce noise in top_k results
- [ ] Similarity threshold set to filter irrelevant chunks
- [ ] Metadata filters applied where document type is known
- [ ] Hallucination rate measured and tracked
- [ ] Context window utilization tracked (not overstuffing the LLM)
- [ ] Index updated on document changes (incremental, not full rebuild)
