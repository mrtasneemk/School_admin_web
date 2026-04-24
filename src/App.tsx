import { Navigate, Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { RequireAuth, RequireRole } from "./auth/RouteGuards";
import AppLayout from "./components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import AccountingPage from "./pages/AccountingPage";
import SecurityPage from "./pages/SecurityPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import GuardianHomePage from "./pages/guardians/GuardianHomePage";
import GuardianSearchPage from "./pages/guardians/GuardianSearchPage";
import GuardianAdmissionPage from "./pages/guardians/GuardianAdmissionPage";
import GuardianDetailPage from "./pages/guardians/GuardianDetailPage";
import EmployeesListPage from "./pages/employees/EmployeesListPage";
import EmployeeUpsertPage from "./pages/employees/EmployeeUpsertPage";
import EmployeeAssignmentsPage from "./pages/employees/EmployeeAssignmentsPage";
import AcademicHomePage from "./pages/academic/AcademicHomePage";
import AcademicSetupPage from "./pages/academic/AcademicSetupPage";
import AcademicTeachersPage from "./pages/academic/AcademicTeachersPage";
import AcademicTeacherManagePage from "./pages/academic/AcademicTeacherManagePage";
import AcademicResultsPage from "./pages/academic/AcademicResultsPage";
import AcademicTimetablePage from "./pages/academic/AcademicTimetablePage";

const routerBase = import.meta.env.BASE_URL.replace(/\/+$/, "") || "/";

function ProtectedLayout() {
  return (
    <RequireAuth>
      <AppLayout />
    </RequireAuth>
  );
}

function CatchAllRedirect() {
  const { token } = useAuth();
  return <Navigate to={token ? "/" : "/login"} replace />;
}

const router = createBrowserRouter(
  [
    { path: "/login", element: <LoginPage /> },
    {
      path: "/",
      element: <ProtectedLayout />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: "profile", element: <ProfilePage /> },
        { path: "change-password", element: <ChangePasswordPage /> },
        {
          path: "employees",
          element: (
            <RequireRole anyOf={["Administrator"]}>
              <EmployeesListPage />
            </RequireRole>
          )
        },
        {
          path: "employees/new",
          element: (
            <RequireRole anyOf={["Administrator"]}>
              <EmployeeUpsertPage />
            </RequireRole>
          )
        },
        {
          path: "employees/:empId/edit",
          element: (
            <RequireRole anyOf={["Administrator"]}>
              <EmployeeUpsertPage />
            </RequireRole>
          )
        },
        {
          path: "employees/:empId/assign",
          element: (
            <RequireRole anyOf={["Administrator"]}>
              <EmployeeAssignmentsPage />
            </RequireRole>
          )
        },
        {
          path: "academic",
          element: (
            <RequireRole anyOf={["Administrator", "Academic_Admin"]}>
              <AcademicHomePage />
            </RequireRole>
          )
        },
        {
          path: "academic/setup",
          element: (
            <RequireRole anyOf={["Administrator", "Academic_Admin"]}>
              <AcademicSetupPage />
            </RequireRole>
          )
        },
        {
          path: "academic/teachers",
          element: (
            <RequireRole anyOf={["Administrator", "Academic_Admin"]}>
              <AcademicTeachersPage />
            </RequireRole>
          )
        },
        {
          path: "academic/teachers/:empId",
          element: (
            <RequireRole anyOf={["Administrator", "Academic_Admin"]}>
              <AcademicTeacherManagePage />
            </RequireRole>
          )
        },
        {
          path: "academic/results",
          element: (
            <RequireRole anyOf={["Administrator", "Academic_Admin"]}>
              <AcademicResultsPage />
            </RequireRole>
          )
        },
        {
          path: "academic/timetable",
          element: (
            <RequireRole anyOf={["Administrator", "Academic_Admin"]}>
              <AcademicTimetablePage />
            </RequireRole>
          )
        },
        {
          path: "accounting",
          element: (
            <RequireRole anyOf={["Administrator"]}>
              <AccountingPage />
            </RequireRole>
          )
        },
        {
          path: "guardians",
          element: (
            <RequireRole anyOf={["Administrator"]}>
              <GuardianHomePage />
            </RequireRole>
          )
        },
        {
          path: "guardians/search",
          element: (
            <RequireRole anyOf={["Administrator"]}>
              <GuardianSearchPage />
            </RequireRole>
          )
        },
        {
          path: "guardians/admission",
          element: (
            <RequireRole anyOf={["Administrator"]}>
              <GuardianAdmissionPage />
            </RequireRole>
          )
        },
        {
          path: "guardians/:guardianId",
          element: (
            <RequireRole anyOf={["Administrator"]}>
              <GuardianDetailPage />
            </RequireRole>
          )
        },
        {
          path: "security",
          element: (
            <RequireRole anyOf={["Administrator"]}>
              <SecurityPage />
            </RequireRole>
          )
        },
        {
          path: "settings",
          element: (
            <RequireRole anyOf={["Administrator"]}>
              <SettingsPage />
            </RequireRole>
          )
        }
      ]
    },
    { path: "*", element: <CatchAllRedirect /> }
  ],
  { basename: routerBase }
);

export default function App() {
  return <RouterProvider router={router} />;
}
