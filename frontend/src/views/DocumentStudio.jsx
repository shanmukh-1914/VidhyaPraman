import React, { useState, useEffect } from 'react';
import {
  FileText,
  Award,
  Download,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Printer,
  ChevronRight,
  RefreshCw,
  FolderGit2,
  Code2,
  Layout,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocalStorage } from '../utils/useLocalStorage';

export default function DocumentStudio() {
  const { user, refreshProfile } = useAuth();

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [portfolioStatus, setPortfolioStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Resume Generation & Template State
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useLocalStorage('vp_doc_has_generated', false);
  const [resumePayload, setResumePayload] = useLocalStorage('vp_doc_resume_payload', null);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useLocalStorage('vp_doc_template', 'modern_tech');

  // LOR State
  const [activeTab, setActiveTab] = useLocalStorage('vp_doc_tab', 'resume'); // 'resume', 'lor'
  const [lorMarkdown, setLorMarkdown] = useLocalStorage('vp_doc_lor_markdown', '');
  const [isGeneratingLor, setIsGeneratingLor] = useState(false);
  const [copied, setCopied] = useState(false);

  // 1. Fetch Eligibility Status
  const fetchStatus = async () => {
    setLoadingStatus(true);
    setErrorMsg(null);
    try {
      const res = await api.portfolio.getStatus();
      setPortfolioStatus(res);
      if (res.has_generated && res.is_unlocked) {
        // Auto-load previously generated payload if unlocked
        handleGenerateResume(false);
      }
    } catch (err) {
      setErrorMsg(`Failed to load verification status: ${err.message}`);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [user]);

  // 2. Trigger Resume Generation (Only reveals templates upon clicking)
  const handleGenerateResume = async (triggerConfetti = true) => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const res = await api.portfolio.generate();
      if (res.success) {
        setResumePayload(res.resume_payload);
        setAvailableTemplates(res.templates || []);
        setSelectedTemplateId(res.active_template_id || 'modern_tech');
        setHasGenerated(true);
        if (triggerConfetti) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      } else {
        setErrorMsg(res.error || 'Failed to generate verified resume.');
      }
    } catch (err) {
      setErrorMsg(`Generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Generate LOR
  const handleGenerateLor = async () => {
    setIsGeneratingLor(true);
    setErrorMsg(null);
    try {
      const telemetry = {
        name: resumePayload?.candidate_name || user?.full_name || user?.username,
        email: resumePayload?.email || user?.email,
        target_role: resumePayload?.target_role || 'Senior Software Engineer',
        verified_skills: portfolioStatus?.verified_data?.skills || [],
        projects: portfolioStatus?.verified_data?.projects || [],
      };
      const res = await api.documents.generateLOR(telemetry);
      setLorMarkdown(res.markdown_content || 'Official recommendation generated.');
    } catch (err) {
      setErrorMsg(`LOR generation failed: ${err.message}`);
    } finally {
      setIsGeneratingLor(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-wrapper animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header */}
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span className="badge badge-green">Verified Portfolio Engine</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Single Source of Truth Career Documents
          </span>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.4rem' }}>
          Verified Resume & Portfolio Studio
        </h1>
        <p className="subheading" style={{ margin: 0 }}>
          Generate cryptographic, proof-grounded resumes and official letters of recommendation derived strictly from your proctored assessments, verified GitHub projects, and earned mastery badges.
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs-header" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'resume' ? 'active' : ''}`}
          onClick={() => setActiveTab('resume')}
        >
          <FileText size={16} />
          <span>Official Verified Resume</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'lor' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('lor');
            if (!lorMarkdown && portfolioStatus?.is_unlocked) {
              handleGenerateLor();
            }
          }}
        >
          <Award size={16} />
          <span>Verified Letter of Recommendation (LOR)</span>
        </button>
      </div>

      {errorMsg && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '0.85rem 1.15rem',
            background: 'var(--color-error-container, #fee2e2)',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            color: 'var(--color-on-error-container, #fca5a5)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* 1. LOCKED STATE (Visibly locked with progress checklist)             */}
      {/* =================================================================== */}
      {!loadingStatus && portfolioStatus && !portfolioStatus.is_unlocked && (
        <div
          className="glass-card animate-fade-in"
          style={{
            padding: '2.5rem 2rem',
            borderRadius: '20px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
            textAlign: 'center',
            maxWidth: '820px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: '#18181b',
              border: '1px solid var(--border-subtle)',
              color: 'var(--color-secondary, #f97316)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.15)',
            }}
          >
            <Lock size={32} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem' }}>
            Resume Generation is Currently Locked
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '580px', margin: '0 auto 1.75rem', lineHeight: 1.5 }}>
            To uphold rigorous industry authenticity, official resumes can only be generated once your profile meets the verified competence threshold.
          </p>

          {/* Verification Criteria Checklist */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              textAlign: 'left',
              maxWidth: '620px',
              margin: '0 auto 2rem',
            }}
          >
            {portfolioStatus.checklist?.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  background: item.met ? 'var(--color-tertiary-fixed, #dcfce7)' : 'var(--color-surface-container-low, #f8fafc)',
                  border: item.met ? '1px solid var(--color-tertiary, #16a34a)' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {item.met ? (
                      <CheckCircle2 size={18} color="var(--color-tertiary, #16a34a)" />
                    ) : (
                      <AlertCircle size={18} color="var(--color-secondary, #f97316)" />
                    )}
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {item.label}
                    </span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0 1.6rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {item.hint}
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span
                    className={`badge ${item.met ? 'badge-green' : 'badge-orange'}`}
                    style={{ fontSize: '0.78rem', fontWeight: 800 }}
                  >
                    {item.current} / {item.required}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={fetchStatus}
              style={{ fontSize: '0.85rem' }}
            >
              <RefreshCw size={15} />
              <span>Re-check Eligibility</span>
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. UNLOCKED STATE: "GENERATE RESUME" CTA (Templates hidden until click) */}
      {/* =================================================================== */}
      {!loadingStatus && portfolioStatus && portfolioStatus.is_unlocked && !hasGenerated && (
        <div
          className="glass-card animate-fade-in"
          style={{
            padding: '3rem 2rem',
            borderRadius: '20px',
            background: 'var(--bg-card)',
            border: '1px solid var(--color-tertiary, #16a34a)',
            boxShadow: '0 15px 35px -10px rgba(22, 163, 74, 0.12)',
            textAlign: 'center',
            maxWidth: '780px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '22px',
              background: 'var(--color-tertiary-fixed, #dcfce7)',
              color: 'var(--color-tertiary, #16a34a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <Unlock size={34} />
          </div>

          <span className="badge badge-green" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', display: 'inline-block' }}>
            ELIGIBILITY CONFIRMED
          </span>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.5rem' }}>
            Verified Portfolio Threshold Achieved!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '540px', margin: '0 auto 2rem', lineHeight: 1.5 }}>
            Your proctored diagnostic scores, verified projects, and credentials have satisfied all verification criteria. Click below to compile your verified data into dynamic resume templates.
          </p>

          <button
            className="btn btn-primary"
            onClick={() => handleGenerateResume(true)}
            disabled={isGenerating}
            style={{ padding: '0.85rem 2rem', fontSize: '1rem', fontWeight: 800, boxShadow: '0 6px 20px rgba(37, 99, 235, 0.25)' }}
          >
            {isGenerating ? <span className="spinner" /> : <Sparkles size={18} />}
            <span>Generate Official Verified Resume</span>
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. POST-GENERATION WORKSPACE: Real-time Rendered Templates           */}
      {/* =================================================================== */}
      {hasGenerated && resumePayload && activeTab === 'resume' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top Template Switcher Toolbar (Visible ONLY after generation) */}
          <div
            className="glass-card"
            style={{
              padding: '1rem 1.5rem',
              borderRadius: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Layout size={20} color="var(--color-primary, #2563eb)" />
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Active Template:
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                  Switch layouts seamlessly without re-triggering eligibility checks.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {availableTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className={`btn ${selectedTemplateId === tpl.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                >
                  <Layers size={14} />
                  <span>{tpl.name}</span>
                </button>
              ))}

              <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)', margin: '0 0.5rem' }} />

              <button className="btn btn-secondary" onClick={handlePrint} style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}>
                <Printer size={14} />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>

          {/* Real-time Rendered Live Resume Document */}
          <div
            id="verified-resume-document"
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '3rem',
              boxShadow: 'var(--shadow-card-elevated)',
              border: '1px solid var(--border-subtle)',
              maxWidth: '920px',
              margin: '0 auto',
              width: '100%',
            }}
          >
            {/* Header / Candidate Identity */}
            <div
              style={{
                borderBottom: `2px solid ${selectedTemplateId === 'executive_lead' ? '#3b82f6' : selectedTemplateId === 'minimalist_developer' ? '#10b981' : '#f97316'}`,
                paddingBottom: '1.5rem',
                marginBottom: '2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 0.25rem' }}>
                  {resumePayload.candidate_name}
                </h1>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary, #2563eb)', marginBottom: '0.4rem' }}>
                  {resumePayload.target_role}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <span>{resumePayload.email}</span>
                  {resumePayload.phone && <span>• {resumePayload.phone}</span>}
                  {resumePayload.github_username && <span>• github.com/{resumePayload.github_username}</span>}
                </div>
              </div>

              {/* Cryptographic Verification Badge */}
              <div
                style={{
                  padding: '0.65rem 0.95rem',
                  borderRadius: '10px',
                  background: 'var(--color-tertiary-fixed, #dcfce7)',
                  border: '1px solid var(--color-tertiary, #16a34a)',
                  textAlign: 'right',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#86efac', fontSize: '0.78rem', fontWeight: 800 }}>
                  <ShieldCheck size={16} color="var(--color-tertiary, #16a34a)" />
                  <span>VIDHYA PRAMAN VERIFIED</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.15rem' }}>
                  {resumePayload.verification_token}
                </div>
              </div>
            </div>

            {/* Professional Summary */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Executive Summary
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                {resumePayload.bio}
              </p>
            </div>

            {/* Verified Skills Matrix */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Verified Technical Proficiencies (Proctored)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {resumePayload.verified_skills?.map((sk, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {sk.name || sk.skill_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Level: <strong style={{ textTransform: 'capitalize', color: 'var(--color-primary, #2563eb)' }}>{sk.level || 'Advanced'}</strong>
                      </div>
                    </div>
                    <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                      VERIFIED
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Verified Technical Projects */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Verified Technical Projects & Architecture
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {resumePayload.verified_projects?.map((proj, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {proj.title}
                      </div>
                      {proj.repo_url && (
                        <a
                          href={proj.repo_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '0.75rem', color: 'var(--color-primary, #2563eb)', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontWeight: 600 }}
                        >
                          <FolderGit2 size={13} />
                          <span>View Repository</span>
                        </a>
                      )}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                      {proj.description}
                    </p>
                    {proj.technologies && (
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {proj.technologies.map((t, tIdx) => (
                          <span key={tIdx} className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Verified Certifications & Mastery Badges */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Verified Certifications & Badges
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                {resumePayload.verified_certifications?.map((cert, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'var(--color-tertiary-fixed, #dcfce7)',
                      border: '1px solid var(--color-tertiary, #16a34a)',
                    }}
                  >
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {cert.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Issuer: {cert.issuer}
                    </div>
                  </div>
                ))}

                {resumePayload.mastery_badges?.map((b, idx) => (
                  <div
                    key={`b_${idx}`}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'var(--color-primary-fixed, #dbeafe)',
                      border: '1px solid var(--color-primary, #2563eb)',
                    }}
                  >
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {b.skill_name} Mastery Badge
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Tier: {b.tier || 'Gold Mastery'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. VERIFIED LOR TAB                                                 */}
      {/* =================================================================== */}
      {activeTab === 'lor' && (
        <div className="glass-card animate-fade-in" style={{ padding: '2rem', background: 'var(--bg-card)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Official Recommendation Letter
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                Synthesized directly from your authenticated telemetry and proctoring event trails.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleCopy(lorMarkdown)}
                style={{ fontSize: '0.8rem' }}
              >
                {copied ? <Check size={14} color="var(--color-tertiary, #16a34a)" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
          </div>

          <div
            style={{
              padding: '1.5rem',
              borderRadius: '12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'serif',
              lineHeight: 1.8,
              fontSize: '0.95rem',
              color: 'var(--text-main)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {isGeneratingLor ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <span className="spinner" />
                <span>Generating official verification letter...</span>
              </div>
            ) : (
              lorMarkdown || 'Letter of Recommendation will render here.'
            )}
          </div>
        </div>
      )}
    </div>
  );
}
