import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Briefcase,
  Code2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Save,
  ExternalLink,
  BookOpen,
  Sparkles,
  Link,
  ShieldCheck,
  FolderGit2,
  Upload,
  FileText,
  HelpCircle,
  Award,
  ChevronRight,
} from 'lucide-react';
import Github from './GithubIcon';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { triggerGitHubOAuth } from '../utils/oauth';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateProfile, linkGitHub, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'resume_import'

  // Profile Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [targetRole, setTargetRole] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Resume Ingestion State
  const [resumeText, setResumeText] = useState('');
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [parsedClaims, setParsedClaims] = useState(null);

  // Project Q&A Verification Modal State
  const [activeProjectQA, setActiveProjectQA] = useState(null);
  const [projectAnswers, setProjectAnswers] = useState({});
  const [isSubmittingProjectQA, setIsSubmittingProjectQA] = useState(false);
  const [projectQAResult, setProjectQAResult] = useState(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
      setPhone(user.phone_number || '');
      setTargetRole(user.target_role || 'Full Stack & AI Engineer');
      if (user.resume_claims && Object.keys(user.resume_claims).length > 0) {
        setParsedClaims(user.resume_claims);
      }
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const isGitHubLinked = !!(user?.github_username || user?.linked_providers?.includes('github'));

  // Link GitHub Handler
  const handleLinkGitHub = async () => {
    setIsLinking(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const { code } = await triggerGitHubOAuth();
      const res = await linkGitHub(code);
      if (res.success) {
        setStatusMsg(`Successfully linked GitHub account @${res.user?.github_username} (${res.reposSynced || 0} repositories synced)!`);
        setTimeout(() => setStatusMsg(null), 4000);
      } else {
        setErrorMsg(res.error || 'Failed to link GitHub account.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'GitHub OAuth linking error.');
    } finally {
      setIsLinking(false);
    }
  };

  // Save Profile Details
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);
    setErrorMsg(null);

    const res = await updateProfile({
      full_name: fullName,
      email: email,
      bio: bio,
      phone_number: phone,
      target_role: targetRole,
    });

    if (res.success) {
      setStatusMsg('Profile details successfully updated!');
      setTimeout(() => setStatusMsg(null), 3500);
    } else {
      setErrorMsg(res.error || 'Failed to update profile.');
    }
    setIsSaving(false);
  };

  // 1. Parse Resume Claims (Text or PDF file)
  const handleParseResume = async () => {
    if (!resumeText.trim() || resumeText.length < 15) {
      setErrorMsg('Please paste your resume text or upload a PDF document below.');
      return;
    }

    setIsParsingResume(true);
    setErrorMsg(null);
    try {
      const res = await api.resumeImport.parseResume(resumeText, 'Direct Resume Ingestion');
      setParsedClaims(res);
      await refreshProfile();
      setStatusMsg(`Parsed ${res.skills?.length || 0} skills, ${res.projects?.length || 0} projects, and ${res.certificates?.length || 0} certificate claims!`);
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err) {
      setErrorMsg(`Resume parsing failed: ${err.message}`);
    } finally {
      setIsParsingResume(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsParsingResume(true);
    setErrorMsg(null);
    try {
      const res = await api.resumeImport.parseResumeUpload(file);
      setParsedClaims(res);
      await refreshProfile();
      setStatusMsg(`Successfully extracted and parsed "${file.name}"! Found ${res.skills?.length || 0} skills, ${res.projects?.length || 0} projects, and ${res.certificates?.length || 0} certificate claims.`);
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err) {
      setErrorMsg(`PDF extraction failed: ${err.message}`);
    } finally {
      setIsParsingResume(false);
    }
  };

  // 2. Open Project Technical Q&A
  const handleOpenProjectQA = async (projectClaimId) => {
    setErrorMsg(null);
    setProjectQAResult(null);
    setProjectAnswers({});
    try {
      const qa = await api.resumeImport.generateProjectQA(projectClaimId);
      setActiveProjectQA(qa);
    } catch (err) {
      setErrorMsg(`Failed to generate verification questions: ${err.message}`);
    }
  };

  // 3. Submit Project Technical Q&A Answers
  const handleSubmitProjectQA = async () => {
    if (!activeProjectQA) return;
    setIsSubmittingProjectQA(true);
    setErrorMsg(null);

    try {
      const res = await api.resumeImport.submitProjectQA(
        activeProjectQA.project_claim_id,
        projectAnswers
      );
      setProjectQAResult(res);
      await refreshProfile();

      // Refresh claims list
      const updatedClaims = await api.resumeImport.getClaims();
      if (updatedClaims.claims) {
        setParsedClaims(updatedClaims.claims);
      }

      if (res.is_verified) {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      }
    } catch (err) {
      setErrorMsg(`Project verification error: ${err.message}`);
    } finally {
      setIsSubmittingProjectQA(false);
    }
  };

  // 4. Authenticate Certificate Claim via Prompt 6 Engine
  const handleVerifyCertificateClaim = async (certClaimId) => {
    setErrorMsg(null);
    try {
      const res = await api.resumeImport.verifyCertificateClaim(certClaimId);
      await refreshProfile();
      const updatedClaims = await api.resumeImport.getClaims();
      if (updatedClaims.claims) {
        setParsedClaims(updatedClaims.claims);
      }
      if (res.is_verified) {
        setStatusMsg('Certificate authenticated and added to verified profile!');
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } else {
        setErrorMsg(`Certificate rejected: ${res.rejection_reasons?.join(', ')}`);
      }
    } catch (err) {
      setErrorMsg(`Certificate verification error: ${err.message}`);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          borderRadius: '20px',
          background: '#18181b',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
              <User size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Learner Profile & Identity Hub
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                Single source of truth for auth identity, verified credentials, and linked accounts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '0.5rem',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="tabs-header" style={{ marginBottom: '1.25rem' }}>
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={15} />
            <span>Profile & Linked Accounts</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'resume_import' ? 'active' : ''}`}
            onClick={() => setActiveTab('resume_import')}
          >
            <Upload size={15} />
            <span>Import Resume Claims</span>
          </button>
        </div>

        {/* Status Messages */}
        {statusMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--color-tertiary-fixed, #dcfce7)',
              border: '1px solid var(--color-tertiary-fixed-dim, #86efac)',
              borderRadius: '10px',
              color: 'var(--color-on-tertiary-fixed, #86efac)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={16} />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--color-error-container, #fee2e2)',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              color: 'var(--color-on-error-container, #fca5a5)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              fontWeight: 600,
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 1: PROFILE & LINKED ACCOUNTS                                    */}
        {/* =================================================================== */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* GitHub Account Linking Banner */}
            <div
              style={{
                padding: '1.15rem',
                borderRadius: '12px',
                background: isGitHubLinked ? 'rgba(16, 185, 129, 0.12)' : '#18181b',
                border: isGitHubLinked ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#0f172a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Github size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      GitHub Identity & Repositories
                    </span>
                    {isGitHubLinked && (
                      <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                        VERIFIED & CONNECTED
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {isGitHubLinked
                      ? `Linked as @${user?.github_username} • ${user?.github_repos?.length || 0} repositories synced for claim verification.`
                      : 'Link your GitHub account to enable automatic repository syncing and project proof verification.'}
                  </p>
                </div>
              </div>

              {!isGitHubLinked ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleLinkGitHub}
                    disabled={isLinking}
                    style={{ background: '#0f172a', color: '#ffffff', border: 'none', fontSize: '0.82rem' }}
                  >
                    {isLinking ? <span className="spinner" /> : <Link size={14} />}
                    <span>Link & Verify GitHub</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleLinkGitHub}
                    disabled={isLinking}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                  >
                    {isLinking ? <span className="spinner" /> : <RefreshCw size={12} />}
                    <span>Re-sync Repos</span>
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--color-tertiary, #16a34a)', fontWeight: 700 }}>
                    <ShieldCheck size={16} />
                    <span>Verified</span>
                  </div>
                </div>
              )}
            </div>

            {/* Synced Repositories Preview Chip List */}
            {isGitHubLinked && user?.github_repos && user.github_repos.length > 0 && (
              <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: '#18181b', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    SYNCED REPOSITORIES ({user.github_repos.length})
                  </span>
                  {user.github_top_languages?.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      {user.github_top_languages.slice(0, 4).map((lang, lIdx) => (
                        <span key={lIdx} className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{lang}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '120px', overflowY: 'auto' }}>
                  {user.github_repos.slice(0, 8).map((repo, rIdx) => (
                    <span
                      key={rIdx}
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        background: '#18181b',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-main)',
                        fontWeight: 600,
                      }}
                    >
                      {repo.name} {repo.language && `(${repo.language})`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Profile Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Target Role / Career Goal</label>
              <input
                type="text"
                className="form-input"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Backend Architect"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Professional Bio</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief summary of your background and technical interests..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? <span className="spinner" /> : <Save size={16} />}
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        )}

        {/* =================================================================== */}
        {/* TAB 2: RESUME IMPORT & INDEPENDENT CLAIM VERIFICATION               */}
        {/* =================================================================== */}
        {activeTab === 'resume_import' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Resume Upload / PDF Drag & Drop Zone */}
            <div className="glass-card" style={{ background: '#18181b', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={18} color="var(--color-primary, #2563eb)" />
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Upload Resume Document (PDF / Text)
                  </span>
                </div>
                <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                  Automatic 3-Way Parsing
                </span>
              </div>

              {/* PDF File Dropzone */}
              <div
                style={{
                  border: '2px dashed var(--color-primary-fixed-dim, #93c5fd)',
                  background: '#18181b',
                  borderRadius: '12px',
                  padding: '1.5rem 1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginBottom: '1rem',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => document.getElementById('resume-pdf-file-input')?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
              >
                <input
                  id="resume-pdf-file-input"
                  type="file"
                  accept=".pdf,.txt,.docx,.md"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'var(--color-primary-fixed, #dbeafe)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-primary, #2563eb)',
                    }}
                  >
                    <Upload size={22} />
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Click to browse or drag & drop your Resume PDF
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Supports <strong>.PDF</strong>, <strong>.TXT</strong>, <strong>.DOCX</strong>, or <strong>.MD</strong>
                  </div>
                </div>
              </div>

              {/* Collapsible Text Fallback */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>OR PASTE TEXT</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              </div>

              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Paste plain text of your resume here (including skills, projects, and certificates)..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                style={{ background: '#18181b', fontSize: '0.82rem' }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleParseResume}
                  disabled={isParsingResume}
                >
                  {isParsingResume ? <span className="spinner" /> : <Sparkles size={15} />}
                  <span>Parse Resume Text</span>
                </button>
              </div>
            </div>

            {/* Parsed Claims 3-Way Independent Dashboard */}
            {parsedClaims && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* 1. Skill Claims */}
                <div className="glass-card" style={{ padding: '1.15rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Code2 size={16} color="var(--color-primary, #2563eb)" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        Skill Claims ({parsedClaims.skills?.length || 0})
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Requires 20-Q Proctored Assessment
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {parsedClaims.skills?.map((sk, skIdx) => {
                      const isVerified = user?.skills_matrix?.[sk.name]?.verified || sk.verified;
                      return (
                        <div
                          key={sk.id || skIdx}
                          style={{
                            padding: '0.45rem 0.75rem',
                            borderRadius: '8px',
                            background: isVerified ? 'rgba(16, 185, 129, 0.12)' : '#18181b',
                            border: isVerified ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.78rem',
                          }}
                        >
                          {isVerified ? (
                            <CheckCircle2 size={14} color="var(--color-tertiary, #16a34a)" />
                          ) : (
                            <Sparkles size={14} color="var(--color-secondary, #f97316)" />
                          )}
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{sk.name}</span>
                          <span className={`badge ${isVerified ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: '0.62rem' }}>
                            {isVerified ? 'VERIFIED' : 'PENDING'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Project Claims */}
                <div className="glass-card" style={{ padding: '1.15rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FolderGit2 size={16} color="var(--color-primary, #2563eb)" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        Project Claims ({parsedClaims.projects?.length || 0})
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Verified via Deep Technical Q&A & GitHub
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {parsedClaims.projects?.map((proj, pIdx) => {
                      const isVerified = user?.verified_projects?.some((vp) => vp.title === proj.title) || proj.verified;
                      return (
                        <div
                          key={proj.id || pIdx}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '10px',
                            background: isVerified ? 'rgba(16, 185, 129, 0.12)' : '#18181b',
                            border: isVerified ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--border-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: '240px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                {proj.title}
                              </span>
                              {proj.matched_github_repo && (
                                <span className="badge badge-blue" style={{ fontSize: '0.62rem' }}>
                                  GitHub Matched
                                </span>
                              )}
                            </div>
                            <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                              {proj.description?.slice(0, 120)}...
                            </p>
                          </div>

                          <div>
                            {isVerified ? (
                              <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
                                <ShieldCheck size={12} style={{ marginRight: '3px' }} /> VERIFIED & MERGED
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                onClick={() => handleOpenProjectQA(proj.id)}
                              >
                                <span>Verify Technical Depth</span>
                                <ChevronRight size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Certificate Claims */}
                <div className="glass-card" style={{ padding: '1.15rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Award size={16} color="var(--color-primary, #2563eb)" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        Certificate Claims ({parsedClaims.certificates?.length || 0})
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Authenticity Verification Engine
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {parsedClaims.certificates?.map((cert, cIdx) => (
                      <div
                        key={cert.id || cIdx}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          background: cert.verified ? 'rgba(16, 185, 129, 0.12)' : '#18181b',
                          border: cert.verified ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--border-subtle)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            {cert.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {cert.issuer}
                          </div>
                        </div>

                        <div>
                          {cert.verified ? (
                            <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                              VERIFIED
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                              onClick={() => handleVerifyCertificateClaim(cert.id)}
                            >
                              <span>Authenticate</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* PROJECT TECHNICAL Q&A VERIFICATION MODAL                            */}
        {/* =================================================================== */}
        {activeProjectQA && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10000,
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
          >
            <div
              className="glass-card"
              style={{
                width: '100%',
                maxWidth: '620px',
                padding: '2rem',
                borderRadius: '20px',
                background: '#18181b',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <span className="badge badge-blue" style={{ fontSize: '0.68rem', marginBottom: '0.25rem', display: 'inline-block' }}>
                    Project Authenticity Verification
                  </span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    {activeProjectQA.title}
                  </h3>
                </div>

                <button
                  onClick={() => setActiveProjectQA(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Answer these 3 deep technical questions generated from your project description and GitHub repository context.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {activeProjectQA.questions?.map((q, idx) => (
                  <div key={q.id} className="form-group">
                    <label className="form-label" style={{ fontSize: '0.82rem' }}>
                      {idx + 1}. {q.prompt}
                    </label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder="Explain your technical rationale and architecture..."
                      value={projectAnswers[q.id] || ''}
                      onChange={(e) => setProjectAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      style={{ fontSize: '0.82rem' }}
                    />
                  </div>
                ))}
              </div>

              {projectQAResult && (
                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: '10px',
                    marginBottom: '1rem',
                    background: projectQAResult.is_verified ? 'var(--color-tertiary-fixed, #dcfce7)' : 'var(--color-error-container, #fee2e2)',
                    color: projectQAResult.is_verified ? '#86efac' : '#fca5a5',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                  }}
                >
                  {projectQAResult.message}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveProjectQA(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmitProjectQA}
                  disabled={isSubmittingProjectQA}
                >
                  {isSubmittingProjectQA ? <span className="spinner" /> : <ShieldCheck size={16} />}
                  <span>Verify & Merge Project</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
