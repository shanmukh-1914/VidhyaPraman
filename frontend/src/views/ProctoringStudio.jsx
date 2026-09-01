import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Smartphone,
  User,
  Users,
  Play,
  Clock,
  RefreshCw,
  Eye,
  StopCircle,
  FileText,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import WebcamCapture from '../components/WebcamCapture';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocalStorage } from '../utils/useLocalStorage';

export default function ProctoringStudio() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useLocalStorage('vp_proctoring_tab', 'live');
  const [sessionId, setSessionId] = useLocalStorage('vp_proctoring_session_id', null);
  const [isSessionActive, setIsSessionActive] = useLocalStorage('vp_proctoring_active', false);
  const [sessionOutcome, setSessionOutcome] = useLocalStorage('vp_proctoring_outcome', null);
  const [terminationReason, setTerminationReason] = useState(null);

  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [auditEvents, setAuditEvents] = useLocalStorage('vp_proctoring_audits', []);
  const [integrityScore, setIntegrityScore] = useLocalStorage('vp_proctoring_score', 100);

  const [errorMsg, setErrorMsg] = useState(null);

  // Start new test session
  const handleStartTestSession = async () => {
    setErrorMsg(null);
    setSessionOutcome(null);
    setTerminationReason(null);
    setAuditEvents([]);
    setIntegrityScore(100);
    try {
      const res = await api.proctoringSession.start(
        'practice_evaluation',
        'Live Integrity & Presence Calibration'
      );
      setSessionId(res.session_id);
      setIsSessionActive(true);
    } catch (err) {
      setErrorMsg(`Failed to initiate proctoring session: ${err.message}`);
    }
  };

  // Process live camera frame stream
  const handleProcessFrame = async (base64Img) => {
    if (!sessionId || !isSessionActive) return;
    setIsAnalyzing(true);
    try {
      const res = await api.proctoringSession.analyzeFrame(sessionId, base64Img);
      setCurrentAnalysis(res);

      if (res.should_terminate || res.outcome === 'malpractice') {
        // Immediate Malpractice Termination Triggered!
        setIsSessionActive(false);
        setSessionOutcome('malpractice');
        setTerminationReason(res.violation_reason);
        setIntegrityScore(0);

        // Fetch audit trail
        const audit = await api.proctoringSession.getAuditTrail(sessionId);
        setAuditEvents(audit.audit_trail || []);
      } else {
        if (res.flags && res.flags.length > 0) {
          setIntegrityScore((prev) => Math.max(30, prev - 5));
        }
      }
    } catch (err) {
      // Stream error catch
    } finally {
      setIsAnalyzing(false);
    }
  };

  // End session cleanly (Compliant pass or low-score fail)
  const handleEndSession = async () => {
    if (!sessionId) return;
    try {
      const res = await api.proctoringSession.end(sessionId, 0.95, 0.70);
      setIsSessionActive(false);
      setSessionOutcome(res.outcome);
      setAuditEvents(res.audit_trail || []);
    } catch (err) {
      setErrorMsg(`Failed to finalize session: ${err.message}`);
    }
  };

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Header */}
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span className="badge badge-blue">Single Shared Security Engine</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-time multi-person & unauthorized device detection with instant malpractice termination
          </span>
        </div>
        <h1>Exam Proctoring & Integrity Engine</h1>
        <p className="subheading">
          Continuous camera stream monitoring shared across skill assessments, module exams, and resume-claim skill re-tests. Real-time detection of a second person or device immediately terminates the session as malpractice.
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
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Left Stream / Controls vs. Right Diagnostics & Audit Trail */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Left Column: Live Camera & Session Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card" style={{ background: '#ffffff', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={18} color="var(--color-primary, #2563eb)" />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Live Camera Integrity Stream
                </h2>
              </div>
              <span className={`badge ${isSessionActive ? 'badge-green' : 'badge-orange'}`}>
                Session: {isSessionActive ? 'ACTIVE MONITORING' : 'IDLE / TERMINATED'}
              </span>
            </div>

            <WebcamCapture
              autoStart={true}
              isActive={isSessionActive}
              isContinuous={isSessionActive}
              hideControls={true}
              continuousIntervalMs={2000}
              onContinuousFrame={handleProcessFrame}
              label="Proctoring Session Camera"
            />

            {/* Session Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              {!isSessionActive ? (
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleStartTestSession}>
                  <Play size={16} />
                  <span>Start Live Monitored Session</span>
                </button>
              ) : (
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleEndSession}>
                  <StopCircle size={16} />
                  <span>Conclude & Finalize Session</span>
                </button>
              )}
            </div>
          </div>

          {/* Malpractice Termination Alert Banner */}
          {sessionOutcome === 'malpractice' && (
            <div
              className="glass-card"
              style={{
                border: '2px solid var(--color-error, #dc2626)',
                background: 'var(--color-error-container, #fee2e2)',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShieldAlert size={32} color="var(--color-on-error-container, #991b1b)" />
                <div>
                  <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--color-on-error-container, #991b1b)', fontSize: '1.05rem' }}>
                    SESSION TERMINATED: MALPRACTICE DETECTED
                  </h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#991b1b' }}>
                    {terminationReason || 'A second individual or unauthorized secondary device was detected in your camera frame.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Clean Pass Outcome Banner */}
          {sessionOutcome === 'pass' && (
            <div
              className="glass-card"
              style={{
                border: '2px solid var(--color-tertiary, #16a34a)',
                background: 'var(--color-tertiary-fixed, #dcfce7)',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShieldCheck size={32} color="var(--color-on-tertiary-fixed, #14532d)" />
                <div>
                  <h3 style={{ margin: 0, fontWeight: 900, color: '#14532d', fontSize: '1.05rem' }}>
                    SESSION COMPLETED: VERIFIED COMPLIANT
                  </h3>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#166534' }}>
                    Exam environment verified with 0 malpractice incidents recorded throughout the session.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Detection Meters & Auditable Event Trail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Real-time Detection Signals */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.85rem', color: 'var(--text-main)' }}>
              Real-Time Vision Signals
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--color-surface-container-low, #f8fafc)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Person Count</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: currentAnalysis?.face_count > 1 ? 'var(--color-error, #dc2626)' : 'var(--text-main)' }}>
                  {currentAnalysis?.face_count ?? 1} {currentAnalysis?.face_count > 1 ? '(Violation!)' : ''}
                </div>
              </div>

              <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'var(--color-surface-container-low, #f8fafc)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Secondary Device</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: currentAnalysis?.phone_detected ? 'var(--color-error, #dc2626)' : 'var(--color-tertiary, #16a34a)' }}>
                  {currentAnalysis?.phone_detected ? 'DETECTED!' : 'None'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'var(--color-surface-container-low, #f8fafc)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Integrity Metric:</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: integrityScore >= 80 ? 'var(--color-tertiary, #16a34a)' : 'var(--color-error, #dc2626)' }}>
                {integrityScore}%
              </span>
            </div>
          </div>

          {/* Auditable Event Trail */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText size={16} color="var(--color-primary, #2563eb)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Session Audit Trail
                </h3>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Lightweight Structured Log</span>
            </div>

            {auditEvents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                {auditEvents.map((ev, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      background: ev.event === 'malpractice_trigger' ? 'var(--color-error-container, #fee2e2)' : 'var(--color-surface-container-low, #f8fafc)',
                      border: ev.event === 'malpractice_trigger' ? '1px solid #fecaca' : '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-main)' }}>
                      <span>{ev.event?.toUpperCase()}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{ev.timestamp?.split('T')[1]?.slice(0, 8)}</span>
                    </div>
                    <div style={{ color: ev.event === 'malpractice_trigger' ? '#991b1b' : 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {ev.violation_reason || ev.details || `Outcome: ${ev.final_outcome}`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No audit events recorded for current session yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
