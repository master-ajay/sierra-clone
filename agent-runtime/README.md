# Agent Runtime & SDK

RAG engine: retrieval (vector + BM25, fused via RRF) -> generation with
citations (Gemini) -> faithfulness guardrail -> answer or escalate. Callable
as a Python SDK, REST API, or SSE streaming API. See
`docs/superpowers/specs/2026-07-04-agent-runtime-design.md` in the parent
repo for the full spec.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .
cp .env.example .env
# fill in GEMINI_API_KEY in .env
```

## Usage

```python
from agent_runtime import Agent

agent = Agent(knowledge_base_path="./docs")
response = agent.query("How do I reset my password?")
```

## Run the API

```bash
source .venv/bin/activate
uvicorn agent_runtime.api:app --reload
```

## Test

```bash
source .venv/bin/activate
pytest
ruff check .
```
