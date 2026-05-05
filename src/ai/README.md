# src/ai/

AI service. Separate Python process — communicates with main backend via HTTP (FastAPI endpoints) and message bus.

| Folder | Purpose |
|---|---|
| [ulp-ai/](ulp-ai/) | FastAPI app + LangGraph agents |

## Capabilities (M28, Phase 4)

- Document extraction: BOE (India), 7501 (US), invoices, BLs
- RAG-based compliance Q&A — vector store in Qdrant
- Conversational agents for Control Tower
- Smart suggestions (HSN code lookup, account coding)

## Layout

```
ulp-ai/
├── app/                   # FastAPI routes, dependency injection, middleware
├── agents/                # LangGraph state machines
└── pyproject.toml
```

Reference skills: [../../.claude/skills/fastapi-langgraph-agents/](../../.claude/skills/fastapi-langgraph-agents/), [../../.claude/skills/qdrant-vector-db/](../../.claude/skills/qdrant-vector-db/).
