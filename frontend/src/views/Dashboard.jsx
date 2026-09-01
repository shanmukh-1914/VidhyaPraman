import React, { useState } from 'react';
import {
  UserCheck,
  ShieldCheck,
  TrendingUp,
  Award,
  BookOpen,
  Database,
  BotMessageSquare,
  FileText,
  ScanText,
  Activity,
  ArrowRight,
  ExternalLink,
  Sparkles,
  User,
  Star,
  GitFork,
  CheckCircle2,
  Calendar,
  Layers,
  Edit3,
  RefreshCw,
  Code2,
  Zap,
  Target,
  Clock,
  Compass,
  Check,
} from 'lucide-react';
import Github from '../components/GithubIcon';
import { useAuth } from '../context/AuthContext';
import ProfileModal from '../components/ProfileModal';

export default function Dashboard({ isOnline, setActiveTab }) {
  const { user, activities, syncGitHub, isLoading } = useAuth();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncGithub = async () => {
    setIsSyncing(true);
    try {
      await syncGitHub();
    } catch (e) {
      console.warn('Sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const featureCards = [
    {
      id: 'assessment',
      title: 'Proctored Exam Studio',
      desc: 'Take interactive technical assessments with automated grading and live proctoring verification.',
      icon: ShieldCheck,
      color: 'var(--color-primary, #2563eb)',
      badge: 'Evaluation',
      action: 'Start Assessment',
    },
    {
      id: 'skill-confidence',
      title: 'Skill Analytics & Evidence',
      desc: 'Predictive competency ratings calculated from your genuine GitHub repositories, commits, and activity.',
      icon: TrendingUp,
      color: 'var(--color-secondary, #f97316)',
      badge: 'Analytics',
      action: 'View Skill Score',
    },
    {
      id: 'learning-plan',
      title: 'Personalized Roadmap',
      desc: 'Tailored hierarchical learning paths broken down into progressive milestones and weekly study goals.',
      icon: BookOpen,
      color: 'var(--color-primary, #2563eb)',
      badge: 'Roadmap',
      action: 'View Curriculum',
    },
    {
      id: 'tutoring',
      title: '1:1 AI Mentor & Notes',
      desc: 'Conversational technical tutoring in your preferred native language with instant AI study note generation.',
      icon: BotMessageSquare,
      color: 'var(--color-tertiary, #16a34a)',
      badge: '1:1 Coaching',
      action: 'Open AI Mentor',
    },
    {
      id: 'documents',
      title: 'Verified Career Documents',
      desc: 'Generate truth-grounded, verifiable Resumes and Letters of Recommendation with tamper-evident badges.',
      icon: FileText,
      color: 'var(--color-primary, #2563eb)',
      badge: 'Career Docs',
      action: 'Generate Resume',
    },
    {
      id: 'certificate',
      title: 'Certificate Scanner',
      desc: 'High-accuracy OCR document scanner that extracts accredited certificates and adds them to your profile.',
      icon: ScanText,
      color: 'var(--color-secondary, #f97316)',
      badge: 'Credentials',
      action: 'Scan Certificate',
    },
  ];

  return (
    <div className="page-wrapper animate-fade-in">
      {/* 1. Hero / Welcome Header */}
      <div className="hero-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span className="badge badge-orange">Learning Journey Active</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Continuous skill growth & verification
              </span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-main)' }}>
              Welcome back, <span className="gradient-text">{user?.full_name || user?.username || 'Learner'}</span> 👋
            </h1>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginTop: '0.35rem', maxWidth: '680px', lineHeight: 1.5 }}>
              Track your career readiness, take proctored assessments, connect your developer portfolio, and achieve your study milestones.
            </p>
          </div>

          {/* Target Role & Profile Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div
              style={{
                padding: '0.75rem 1.1rem',
                borderRadius: '14px',
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Target Career Goal
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary, #2563eb)', marginTop: '0.1rem' }}>
                {user?.target_role || 'Full Stack & AI Engineer'}
              </div>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => setShowEditProfile(true)}
              style={{ padding: '0.7rem 1.1rem' }}
            >
              <Edit3 size={15} />
              <span>Edit Goals</span>
            </button>
          </div>
        </div>

        {/* Segmented Milestone Progress Bar */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Target size={16} color="var(--color-primary, #2563eb)" />
              <span>Milestone Progress • 4 of 5 Stages Completed</span>
            </span>
            <span className="badge badge-green">
              <Check size={12} /> 80% Career Ready
            </span>
          </div>

          {/* Segmented Bar */}
          <div className="milestone-progress-container">
            <div className="milestone-segment completed" title="Foundation & Core Syntax (Completed)" />
            <div className="milestone-segment completed" title="Architecture & APIs (Completed)" />
            <div className="milestone-segment completed" title="Deep Learning & LLMs (Completed)" />
            <div className="milestone-segment completed" title="Proctored Assessments (Completed)" />
            <div className="milestone-segment in-progress" title="Verified Portfolio & LOR (In Progress)" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            <span>Stage 1: Core Fundamentals</span>
            <span>Stage 3: Advanced Architectures</span>
            <span style={{ fontWeight: 700, color: 'var(--color-secondary, #f97316)' }}>Stage 5: Final Credentials</span>
          </div>
        </div>
      </div>

      {/* 2. Flagship GitHub Developer Card */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.5rem 1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--color-surface-container-low, #f8fafc)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Github size={18} color="var(--text-main)" />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Developer Portfolio & Verified Signals
            </h2>
            {user?.github_username ? (
              <span className="badge badge-green">
                <CheckCircle2 size={12} /> Connected (@{user.github_username})
              </span>
            ) : (
              <span className="badge badge-orange">Not Connected</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {user?.github_username && (
              <a
                href={`https://github.com/${user.github_username}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
              >
                <ExternalLink size={13} />
                <span>View on GitHub</span>
              </a>
            )}

            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
              onClick={handleSyncGithub}
              disabled={isSyncing}
            >
              <RefreshCw size={13} className={isSyncing ? 'spin-animation' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Portfolio'}</span>
            </button>
          </div>
        </div>

        {/* GitHub Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', alignItems: 'center' }}>
          {/* Avatar & Bio */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '240px' }}>
            <img
              src={user?.github_avatar_url || 'https://avatars.githubusercontent.com/u/9919?v=4'}
              alt={user?.github_username || 'Developer'}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                objectFit: 'cover',
                border: '2px solid var(--color-primary, #2563eb)',
                boxShadow: 'var(--shadow-sm)',
              }}
            />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                {user?.full_name || user?.username}
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {user?.github_username ? `@${user.github_username}` : 'Link your GitHub in Profile'}
              </span>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.2rem', lineHeight: 1.3 }}>
                {user?.github_bio || user?.bio || 'Passionate developer building modern AI architectures & distributed systems.'}
              </p>
            </div>
          </div>

          {/* Quantitative Counters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            <div style={{ background: 'var(--color-surface-container-low, #f8fafc)', padding: '0.75rem 0.9rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Public Repos</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-primary, #2563eb)', marginTop: '0.1rem' }}>
                {user?.github_public_repos !== undefined ? user.github_public_repos : 0}
              </div>
            </div>

            <div style={{ background: 'var(--color-surface-container-low, #f8fafc)', padding: '0.75rem 0.9rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Followers</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
                {user?.github_followers !== undefined ? user.github_followers : 0}
              </div>
            </div>

            <div style={{ background: 'var(--color-surface-container-low, #f8fafc)', padding: '0.75rem 0.9rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Following</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.1rem' }}>
                {user?.github_following !== undefined ? user.github_following : 0}
              </div>
            </div>

            <div style={{ background: 'var(--color-surface-container-low, #f8fafc)', padding: '0.75rem 0.9rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Passed Exams</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-tertiary, #16a34a)', marginTop: '0.1rem' }}>
                {activities?.filter((a) => a.activity_type === 'assessment').length || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Top Dominant Languages */}
        {user?.github_top_languages && user.github_top_languages.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Top Languages:</span>
            {user.github_top_languages.map((lang, idx) => (
              <span key={idx} className="badge badge-blue">
                {lang}
              </span>
            ))}
          </div>
        )}

        {/* Top Repositories Grid */}
        {user?.github_top_repos && user.github_top_repos.length > 0 && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Code2 size={15} color="var(--color-primary, #2563eb)" />
              <span>Verified Repositories ({user.github_top_repos.length})</span>
            </div>
            <div className="grid-3" style={{ gap: '0.75rem' }}>
              {user.github_top_repos.map((repo, idx) => (
                <a
                  key={idx}
                  href={repo.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    textDecoration: 'none',
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#93c5fd';
                    e.currentTarget.style.boxShadow = 'var(--shadow-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-primary, #2563eb)' }}>{repo.name}</span>
                      <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{repo.language}</span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {repo.description || 'Public repository'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.6rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Star size={12} color="var(--color-secondary, #f97316)" fill="var(--color-secondary, #f97316)" /> {repo.stars || 0}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <GitFork size={12} /> {repo.forks || 0}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Core Feature Workspaces Grid */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Learning & Assessment Hubs
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Select a workspace below to study concepts, take exams, or generate verified career documents.
            </p>
          </div>
        </div>

        <div className="grid-3">
          {featureCards.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                className="glass-card interactive"
                onClick={() => setActiveTab(feat.id)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '190px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: 'var(--color-surface-container-low, #f8fafc)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: feat.color,
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <span className="badge badge-blue">{feat.badge}</span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                    {feat.title}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    {feat.desc}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '1rem',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid var(--border-subtle)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--color-primary, #2563eb)',
                  }}
                >
                  <span>{feat.action}</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Recent Activity & Verification History */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="var(--color-primary, #2563eb)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Recent Learning & Assessment Activity
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Real-time verification log
          </span>
        </div>

        {activities && activities.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activities.slice(0, 5).map((act) => (
              <div
                key={act.id}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  background: 'var(--color-surface-container-low, #f8fafc)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {act.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    {act.summary}
                  </div>
                </div>
                <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                  {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-box">
            <div className="empty-state-icon-wrapper">
              <Sparkles size={24} />
            </div>
            <div className="empty-state-title">Your Learning Journey Awaits</div>
            <div className="empty-state-desc">
              Take a proctored exam or start a 1:1 session with your AI tutor to see your achievements and verified badges recorded here.
            </div>
            <button
              className="btn btn-primary"
              style={{ marginTop: '0.5rem' }}
              onClick={() => setActiveTab('assessment')}
            >
              Take Your First Assessment
            </button>
          </div>
        )}
      </div>

      {/* Profile Edit Modal */}
      <ProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} />
    </div>
  );
}
