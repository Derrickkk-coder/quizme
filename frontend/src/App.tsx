import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute, roleHomePath } from "./routes/ProtectedRoute";
import { StudentLayout, TeacherLayout, AdminLayout } from "./components/layout/RoleLayouts";
import { PageLoader } from "./components/ui/Spinner";

import LandingPage from "./pages/landing/LandingPage";
import LoginPage from "./pages/auth/LoginPage";

import StudentDashboard from "./pages/student/StudentDashboard";
import MyQuizzesPage from "./pages/student/MyQuizzesPage";
import QuizTakePage from "./pages/student/QuizTakePage";
import StudentResultsPage from "./pages/student/ResultsPage";
import StudentResultDetailPage from "./pages/student/ResultDetailPage";
import PerformancePage from "./pages/student/PerformancePage";
import HistoryPage from "./pages/student/HistoryPage";

import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherQuizzesPage from "./pages/teacher/QuizzesPage";
import QuizEditorPage from "./pages/teacher/QuizEditorPage";
import QuestionBankPage from "./pages/teacher/QuestionBankPage";
import TeacherStudentsPage from "./pages/teacher/StudentsPage";
import TeacherResultsPage from "./pages/teacher/ResultsPage";
import TeacherResultDetailPage from "./pages/teacher/ResultDetailPage";
import TeacherAnalyticsPage from "./pages/teacher/AnalyticsPage";
import StudentAnalyticsDetailPage from "./pages/teacher/StudentAnalyticsDetailPage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";
import ClassesPage from "./pages/admin/ClassesPage";
import SubjectsPage from "./pages/admin/SubjectsPage";
import AdminQuizzesPage from "./pages/admin/QuizzesPage";
import ReportsPage from "./pages/admin/ReportsPage";
import AdminAnalyticsPage from "./pages/admin/AnalyticsPage";
import AuditLogsPage from "./pages/admin/AuditLogsPage";
import SettingsPage from "./pages/admin/SettingsPage";

import NotificationsPage from "./pages/shared/NotificationsPage";
import ProfilePage from "./pages/shared/ProfilePage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15000 },
  },
});

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/" replace />;
  return <Navigate to={roleHomePath(user.role)} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/app" element={<RootRedirect />} />

              <Route element={<ProtectedRoute allow={["STUDENT"]} />}>
                <Route path="/app/student" element={<StudentLayout />}>
                  <Route index element={<StudentDashboard />} />
                  <Route path="quizzes" element={<MyQuizzesPage />} />
                  <Route path="quizzes/:quizId/take" element={<QuizTakePage />} />
                  <Route path="results" element={<StudentResultsPage />} />
                  <Route path="results/:attemptId" element={<StudentResultDetailPage />} />
                  <Route path="performance" element={<PerformancePage />} />
                  <Route path="history" element={<HistoryPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allow={["TEACHER"]} />}>
                <Route path="/app/teacher" element={<TeacherLayout />}>
                  <Route index element={<TeacherDashboard />} />
                  <Route path="quizzes" element={<TeacherQuizzesPage />} />
                  <Route path="quizzes/new" element={<QuizEditorPage />} />
                  <Route path="quizzes/:quizId/edit" element={<QuizEditorPage />} />
                  <Route path="questions" element={<QuestionBankPage />} />
                  <Route path="students" element={<TeacherStudentsPage />} />
                  <Route path="results" element={<TeacherResultsPage />} />
                  <Route path="results/:attemptId" element={<TeacherResultDetailPage />} />
                  <Route path="analytics" element={<TeacherAnalyticsPage />} />
                  <Route path="analytics/student/:studentId" element={<StudentAnalyticsDetailPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allow={["ADMIN"]} />}>
                <Route path="/app/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="classes" element={<ClassesPage />} />
                  <Route path="subjects" element={<SubjectsPage />} />
                  <Route path="quizzes" element={<AdminQuizzesPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="analytics" element={<AdminAnalyticsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="audit-logs" element={<AuditLogsPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
