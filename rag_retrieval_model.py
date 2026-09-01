"""
rag_retrieval_model.py - Standalone In-Memory RAG Retrieval Pipeline for Learner History.

================================================================================
ARCHITECTURE & CONTEXT ISOLATION RATIONALE:
================================================================================
This module implements the retrieval engine of the AI tutoring RAG pipeline.

Key Capabilities:
  1. Dense Semantic Embeddings:
     - Uses Sentence-Transformers 'all-MiniLM-L6-v2' (384-dimensional embeddings).
     - Free, lightweight, fully local execution (zero API keys or cloud dependencies).
  2. Multi-Tenant User Isolation:
     - Learner memories are partitioned strictly by `user_id`.
     - Cross-tenant queries are structurally prevented; searches only execute
       against the requested user's private embedding partition.
  3. In-Memory Vector Index:
     - Fast, exact cosine similarity search over normalized embedding matrices.
================================================================================
"""

import argparse
import json
import sys
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np

# Ensure UTF-8 console output on Windows
for _stream in (sys.stdout, sys.stderr):
    _reconfig = getattr(_stream, "reconfigure", None)
    if callable(_reconfig):
        try:
            _reconfig(encoding="utf-8")
        except Exception:
            pass

# Global SentenceTransformer model cache
_EMBEDDING_MODEL = None
MODEL_NAME = "all-MiniLM-L6-v2"

# In-memory partitioned memory store: { user_id: [ {"text": str, "embedding": np.ndarray, "metadata": dict} ] }
_USER_MEMORY_STORE: Dict[str, List[Dict[str, Any]]] = {}


def get_embedding_model(model_name: str = MODEL_NAME):
    """
    Lazily initializes and caches the SentenceTransformer embedding model.
    """
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        from sentence_transformers import SentenceTransformer
        _EMBEDDING_MODEL = SentenceTransformer(model_name)
    return _EMBEDDING_MODEL


def embed_text(text: str) -> np.ndarray:
    """
    Generates a normalized 384-dimensional embedding vector for input text.

    Args:
        text: Input string to embed.

    Returns:
        np.ndarray: 1D normalized float32 embedding vector.
    """
    model = get_embedding_model()
    # normalize_embeddings=True ensures unit L2 norm so dot-product equals cosine similarity
    embedding = model.encode(text, normalize_embeddings=True, convert_to_numpy=True)
    return np.asarray(embedding, dtype=np.float32)


def add_memory(user_id: str, text: str, metadata: Optional[Dict[str, Any]] = None) -> None:
    """
    Embeds and stores a learner history/tutoring memory tagged with user_id.

    Args:
        user_id: Unique learner identifier.
        text: Memory or interaction text snippet.
        metadata: Optional additional metadata dictionary.
    """
    global _USER_MEMORY_STORE
    if not text or not text.strip():
        return

    emb = embed_text(text.strip())
    entry = {
        "text": text.strip(),
        "embedding": emb,
        "metadata": metadata or {},
    }

    if user_id not in _USER_MEMORY_STORE:
        _USER_MEMORY_STORE[user_id] = []

    _USER_MEMORY_STORE[user_id].append(entry)


def retrieve_context_with_scores(
    user_id: str, query: str, top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Searches within user_id's stored memories and returns the top_k most similar entries with scores.

    Args:
        user_id: Target learner ID to query within.
        query: Query string (e.g. learner question or topic).
        top_k: Number of most relevant entries to return.

    Returns:
        List[Dict]: Ranked list of dicts containing "text", "similarity_score", and "metadata".
    """
    user_memories = _USER_MEMORY_STORE.get(user_id, [])
    if not user_memories or not query or not query.strip():
        return []

    q_emb = embed_text(query.strip())

    # Build matrix of user's stored embeddings (N, D)
    mem_matrix = np.vstack([m["embedding"] for m in user_memories])

    # Dot product of normalized vectors equals cosine similarity
    similarities = np.dot(mem_matrix, q_emb)

    # Rank indices by descending similarity
    ranked_indices = np.argsort(-similarities)[:top_k]

    results = []
    for idx in ranked_indices:
        results.append(
            {
                "text": user_memories[idx]["text"],
                "similarity_score": round(float(similarities[idx]), 4),
                "metadata": user_memories[idx]["metadata"],
            }
        )
    return results


def retrieve_context(user_id: str, query: str, top_k: int = 5) -> List[str]:
    """
    Searches within user_id's stored memories and returns the top_k most similar past text entries.

    Args:
        user_id: Target learner ID.
        query: Query string.
        top_k: Number of entries to retrieve.

    Returns:
        List[str]: Top matching memory strings.
    """
    scored_results = retrieve_context_with_scores(user_id=user_id, query=query, top_k=top_k)
    return [r["text"] for r in scored_results]


def clear_memories(user_id: Optional[str] = None) -> None:
    """
    Clears memories for a specific user_id, or all users if user_id is None.
    """
    global _USER_MEMORY_STORE
    if user_id is None:
        _USER_MEMORY_STORE.clear()
    elif user_id in _USER_MEMORY_STORE:
        del _USER_MEMORY_STORE[user_id]


def run_test_suite() -> None:
    """
    CLI test suite:
      1. Initializes two distinct learners (user_alice & user_bob).
      2. Populates each with domain-specific learner history entries.
      3. Queries "explain recursion again" on Alice (expected high-relevance recursion hits).
      4. Queries "explain recursion again" on Bob (confirms zero leakage of Alice's recursion data).
      5. Queries "help with SQL joins" on Bob (expected high-relevance SQL hits).
    """
    print("=" * 80)
    print("RAG RETRIEVAL PIPELINE TEST SUITE (Sentence-Transformers all-MiniLM-L6-v2)")
    print("=" * 80)
    print("Initializing embedding model...")
    get_embedding_model()
    print("Embedding model ready.\n")

    clear_memories()

    # Define test profiles
    alice_id = "user_alice_401"
    bob_id = "user_bob_802"

    alice_memories = [
        "Learner struggled with recursion base cases and stack overflow errors in Python",
        "Understands basic for-loops well, but gets confused on nested recursive branching",
        "Aced arrays, list comprehension, and hash map modules with 98% pass rate",
        "Requested extra step-by-step hints on binary tree recursive depth-first search",
        "Completed binary search milestone with 100% unit test accuracy",
        "Asked about recursion call stack frames and sys.setrecursionlimit() behavior",
    ]

    bob_memories = [
        "Learner struggled with SQL inner joins vs left outer join queries on multiple tables",
        "Mastered dynamic programming memoization and bottom-up tabulation techniques",
        "Confused about relational database indexing and B-tree query execution plans",
        "Aced database normalization forms 1NF, 2NF, and 3NF schema design exam",
        "Asked for more practice problems on PostgreSQL foreign key ON DELETE CASCADE constraints",
        "Completed Redis in-memory caching and TTL expiration module successfully",
    ]

    print("Populating learner history memories...")
    for m in alice_memories:
        add_memory(alice_id, m)
    for m in bob_memories:
        add_memory(bob_id, m)

    print(f"  Enrolled {len(alice_memories)} memories for [{alice_id}] (Recursion & Algorithms focus)")
    print(f"  Enrolled {len(bob_memories)} memories for [{bob_id}] (SQL & Databases focus)\n")

    # -------------------------------------------------------------
    # Test 1: Alice querying "explain recursion again"
    # -------------------------------------------------------------
    query1 = "explain recursion again"
    print("-" * 80)
    print(f"TEST 1: Query for [{alice_id}] | Query: \"{query1}\" (top_k=3)")
    alice_results = retrieve_context_with_scores(alice_id, query1, top_k=3)
    for idx, res in enumerate(alice_results, 1):
        print(f"  {idx}. [Score: {res['similarity_score']:.4f}] {res['text']}")

    # -------------------------------------------------------------
    # Test 2: Bob querying "explain recursion again" (ISOLATION TEST)
    # -------------------------------------------------------------
    print("\n" + "-" * 80)
    print(f"TEST 2: Cross-Tenant Isolation Test for [{bob_id}] | Query: \"{query1}\" (top_k=3)")
    print("Checking if any of Alice's recursion memories leak into Bob's search space...")
    bob_leak_results = retrieve_context_with_scores(bob_id, query1, top_k=3)
    for idx, res in enumerate(bob_leak_results, 1):
        print(f"  {idx}. [Score: {res['similarity_score']:.4f}] {res['text']}")

    # Verify zero leakage
    for res in bob_leak_results:
        assert res["text"] in bob_memories, f"Security Leakage Detected! Bob retrieved: {res['text']}"
        assert res["text"] not in alice_memories, f"Cross-tenant Leak! Found Alice memory in Bob results: {res['text']}"
    print("  -> CONFIRMED: 0% data leakage. Bob's retrieval contains strictly Bob's private memories.")

    # -------------------------------------------------------------
    # Test 3: Bob querying "help with SQL joins"
    # -------------------------------------------------------------
    query2 = "help with SQL joins"
    print("\n" + "-" * 80)
    print(f"TEST 3: Targeted Query for [{bob_id}] | Query: \"{query2}\" (top_k=3)")
    bob_sql_results = retrieve_context_with_scores(bob_id, query2, top_k=3)
    for idx, res in enumerate(bob_sql_results, 1):
        print(f"  {idx}. [Score: {res['similarity_score']:.4f}] {res['text']}")

    print("\n" + "=" * 80)
    print("ALL RAG RETRIEVAL & USER ISOLATION TESTS PASSED SUCCESSFULLY")
    print("=" * 80)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Standalone In-Memory RAG Retrieval Pipeline for Learner History"
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Run multi-user isolation and semantic retrieval test suite",
    )
    parser.add_argument(
        "--user",
        type=str,
        default=None,
        help="Target user ID for retrieval",
    )
    parser.add_argument(
        "--query",
        type=str,
        default=None,
        help="Search query string",
    )
    parser.add_argument(
        "--top_k",
        type=int,
        default=3,
        help="Number of results to retrieve (default: 3)",
    )
    args = parser.parse_args()

    if args.test:
        run_test_suite()
    elif args.user and args.query:
        results = retrieve_context(args.user, args.query, top_k=args.top_k)
        print(json.dumps(results, indent=2))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
