import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, RotateCw, Sparkles, CheckCircle2, Sliders, Cpu, Check, Target } from 'lucide-react';
import { api } from '../services/api';
import { useLocalStorage } from '../utils/useLocalStorage';

export default function SkillConfidence() {
  const [skillName, setSkillName] = useLocalStorage('vp_skill_conf_name', 'React & Full-Stack Architecture');
  const [features, setFeatures] = useLocalStorage('vp_skill_conf_features', {
    github_repos_count: 14,
    commit_frequency_monthly: 45,
    code_quality_score: 0.85,
    pr_acceptance_rate: 0.90,
    test_coverage_pct: 78,
    primary_language_match: 0.95,
    documentation_quality: 0.80,
  });

  const [scoreResult, setScoreResult] = useLocalStorage('vp_skill_conf_score', null);
  const [isScoring, setIsScoring] = useState(false);

  // Feature Importance & Retraining state
  const [featureImportances, setFeatureImportances] = useState([]);
  const [isLoadingImportances, setIsLoadingImportances] = useState(false);
  const [retrainMetrics, setRetrainMetrics] = useState(null);
  const [isRetraining, setIsRetraining] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchFeatureImportances = async () => {
    setIsLoadingImportances(true);
    try {
      const res = await api.skillConfidence.getFeatureImportances();
      setFeatureImportances(res.feature_importances || []);
    } catch (err) {
      console.warn("Feature importance fetch error:", err);
    } finally {
      setIsLoadingImportances(false);
    }
  };

  useEffect(() => {
    fetchFeatureImportances();
    handleScore();
  }, []);

  const handleScore = async () => {
    setIsScoring(true);
    setErrorMsg(null);
    try {
      const res = await api.skillConfidence.score(skillName, features);
      setScoreResult(res);
    } catch (err) {
      setErrorMsg(`Scoring error: ${err.message}`);
    } finally {
      setIsScoring(false);
    }
  };

  const handleRetrain = async () => {
    setIsRetraining(true);
    setErrorMsg(null);
    try {
      const res = await api.skillConfidence.retrain(600);
      setRetrainMetrics(res);
      await fetchFeatureImportances();
      await handleScore();
    } catch (err) {
      setErrorMsg(`Retraining failed: ${err.message}`);
    } finally {
      setIsRetraining(false);
    }
  };

  const handleSliderChange = (key, val) => {
    setFeatures((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Header */}
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span className="badge badge-orange">Skill Readiness</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Quantitative signals & verified competency rating
          </span>
        </div>
        <h1>Developer Skill Evidence & Confidence Analytics</h1>
        <p className="subheading">
          Calculates your authentic skill confidence rating based on repository commits, test coverage, code quality, and peer-reviewed pull requests.
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
            color: 'var(--color-on-error-container, #fca5a5)',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          {errorMsg}
        </div>
      )}

      <div className="grid-2">
        {/* Left Column: Interactive Feature Controls */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', margin: 0 }}>
              <Sliders size={18} color="var(--color-primary, #2563eb)" />
              Developer Activity Telemetry
            </h3>
            <button
              className="badge badge-blue"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setFeatures({
                  github_repos_count: 22,
                  commit_frequency_monthly: 65,
                  code_quality_score: 0.92,
                  pr_acceptance_rate: 0.95,
                  test_coverage_pct: 88,
                  primary_language_match: 0.98,
                  documentation_quality: 0.88,
                });
              }}
            >
              Preset: Senior Developer
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Evaluated Skill Topic</label>
            <input
              type="text"
              className="form-input"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              placeholder="e.g. React.js, Python FastAPI, PyTorch"
            />
          </div>

          {/* Sliders for 7 features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div className="form-label">
                <span>Public GitHub Repositories: {features.github_repos_count}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0 - 50</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={features.github_repos_count}
                onChange={(e) => handleSliderChange('github_repos_count', parseInt(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div className="form-label">
                <span>Monthly Commit Frequency: {features.commit_frequency_monthly} commits/mo</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0 - 120</span>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                value={features.commit_frequency_monthly}
                onChange={(e) => handleSliderChange('commit_frequency_monthly', parseInt(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div className="form-label">
                <span>Code Quality Score: {(features.code_quality_score * 100).toFixed(0)}%</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0.0 - 1.0</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={features.code_quality_score}
                onChange={(e) => handleSliderChange('code_quality_score', parseFloat(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div className="form-label">
                <span>Pull Request (PR) Acceptance Rate: {(features.pr_acceptance_rate * 100).toFixed(0)}%</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0.0 - 1.0</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={features.pr_acceptance_rate}
                onChange={(e) => handleSliderChange('pr_acceptance_rate', parseFloat(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div className="form-label">
                <span>Unit & Integration Test Coverage: {features.test_coverage_pct}%</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0 - 100%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={features.test_coverage_pct}
                onChange={(e) => handleSliderChange('test_coverage_pct', parseInt(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div className="form-label">
                <span>Primary Language Match: {(features.primary_language_match * 100).toFixed(0)}%</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0.0 - 1.0</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={features.primary_language_match}
                onChange={(e) => handleSliderChange('primary_language_match', parseFloat(e.target.value))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div className="form-label">
                <span>Documentation & README Quality: {(features.documentation_quality * 100).toFixed(0)}%</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>0.0 - 1.0</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={features.documentation_quality}
                onChange={(e) => handleSliderChange('documentation_quality', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <button
              className="btn btn-primary"
              style={{ width: '100%', height: '42px' }}
              onClick={handleScore}
              disabled={isScoring}
            >
              {isScoring ? (
                <>
                  <span className="spinner" />
                  <span>Computing Prediction...</span>
                </>
              ) : (
                <>
                  <TrendingUp size={16} />
                  <span>Calculate Skill Confidence Score</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Score Gauge & Feature Importance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Prediction Result Card */}
          <div className="hero-card" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Calibrated Skill Confidence
            </div>
            <h2 style={{ fontSize: '1.35rem', margin: '0.3rem 0 1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {scoreResult?.skill_name || skillName}
            </h2>

            {scoreResult ? (
              <div>
                <div
                  style={{
                    fontSize: '3.5rem',
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                    color: scoreResult.confidence_score >= 0.75 ? 'var(--color-tertiary, #16a34a)' : scoreResult.confidence_score >= 0.5 ? 'var(--color-secondary, #f97316)' : 'var(--color-error, #dc2626)',
                    lineHeight: 1,
                    marginBottom: '0.5rem',
                  }}
                >
                  {scoreResult.confidence_percentage}
                </div>

                <div style={{ display: 'inline-block', marginBottom: '1.25rem' }}>
                  <span
                    className={`badge ${
                      scoreResult.confidence_score >= 0.75 ? 'badge-green' : scoreResult.confidence_score >= 0.5 ? 'badge-orange' : 'badge-red'
                    }`}
                    style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}
                  >
                    {scoreResult.rating_tier}
                  </span>
                </div>

                {/* Milestone Progress Meter */}
                <div style={{ maxWidth: '360px', margin: '0 auto' }}>
                  <div className="milestone-progress-container">
                    <div className={`milestone-segment ${scoreResult.confidence_score >= 0.25 ? 'completed' : ''}`} />
                    <div className={`milestone-segment ${scoreResult.confidence_score >= 0.50 ? 'completed' : ''}`} />
                    <div className={`milestone-segment ${scoreResult.confidence_score >= 0.75 ? 'completed' : ''}`} />
                    <div className={`milestone-segment ${scoreResult.confidence_score >= 0.90 ? 'completed' : ''}`} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>Novice</span>
                    <span>Competent</span>
                    <span>Proficient</span>
                    <span>Mastery</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>Adjust telemetry signals to preview prediction</div>
            )}
          </div>

          {/* Feature Importances Card */}
          <div className="glass-card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', margin: 0 }}>
                <BarChart3 size={16} color="var(--color-primary, #2563eb)" />
                Telemetry Feature Weights
              </h4>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                onClick={handleRetrain}
                disabled={isRetraining}
              >
                {isRetraining ? <span className="spinner" /> : <RotateCw size={13} />}
                <span>{isRetraining ? 'Fitting...' : 'Retrain Model'}</span>
              </button>
            </div>

            {retrainMetrics && (
              <div
                style={{
                  background: 'var(--color-tertiary-fixed, #dcfce7)',
                  border: '1px solid var(--color-tertiary-fixed-dim, #86efac)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1rem',
                  fontSize: '0.78rem',
                  color: 'var(--color-on-tertiary-fixed, #86efac)',
                  fontWeight: 600,
                }}
              >
                ✓ Model retrained: R² Score = {retrainMetrics.metrics?.r2_score} | MAE = {retrainMetrics.metrics?.mae}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {featureImportances.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{item.feature}</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary, #2563eb)' }}>{item.weight_percentage}</span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      background: 'var(--color-surface-container-high, #e2e8f0)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${item.importance * 100}%`,
                        height: '100%',
                        background: 'var(--color-primary, #2563eb)',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
