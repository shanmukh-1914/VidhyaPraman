import React, { useState } from 'react';
import {
  BotMessageSquare,
  Send,
  Sparkles,
  Database,
  User,
  Globe,
  BookOpen,
  Download,
  Copy,
  Check,
  Trash2,
  Search,
  FileText,
  BookmarkPlus,
  Layers,
  ChevronDown,
  Printer,
  Maximize2,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocalStorage } from '../utils/useLocalStorage';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { exportNotesToPDF } from '../utils/pdfNotesExport';

export const SUPPORTED_LANGUAGES = [
  { code: 'English', label: 'English', native: 'English' },
  { code: 'Hindi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'Telugu', label: 'Telugu', native: 'తెలుగు' },
  { code: 'Tamil', label: 'Tamil', native: 'தமிழ்' },
  { code: 'Kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'Malayalam', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'Bengali', label: 'Bengali', native: 'বাংলা' },
  { code: 'Marathi', label: 'Marathi', native: 'मराठी' },
  { code: 'Gujarati', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'Spanish', label: 'Spanish', native: 'Español' },
  { code: 'French', label: 'French', native: 'Français' },
  { code: 'German', label: 'German', native: 'Deutsch' },
  { code: 'Japanese', label: 'Japanese', native: '日本語' },
  { code: 'Mandarin Chinese', label: 'Mandarin', native: '中文' },
  { code: 'Korean', label: 'Korean', native: '한국어' },
  { code: 'Arabic', label: 'Arabic', native: 'العربية' },
  { code: 'Portuguese', label: 'Portuguese', native: 'Português' },
  { code: 'Russian', label: 'Russian', native: 'Русский' },
  { code: 'Italian', label: 'Italian', native: 'Italiano' },
];

export default function TutorStudio() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useLocalStorage('vp_tutor_tab', 'chat');
  const [userId, setUserId] = useState(user?.username || user?.email || 'user');

  React.useEffect(() => {
    if (user?.username || user?.email) {
      setUserId(user.username || user.email);
    }
  }, [user]);

  const [moduleTopic, setModuleTopic] = useLocalStorage('vp_tutor_topic', 'React Hooks & Virtual DOM');
  const [language, setLanguage] = useLocalStorage('vp_tutor_lang', 'English');
  const [apiKey, setApiKey] = useState('');

  // Conversation history
  const [messages, setMessages] = useLocalStorage('vp_tutor_messages', [
    {
      sender: 'tutor',
      text: "Hello! I am your 1:1 AI Technical Mentor. Ask me any conceptual question or ask for an explanation in your preferred language. You can also generate high-yield AI Study Notes at any time!",
      retrieved: [],
      topic: 'React Hooks & Virtual DOM',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [lastRetrievedContext, setLastRetrievedContext] = useState([]);
  const [lastCommittedSummary, setLastCommittedSummary] = useState(null);

  // AI Notes State
  const [aiNotesList, setAiNotesList] = useLocalStorage('vp_tutor_notes', []);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [notesSearch, setNotesSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [activeViewingNote, setActiveViewingNote] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const samplePrompts = [
    "Why does useEffect trigger infinite loops with objects in dependency arrays?",
    "Can you explain React.memo vs useMemo with an intuitive mental model?",
    "How does FastAPI manage asynchronous background tasks concurrently?",
    "What are best practices for structuring Redux Toolkit state slices?",
    "Explain Database Sharding vs Partitioning in System Design.",
  ];

  const handleSend = async (msgText = null) => {
    const textToSend = msgText || inputMessage;
    if (!textToSend.trim()) return;

    const userTurn = { sender: 'user', text: textToSend, topic: moduleTopic };
    setMessages((prev) => [...prev, userTurn]);
    setInputMessage('');
    setIsSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.tutoring.turn(userId, moduleTopic, textToSend, language, apiKey);
      
      setLastRetrievedContext(res.retrieved_context || []);
      setLastCommittedSummary(res.committed_summary);

      const tutorTurn = {
        sender: 'tutor',
        text: res.tutor_reply,
        retrieved: res.retrieved_context || [],
        topic: moduleTopic,
      };
      setMessages((prev) => [...prev, tutorTurn]);
    } catch (err) {
      setErrorMsg(`Tutoring turn failed: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateNotes = async (topicToNote = moduleTopic, userQ = null) => {
    setIsGeneratingNotes(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.tutoring.generateNotes(topicToNote, userQ, language, apiKey);
      
      const newNote = {
        id: Date.now(),
        topic: res.module_topic,
        language: res.language,
        notesMarkdown: res.notes_markdown,
        takeaways: res.key_takeaways || [],
        createdAt: res.created_at,
        query: userQ,
      };

      setAiNotesList((prev) => [newNote, ...prev]);
      setSuccessMsg(`Generated AI study notes for "${topicToNote}".`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(`Failed to generate notes: ${err.message}`);
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  const handleCopyNote = (noteId, markdown) => {
    navigator.clipboard.writeText(markdown);
    setCopiedId(noteId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteNote = (noteId) => {
    setAiNotesList((prev) => prev.filter((n) => n.id !== noteId));
    if (activeViewingNote?.id === noteId) setActiveViewingNote(null);
  };

  const handleExportSinglePDF = (note) => {
    if (!note) return;
    exportNotesToPDF(note, user?.full_name || user?.username, note.topic);
  };

  const handleDownloadAllNotesPDF = () => {
    if (aiNotesList.length === 0) return;
    exportNotesToPDF(aiNotesList, user?.full_name || user?.username, null);
  };

  const filteredNotes = aiNotesList.filter(
    (n) =>
      n.topic.toLowerCase().includes(notesSearch.toLowerCase()) ||
      n.notesMarkdown.toLowerCase().includes(notesSearch.toLowerCase())
  );

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Header */}
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span className="badge badge-green">1:1 Mentorship</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Socratic technical coaching in {SUPPORTED_LANGUAGES.length} languages
          </span>
        </div>
        <h1>1:1 AI Technical Mentor & Study Notes</h1>
        <p className="subheading">
          Get intuitive conceptual explanations in your preferred language, review past memory insights, and generate high-yield study notes.
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <BotMessageSquare size={16} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
            Interactive 1:1 Tutor Chat
          </button>
          <button
            className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            <BookOpen size={16} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
            AI Study Notes & Cheat Sheets ({aiNotesList.length})
          </button>
        </div>

        <button
          className="btn btn-emerald"
          style={{ fontSize: '0.82rem', padding: '0.45rem 0.95rem' }}
          onClick={() => handleGenerateNotes(moduleTopic, null)}
          disabled={isGeneratingNotes}
        >
          {isGeneratingNotes ? <span className="spinner" /> : <BookmarkPlus size={15} />}
          <span>{isGeneratingNotes ? 'Synthesizing Notes...' : 'Generate Short Notes for Active Topic'}</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#86efac',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
          }}
        >
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Configuration Header Bar */}
      <div className="glass-card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <div className="grid-3" style={{ alignItems: 'center' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Active Learner</label>
            <input
              type="text"
              className="form-input"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Subject / Topic Focus</label>
            <input
              type="text"
              className="form-input"
              value={moduleTopic}
              onChange={(e) => setModuleTopic(e.target.value)}
              placeholder="e.g. React Hooks, System Design, PyTorch"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Globe size={14} color="var(--color-primary, #2563eb)" />
              <span>Coaching Language ({SUPPORTED_LANGUAGES.length} Available)</span>
            </label>
            <select
              className="form-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ fontWeight: 600, color: 'var(--color-primary, #2563eb)' }}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label} ({lang.native})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {activeTab === 'chat' ? (
        /* CHAT VIEW */
        <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr' }}>
          {/* Left: Chat Container */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '620px', padding: 0, overflow: 'hidden' }}>
            {/* Messages list */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                background: '#09090b',
              }}
            >
              {messages.map((m, idx) => {
                const isTutor = m.sender === 'tutor';
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isTutor ? 'flex-start' : 'flex-end',
                      maxWidth: '90%',
                      alignSelf: isTutor ? 'flex-start' : 'flex-end',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        marginBottom: '0.35rem',
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {isTutor ? (
                        <>
                          <BotMessageSquare size={14} color="#10b981" />
                          <span style={{ color: '#10b981', fontWeight: 600 }}>AI Tutor • {language}</span>
                        </>
                      ) : (
                        <>
                          <User size={14} color="#3b82f6" />
                          <span style={{ color: '#93c5fd' }}>You ({userId})</span>
                        </>
                      )}
                    </div>

                    <div
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '0.75rem',
                        background: isTutor ? '#18181b' : 'rgba(37, 99, 235, 0.25)',
                        border: isTutor ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(59, 130, 246, 0.4)',
                        color: '#f4f4f5',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                        width: '100%',
                      }}
                    >
                      {isTutor ? (
                        <MarkdownRenderer content={m.text} />
                      ) : (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                      )}
                    </div>

                    {/* Quick generate notes button below tutor reply */}
                    {isTutor && idx > 0 && (
                      <button
                        className="badge badge-orange"
                        style={{
                          marginTop: '0.35rem',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleGenerateNotes(m.topic || moduleTopic, messages[idx - 1]?.text)}
                        disabled={isGeneratingNotes}
                      >
                        <BookmarkPlus size={12} />
                        <span>Save as AI Study Note</span>
                      </button>
                    )}
                  </div>
                );
              })}

              {isSending && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <span className="spinner" />
                  <span>AI Tutor is querying concepts and composing reply in {language}...</span>
                </div>
              )}
            </div>

            {/* Quick suggestions pills */}
            <div
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--bg-card)',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: '0.4rem',
                overflowX: 'auto',
              }}
            >
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  className="badge badge-blue"
                  style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onClick={() => handleSend(p)}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Message input bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              style={{
                padding: '0.85rem 1rem',
                background: 'var(--bg-card)',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: '0.75rem',
              }}
            >
              <input
                type="text"
                className="form-input"
                placeholder={`Ask a question or request explanation in ${language}...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isSending}
              />
              <button type="submit" className="btn btn-primary" disabled={isSending || !inputMessage.trim()}>
                <Send size={16} />
              </button>
            </form>
          </div>

          {/* Right: RAG Context & Memory Commits Inspector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <Database size={17} color="var(--color-primary, #2563eb)" />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Injected Study Context
                </h3>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Past learner struggles retrieved from vector store to personalize tutor guidance:
              </p>

              {lastRetrievedContext.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0.5rem' }}>
                  No prior struggles recorded for this topic.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {lastRetrievedContext.map((c, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        padding: '0.6rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem',
                        color: 'var(--text-main)',
                      }}
                    >
                      • {c}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <Sparkles size={17} color="var(--color-secondary, #f97316)" />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Concept Memory Commit
                </h3>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Key takeaways committed back to your learning profile:
              </p>

              {lastCommittedSummary ? (
                <div
                  style={{
                    background: 'rgba(249, 115, 22, 0.15)',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    color: '#fdba74',
                    fontWeight: 500,
                  }}
                >
                  ✓ {lastCommittedSummary}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0.5rem' }}>
                  Awaiting next tutoring turn.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* NOTES & REVISION BOARD VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Notes Toolbar */}
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
              <Search size={16} color="var(--color-primary, #2563eb)" />
              <input
                type="text"
                className="form-input"
                placeholder="Search study notes by topic or keyword..."
                value={notesSearch}
                onChange={(e) => setNotesSearch(e.target.value)}
                style={{ padding: '0.45rem 0.75rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={handleDownloadAllNotesPDF}
                disabled={aiNotesList.length === 0}
                style={{ gap: '0.5rem' }}
                title="Export all study notes into a compiled PDF handbook"
              >
                <Printer size={15} />
                <span>Export All Notes (PDF)</span>
              </button>

              {aiNotesList.length > 0 && (
                <button
                  className="btn btn-danger"
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                  onClick={() => {
                    if (window.confirm("Clear all AI study notes?")) setAiNotesList([]);
                  }}
                >
                  <Trash2 size={14} />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Notes Grid */}
          {filteredNotes.length === 0 ? (
            <div className="empty-state-box">
              <div className="empty-state-icon-wrapper">
                <BookOpen size={24} />
              </div>
              <div className="empty-state-title">No AI Study Notes Yet</div>
              <div className="empty-state-desc">
                Click <strong>"Generate Short Notes for Active Topic"</strong> above or ask the AI Tutor questions in chat to auto-generate revision summary cards.
              </div>
              <button
                className="btn btn-primary"
                onClick={() => handleGenerateNotes(moduleTopic, null)}
                disabled={isGeneratingNotes}
                style={{ marginTop: '0.5rem' }}
              >
                {isGeneratingNotes ? <span className="spinner" /> : <Sparkles size={16} />}
                <span>Generate Notes for "{moduleTopic}"</span>
              </button>
            </div>
          ) : (
            <div className="grid-2">
              {filteredNotes.map((note) => (
                <div key={note.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className="badge badge-orange">{note.language}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{note.createdAt}</span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', gap: '0.3rem' }}
                          onClick={() => handleExportSinglePDF(note)}
                          title="Download note as formatted PDF"
                        >
                          <Printer size={13} />
                          <span>PDF</span>
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => setActiveViewingNote(note)}
                          title="Open Full Reader"
                        >
                          <Maximize2 size={13} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleCopyNote(note.id, note.notesMarkdown)}
                          title="Copy Markdown"
                        >
                          {copiedId === note.id ? <Check size={13} color="var(--color-tertiary, #16a34a)" /> : <Copy size={13} />}
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleDeleteNote(note.id)}
                          title="Delete Note"
                        >
                          <Trash2 size={13} color="var(--color-error, #dc2626)" />
                        </button>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                      {note.topic}
                    </h3>

                    {note.query && (
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: '#93c5fd',
                          marginBottom: '0.75rem',
                          background: 'rgba(37, 99, 235, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          padding: '0.4rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 500,
                        }}
                      >
                        Q: "{note.query}"
                      </div>
                    )}

                    <div
                      style={{
                        maxHeight: '340px',
                        overflowY: 'auto',
                        background: 'var(--bg-card)',
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.85rem',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <MarkdownRenderer content={note.notesMarkdown} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Reading & Single PDF Print Modal */}
      {activeViewingNote && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div
            className="glass-card animate-scale-up"
            style={{
              maxWidth: '860px',
              width: '90%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '1.75rem',
              background: 'var(--bg-card)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div>
                <span className="badge badge-orange" style={{ marginBottom: '0.3rem', display: 'inline-block' }}>
                  {activeViewingNote.language} Study Note
                </span>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  {activeViewingNote.topic}
                </h2>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleExportSinglePDF(activeViewingNote)}
                  style={{ gap: '0.4rem', fontSize: '0.85rem' }}
                >
                  <Printer size={15} />
                  <span>Save / Print PDF</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setActiveViewingNote(null)}
                  style={{ padding: '0.45rem' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              <MarkdownRenderer content={activeViewingNote.notesMarkdown} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
