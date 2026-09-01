import React, { useState, useEffect } from 'react';
import {
  Award,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Upload,
  PlusCircle,
  Sparkles,
  FileCheck,
  Building2,
  Calendar,
  Hash,
  Globe,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocalStorage } from '../utils/useLocalStorage';

export default function CertificateOCR() {
  const { user, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useLocalStorage('vp_cert_tab', 'badges'); // 'badges', 'upload', 'curated'
  const [summaryData, setSummaryData] = useState(null);
  const [curatedCerts, setCuratedCerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Upload & Verification Form State
  const [certTitle, setCertTitle] = useLocalStorage('vp_cert_title', '');
  const [certIssuer, setCertIssuer] = useLocalStorage('vp_cert_issuer', '');
  const [verificationId, setVerificationId] = useLocalStorage('vp_cert_verif_id', '');
  const [credentialUrl, setCredentialUrl] = useLocalStorage('vp_cert_url', '');
  const [issueDate, setIssueDate] = useLocalStorage('vp_cert_date', '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Skill badge check state
  const [isClaimingBadge, setIsClaimingBadge] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  // 1. Fetch Badges & Certifications Summary
  const loadCredentials = async () => {
    setIsLoading(true);
    try {
      const summary = await api.badges.getSummary();
      setSummaryData(summary);

      const curated = await api.certificates.getCurated('default');
      setCuratedCerts(curated.certifications || []);
    } catch (err) {
      setErrorMsg(`Failed to load credentials: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, [user]);

  // 2. Claim Mastery Badge for completed skill
  const handleClaimBadge = async (skillId) => {
    setIsClaimingBadge(true);
    setErrorMsg(null);
    try {
      const res = await api.badges.checkAward(skillId);
      if (res.badge_awarded) {
        setStatusMsg(res.message);
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        await refreshProfile();
        await loadCredentials();
      } else {
        setErrorMsg(res.message || res.reason);
      }
    } catch (err) {
      setErrorMsg(`Failed to claim badge: ${err.message}`);
    } finally {
      setIsClaimingBadge(false);
    }
  };

  // 3. Submit External Certificate for Authenticity Verification
  const handleVerifyUpload = async (e) => {
    e.preventDefault();
    if (!certTitle.trim() || !certIssuer.trim()) {
      setErrorMsg('Please provide Certificate Title and Issuing Organization.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);
    setUploadResult(null);

    try {
      const res = await api.certificates.verifyUpload({
        title: certTitle,
        issuer: certIssuer,
        verification_id: verificationId,
        credential_url: credentialUrl,
        issue_date: issueDate,
      });

      setUploadResult(res);
      await refreshProfile();
      await loadCredentials();

      if (res.is_verified) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        setCertTitle('');
        setCertIssuer('');
        setVerificationId('');
        setCredentialUrl('');
        setIssueDate('');
      }
    } catch (err) {
      setErrorMsg(`Verification error: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Header */}
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span className="badge badge-blue">Verified Credentials Hub</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Tamper-evident mastery badges & authenticated external certifications
          </span>
        </div>
        <h1>Badges & Certification Studio</h1>
        <p className="subheading">
          Earn verified skill mastery badges upon curriculum completion, explore curated industry certifications, and submit external credentials for cryptographic authenticity validation.
        </p>
      </div>

      {statusMsg && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'var(--color-tertiary-fixed, #dcfce7)',
            border: '1px solid var(--color-tertiary-fixed-dim, #86efac)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-on-tertiary-fixed, #14532d)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'var(--color-error-container, #fee2e2)',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-on-error-container, #991b1b)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top Credentials Metric Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Mastery Badges</span>
            <Award size={18} color="var(--color-secondary, #f97316)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '0.35rem' }}>
            {summaryData?.total_badges_count || 0}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Generated SVG base-art emblems</span>
        </div>

        <div className="glass-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Verified External Certs</span>
            <ShieldCheck size={18} color="var(--color-tertiary, #16a34a)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-tertiary, #16a34a)', marginTop: '0.35rem' }}>
            {summaryData?.verified_certs_count || 0}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Eligible for resume telemetry</span>
        </div>

        <div className="glass-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Verified Credentials</span>
            <Sparkles size={18} color="var(--color-primary, #2563eb)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-primary, #2563eb)', marginTop: '0.35rem' }}>
            {summaryData?.total_verified_credentials || 0}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>100% verified & tamper-evident</span>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="tabs-header" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'badges' ? 'active' : ''}`}
          onClick={() => setActiveTab('badges')}
        >
          <Award size={16} />
          <span>Earned Mastery Badges ({summaryData?.total_badges_count || 0})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <Upload size={16} />
          <span>Upload & Verify External Certificate</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'curated' ? 'active' : ''}`}
          onClick={() => setActiveTab('curated')}
        >
          <Globe size={16} />
          <span>Curated Industry Certifications</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: EARNED MASTERY BADGES GALLERY                                  */}
      {/* ===================================================================== */}
      {activeTab === 'badges' && (
        <div>
          {summaryData?.badges && summaryData.badges.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {summaryData.badges.map((badge, idx) => (
                <div
                  key={badge.badge_id || idx}
                  className="glass-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '1.5rem',
                    textAlign: 'center',
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Render SVG Badge */}
                  <div
                    style={{ width: '200px', height: '240px', marginBottom: '1rem' }}
                    dangerouslySetInnerHTML={{ __html: badge.badge_svg }}
                  />

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>
                    {badge.skill_name}
                  </h3>

                  <span className="badge badge-green" style={{ marginBottom: '0.75rem', fontSize: '0.72rem' }}>
                    <ShieldCheck size={12} style={{ marginRight: '4px' }} /> Verified Mastery
                  </span>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    Issued: {badge.issued_at?.split('T')[0]}
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    ID: {badge.badge_id?.slice(0, 18)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state-box">
              <div className="empty-state-icon-wrapper">
                <Award size={32} />
              </div>
              <div className="empty-state-title">No Mastery Badges Earned Yet</div>
              <div className="empty-state-desc">
                Complete all sequential learning modules and pass the proctored exams for any skill in the Curriculum Studio to earn and attach your official Vidhya Praman Mastery Badge.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: UPLOAD & VERIFY EXTERNAL CERTIFICATE                           */}
      {/* ===================================================================== */}
      {activeTab === 'upload' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
          {/* Upload & Verification Form */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <FileCheck size={20} color="var(--color-primary, #2563eb)" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Submit External Certificate Proof
              </h2>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Upload details of completed external certifications (AWS, Google Cloud, Meta, Coursera, Linux Foundation, etc.). Our verification engine will validate issuer legitimacy and verification credentials.
            </p>

            <form onSubmit={handleVerifyUpload}>
              <div className="form-group">
                <label className="form-label">Certificate Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. AWS Certified Solutions Architect – Associate"
                  value={certTitle}
                  onChange={(e) => setCertTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Issuing Authority / Organization *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Amazon Web Services (AWS), Meta, Coursera, Microsoft"
                  value={certIssuer}
                  onChange={(e) => setCertIssuer(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Verification / Credential ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. AWS-PSA-9938102"
                    value={verificationId}
                    onChange={(e) => setVerificationId(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Issue Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Online Verification URL (Credly / Coursera / AWS)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="e.g. https://www.credly.com/badges/your-badge-id"
                  value={credentialUrl}
                  onChange={(e) => setCredentialUrl(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={isVerifying}>
                  {isVerifying ? <span className="spinner" /> : <ShieldCheck size={16} />}
                  <span>Verify & Store Certification</span>
                </button>
              </div>
            </form>
          </div>

          {/* Verification Result Diagnostic Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {uploadResult ? (
              <div
                className="glass-card"
                style={{
                  border: uploadResult.is_verified ? '2px solid var(--color-tertiary, #16a34a)' : '2px solid var(--color-error, #dc2626)',
                  background: uploadResult.is_verified ? 'var(--color-tertiary-fixed, #dcfce7)' : 'var(--color-error-container, #fee2e2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {uploadResult.is_verified ? (
                    <ShieldCheck size={32} color="var(--color-on-tertiary-fixed, #14532d)" />
                  ) : (
                    <ShieldAlert size={32} color="var(--color-on-error-container, #991b1b)" />
                  )}
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 900, color: uploadResult.is_verified ? '#14532d' : '#991b1b', fontSize: '1.05rem' }}>
                      {uploadResult.is_verified ? 'CERTIFICATE AUTHENTICATED' : 'VERIFICATION REJECTED'}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: uploadResult.is_verified ? '#166534' : '#b91c1c' }}>
                      {uploadResult.is_verified
                        ? 'Added to verified profile. Eligible for resume generation.'
                        : 'Excluded from resume stats & verified credentials.'}
                    </span>
                  </div>
                </div>

                {!uploadResult.is_verified && uploadResult.rejection_reasons?.length > 0 && (
                  <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', marginTop: '0.5rem', border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.25rem' }}>
                      Authenticity Failure Reasons:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.75rem', color: '#b91c1c' }}>
                      {uploadResult.rejection_reasons.map((r, rIdx) => (
                        <li key={rIdx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-main)' }}>
                  Authenticity Verification Criteria
                </h3>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <li><strong>Issuer Recognition:</strong> Issuer must match an accredited global authority (AWS, Microsoft, Google, Meta, Linux Foundation, Coursera, etc.).</li>
                  <li><strong>Verification ID / URL:</strong> Must contain a valid verification ID or live credential validation URL (Credly, Coursera, CertMetrics).</li>
                  <li><strong>Strict Anti-Forgery Policy:</strong> Unverified submissions are safely excluded from verified stats and resume generation.</li>
                </ul>
              </div>
            )}

            {/* List of currently stored certifications */}
            <div className="glass-card">
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.75rem', color: 'var(--text-main)' }}>
                Your Stored External Certifications
              </h3>

              {summaryData?.verified_certifications?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {summaryData.verified_certifications.map((c, cIdx) => (
                    <div
                      key={c.cert_id || cIdx}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        background: 'var(--color-surface-container-low, #f8fafc)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {c.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {c.issuer} • ID: {c.verification_id || 'Verified'}
                        </div>
                      </div>
                      <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                        VERIFIED
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  No verified external certifications added yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: CURATED INDUSTRY CERTIFICATIONS                                */}
      {/* ===================================================================== */}
      {activeTab === 'curated' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {curatedCerts.map((cc, ccIdx) => (
              <div
                key={ccIdx}
                className="glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.5rem',
                  borderRadius: '16px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span className="badge badge-blue">{cc.level}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>~{cc.estimated_hours}h prep</span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.4rem', color: 'var(--text-main)' }}>
                    {cc.title}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    <Building2 size={14} />
                    <span>{cc.issuer}</span>
                  </div>
                </div>

                <a
                  href={cc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
                >
                  <span>Explore Official Exam</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
