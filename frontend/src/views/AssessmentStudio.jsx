import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  HelpCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Code2,
  BookOpen,
  Shield,
  Layers,
  ArrowRight,
  Flame,
  Lightbulb,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { useLocalStorage } from '../utils/useLocalStorage';

export default function AssessmentStudio() {
  const [topic, setTopic] = useLocalStorage('vp_practice_topic', 'Python Core & Advanced Internals');
  const [numQuestions, setNumQuestions] = useLocalStorage('vp_practice_num_q', 5);
  const [difficulty, setDifficulty] = useLocalStorage('vp_practice_diff', 'medium');

  // Test Session State
  const [testData, setTestData] = useLocalStorage('vp_practice_test_data', null);
  const [learnerAnswers, setLearnerAnswers] = useLocalStorage('vp_practice_answers', {});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitted, setIsSubmitted] = useLocalStorage('vp_practice_submitted', false);
  const [gradingResult, setGradingResult] = useLocalStorage('vp_practice_grading_res', null);
  const [isGrading, setIsGrading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const topicPresets = [
    'Python Core & Advanced Internals',
    'React & Frontend Architecture',
    'System Design & Distributed Architecture',
    'Docker, Containers & Cloud Infrastructure',
    'PostgreSQL & Relational Query Optimization',
    'Rust Systems & Memory Safety',
    'Async API Systems & Microservices',
  ];

  // 1. Generate Stateless Practice Test
  const handleStartPractice = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setErrorMsg(null);
    setTestData(null);
    setGradingResult(null);
    setIsSubmitted(false);
    setLearnerAnswers({});

    try {
      const res = await api.practice.generate(topic, numQuestions, difficulty);
      setTestData(res);
    } catch (err) {
      setErrorMsg(`Failed to generate practice test: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Select Option
  const handleSelectOption = (qid, optionKey) => {
    if (isSubmitted) return;
    setLearnerAnswers((prev) => ({ ...prev, [qid]: optionKey }));
  };

  // 3. Submit for In-Memory Instant Feedback (Zero DB writes)
  const handleSubmitPractice = async () => {
    if (!testData) return;
    setIsGrading(true);
    setErrorMsg(null);

    try {
      const res = await api.practice.grade(
        testData.questions,
        testData.answer_key,
        testData.explanations,
        learnerAnswers
      );
      setGradingResult(res);
      setIsSubmitted(true);

      if (res.score_ratio >= 0.7) {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      }
    } catch (err) {
      setErrorMsg(`Grading error: ${err.message}`);
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <div className="page-wrapper animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span className="badge badge-orange">
            <Flame size={12} style={{ marginRight: '3px' }} /> Self-Test Practice Sandbox
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Unproctored & Isolated Knowledge Exploration
          </span>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.4rem' }}>
          Self-Test Practice Sandbox
        </h1>
        <p className="subheading" style={{ margin: 0 }}>
          Test your conceptual understanding across any engineering domain. This sandbox is completely unproctored, scored instantly for your own learning, and strictly never persisted to your profile or progress records.
        </p>
      </div>

      {/* Zero Persistence & Privacy Guarantee Banner */}
      <div
        style={{
          padding: '0.85rem 1.15rem',
          borderRadius: '12px',
          background: 'var(--color-primary-fixed, #dbeafe)',
          border: '1px solid var(--color-primary-fixed-dim, #93c5fd)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.75rem',
        }}
      >
        <Shield size={20} color="var(--color-primary, #2563eb)" />
        <div style={{ fontSize: '0.82rem', color: '#1e3a8a', lineHeight: 1.4 }}>
          <strong>Zero Database Writes Guarantee:</strong> Scores, choices, and attempts in this sandbox exist purely in memory. They do not affect your official skill matrices, learning paths, or assessment history.
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '0.85rem 1.15rem',
            background: 'var(--color-error-container, #fee2e2)',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            color: 'var(--color-on-error-container, #991b1b)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
          }}
        >
          <XCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* 1. TOPIC SELECTION & PRACTICE CONFIGURATION                         */}
      {/* =================================================================== */}
      {!testData && (
        <div
          className="glass-card animate-fade-in"
          style={{
            padding: '2rem',
            borderRadius: '20px',
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.05)',
          }}
        >
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1.25rem' }}>
            Choose Any Topic or Domain
          </h2>

          {/* Quick Topic Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {topicPresets.map((t) => (
              <button
                key={t}
                type="button"
                className={`tab-btn ${topic === t ? 'active' : ''}`}
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem' }}
                onClick={() => setTopic(t)}
              >
                <Code2 size={13} />
                <span>{t}</span>
              </button>
            ))}
          </div>

          {/* Custom Topic Input */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontSize: '0.84rem' }}>
              Custom Topic / Technology
            </label>
            <input
              type="text"
              className="form-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Distributed Consensus (Raft & Paxos), GraphQL Federation..."
              style={{ fontSize: '0.9rem' }}
            />
          </div>

          {/* Parameters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.84rem' }}>
                Question Count
              </label>
              <select
                className="form-select"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                style={{ fontSize: '0.85rem' }}
              >
                <option value={3}>3 Quick Warm-up Questions</option>
                <option value={5}>5 Questions (Recommended)</option>
                <option value={10}>10 Questions</option>
                <option value={15}>15 Comprehensive Questions</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.84rem' }}>
                Difficulty Level
              </label>
              <select
                className="form-select"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              >
                <option value="easy">Foundational Concepts</option>
                <option value="medium">Applied Engineering (Medium)</option>
                <option value="hard">Advanced Systems & Edge Cases</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary"
              onClick={handleStartPractice}
              disabled={isGenerating || !topic.trim()}
              style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem', fontWeight: 800 }}
            >
              {isGenerating ? <span className="spinner" /> : <Sparkles size={16} />}
              <span>Generate Practice Test</span>
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. ACTIVE TEST QUESTIONS & INSTANT SCORING                          */}
      {/* =================================================================== */}
      {testData && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Action Toolbar */}
          <div
            className="glass-card"
            style={{
              padding: '1rem 1.5rem',
              borderRadius: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <span className="badge badge-orange" style={{ fontSize: '0.68rem', marginBottom: '0.2rem', display: 'inline-block' }}>
                Active Self-Test
              </span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {testData.topic}
              </h3>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setTestData(null);
                setGradingResult(null);
                setIsSubmitted(false);
              }}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            >
              <RefreshCw size={14} />
              <span>Change Topic</span>
            </button>
          </div>

          {/* Instant Score Card (Revealed on submission) */}
          {isSubmitted && gradingResult && (
            <div
              className="glass-card animate-fade-in"
              style={{
                padding: '1.5rem 2rem',
                borderRadius: '16px',
                background: gradingResult.score_ratio >= 0.7 ? 'var(--color-tertiary-fixed, #dcfce7)' : 'var(--color-surface-container-low, #f8fafc)',
                border: gradingResult.score_ratio >= 0.7 ? '1px solid var(--color-tertiary, #16a34a)' : '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
                  Self-Test Score Result
                </span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-main)', margin: '0.15rem 0 0' }}>
                  {gradingResult.score_percentage} ({gradingResult.correct_count} / {gradingResult.total_questions} Correct)
                </h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {gradingResult.summary}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleStartPractice}
                  style={{ fontSize: '0.85rem' }}
                >
                  <RefreshCw size={14} />
                  <span>Retake with New Questions</span>
                </button>
              </div>
            </div>
          )}

          {/* Questions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {testData.questions.map((q, qIndex) => {
              const breakdownItem = gradingResult?.detailed_breakdown?.find((b) => b.id === q.id);
              const isCorrect = breakdownItem?.is_correct;
              const selectedOption = learnerAnswers[q.id];

              return (
                <div
                  key={q.id}
                  className="glass-card"
                  style={{
                    padding: '1.5rem',
                    borderRadius: '16px',
                    background: '#ffffff',
                    border: isSubmitted
                      ? isCorrect
                        ? '1px solid var(--color-tertiary, #16a34a)'
                        : '1px solid var(--color-error, #dc2626)'
                      : '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '8px',
                          background: 'var(--color-primary-fixed, #dbeafe)',
                          color: 'var(--color-primary, #2563eb)',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {qIndex + 1}
                      </span>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                        {q.prompt}
                      </h4>
                    </div>

                    {isSubmitted && (
                      <span
                        className={`badge ${isCorrect ? 'badge-green' : 'badge-red'}`}
                        style={{ fontSize: '0.72rem', fontWeight: 800 }}
                      >
                        {isCorrect ? 'CORRECT' : 'INCORRECT'}
                      </span>
                    )}
                  </div>

                  {/* Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    {Object.entries(q.options || {}).map(([optKey, optText]) => {
                      const isSelected = selectedOption === optKey;
                      const isAnswerKey = isSubmitted && testData.answer_key?.[q.id] === optKey;

                      let optBg = '#ffffff';
                      let optBorder = '1px solid var(--border-subtle)';

                      if (isSubmitted) {
                        if (isAnswerKey) {
                          optBg = 'var(--color-tertiary-fixed, #dcfce7)';
                          optBorder = '1px solid var(--color-tertiary, #16a34a)';
                        } else if (isSelected && !isCorrect) {
                          optBg = 'var(--color-error-container, #fee2e2)';
                          optBorder = '1px solid #fecaca';
                        }
                      } else if (isSelected) {
                        optBg = 'var(--color-primary-fixed, #dbeafe)';
                        optBorder = '1px solid var(--color-primary, #2563eb)';
                      }

                      return (
                        <div
                          key={optKey}
                          onClick={() => handleSelectOption(q.id, optKey)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '10px',
                            background: optBg,
                            border: optBorder,
                            cursor: isSubmitted ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontSize: '0.85rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '6px',
                              background: isSelected ? 'var(--color-primary, #2563eb)' : '#f1f5f9',
                              color: isSelected ? '#ffffff' : 'var(--text-main)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                            }}
                          >
                            {optKey}
                          </span>
                          <span style={{ color: 'var(--text-main)', flex: 1 }}>{optText}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Conceptual Explanation (Revealed on submission) */}
                  {isSubmitted && breakdownItem && (
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'var(--color-surface-container-low, #f8fafc)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.8rem',
                        color: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                      }}
                    >
                      <Lightbulb size={16} color="var(--color-secondary, #f97316)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong>Conceptual Explanation:</strong> {breakdownItem.explanation}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit Button */}
          {!isSubmitted && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmitPractice}
                disabled={isGrading || Object.keys(learnerAnswers).length === 0}
                style={{ padding: '0.85rem 2.25rem', fontSize: '0.95rem', fontWeight: 800 }}
              >
                {isGrading ? <span className="spinner" /> : <Send size={16} />}
                <span>Submit & View Instant Score</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
