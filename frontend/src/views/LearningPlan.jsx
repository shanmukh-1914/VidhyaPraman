import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Clock,
  Layers,
  Sparkles,
  CheckCircle,
  ChevronRight,
  Download,
  Check,
  Target,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Award,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocalStorage } from '../utils/useLocalStorage';

export default function LearningPlan({ setActiveTab }) {
  const { user, refreshProfile } = useAuth();

  const [goal, setGoal] = useLocalStorage('vp_learning_plan_goal', 'Full Stack & AI Engineer');
  const [durationWeeks, setDurationWeeks] = useLocalStorage('vp_learning_plan_weeks', 8);
  const [skillsInput, setSkillsInput] = useLocalStorage('vp_learning_plan_skills', 'Python, React, FastAPI');
  const [learningPath, setLearningPath] = useLocalStorage('vp_learning_plan_path', null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const goalPresets = [
    { goal: 'Java FullStack Developer', weeks: 9, skills: 'Java 17, Spring Boot, React, PostgreSQL, Docker' },
    { goal: 'Full Stack & AI Engineer', weeks: 8, skills: 'Python, React, FastAPI, Docker' },
    { goal: 'Machine Learning & Deep Learning Specialist', weeks: 12, skills: 'Python, NumPy, PyTorch, YOLOv8' },
    { goal: 'Cloud Native & Kubernetes DevOps Engineer', weeks: 7, skills: 'Linux, Bash, Docker, Kubernetes' },
  ];

  // ---------------------------------------------------------------------------
  // Load Persisted Learning Path on Mount (From Django UserProfile)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadProfileData = async () => {
      setIsLoading(true);
      try {
        const profile = await api.auth.getProfile();
        if (profile?.learning_path && Object.keys(profile.learning_path).length > 0) {
          const path = profile.learning_path;
          setLearningPath(path);
          if (path.target_role) setGoal(path.target_role);
          if (path.total_estimated_weeks) setDurationWeeks(path.total_estimated_weeks);
        } else if (user?.learning_path && Object.keys(user.learning_path).length > 0) {
          setLearningPath(user.learning_path);
          if (user.learning_path.target_role) setGoal(user.learning_path.target_role);
        }
      } catch (e) {
        console.error('Failed to load profile learning path:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, []);

  // ---------------------------------------------------------------------------
  // Generate / Regenerate Learning Path via Django (Single Source of Truth)
  // ---------------------------------------------------------------------------
  const handleGenerate = async () => {
    if (!goal.trim()) return;
    setIsGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const interestsList = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      // Call Django backend endpoint to synthesize and persist to UserProfile.learning_path
      const res = await api.onboarding.generatePath(goal.trim(), interestsList, durationWeeks);
      if (res && res.learning_path) {
        setLearningPath(res.learning_path);
        setSuccessMsg(`Accurate ${res.learning_path.total_estimated_weeks || durationWeeks}-Week Learning Roadmap for "${goal}" generated and synced!`);
        await refreshProfile();
      }
    } catch (err) {
      setErrorMsg(`Failed to generate learning roadmap: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportJSON = () => {
    if (!learningPath) return;
    const blob = new Blob([JSON.stringify(learningPath, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vidhya_Praman_Roadmap-${(learningPath.target_role || goal).replace(/\s+/g, '_')}.json`;
    a.click();
  };

  const skillsList = learningPath?.custom_path || learningPath?.suggested_path || [];
  const totalModulesCount = learningPath?.total_modules || skillsList.reduce((acc, s) => acc + (s.modules?.length || 0), 0);

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Header */}
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span className="badge badge-orange">Persistent Cloud Curriculum</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Single Source of Truth • Synced with Module Studio
          </span>
        </div>
        <h1>Personalized Learning Roadmap</h1>
        <p className="subheading">
          Generate structured, sequential technical milestones tailored to your target career role, verified skills, and timeline.
        </p>
      </div>

      {errorMsg && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '0.85rem 1.25rem',
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

      {successMsg && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '0.85rem 1.25rem',
            background: 'var(--color-tertiary-fixed, #dcfce7)',
            border: '1px solid var(--color-tertiary-fixed-dim, #86efac)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-on-tertiary-fixed, #14532d)',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Check size={16} />
          {successMsg}
        </div>
      )}

      {/* Input Parameters Card */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div className="grid-3" style={{ alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Target Mastery Role / Goal</label>
            <input
              type="text"
              className="form-input"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Full Stack & AI Engineer"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <div className="form-label">
              <span>Target Timeline: {durationWeeks} Weeks</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>1 - 24 Weeks</span>
            </div>
            <input
              type="range"
              min="1"
              max="24"
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(parseInt(e.target.value))}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Focus Skills & Interests (Comma-separated)</label>
            <input
              type="text"
              className="form-input"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="Python, React, Docker"
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginTop: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Role presets:</span>
            {goalPresets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="badge badge-blue"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setGoal(p.goal);
                  setDurationWeeks(p.weeks);
                  setSkillsInput(p.skills);
                }}
              >
                {p.goal} ({p.weeks}w)
              </button>
            ))}
          </div>

          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={isGenerating || !goal.trim()}
          >
            {isGenerating ? (
              <>
                <span className="spinner" />
                <span>Synthesizing & Saving Roadmap...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>{learningPath ? 'Regenerate Learning Plan' : 'Generate Learning Plan'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Roadmap Display */}
      {isLoading ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <span className="spinner" style={{ margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading verified roadmap from your profile...</p>
        </div>
      ) : learningPath && skillsList.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Plan Summary Bar */}
          <div
            className="hero-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <span className="badge badge-orange">Active Cloud Roadmap</span>
                <span className="badge badge-green">
                  <Check size={12} /> {skillsList.length} Milestones • {totalModulesCount} Total Modules
                </span>
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Target Track: <span className="gradient-text">{learningPath.target_role || goal}</span>
              </h2>
              <div
                style={{
                  display: 'flex',
                  gap: '1.25rem',
                  marginTop: '0.4rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span>
                  Estimated Timeline:{' '}
                  <b style={{ color: 'var(--text-main)' }}>
                    {learningPath.total_estimated_weeks || durationWeeks} Weeks
                  </b>
                </span>
                <span>
                  Status:{' '}
                  <b style={{ color: 'var(--color-primary, #2563eb)', textTransform: 'capitalize' }}>
                    {learningPath.status || 'Suggested'}
                  </b>
                </span>
                <span>
                  Generated:{' '}
                  <b style={{ color: 'var(--text-dim)' }}>
                    {learningPath.generated_at ? new Date(learningPath.generated_at).toLocaleDateString() : 'Active'}
                  </b>
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {setActiveTab && (
                <button
                  className="btn btn-primary"
                  onClick={() => setActiveTab('modules')}
                  style={{ gap: '0.5rem' }}
                >
                  <BookOpen size={16} />
                  <span>Open Curriculum & Content Library</span>
                  <ArrowRight size={16} />
                </button>
              )}

              <button className="btn btn-secondary" onClick={handleExportJSON}>
                <Download size={16} />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Sequential Skill Milestones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {skillsList.map((skill, sIdx) => (
              <div key={skill.skill_id || sIdx} className="glass-card" style={{ position: 'relative' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'var(--color-primary-fixed, #dbeafe)',
                        color: 'var(--color-primary, #2563eb)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                      }}
                    >
                      M{sIdx + 1}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                        Milestone {sIdx + 1}: {skill.skill_name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {skill.modules?.length || 0} Modules • ~{skill.estimated_weeks || 2} Weeks
                        </span>
                        <span
                          className={`badge ${
                            skill.current_level === 'advanced'
                              ? 'badge-green'
                              : skill.current_level === 'intermediate'
                              ? 'badge-blue'
                              : 'badge-orange'
                          }`}
                          style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}
                        >
                          Target: {skill.target_level || 'Advanced'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {setActiveTab && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                      onClick={() => setActiveTab('modules')}
                    >
                      <span>View Modules</span>
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>

                {/* Modules Grid */}
                <div className="grid-3">
                  {skill.modules?.map((mod, mIdx) => (
                    <div
                      key={mod.module_id || mIdx}
                      style={{
                        background: 'var(--color-surface-container-low, #f8fafc)',
                        border: '1px solid var(--border-subtle)',
                        padding: '0.9rem',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            marginBottom: '0.4rem',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: 'var(--color-primary, #2563eb)',
                              textTransform: 'uppercase',
                            }}
                          >
                            Module {sIdx + 1}.{mIdx + 1}
                          </span>
                          <span className="badge badge-blue" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                            <Clock size={10} /> {mod.duration_hours || 8}h
                          </span>
                        </div>
                        <h4
                          style={{
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            margin: '0 0 0.4rem 0',
                            color: 'var(--text-main)',
                            lineHeight: 1.3,
                          }}
                        >
                          {mod.title}
                        </h4>
                      </div>

                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-dim)',
                          borderTop: '1px solid var(--border-subtle)',
                          paddingTop: '0.4rem',
                          marginTop: '0.4rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <ShieldCheck size={12} color="var(--color-primary)" />
                        <span>AI Lesson & Proctored Verification</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state-box">
          <div className="empty-state-icon-wrapper">
            <BookOpen size={24} />
          </div>
          <div className="empty-state-title">Build Your Personalized Roadmap</div>
          <div className="empty-state-desc">
            Define your target engineering goal and timeline above, then click <strong>Generate Learning Plan</strong> to receive a structured milestone curriculum saved to your cloud profile.
          </div>
        </div>
      )}
    </div>
  );
}
