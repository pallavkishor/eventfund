import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToSignIn: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose, onBackToSignIn }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest("POST", "/api/auth/forgot-password", { email });
    },
    onSuccess: () => {
      setIsSuccess(true);
      toast({
        title: "Success",
        description: "Password reset email sent successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      forgotPasswordMutation.mutate(email.trim());
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setEmail("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-900">Reset Password</DialogTitle>
        </DialogHeader>

        {!isSuccess ? (
          <div>
            <p className="text-gray-600 mb-6">Enter your email address and we'll send you a link to reset your password.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</Label>
                <Input 
                  id="reset-email"
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@example.com" 
                  required
                  data-testid="input-reset-email"
                />
              </div>
              <Button 
                type="submit"
                disabled={forgotPasswordMutation.isPending}
                className="w-full bg-primary text-white py-3 hover:bg-primary-dark transition-colors font-medium"
                data-testid="button-send-reset"
              >
                {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button 
                onClick={onBackToSignIn}
                className="text-sm text-primary hover:text-primary-dark"
                data-testid="button-back-signin"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-check text-2xl text-green-600"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Check Your Email</h3>
            <p className="text-gray-600 mb-6">We've sent a password reset link to your email address. Please check your inbox and follow the instructions.</p>
            <Button 
              onClick={handleClose}
              className="text-primary hover:text-primary-dark font-medium"
              variant="ghost"
              data-testid="button-close-success"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
