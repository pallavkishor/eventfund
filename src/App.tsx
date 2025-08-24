import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import EventDetails from "./pages/EventDeatils";
import ContributorEvent from "./pages/ContributorEvent";
import NotFound from "./pages/not-found";
import InvitationHandler from "./pages/InvitationHandler";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/invite/:token" component={InvitationHandler} />
          <Route path="/event/:code" component={ContributorEvent} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/events/:id" component={EventDetails} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;