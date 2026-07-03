from agent_runtime.generation.generator import generate
from agent_runtime.guardrails.faithfulness import check_faithfulness
from agent_runtime.ingestion.indexer import IndexResult, index_chunks
from agent_runtime.ingestion.loader import load_and_chunk
from agent_runtime.models import AgentResponse, RetrievalTrace
from agent_runtime.retrieval.bm25_search import search as bm25_search
from agent_runtime.retrieval.fusion import reciprocal_rank_fusion
from agent_runtime.retrieval.vector_search import search as vector_search


class Agent:
    def __init__(
        self,
        knowledge_base_path: str | None = None,
        persist_path: str = "./chroma_data",
        top_k: int = 5,
        faithfulness_threshold: float = 0.7,
        client=None,
    ):
        self.persist_path = persist_path
        self.top_k = top_k
        self.faithfulness_threshold = faithfulness_threshold
        self.client = client
        if knowledge_base_path:
            self.ingest(knowledge_base_path)

    def ingest(self, knowledge_base_path: str) -> IndexResult:
        chunks = load_and_chunk(knowledge_base_path)
        return index_chunks(chunks, self.persist_path)

    def query(self, query: str) -> AgentResponse:
        vector_results = vector_search(query, self.persist_path, top_k=self.top_k)
        bm25_results = bm25_search(query, self.persist_path, top_k=self.top_k)
        fused_results = reciprocal_rank_fusion(vector_results, bm25_results, top_n=self.top_k)
        retrieval_trace = RetrievalTrace(
            vector_results=vector_results,
            bm25_results=bm25_results,
            fused_results=fused_results,
        )

        gen_result = generate(query, fused_results, client=self.client)
        guardrail_trace = check_faithfulness(
            gen_result.answer,
            fused_results,
            threshold=self.faithfulness_threshold,
            client=self.client,
        )

        if guardrail_trace.passed:
            return AgentResponse(
                query=query,
                action="answer",
                answer=gen_result.answer,
                citations=gen_result.citations,
                retrieval_trace=retrieval_trace,
                guardrail_trace=guardrail_trace,
            )

        return AgentResponse(
            query=query,
            action="escalate",
            answer=None,
            citations=[],
            retrieval_trace=retrieval_trace,
            guardrail_trace=guardrail_trace,
            escalation_reason=(
                f"faithfulness score {guardrail_trace.faithfulness_score:.2f} "
                f"below threshold {guardrail_trace.threshold:.2f}"
            ),
        )
