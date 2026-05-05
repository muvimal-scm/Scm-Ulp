---
name: qdrant-vector-db
description: Qdrant vector database patterns for ULP RAG and similarity search. Use when implementing semantic search, RAG over policies and SOPs, similar invoice or customer matching, anomaly clustering, embedding pipelines. Covers collection design with mandatory tenant filtering, hybrid search (vector plus keyword), payload indexing for filter performance. Use for any vector workload in ULP.
---

# Qdrant Vector DB for ULP

## When this skill triggers
Implementing vector search: RAG over Finacle/SOP docs, similar customer matching, duplicate invoice detection, anomaly clustering. Qdrant is self-hosted in MVP, Qdrant Cloud later.

## Top 3 reference repos
1. **qdrant/qdrant** (https://github.com/qdrant/qdrant) - Official Rust server. The `docs/` folder covers all collection options, payloads, filters.
2. **qdrant/qdrant-client** (https://github.com/qdrant/qdrant-client) - Python client. The `tests/` directory has comprehensive examples.
3. **qdrant/examples** (https://github.com/qdrant/examples) - Production patterns: hybrid search, payload filtering, multi-tenancy.

## Standard ULP collection setup

```python
from qdrant_client import QdrantClient, models

client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)

# CRITICAL: One collection per "domain", tenant_id in payload
client.recreate_collection(
    collection_name="ulp_documents",
    vectors_config=models.VectorParams(
        size=1536,                                # OpenAI ada-002 dimensions
        distance=models.Distance.COSINE,
        on_disk=True
    ),
    optimizers_config=models.OptimizersConfigDiff(
        default_segment_number=2,
        memmap_threshold=20000
    )
)

# CRITICAL: Index payload fields for filtering performance
client.create_payload_index(
    collection_name="ulp_documents",
    field_name="tenant_id",
    field_schema=models.PayloadSchemaType.KEYWORD
)
client.create_payload_index(
    collection_name="ulp_documents",
    field_name="doc_type",
    field_schema=models.PayloadSchemaType.KEYWORD
)
```

## Upsert pattern (with tenant scoping)

```python
async def upsert_document(tenant_id: str, doc: Document, embeddings: list[float]):
    await client.upsert(
        collection_name="ulp_documents",
        points=[
            models.PointStruct(
                id=str(uuid.uuid4()),
                vector=embeddings,
                payload={
                    "tenant_id": tenant_id,           # MANDATORY
                    "doc_id": doc.id,
                    "doc_type": doc.type,
                    "title": doc.title,
                    "chunk_text": doc.content[:1000],
                    "created_at": datetime.utcnow().isoformat()
                }
            )
        ]
    )
```

## Search with mandatory tenant filter

```python
async def search(tenant_id: str, query_embedding: list[float], doc_type: str | None = None):
    must_filters = [
        models.FieldCondition(
            key="tenant_id",
            match=models.MatchValue(value=tenant_id)   # CRITICAL - never optional
        )
    ]
    if doc_type:
        must_filters.append(
            models.FieldCondition(key="doc_type", match=models.MatchValue(value=doc_type))
        )
    
    results = await client.search(
        collection_name="ulp_documents",
        query_vector=query_embedding,
        query_filter=models.Filter(must=must_filters),
        limit=10,
        score_threshold=0.7
    )
    return results
```

## Embedding pipeline (chunking)

```python
from langchain_openai import AzureOpenAIEmbeddings

embeddings = AzureOpenAIEmbeddings(azure_deployment=settings.AZURE_EMBEDDINGS_DEPLOYMENT)

async def index_document(tenant_id: str, doc: Document):
    # 500 token chunks with 50 token overlap
    chunks = recursive_text_splitter(doc.content, chunk_size=500, overlap=50)
    vectors = await embeddings.aembed_documents([c.text for c in chunks])
    
    points = [
        models.PointStruct(
            id=str(uuid.uuid4()),
            vector=vec,
            payload={
                "tenant_id": tenant_id,
                "doc_id": doc.id,
                "chunk_index": i,
                "chunk_text": chunk.text,
                "doc_type": doc.type
            }
        )
        for i, (chunk, vec) in enumerate(zip(chunks, vectors))
    ]
    await client.upsert(collection_name="ulp_documents", points=points)
```

## Gotchas specific to ULP

1. **tenant_id in payload, NOT in vector** - vectors are tenant-agnostic; filter at query time.
2. **Index tenant_id field** - without payload index, every search becomes a full scan.
3. **Score threshold 0.7+ for cosine** - below this, results too dissimilar to be useful.
4. **Chunk size 500 tokens** - balance between context and precision. 1000+ tokens dilutes the embedding.
5. **One collection per domain, not per tenant** - tenant separation via filter. Per-tenant collections explode operational cost.
6. **Embedding model lock-in** - changing model = re-embed everything. Pick once, version it in payload.
7. **Backups** - snapshots scheduled daily to Azure Blob.
8. **MVP** = Qdrant in Docker (single node). **Prod** = Qdrant Cloud or 3-node cluster.

## ULP companion docs
- RAG architecture: `docs/ULP_HLD_v1.0_HighLevelDesign.docx` Section 8
