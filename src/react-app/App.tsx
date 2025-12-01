import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  Home,
  Reports,
  Projects,
  Dashboard,
  Login,
  Register,
  SubmitReport,
  ReportIncident,
  ReportVerified,
} from "@/pages";

function AppContent() {
  return (
    <Layout>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/submit" element={<SubmitReport />} />
        <Route path="/report" element={<ReportIncident />} />
        <Route path="/report-verified" element={<ReportVerified />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={[
                "field_officer",
                "planner",
                "admin",
                "super_admin",
                "stakeholder",
              ]}
            >
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute
              allowedRoles={["planner", "admin", "super_admin", "stakeholder"]}
            >
              <Projects />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <div className="flex h-full items-center justify-center p-8">
              <div className="text-center">
                <h1 className="mb-2 text-4xl font-bold">404</h1>
                <p className="text-gray-500">Page not found</p>
              </div>
            </div>
          }
        />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
