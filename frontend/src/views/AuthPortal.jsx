import React, { useState } from 'react';
import {
  Sparkles,
  LogIn,
  UserPlus,
  Lock,
  Mail,
  User,
  Briefcase,
  Code2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
} from 'lucide-react';
import Github from '../components/GithubIcon';
import VidhyaPramanLogo from '../components/VidhyaPramanLogo';
import { useAuth } from '../context/AuthContext';
import { triggerGitHubOAuth, triggerGoogleOAuth } from '../utils/oauth';

export default function AuthPortal() {
  const { login, signup, loginWithGoogle, loginWithGitHub } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState(null);
  const [error, setError] = useState(null);

  // Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [targetRole, setTargetRole] = useState('Full Stack & AI Engineer');

  // Automatically handle GitHub OAuth code if redirected to the page
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const oauthError = params.get('error_description') || params.get('error');

    if (oauthError) {
      setError(`GitHub authorization error: ${oauthError}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      window.history.replaceState({}, document.title, window.location.pathname);

      // If in popup window created by triggerGitHubOAuth
      if (window.opener && window.opener !== window) {
        try {
          window.opener.postMessage({ type: 'GITHUB_OAUTH_CODE', code }, '*');
          window.close();
          return;
        } catch (e) {
          // fallback to direct login if opener unreachable
        }
      }

      setLoading(true);
      setOauthProvider('GitHub');
      loginWithGitHub(code)
        .then((res) => {
          if (!res.success) {
            setError(res.error || 'GitHub authentication failed.');
          }
        })
        .catch((err) => {
          setError(err.message || 'GitHub OAuth failed.');
        })
        .finally(() => {
          setLoading(false);
          setOauthProvider(null);
        });
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    setOauthProvider('Google');
    try {
      const { credential } = await triggerGoogleOAuth();
      const res = await loginWithGoogle(credential);
      if (!res.success) {
        setError(res.error || 'Google authentication failed.');
      }
    } catch (err) {
      setError(err.message || 'Google OAuth error.');
    } finally {
      setLoading(false);
      setOauthProvider(null);
    }
  };

  const handleGitHubSignIn = async () => {
    setError(null);
    setLoading(true);
    setOauthProvider('GitHub');
    try {
      const { code } = await triggerGitHubOAuth();
      const res = await loginWithGitHub(code);
      if (!res.success) {
        setError(res.error || 'GitHub authentication failed.');
      }
    } catch (err) {
      setError(err.message || 'GitHub OAuth error.');
    } finally {
      setLoading(false);
      setOauthProvider(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isSignup) {
      if (!username || !email || !password) {
        setError('Please fill in all required fields (Username, Email, and Password).');
        setLoading(false);
        return;
      }

      const res = await signup({
        username,
        email,
        password,
        full_name: fullName,
        target_role: targetRole,
      });

      if (!res.success) {
        setError(res.error || 'Registration failed. Please check your inputs.');
      }
    } else {
      if (!username || !password) {
        setError('Please enter your Username or Email and Password.');
        setLoading(false);
        return;
      }

      const res = await login({
        username,
        password,
      });

      if (!res.success) {
        setError(res.error || 'Invalid credentials. Please verify and try again.');
      }
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1rem',
        background: 'var(--color-background, #fafbff)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Soft decorative background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '15%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '15%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(249, 115, 22, 0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: isSignup ? '520px' : '460px',
          padding: '2.5rem 2.25rem',
          borderRadius: '24px',
          boxShadow: 'var(--shadow-card-elevated)',
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)',
          position: 'relative',
          zIndex: 10,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'inline-block', marginBottom: '0.85rem' }}>
            <VidhyaPramanLogo size={64} />
          </div>

          <h1
            className="font-brand"
            style={{
              fontSize: '1.9rem',
              fontWeight: 900,
              letterSpacing: '0.04em',
              color: 'var(--color-on-surface, #f4f4f5)',
              marginBottom: '0.35rem',
            }}
          >
            VIDHYA <span style={{ color: 'var(--color-secondary, #f97316)' }}>PRAMAN</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {isSignup
              ? 'Start your verified technical learning journey'
              : 'Sign in to access your learning roadmap and proctored studio'}
          </p>
        </div>

        {/* OAuth Fast Sign-In Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {/* GitHub OAuth Button */}
          <button
            type="button"
            onClick={handleGitHubSignIn}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              background: '#121216',
              color: '#f4f4f5',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
            }}
          >
            <Github size={18} color="#ffffff" />
            <span>{loading && oauthProvider === 'GitHub' ? 'Connecting to GitHub...' : 'Continue with Verified GitHub'}</span>
          </button>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              background: '#121216',
              color: '#f4f4f5',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading && oauthProvider === 'Google' ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>OR WITH EMAIL</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Toggle Tabs */}
        <div
          style={{
            display: 'flex',
            background: 'var(--color-surface-container-low, #f4f6fb)',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setIsSignup(false);
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '0.65rem',
              borderRadius: '9px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: !isSignup ? 700 : 600,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              background: !isSignup ? '#ffffff' : 'transparent',
              color: !isSignup ? 'var(--color-primary, #2563eb)' : 'var(--text-muted)',
              boxShadow: !isSignup ? '0 2px 6px rgba(0, 0, 0, 0.06)' : 'none',
              fontFamily: 'inherit',
            }}
          >
            <LogIn size={16} />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSignup(true);
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '0.65rem',
              borderRadius: '9px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: isSignup ? 700 : 600,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              background: isSignup ? '#ffffff' : 'transparent',
              color: isSignup ? 'var(--color-primary, #2563eb)' : 'var(--text-muted)',
              boxShadow: isSignup ? '0 2px 6px rgba(0, 0, 0, 0.06)' : 'none',
              fontFamily: 'inherit',
            }}
          >
            <UserPlus size={16} />
            <span>Create Account</span>
          </button>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div
            style={{
              padding: '0.85rem 1rem',
              background: 'var(--color-error-container, #fee2e2)',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              color: 'var(--color-on-error-container, #fca5a5)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              marginBottom: '1.25rem',
              fontWeight: 500,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Alex Mercer"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Target Role</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. AI Engineer"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <Briefcase size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                </div>
              </div>
            </div>
          )}

          {/* Username */}
          <div className="form-group">
            <label className="form-label">
              {isSignup ? 'Username *' : 'Username or Email *'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder={isSignup ? 'Choose a unique username' : 'Enter username or email'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
              <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            </div>
          </div>

          {/* Email (Signup Only) */}
          {isSignup && (
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="form-group" style={{ marginBottom: isSignup ? '1rem' : '1.5rem' }}>
            <label className="form-label">Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ paddingLeft: '2.5rem' }}
              />
              <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.85rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              borderRadius: '12px',
              marginBottom: '1rem',
            }}
          >
            {loading ? (
              <span>Connecting session...</span>
            ) : isSignup ? (
              <>
                <span>Create Learner Account</span>
                <ArrowRight size={16} />
              </>
            ) : (
              <>
                <LogIn size={16} />
                <span>Sign In to Learning Hub</span>
              </>
            )}
          </button>
        </form>

        {/* Security & Database Status Footer */}
        <div
          style={{
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={14} color="var(--color-tertiary, #16a34a)" />
            <span>JWT Session Auth</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Github size={14} color="var(--text-dim)" />
            <span>Verified OAuth Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
}
