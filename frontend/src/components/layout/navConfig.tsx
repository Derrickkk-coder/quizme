import {
  LayoutDashboard,
  BookOpenCheck,
  BarChart3,
  History,
  Bell,
  User,
  ListChecks,
  PlusCircle,
  Library,
  Users,
  ClipboardList,
  GraduationCap,
  School,
  BookMarked,
  FileBarChart,
  ShieldCheck,
  Settings,
  MessageCircle,
  Trophy,
} from "lucide-react";
import { ComponentType } from "react";
import { Role } from "../../types";

export interface NavItem {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
}

export const studentNav: NavItem[] = [
  { label: "Dashboard", to: "/app/student", icon: LayoutDashboard, end: true },
  { label: "My Quizzes", to: "/app/student/quizzes", icon: BookOpenCheck },
  { label: "Results", to: "/app/student/results", icon: ListChecks },
  { label: "Performance", to: "/app/student/performance", icon: BarChart3 },
  { label: "Leaderboard", to: "/app/student/leaderboard", icon: Trophy },
  { label: "History", to: "/app/student/history", icon: History },
  { label: "Chat", to: "/app/student/chat", icon: MessageCircle },
  { label: "Notifications", to: "/app/student/notifications", icon: Bell },
  { label: "Profile", to: "/app/student/profile", icon: User },
];

export const teacherNav: NavItem[] = [
  { label: "Dashboard", to: "/app/teacher", icon: LayoutDashboard, end: true },
  { label: "Quizzes", to: "/app/teacher/quizzes", icon: BookOpenCheck },
  { label: "Create Quiz", to: "/app/teacher/quizzes/new", icon: PlusCircle },
  { label: "Question Bank", to: "/app/teacher/questions", icon: Library },
  { label: "Students", to: "/app/teacher/students", icon: Users },
  { label: "Chat", to: "/app/teacher/chat", icon: MessageCircle },
  { label: "Results", to: "/app/teacher/results", icon: ClipboardList },
  { label: "Analytics", to: "/app/teacher/analytics", icon: BarChart3 },
  { label: "Notifications", to: "/app/teacher/notifications", icon: Bell },
  { label: "Profile", to: "/app/teacher/profile", icon: User },
];

export const adminNav: NavItem[] = [
  { label: "Dashboard", to: "/app/admin", icon: LayoutDashboard, end: true },
  { label: "Users", to: "/app/admin/users", icon: Users, end: true },
  { label: "Students", to: "/app/admin/users?role=STUDENT", icon: GraduationCap },
  { label: "Teachers", to: "/app/admin/users?role=TEACHER", icon: School },
  { label: "Classes", to: "/app/admin/classes", icon: BookMarked },
  { label: "Subjects", to: "/app/admin/subjects", icon: Library },
  { label: "Quizzes", to: "/app/admin/quizzes", icon: BookOpenCheck },
  { label: "Reports", to: "/app/admin/reports", icon: FileBarChart },
  { label: "Analytics", to: "/app/admin/analytics", icon: BarChart3 },
  { label: "Notifications", to: "/app/admin/notifications", icon: Bell },
  { label: "Audit Logs", to: "/app/admin/audit-logs", icon: ShieldCheck },
  { label: "Settings", to: "/app/admin/settings", icon: Settings },
];

export function navForRole(role: Role): NavItem[] {
  if (role === "STUDENT") return studentNav;
  if (role === "TEACHER") return teacherNav;
  return adminNav;
}
