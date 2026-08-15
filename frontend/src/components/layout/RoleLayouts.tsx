import { Outlet } from "react-router-dom";
import { DashboardLayout } from "./DashboardLayout";
import { adminNav, studentNav, teacherNav } from "./navConfig";

export function StudentLayout() {
  return (
    <DashboardLayout navItems={studentNav}>
      <Outlet />
    </DashboardLayout>
  );
}

export function TeacherLayout() {
  return (
    <DashboardLayout navItems={teacherNav}>
      <Outlet />
    </DashboardLayout>
  );
}

export function AdminLayout() {
  return (
    <DashboardLayout navItems={adminNav}>
      <Outlet />
    </DashboardLayout>
  );
}
