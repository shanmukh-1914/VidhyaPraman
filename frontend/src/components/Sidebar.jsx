import React from 'react';
import {
  LayoutDashboard,
  UserCheck,
  ShieldCheck,
  TrendingUp,
  Award,
  BookOpen,
  Database,
  BotMessageSquare,
  FileText,
  ScanText,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

import VidhyaPramanLogo from './VidhyaPramanLogo';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard & Progress', icon: LayoutDashboard, category: 'Core' },
  { id: 'learning-plan', label: 'Learning Roadmap', icon: TrendingUp, category: 'Learning' },
  { id: 'modules', label: 'Curriculum & Content Library', icon: BookOpen, category: 'Learning' },
  { id: 'assessment', label: 'Proctored Exam Studio', icon: ShieldCheck, category: 'Evaluation' },
  { id: 'onboarding', label: 'Skill Intake & Diagnostics', icon: Sparkles, category: 'Onboarding' },
  { id: 'tutoring', label: '1:1 AI Mentor & Notes', icon: BotMessageSquare, category: 'Learning' },
  { id: 'skill-confidence', label: 'Skill Analytics & Evidence', icon: Award, category: 'Analytics' },
  { id: 'rag', label: 'Knowledge Assistant', icon: Database, category: 'Memory' },
  { id: 'identity', label: 'Identity Verification', icon: UserCheck, category: 'Security' },
  { id: 'documents', label: 'Verified Resume & LOR', icon: FileText, category: 'Career' },
  { id: 'certificate', label: 'Certificate Scanner', icon: ScanText, category: 'Credentials' },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside
      style={{
        width: '260px',
        background: 'var(--color-surface-container-lowest, #ffffff)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          padding: '1.25rem 1.25rem 0.85rem',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <VidhyaPramanLogo size={28} />
          <div>
            <div
              className="font-brand"
              style={{
                fontSize: '0.95rem',
                fontWeight: 900,
                letterSpacing: '0.04em',
                color: 'var(--color-on-surface, #1e293b)',
                lineHeight: 1.1,
              }}
            >
              VIDHYA <span style={{ color: 'var(--color-secondary, #f97316)' }}>PRAMAN</span>
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Learning & Career Hub
            </span>
          </div>
        </div>
      </div>

      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.75rem 0.6rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.2rem',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.6rem 0.8rem',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--color-primary-fixed, #dbeafe)' : 'transparent',
                border: isActive ? '1px solid var(--color-primary-fixed-dim, #93c5fd)' : '1px solid transparent',
                color: isActive ? 'var(--color-on-primary-fixed, #1e3a8a)' : 'var(--text-muted)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--color-surface-container-low, #f4f6fb)';
                  e.currentTarget.style.color = 'var(--color-on-surface, #1e293b)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
                <div
                  style={{
                    color: isActive ? 'var(--color-primary, #2563eb)' : 'var(--text-dim)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Icon size={17} />
                </div>
                <div
                  style={{
                    fontSize: '0.84rem',
                    fontWeight: isActive ? 700 : 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.label}
                </div>
              </div>

              {isActive && <ChevronRight size={13} color="var(--color-primary, #2563eb)" />}
            </button>
          );
        })}
      </nav>

      <div
        style={{
          padding: '0.85rem 1rem',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--color-surface-container-low, #f4f6fb)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
          }}
        >
          <span className="font-brand" style={{ fontWeight: 700, color: 'var(--color-on-surface, #1e293b)' }}>Vidhya Praman</span>
          <span>Verified Platform</span>
        </div>
      </div>
    </aside>
  );
}
