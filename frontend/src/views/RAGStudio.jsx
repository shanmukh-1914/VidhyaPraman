import React, { useState, useEffect } from 'react';
import { Database, Search, PlusCircle, Trash2, Layers, Sparkles, CheckCircle, RefreshCw, Bookmark, HelpCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocalStorage } from '../utils/useLocalStorage';

export default function RAGStudio() {
  const { user } = useAuth();
  const [userId, setUserId] = useState(user?.username || user?.email || 'user');

  useEffect(() => {
    if (user?.username || user?.email) {
      setUserId(user.username || user.email);
    }
  }, [user]);

  const [singleText, setSingleText] = useLocalStorage('vp_rag_single_text', '');
  const [memoryCount, setMemoryCount] = useState(0);

  // Search State
  const [query, setQuery] = useLocalStorage('vp_rag_query', 'Struggled with async generators and event loop');
  const [topK, setTopK] = useLocalStorage('vp_rag_top_k', 3);
  const [searchResults, setSearchResults] = useLocalStorage('vp_rag_search_results', null);
  const [isSearching, setIsSearching] = useState(false);

  const [isIngesting, setIsIngesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const batchPresets = [
    "Learner had trouble understanding React useEffect dependency array closures.",
    "Candidate successfully solved FastAPI dependency injection and OAuth2 password flow.",
    "Student needed clarification on PyTorch backprop gradient accumulation with small batch sizes.",
    "Demonstrated mastery on Docker multi-stage builds and non-root container security.",
    "Requested extra practice exercises for binary search tree balancing algorithms.",
  ];

  const fetchCount = async () => {
    try {
      const res = await api.rag.getUserMemoryCount(userId);
      setMemoryCount(res.active_memory_count || 0);
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    fetchCount();
  }, [userId]);

  const handleAddSingle = async () => {
    if (!singleText.trim()) return;
    setIsIngesting(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await api.rag.addMemory(userId, singleText, { source: 'manual_input', timestamp: new Date().toISOString() });
      setSingleText('');
      setStatusMsg('Memory successfully encoded & indexed into vector store.');
      await fetchCount();
    } catch (err) {
      setErrorMsg(`Ingestion failed: ${err.message}`);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleBatchIngestPresets = async () => {
    setIsIngesting(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await api.rag.addBatchMemories(userId, batchPresets);
      setStatusMsg(`Ingested ${batchPresets.length} curated study logs into your profile.`);
      await fetchCount();
    } catch (err) {
      setErrorMsg(`Batch ingestion failed: ${err.message}`);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setErrorMsg(null);
    try {
      const res = await api.rag.retrieve(userId, query, topK);
      setSearchResults(res.results || []);
    } catch (err) {
      setErrorMsg(`Semantic retrieval failed: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm(`Clear all study memories for user '${userId}'?`)) return;
    try {
      await api.rag.clearMemories(userId);
      setStatusMsg(`Memories reset for ${userId}`);
      setSearchResults(null);
      await fetchCount();
    } catch (err) {
      setErrorMsg(`Clear failed: ${err.message}`);
    }
  };

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Header */}
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span className="badge badge-blue">Knowledge Retention</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Personalized study memory & semantic concept recall
          </span>
        </div>
        <h1>Personal Knowledge Assistant</h1>
        <p className="subheading">
          Review your personal learning history, key technical struggle points, and mastered concepts retrieved in real-time.
        </p>
      </div>

      {/* User Tenant Selector & Stats Header */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'var(--color-primary-fixed, #dbeafe)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary, #2563eb)',
            }}
          >
            <Database size={22} />
          </div>
          <div>
            <label className="form-label" style={{ marginBottom: '0.2rem' }}>Learner Profile ID</label>
            <input
              type="text"
              className="form-input"
              style={{ width: '220px', padding: '0.45rem 0.75rem' }}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Knowledge Items</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary, #2563eb)' }}>
              {memoryCount} Concepts Indexed
            </div>
          </div>

          <button className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', color: 'var(--color-error, #dc2626)' }} onClick={handleClear}>
            <Trash2 size={14} />
            <span>Reset Concepts</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            background: 'var(--color-tertiary-fixed, #dcfce7)',
            border: '1px solid var(--color-tertiary-fixed-dim, #86efac)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-on-tertiary-fixed, #14532d)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle size={16} />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            background: 'var(--color-error-container, #fee2e2)',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-on-error-container, #991b1b)',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          {errorMsg}
        </div>
      )}

      <div className="grid-2">
        {/* Left Column: Ingest Memories */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)' }}>
            <PlusCircle size={18} color="var(--color-primary, #2563eb)" />
            Add Learning Note or Concept
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Store questions, study takeaways, or tricky topics into your vector memory.
          </p>

          <div className="form-group">
            <label className="form-label">Concept or Study Note</label>
            <textarea
              className="form-textarea"
              placeholder="e.g. Learner struggled to grasp React useEffect cleanup functions with WebSocket connections."
              value={singleText}
              onChange={(e) => setSingleText(e.target.value)}
              style={{ minHeight: '90px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleAddSingle}
              disabled={isIngesting || !singleText.trim()}
            >
              {isIngesting ? <span className="spinner" /> : <PlusCircle size={16} />}
              <span>Save Study Note</span>
            </button>
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>Seed Sample Study Items</span>
              <span className="badge badge-orange">5 Samples</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Quickly populate your memory store with a mix of React, FastAPI, Docker, and PyTorch study logs.
            </p>
            <button
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={handleBatchIngestPresets}
              disabled={isIngesting}
            >
              <Sparkles size={15} color="var(--color-secondary, #f97316)" />
              <span>Load 5 Sample Engineering Logs</span>
            </button>
          </div>
        </div>

        {/* Right Column: Semantic Cosine Search Explorer */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)' }}>
            <Search size={18} color="var(--color-primary, #2563eb)" />
            Search Personal Knowledge
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Query your conceptual study memory using semantic nearest-neighbor search.
          </p>

          <div className="form-group">
            <label className="form-label">Natural Language Search Query</label>
            <input
              type="text"
              className="form-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What topics did I have difficulty with?"
            />
          </div>

          <div className="form-group">
            <div className="form-label">
              <span>Top Match Count: {topK}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>1 - 8</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '1.25rem' }}
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
          >
            {isSearching ? <span className="spinner" /> : <Search size={16} />}
            <span>Search Conceptual Memory</span>
          </button>

          {/* Search Hits Result */}
          {searchResults && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Retrieved Results ({searchResults.length} Concepts Matched):
              </div>

              {searchResults.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No matching memories found for this query.
                </div>
              ) : (
                searchResults.map((hit, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--color-surface-container-low, #f8fafc)',
                      border: '1px solid var(--border-subtle)',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                        Match #{idx + 1}
                      </span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-tertiary, #16a34a)' }}>
                        Relevance: {(hit.similarity_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.45, margin: 0 }}>
                      "{hit.text}"
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
