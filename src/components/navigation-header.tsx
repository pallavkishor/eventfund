import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface NavigationHeaderProps {
  userRole: "manager" | "contributor";
  userName?: string;
  eventCode?: string;
}

export function NavigationHeader({ userRole, userName, eventCode }: NavigationHeaderProps) {
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Logout failed",
        variant: "destructive",
      });
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-primary">EventFund</h1>
            </div>
            {eventCode && (
              <div className="hidden md:block ml-8">
                <span className="text-sm text-muted">
                  Event Code:{" "}
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-primary">
                    {eventCode}
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {userRole === "manager" && userName ? (
              <div className="hidden md:flex items-center space-x-2">
                <span className="text-sm text-muted">Welcome, {userName}</span>
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {getInitials(userName)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-sign-out-alt"></i>
                  )}
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center">
                <span className="text-sm text-muted">Contributors Dashboard</span>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = "/"}
            >
              <i className="fas fa-home"></i>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}