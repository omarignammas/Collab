import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { isTauri } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { Window, getCurrentWindow } from '@tauri-apps/api/window';
import { onAction } from '@tauri-apps/plugin-notification';
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { AuthProvider } from './context/AuthContext';
import { FocusSessionProvider } from './context/FocusSessionContext';
import { ActivityTrackingProvider } from './context/ActivityTrackingContext';
import ProtectedRoute from './components/routes/ProtectedRoute';
import AdminRoute from './components/routes/AdminRoute';
import LandingPage from './pages/LandingPage';
import { ThemeProvider } from './components/theme/theme-provider';
import './App.css'
import { Toaster } from './components/ui/toaster';
import { useAuth } from './hooks/useAuth';

// In the desktop app there's no marketing funnel to land on, so skip straight past it —
// but only to login if there's no session yet. Once signed in once, every later launch
// should reopen straight into the app, not force the login screen again.
const DesktopEntryPage = () => {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/today' : '/login'} replace />;
};
const EntryPage = isTauri() ? DesktopEntryPage : LandingPage;

// Landing stays eager — it's the entry point Lighthouse/SEO cares about, and lazy-loading
// it would just add a chunk-fetch delay to the page that's already loading first. Everything
// past it (auth pages, and the whole authenticated app behind AppShell) is a separate chunk,
// so a first-time visitor to "/" never downloads Dashboard/Tasks/Focus Rooms/Admin code.
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const TermsOfUsePage = lazy(() => import('./pages/TermsOfUsePage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const AppShell = lazy(() => import('./components/layout/AppShell'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TodayPage = lazy(() => import('./pages/TodayPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const CoursesPage = lazy(() => import('./pages/CoursesPage'));
const CourseDetailPage = lazy(() => import('./pages/CourseDetailPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const FocusRoomsPage = lazy(() => import('./pages/FocusRoomsPage'));
const FocusRoomPage = lazy(() => import('./pages/FocusRoomPage'));
const NotesPage = lazy(() => import('./pages/NotesPage'));
const FriendsPage = lazy(() => import('./pages/FriendsPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const OverduePage = lazy(() => import('./pages/OverduePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const SummariesPage = lazy(() => import('./pages/SummariesPage'));
const SummaryDetailPage = lazy(() => import('./pages/SummaryDetailPage'));
const QuizTakePage = lazy(() => import('./pages/QuizTakePage'));
const WidgetPage = lazy(() => import('./pages/WidgetPage'));
const CirclesPage = lazy(() => import('./pages/CirclesPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));

const GLOBAL_ASSISTANT_SHORTCUTS = ['Control+Alt+C', 'Control+Alt+Space'];

const GlobalAssistantShortcut = () => {
  useEffect(() => {
    if (!isTauri() || getCurrentWindow().label !== 'main') return undefined;

    let mounted = true;
    const setup = async () => {
      try {
        const onAssistantShortcut = async (event) => {
          if (!mounted || event.state !== 'Pressed') return;
          const widget = await Window.getByLabel('widget');
          await widget?.show();
          await widget?.setFocus();
          await emit('assistant-hotkey');
        };

        const results = await Promise.allSettled(
          GLOBAL_ASSISTANT_SHORTCUTS.map((shortcut) => register(shortcut, onAssistantShortcut))
        );
        const registeredAny = results.some((result) => result.status === 'fulfilled');
        if (!registeredAny) {
          const firstError = results.find((result) => result.status === 'rejected')?.reason;
          throw firstError || new Error('No assistant shortcut could be registered');
        }
      } catch (error) {
        console.warn('Global assistant shortcut could not be registered:', error);
      }
    };
    setup();

    return () => {
      mounted = false;
      GLOBAL_ASSISTANT_SHORTCUTS.forEach((shortcut) => unregister(shortcut).catch(() => {}));
    };
  }, []);

  return null;
};

// Clicking a native notification banner should bring Collab back to the
// foreground and jump to whatever it was about, same as clicking it in the
// in-app bell. Only the main window registers this — the widget window loads
// the same bundle, and a second listener there would double-fire.
const NotificationClickHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isTauri() || getCurrentWindow().label !== 'main') return undefined;
    const listener = onAction((notification) => {
      const mainWindow = getCurrentWindow();
      mainWindow.show();
      mainWindow.setFocus();
      const link = notification.extra?.link;
      if (link) navigate(link);
    });
    return () => {
      listener.then((handle) => handle.unregister());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

function App() {
  return (

  <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <Toaster/>
    <Router>
      <AuthProvider>
        <ActivityTrackingProvider>
        <FocusSessionProvider>
        <NotificationClickHandler />
        <GlobalAssistantShortcut />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<EntryPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/terms" element={<TermsOfUsePage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/widget" element={<WidgetPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/today" element={<TodayPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:courseId" element={<CourseDetailPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/focus-rooms" element={<FocusRoomsPage />} />
              <Route path="/focus-rooms/:roomCode" element={<FocusRoomPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/circles" element={<CirclesPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/overdue" element={<OverduePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
              <Route path="/summaries" element={<SummariesPage />} />
              <Route path="/summaries/:summaryId" element={<SummaryDetailPage />} />
              <Route path="/quizzes/:quizId/take" element={<QuizTakePage />} />
            </Route>
          </Routes>
        </Suspense>
        </FocusSessionProvider>
        </ActivityTrackingProvider>
      </AuthProvider>
    </Router>
    </ThemeProvider>
  );
}

export default App;
