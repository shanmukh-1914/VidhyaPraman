import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import IdentityCheck from './views/IdentityCheck';
import ProctoringStudio from './views/ProctoringStudio';
import SkillConfidence from './views/SkillConfidence';
import AssessmentStudio from './views/AssessmentStudio';
import LearningPlan from './views/LearningPlan';
import RAGStudio from './views/RAGStudio';
import TutorStudio from './views/TutorStudio';
import DocumentStudio from './views/DocumentStudio';
import CertificateOCR from './views/CertificateOCR';
import OnboardingStudio from './views/OnboardingStudio';
import ModuleStudio from './views/ModuleStudio';
import AuthPortal from './views/AuthPortal';
import VidhyaPramanLogo from './components/VidhyaPramanLogo';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';

const VALID_TABS = [
  'dashboard',
  'onboarding',
  'modules',
  'learning-plan',
  'assessment',
  'skill-confidence',
  'tutoring',
  'rag',
  'identity',
  'documents',
  'certificate',
  'proctoring',
];

function MainApp() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Restore active tab from URL hash or localStorage or fallback to dashboard
  const [activeTab, setActiveTabState] = useState(() => {
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (hash && VALID_TABS.includes(hash)) {
      return hash;
    }
    const saved = localStorage.getItem('vidhyapraman_active_tab');
    if (saved && VALID_TABS.includes(saved)) {
      return saved;
    }
    return 'dashboard';
  });

  const [isOnline, setIsOnline] = useState(false);

  // Synchronize tab state with localStorage and URL hash
  const setActiveTab = (tabId) => {
    if (!VALID_TABS.includes(tabId)) return;
    setActiveTabState(tabId);
    localStorage.setItem('vidhyapraman_active_tab', tabId);
    if (window.location.hash.replace(/^#\/?/, '') !== tabId) {
      window.location.hash = `#${tabId}`;
    }
  };

  // Listen to hash changes (back/forward or direct link)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash && VALID_TABS.includes(hash) && hash !== activeTab) {
        setActiveTabState(hash);
        localStorage.setItem('vidhyapraman_active_tab', hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  // Keep localStorage and initial hash in sync on mount
  useEffect(() => {
    localStorage.setItem('vidhyapraman_active_tab', activeTab);
    if (!window.location.hash || window.location.hash === '#') {
      window.history.replaceState(null, '', `#${activeTab}`);
    }
  }, []);

  const checkHealth = async () => {
    try {
      const res = await api.checkHealth();
      if (res && res.status === 'healthy') {
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch (e) {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-background, #09090b)',
          color: 'var(--color-on-background, #f4f4f5)',
          gap: '1.25rem',
        }}
      >
        <VidhyaPramanLogo size={72} />
        <div style={{ textAlign: 'center' }}>
          <h2
            className="font-brand"
            style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              letterSpacing: '0.04em',
              color: 'var(--color-on-background, #f4f4f5)',
              marginBottom: '0.25rem',
            }}
          >
            VIDHYA <span style={{ color: 'var(--color-secondary, #f97316)' }}>PRAMAN</span>
          </h2>
          <p style={{ color: 'var(--text-muted, #a1a1aa)', fontSize: '0.85rem', fontWeight: 500 }}>
            Initializing secure learning platform & cloud session...
          </p>
        </div>
      </div>
    );
  }

  // If not logged in, render the Auth Portal
  if (!isAuthenticated) {
    return <AuthPortal />;
  }

  return (
    <div className="app-container bg-zinc-950 text-zinc-100 min-h-screen">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area with Real-Time Keep-Alive Persistence */}
      <div className="main-content bg-zinc-950 text-zinc-100">
        <Navbar />
        <main style={{ position: 'relative', width: '100%', minHeight: 'calc(100vh - 70px)' }}>
          <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
            <Dashboard setActiveTab={setActiveTab} />
          </div>
          <div style={{ display: activeTab === 'onboarding' ? 'block' : 'none' }}>
            <OnboardingStudio />
          </div>
          <div style={{ display: activeTab === 'modules' ? 'block' : 'none' }}>
            <ModuleStudio />
          </div>
          <div style={{ display: activeTab === 'learning-plan' ? 'block' : 'none' }}>
            <LearningPlan setActiveTab={setActiveTab} />
          </div>
          <div style={{ display: activeTab === 'assessment' ? 'block' : 'none' }}>
            <AssessmentStudio />
          </div>
          <div style={{ display: activeTab === 'skill-confidence' ? 'block' : 'none' }}>
            <SkillConfidence />
          </div>
          <div style={{ display: activeTab === 'tutoring' ? 'block' : 'none' }}>
            <TutorStudio />
          </div>
          <div style={{ display: activeTab === 'rag' ? 'block' : 'none' }}>
            <RAGStudio />
          </div>
          <div style={{ display: activeTab === 'identity' ? 'block' : 'none' }}>
            <IdentityCheck />
          </div>
          <div style={{ display: activeTab === 'documents' ? 'block' : 'none' }}>
            <DocumentStudio />
          </div>
          <div style={{ display: activeTab === 'certificate' ? 'block' : 'none' }}>
            <CertificateOCR />
          </div>
          <div style={{ display: activeTab === 'proctoring' ? 'block' : 'none' }}>
            <ProctoringStudio />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
