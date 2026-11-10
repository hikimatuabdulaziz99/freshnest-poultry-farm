import { useState, useMemo } from 'react';
import { Egg, Bird } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout.jsx';
import { AdminRegister } from '../components/auth/AdminRegister.jsx';
import { AdminLogin } from '../components/auth/AdminLogin.jsx';
import { AdminProfileModal } from '../components/auth/AdminProfileModal.jsx';
import { HomePage } from '../pages/HomePage.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useDatabaseStatus } from '../hooks/useDatabaseStatus.js';
import { APP_MODULES, APP_INFO } from '../utils/constants.js';
import { MODULE_REGISTRY } from '../modules/index.js';
import styles from './App.module.css';

export default function App() {
  const [activeModuleId, setActiveModuleId] = useState('dashboard');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [unauthViewMode, setUnauthViewMode] = useState('home'); // 'home' | 'login' | 'register'

  const auth = useAuth();
  const dbStatus = useDatabaseStatus();

  // Active module configuration object
  const activeModule = useMemo(() => {
    return APP_MODULES.find((m) => m.id === activeModuleId) || APP_MODULES[0];
  }, [activeModuleId]);

  // Resolve component from registry
  const ActiveComponent = MODULE_REGISTRY[activeModuleId] || MODULE_REGISTRY.dashboard;

  // 1. Initializing State: checking local IndexedDB for admin and session tokens
  if (auth.isInitializing) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingLogoBox}>
          <Egg size={28} />
          <Bird size={18} style={{ position: 'absolute', bottom: 6, right: 6, color: '#D8F3DC' }} />
        </div>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>Initializing {APP_INFO.name}...</span>
        <span className={styles.loadingSubtext}>Verifying local IndexedDB security credentials</span>
      </div>
    );
  }

  // 2. Unauthenticated Public Flow: Landing Page, Login, or Initial Registration
  if (!auth.isAuthenticated) {
    // A. Public Landing Page
    if (unauthViewMode === 'home') {
      return (
        <HomePage
          onLogin={() => setUnauthViewMode(auth.hasAdmin ? 'login' : 'register')}
          onGetStarted={() => setUnauthViewMode(auth.hasAdmin ? 'login' : 'register')}
        />
      );
    }

    // B. Initial Admin Registration (or switch to register)
    if (!auth.hasAdmin || unauthViewMode === 'register') {
      return (
        <AdminRegister
          onRegisterSuccess={auth.registerInitialAdmin}
          onSwitchToLogin={auth.hasAdmin ? () => setUnauthViewMode('login') : null}
          onBackToHome={() => setUnauthViewMode('home')}
        />
      );
    }

    // C. Administrator Login Form
    return (
      <AdminLogin
        onLoginSuccess={auth.login}
        onSwitchToRegister={!auth.hasAdmin ? () => setUnauthViewMode('register') : null}
        onBackToHome={() => setUnauthViewMode('home')}
      />
    );
  }

  // 3. Authenticated: Full access to protected Farm Management System
  const handleLogout = () => {
    auth.logout();
    setUnauthViewMode('home');
  };

  return (
    <>
      <AppLayout
        activeModule={activeModule}
        activeModuleId={activeModuleId}
        onSelectModule={setActiveModuleId}
        dbStatus={dbStatus}
        onRefreshDb={dbStatus.refreshStatus}
        admin={auth.admin}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
      >
        <ActiveComponent
          module={activeModule}
          dbStatus={dbStatus}
          onSelectModule={setActiveModuleId}
          onNavigateToDashboard={() => setActiveModuleId('dashboard')}
          onRefreshDb={dbStatus.refreshStatus}
        />
      </AppLayout>

      {/* Administrator Profile & Password Management Modal */}
      <AdminProfileModal
        admin={auth.admin}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdateProfile={auth.updateProfile}
        onChangePassword={auth.changePassword}
        onLogout={() => {
          setIsProfileModalOpen(false);
          handleLogout();
        }}
      />
    </>
  );
}
