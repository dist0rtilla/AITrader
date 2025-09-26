"""
Optional integration helpers for LangChain + Haystack (RAG) used by the Strategy Engine.

This module is written to be optional: if `langchain` or `haystack` are not installed the
functions here will raise `RuntimeError` with a helpful message. The Strategy Engine imports
and calls these helpers only when available.

The helpers are intentionally small: they build a retrieval-context from provided signals
and sentiment, then invoke a configurable LLM via LangChain if present. For production
use, swap in a persistent Haystack document store (Elasticsearch, FAISS) and a proper
LLM backend configured via environment variables.
"""
from typing import List, Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

try:  # pragma: no cover - optional deps
    # LangChain small imports
    from langchain import LLMChain, PromptTemplate
    from langchain.chat_models import ChatOpenAI
    from langchain.schema import HumanMessage
    LANGCHAIN_AVAILABLE = True
except Exception:
    LANGCHAIN_AVAILABLE = False

try:  # pragma: no cover - optional deps
    # Haystack (Farm-Haystack) imports can vary between versions; we only attempt to import
    # an in-memory DocumentStore for local testing. If unavailable, retrieval will be naive.
    from haystack.document_stores import InMemoryDocumentStore
    from haystack.nodes import EmbeddingRetriever
    HAYSTACK_AVAILABLE = True
except Exception:
    HAYSTACK_AVAILABLE = False


def is_rag_available() -> bool:
    """Return True if at least LangChain LLM support is available.

    Haystack is optional: if it's not installed we fall back to simple string-context retrieval.
    """
    return LANGCHAIN_AVAILABLE


def _build_context_from_signals(signals: List[Dict[str, Any]], sentiment: Optional[List[Dict[str, Any]]] = None) -> str:
    parts: List[str] = []
    parts.append("Signals:")
    for s in signals:
        parts.append(f"- {s.get('symbol')}: score={s.get('score')}")
    if sentiment:
        parts.append("Sentiment:")
        for s in sentiment:
            parts.append(f"- {s.get('symbol')}: sentiment={s.get('sentiment_score')}, auth={s.get('authenticity_score')}")
    return '\n'.join(parts)


def rag_decide(signals: List[Dict[str, Any]], sentiment: Optional[List[Dict[str, Any]]] = None, llm_model: Optional[str] = None, top_k: int = 3) -> Dict[str, Any]:
    """Run a retrieval-augmented decision using LangChain + optional Haystack.

    Returns a dict containing `decision_text` and optionally a parsed `recommendation`.
    This function will raise RuntimeError if LangChain is not installed.
    """
    if not LANGCHAIN_AVAILABLE:
        raise RuntimeError("LangChain is not installed. Install `langchain` and an LLM backend to enable RAG decisions.")

    context = _build_context_from_signals(signals, sentiment)

    # Simple prompt - for production, use a carefully crafted system + examples
    template = (
        "You are a trading assistant. Given the following contextual information, produce a concise trading decision.\n\n"
        "Context:\n{context}\n\n"
        "Provide a JSON object with fields: action ('buy'|'sell'|'hold'), symbol (if applicable), confidence (0..1), rationale (short)."
    )

    prompt = PromptTemplate(input_variables=["context"], template=template)

    # choose chat model; default to gpt-like LLM if present via environment
    model_name = llm_model or "gpt-3.5-turbo"
    try:
        llm = ChatOpenAI(model_name=model_name, temperature=0.0)
    except Exception as e:
        logger.exception("Failed to initialize ChatOpenAI LLM: %s", e)
        raise RuntimeError(f"LLM initialization failed: {e}")

    chain = LLMChain(llm=llm, prompt=prompt)

    out = chain.run(context=context)
    # Attempt to be forgiving: return raw text and let caller parse it.
    return {"decision_text": out}
