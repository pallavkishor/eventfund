import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient.ts";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { useAuth } from "@/hooks/useAuth.ts";
import Landing from "./pages/Landing.tsx";
import Home from "./pages/Home.tsx";
import EventDetails from "./pages/EventDeatils.tsx";
import ContributorEvent from "./pages/ContributorEvent.tsx";
import NotFound from "./pages/not-found.tsx";
import InvitationHandler from "./pages/InvitationHandler.tsx";

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