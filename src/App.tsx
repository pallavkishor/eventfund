import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import Landing from "@/pages/landing";
import ManagerDashboard from "@/pages/manager-dashboard";
import ContributorView from "@/pages/contributor-view";
import ManagerLogin from "@/pages/manager-login";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import NotFound from "@/pages/not-found";
import Footer from "@/pages/footer";


function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={user ? ManagerDashboard : Landing} />
      <Route path="/login">
        {() => <ManagerLogin />}
      </Route>
      <Route path="/event/:accessCode" component={ContributorView} />
      <Route path="/invite/:token">
        {(params) => <ManagerLogin inviteToken={params.token} />}
      </Route>
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route  component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex min-h-screen flex-col">
          <main className="flex-grow">
            <Toaster />
            <Router />
          </main>
          <Footer />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
