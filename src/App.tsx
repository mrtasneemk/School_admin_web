import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { RequireAuth, RequireRole } from "./auth/RouteGuards";
import AppLayout from "./components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import AcademicAdminPage from "./pages/AcademicAdminPage";
import AccountingPage from "./pages/AccountingPage";
import SecurityPage from "./pages/SecurityPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import EmployeesListPage from "./pages/employees/EmployeesListPage";
import EmployeeUpsertPage from "./pages/employees/EmployeeUpsertPage";
import EmployeeAssignmentsPage from "./pages/employees/EmployeeAssignmentsPage";

export default function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="change-password" element={<ChangePasswordPage />} />
        <Route
          path="employees"
          element={
            <RequireRole anyOf={["Administrator"]}>
              <EmployeesListPage />
            </RequireRole>
          }
        />
        <Route
          path="employees/new"
          element={
            <RequireRole anyOf={["Administrator"]}>
              <EmployeeUpsertPage />
            </RequireRole>
          }
        />
        <Route
          path="employees/:empId/edit"
          element={
            <RequireRole anyOf={["Administrator"]}>
              <EmployeeUpsertPage />
            </RequireRole>
          }
        />
        <Route
          path="employees/:empId/assign"
          element={
            <RequireRole anyOf={["Administrator"]}>
              <EmployeeAssignmentsPage />
            </RequireRole>
          }
        />
        <Route
          path="academic"
          element={
            <RequireRole anyOf={["Administrator", "Academic_Admin"]}>
              <AcademicAdminPage />
            </RequireRole>
          }
        />
        <Route
          path="accounting"
          element={
            <RequireRole anyOf={["Administrator"]}>
              <AccountingPage />
            </RequireRole>
          }
        />
        <Route
          path="security"
          element={
            <RequireRole anyOf={["Administrator"]}>
              <SecurityPage />
            </RequireRole>
          }
        />
        <Route
          path="settings"
          element={
            <RequireRole anyOf={["Administrator"]}>
              <SettingsPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={token ? "/" : "/login"} replace />} />
    </Routes>
  );
}
