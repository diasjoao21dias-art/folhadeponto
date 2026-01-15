import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import EmployeeDashboard from "@/pages/dashboard";
import AdminDashboard from "@/pages/admin/dashboard";
import EmployeesPage from "@/pages/admin/employees";
import ImportPage from "@/pages/admin/import";
import SettingsPage from "@/pages/admin/settings";
import TimesheetPage from "@/pages/admin/timesheet";

function ProtectedRoute({ 
  component: Component, 
  adminOnly = false 
}: { 
  component: React.ComponentType; 
  adminOnly?: boolean; 
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/auth" component={LoginPage} />
      
      {/* Employee Routes */}
      <Route path="/dashboard">
        <ProtectedRoute component={EmployeeDashboard} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} adminOnly />
      </Route>
      <Route path="/admin/employees">
        <ProtectedRoute component={EmployeesPage} adminOnly />
      </Route>
      <Route path="/admin/import">
        <ProtectedRoute component={ImportPage} adminOnly />
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute component={SettingsPage} adminOnly />
      </Route>
      <Route path="/admin/timesheet">
        <ProtectedRoute component={TimesheetPage} adminOnly />
      </Route>

      {/* Root Redirect */}
      <Route path="/">
        {() => {
          const { user, isLoading } = useAuth();
          if (isLoading) return null;
          if (!user) return <Redirect to="/auth" />;
          return <Redirect to={user.role === "admin" ? "/admin" : "/dashboard"} />;
        }}
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
