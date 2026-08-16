import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./lib/env";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth.routes";
import notificationRoutes from "./routes/notifications.routes";

import adminUsersRoutes from "./routes/admin.users.routes";
import adminClassesRoutes from "./routes/admin.classes.routes";
import adminSubjectsRoutes from "./routes/admin.subjects.routes";
import adminSettingsRoutes from "./routes/admin.settings.routes";
import adminAuditRoutes from "./routes/admin.audit.routes";
import adminDashboardRoutes from "./routes/admin.dashboard.routes";
import adminReportsRoutes from "./routes/admin.reports.routes";
import adminQuizzesRoutes from "./routes/admin.quizzes.routes";

import teacherQuestionsRoutes from "./routes/teacher.questions.routes";
import teacherQuizzesRoutes from "./routes/teacher.quizzes.routes";
import teacherResultsRoutes from "./routes/teacher.results.routes";
import teacherAnalyticsRoutes from "./routes/teacher.analytics.routes";
import teacherMetaRoutes from "./routes/teacher.meta.routes";
import teacherAiRoutes from "./routes/teacher.ai.routes";

import studentQuizzesRoutes from "./routes/student.quizzes.routes";
import studentAttemptsRoutes from "./routes/student.attempts.routes";
import studentPerformanceRoutes from "./routes/student.performance.routes";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);

app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/classes", adminClassesRoutes);
app.use("/api/admin/subjects", adminSubjectsRoutes);
app.use("/api/admin/settings", adminSettingsRoutes);
app.use("/api/admin/audit-logs", adminAuditRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/reports", adminReportsRoutes);
app.use("/api/admin/quizzes", adminQuizzesRoutes);

app.use("/api/teacher/questions", teacherQuestionsRoutes);
app.use("/api/teacher/quizzes", teacherQuizzesRoutes);
app.use("/api/teacher/results", teacherResultsRoutes);
app.use("/api/teacher/analytics", teacherAnalyticsRoutes);
app.use("/api/teacher/ai", teacherAiRoutes);
app.use("/api/teacher", teacherMetaRoutes);

app.use("/api/student/quizzes", studentQuizzesRoutes);
app.use("/api/student/attempts", studentAttemptsRoutes);
app.use("/api/student/performance", studentPerformanceRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`QUIZME API listening on http://localhost:${env.port}`);
});
