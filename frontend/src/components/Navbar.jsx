import React, { useState } from 'react';
import {
  User,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import VidhyaPramanLogo from './VidhyaPramanLogo';
import { useAuth } from '../context/AuthContext';
import ProfileModal from './ProfileModal';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <>
      <header
        className="glass-card"
        style={{
          borderRadius: 0,
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          padding: '0.75rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'var(--color-surface, #ffffff)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {/* Left Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <VidhyaPramanLogo size={36} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                className="font-brand"
                style={{
                  fontWeight: 900,
                  fontSize: '1.25rem',
                  letterSpacing: '0.04em',
                  color: 'var(--color-on-surface, #1e293b)',
                }}
              >
                VIDHYA <span style={{ color: 'var(--color-secondary, #f97316)' }}>PRAMAN</span>
              </span>
              <span className="badge badge-orange" style={{ fontSize: '0.68rem' }}>Learner Hub</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Intelligent Learning Platform & Credential Verification
            </p>
          </div>
        </div>

        {/* Right Navigation & User Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* User Profile Chip */}
          {user && (
            <div
              onClick={() => setShowProfileModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.35rem 0.85rem 0.35rem 0.45rem',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-surface-container-low, #f8fafc)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title="Click to view/edit profile and GitHub sync"
            >
              <img
                src={user.avatar_url || user.github_avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=2563eb&color=fff`}
                alt={user.username}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1.5px solid var(--color-primary, #2563eb)',
                }}
              />
              <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-on-surface, #1e293b)', display: 'block' }}>
                  {user.full_name || user.username}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {user.github_username ? `@${user.github_username}` : user.target_role || 'Learner'}
                </span>
              </div>
              <ChevronDown size={14} color="var(--text-muted)" />
            </div>
          )}

          {/* Logout Button */}
          {user && (
            <button
              className="btn btn-secondary"
              style={{
                padding: '0.45rem 0.75rem',
                fontSize: '0.8rem',
                color: 'var(--color-error, #dc2626)',
                borderColor: 'var(--color-error-container, #fee2e2)',
                background: 'var(--color-error-container, #fee2e2)',
              }}
              onClick={logout}
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </header>

      {/* Profile Editor Modal */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </>
  );
}
