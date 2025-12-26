import { Suspense, lazy } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { SolanaProvider } from './providers/SolanaProvider';
import { BottomNav } from './components/ui/BottomNav';
import { useWalletStore } from './stores/walletStore';
import { XPGainNotification, AchievementPopup } from './components/gamification';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastContainer } from './components/ui/Toast';
import { NetworkStatus } from './components/ui/NetworkStatus';
import { DisclaimerModal } from './components/modals/DisclaimerModal';
import { useSessionTimeout } from './hooks/useSessionTimeout';

// Onboarding pages (not lazy - critical path)
import WelcomePage from './pages/onboarding/index';
import CreateWalletPage from './pages/onboarding/create';
import ImportWalletPage from './pages/onboarding/import';
import ConnectWalletPage from './pages/onboarding/connect';

// Main app pages - lazy loaded
const HomePage = lazy(() => import('./pages/Home'));
const AssetsPage = lazy(() => import('./pages/Assets'));
const SwapPage = lazy(() => import('./pages/Swap'));
const AchievementsPage = lazy(() => import('./pages/Achievements'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const ActivityPage = lazy(() => import('./pages/Activity'));

// Loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-solana-green border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Auth guard component
function RequireWallet({ children }: { children: React.ReactNode }) {
  const { publicKey } = useWalletStore();

  if (!publicKey) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

// Redirect if already has wallet
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { publicKey } = useWalletStore();

  if (publicKey) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Session timeout wrapper
function SessionManager({ children }: { children: React.ReactNode }) {
  useSessionTimeout();
  return <>{children}</>;
}

export default function App() {
  const location = useLocation();
  const isOnboarding = location.pathname.startsWith('/onboarding');

  return (
    <ErrorBoundary>
      <SolanaProvider>
        <SessionManager>
          <div className="min-h-screen bg-bg-primary">
            {/* Global UI */}
            <NetworkStatus />
            <DisclaimerModal />
            <XPGainNotification />
            <AchievementPopup />
            <ToastContainer />

            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Onboarding routes */}
                <Route
                  path="/onboarding"
                  element={
                    <OnboardingGuard>
                      <WelcomePage />
                    </OnboardingGuard>
                  }
                />
                <Route
                  path="/onboarding/create"
                  element={
                    <OnboardingGuard>
                      <CreateWalletPage />
                    </OnboardingGuard>
                  }
                />
                <Route
                  path="/onboarding/import"
                  element={
                    <OnboardingGuard>
                      <ImportWalletPage />
                    </OnboardingGuard>
                  }
                />
                <Route
                  path="/onboarding/connect"
                  element={
                    <OnboardingGuard>
                      <ConnectWalletPage />
                    </OnboardingGuard>
                  }
                />

                {/* Main app routes (protected) */}
                <Route
                  path="/"
                  element={
                    <RequireWallet>
                      <HomePage />
                    </RequireWallet>
                  }
                />
                <Route
                  path="/assets"
                  element={
                    <RequireWallet>
                      <AssetsPage />
                    </RequireWallet>
                  }
                />
                <Route
                  path="/swap"
                  element={
                    <RequireWallet>
                      <SwapPage />
                    </RequireWallet>
                  }
                />
                <Route
                  path="/activity"
                  element={
                    <RequireWallet>
                      <ActivityPage />
                    </RequireWallet>
                  }
                />
                <Route
                  path="/achievements"
                  element={
                    <RequireWallet>
                      <AchievementsPage />
                    </RequireWallet>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <RequireWallet>
                      <SettingsPage />
                    </RequireWallet>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>

            {/* Bottom navigation (only on main app) */}
            {!isOnboarding && <BottomNav />}
          </div>
        </SessionManager>
      </SolanaProvider>
    </ErrorBoundary>
  );
}
