
import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function InvitationHandler() {
  const [, params] = useRoute("/invite/:token");
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [invitationStatus, setInvitationStatus] = useState<"loading" | "success" | "error" | "expired">("loading");

  const acceptInvitationMutation = useMutation({
    mutationFn: async (token: string) => {
      await apiRequest("POST", `/api/invitations/${token}/accept`, {});
    },
    onSuccess: () => {
      setInvitationStatus("success");
      toast({
        title: "Success",
        description: "Co-manager invitation accepted successfully",
      });
      setTimeout(() => {
        setLocation("/dashboard");
      }, 2000);
    },
    onError: () => {
      setInvitationStatus("error");
      toast({
        title: "Error",
        description: "Failed to accept invitation. The link may be expired or invalid.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!params?.token) {
      setInvitationStatus("error");
      return;
    }

    // If user is not authenticated, redirect to login first
    if (!authLoading && !user) {
      // Store the invitation token for after login
      sessionStorage.setItem('pendingInvitation', params.token);
      window.location.href = "/api/login";
      return;
    }

    // If user is authenticated, accept the invitation
    if (user && params.token) {
      acceptInvitationMutation.mutate(params.token);
    }
  }, [user, authLoading, params?.token]);

  // Check for pending invitation after login
  useEffect(() => {
    if (user) {
      const pendingToken = sessionStorage.getItem('pendingInvitation');
      if (pendingToken) {
        sessionStorage.removeItem('pendingInvitation');
        acceptInvitationMutation.mutate(pendingToken);
      }
    }
  }, [user]);

  const handleGoToDashboard = () => {
    setLocation("/dashboard");
  };

  const handleGoHome = () => {
    setLocation("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {invitationStatus === "loading" && (
            <>
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Invitation</h2>
              <p className="text-gray-600">Please wait while we process your co-manager invitation...</p>
            </>
          )}

          {invitationStatus === "success" && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-check text-2xl text-green-600"></i>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Invitation Accepted!</h2>
              <p className="text-gray-600 mb-6">
                You are now a co-manager for this event. You'll be redirected to your dashboard shortly.
              </p>
              <Button onClick={handleGoToDashboard} className="w-full">
                Go to Dashboard
              </Button>
            </>
          )}

          {invitationStatus === "error" && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-2xl text-red-600"></i>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
              <p className="text-gray-600 mb-6">
                This invitation link is invalid or has expired. Please contact the event organizer for a new invitation.
              </p>
              <Button onClick={handleGoHome} variant="outline" className="w-full">
                Go to Home
              </Button>
            </>
          )}

          {invitationStatus === "expired" && (
            <>
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-clock text-2xl text-amber-600"></i>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Invitation Expired</h2>
              <p className="text-gray-600 mb-6">
                This invitation link has expired. Please contact the event organizer for a new invitation.
              </p>
              <Button onClick={handleGoHome} variant="outline" className="w-full">
                Go to Home
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
