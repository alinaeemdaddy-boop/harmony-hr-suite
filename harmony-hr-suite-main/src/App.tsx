import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";

import Onboarding from "./pages/Onboarding";
import Offboarding from "./pages/Offboarding";
import OffboardingCase from "./pages/OffboardingCase";
import OnboardingCase from "./pages/OnboardingCase";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import EmployeeForm from "./pages/EmployeeForm";
import EmployeeDetails from "./pages/EmployeeDetails";
import Departments from "./pages/Departments";
import Branches from "./pages/Branches";
import BranchDetails from "./pages/BranchDetails";
import Leave from "./pages/Leave";
import Payroll from "./pages/Payroll";
import Attendance from "./pages/Attendance";
import Roster from "./pages/Roster";
import Settings from "./pages/Settings";
import Workflow from "./pages/Workflow";
import Tasks from "./pages/Tasks";
import NotFound from "./pages/NotFound";
import Grievances from "./pages/Grievances";
import GrievanceForm from "./pages/GrievanceForm";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/onboarding/:caseId" element={<OnboardingCase />} />
              <Route path="/offboarding" element={<Offboarding />} />
              <Route path="/offboarding/:caseId" element={<OffboardingCase />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/employees/new" element={<EmployeeForm />} />
              <Route path="/employees/:id" element={<EmployeeDetails />} />
              <Route path="/employees/:id/edit" element={<EmployeeForm />} />
              <Route path="/departments" element={<Departments />} />
              <Route path="/branches" element={<Branches />} />
              <Route path="/branches/:id" element={<BranchDetails />} />
              <Route path="/leave" element={<Leave />} />
              <Route path="/payroll" element={<Payroll />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/roster" element={<Roster />} />
              <Route path="/workflow" element={<Workflow />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/grievances" element={<Grievances />} />
              <Route path="/grievances/new" element={<GrievanceForm />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;