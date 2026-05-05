---
name: fastapi-langgraph-agents
description: FastAPI plus LangChain plus LangGraph for ULP AI agents. Use when implementing AI features such as chatbot, document OCR, anomaly detection on dashboards, RAG over Finacle docs, agentic workflows. Covers FastAPI service patterns, LangGraph state machines, tool use, observability via Langfuse, multi-tenant isolation in vector retrieval. Use for any Python AI service in ULP.
---

# FastAPI + LangGraph Agents for ULP

## When this skill triggers
Implementing AI features: chatbot UI for tenants, OCR (invoice extraction), agentic workflows, RAG over docs, anomaly detection. ULP's AI services run as separate Python FastAPI containers.

## Top 3 reference repos
1. **langchain-ai/langgraph** (https://github.com/langchain-ai/langgraph) - Official LangGraph. The `examples/` folder has agent state machine templates.
2. **tiangolo/full-stack-fastapi-template** (https://github.com/tiangolo/full-stack-fastapi-template) - Tiangolo's official FastAPI starter. Production patterns: SQLModel, Alembic, JWT, Docker.
3. **langchain-ai/langgraph-example** (https://github.com/langchain-ai/langgraph-example) - Reference agent implementations including ReAct, plan-and-execute, multi-agent.

## Standard ULP service structure

```
ai-services/
  app/
    main.py                      # FastAPI app
    api/v1/chatbot.py
    api/v1/ocr.py
    agents/invoice_query_agent.py    # LangGraph state machine
    tools/                       # Agent-callable tools
      query_invoice_db.py
      generate_report.py
    rag/qdrant_retriever.py
    config.py
    observability.py             # Langfuse
  pyproject.toml
  Dockerfile
```

## FastAPI app

```python
# app/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_langfuse()
    setup_tracing()
    yield

app = FastAPI(title="ULP AI Services", version="1.0", lifespan=lifespan)

@app.middleware("http")
async def tenant_context(request, call_next):
    tenant_id = extract_tenant_from_jwt(request.headers.get("authorization"))
    request.state.tenant_id = tenant_id
    return await call_next(request)
```

## LangGraph agent (invoice query example)

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
import operator

class AgentState(TypedDict):
    tenant_id: str
    user_question: str
    classification: str | None
    sql_query: str | None
    db_result: list[dict] | None
    answer: str | None
    messages: Annotated[list, operator.add]

def classify(state: AgentState) -> AgentState:
    response = llm.invoke([
        SystemMessage("Classify: AR_AGING / INVOICE_LOOKUP / GST_QUERY / OTHER"),
        HumanMessage(state["user_question"])
    ])
    return {"classification": response.content.strip()}

def generate_sql(state: AgentState) -> AgentState:
    template = SQL_TEMPLATES[state["classification"]]
    sql = template.format(tenant_id=state["tenant_id"])
    return {"sql_query": sql}

def execute_sql(state: AgentState) -> AgentState:
    rows = read_replica.execute(state["sql_query"])
    return {"db_result": rows}

def format_answer(state: AgentState) -> AgentState:
    answer = llm.invoke([
        SystemMessage("Format the data as a concise answer."),
        HumanMessage(f"Q: {state['user_question']}\nData: {state['db_result']}")
    ]).content
    return {"answer": answer}

g = StateGraph(AgentState)
g.add_node("classify", classify)
g.add_node("generate_sql", generate_sql)
g.add_node("execute_sql", execute_sql)
g.add_node("format_answer", format_answer)
g.set_entry_point("classify")
g.add_conditional_edges("classify", route, {"generate_sql": "generate_sql", "fallback": "fallback"})
g.add_edge("generate_sql", "execute_sql")
g.add_edge("execute_sql", "format_answer")
g.add_edge("format_answer", END)

invoice_agent = g.compile()
```

## API endpoint with tracing

```python
from langfuse.callback import CallbackHandler

@router.post("/query")
async def query(req: ChatRequest, request: Request) -> ChatResponse:
    tenant_id = request.state.tenant_id
    callback = CallbackHandler(
        user_id=req.user_id,
        session_id=req.session_id,
        metadata={"tenant_id": tenant_id}
    )
    result = await invoice_agent.ainvoke(
        {"tenant_id": tenant_id, "user_question": req.question, "messages": []},
        config={"callbacks": [callback]}
    )
    return ChatResponse(answer=result["answer"])
```

## Provider abstraction (MVP-to-prod)

```python
# app/llm.py
def get_llm():
    provider = settings.LLM_PROVIDER
    if provider == "ollama":     # MVP local
        return Ollama(model="llama3", base_url=settings.OLLAMA_URL)
    if provider == "azure":      # Production
        return AzureChatOpenAI(deployment_name=settings.AZURE_DEPLOYMENT)
    if provider == "anthropic":  # Fallback
        return ChatAnthropic(model="claude-opus-4-7")
    raise ValueError(f"Unknown LLM provider: {provider}")
```

## Gotchas specific to ULP

1. **NEVER let LLM execute arbitrary SQL** - always parameterized templates with tenant_id baked in. Prompt-injected SQL = catastrophic.
2. **Tenant isolation in vector DB** - filter by tenant_id metadata. Cross-tenant retrieval = data leak.
3. **Token budget** - cap context. Long documents must be chunked + retrieved (RAG), never dumped wholesale.
4. **Langfuse tracing** - mandatory. Tag every trace with tenant_id.
5. **Streaming responses** - use Server-Sent Events for chat UX.
6. **Rate limit per tenant** - 100 queries/min. Prevents one tenant from exhausting LLM budget.
7. **Fallback chain** - Azure OpenAI primary, Anthropic Claude secondary, refuse with friendly error if both down.
8. **Sensitive data masking** - PAN, GSTIN, mobile numbers stripped from prompts. NEVER send to LLM.

## ULP companion docs
- AI services: `docs/ULP_HLD_v1.0_HighLevelDesign.docx` Section 8
