import  { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForgotPassword: () => void;
}

export default function AuthModal({ isOpen, onClose, onForgotPassword }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const {  } = useToast();

  const handleManagerLogin = () => {
    // Redirect to Replit Auth login
    window.location.href = "/api/login";
  };

  const handleGoogleAuth = () => {
    // Redirect to Replit Auth (which supports Google)
    window.location.href = "/api/login";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-gray-900">Get Started as Manager</DialogTitle>
        </DialogHeader>

        {/* Auth Tabs */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button 
            onClick={() => setActiveTab("login")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "login" 
                ? "bg-white text-primary shadow-sm" 
                : "text-gray-600 hover:text-gray-900"
            }`}
            data-testid="tab-sign-in"
          >
            Sign In
          </button>
          <button 
            onClick={() => setActiveTab("register")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "register" 
                ? "bg-white text-primary shadow-sm" 
                : "text-gray-600 hover:text-gray-900"
            }`}
            data-testid="tab-register"
          >
            Register
          </button>
        </div>

        {/* Login Form */}
        {activeTab === "login" && (
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-2">Email</Label>
                <Input 
                  id="login-email"
                  type="email" 
                  placeholder="manager@example.com" 
                  data-testid="input-login-email"
                />
              </div>
              <div>
                <Label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-2">Password</Label>
                <Input 
                  id="login-password"
                  type="password" 
                  placeholder="Enter your password"
                  data-testid="input-login-password"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" />
                  <Label htmlFor="remember" className="text-sm text-gray-600">Remember me</Label>
                </div>
                <button 
                  type="button" 
                  onClick={onForgotPassword}
                  className="text-sm text-primary hover:text-primary-dark"
                  data-testid="button-forgot-password"
                >
                  Forgot password?
                </button>
              </div>
              <Button 
                onClick={handleManagerLogin}
                className="w-full bg-primary text-white py-3 hover:bg-primary-dark transition-colors font-medium"
                data-testid="button-sign-in"
              >
                Sign In
              </Button>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>
              <Button 
                onClick={handleGoogleAuth}
                variant="outline"
                className="mt-4 w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                data-testid="button-google-signin"
              >
                <i className="fab fa-google mr-3 text-red-500"></i>
                Sign in with Google
              </Button>
            </div>
          </div>
        )}

        {/* Register Form */}
        {activeTab === "register" && (
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="register-name" className="block text-sm font-medium text-gray-700 mb-2">Full Name</Label>
                <Input 
                  id="register-name"
                  type="text" 
                  placeholder="John Doe"
                  data-testid="input-register-name"
                />
              </div>
              <div>
                <Label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-2">Email</Label>
                <Input 
                  id="register-email"
                  type="email" 
                  placeholder="manager@example.com"
                  data-testid="input-register-email"
                />
              </div>
              <div>
                <Label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-2">Password</Label>
                <Input 
                  id="register-password"
                  type="password" 
                  placeholder="Create a strong password"
                  data-testid="input-register-password"
                />
              </div>
              <div>
                <Label htmlFor="register-confirm" className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</Label>
                <Input 
                  id="register-confirm"
                  type="password" 
                  placeholder="Confirm your password"
                  data-testid="input-register-confirm"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="terms" />
                <Label htmlFor="terms" className="text-sm text-gray-600">I agree to the Terms of Service and Privacy Policy</Label>
              </div>
              <Button 
                onClick={handleManagerLogin}
                className="w-full bg-primary text-white py-3 hover:bg-primary-dark transition-colors font-medium"
                data-testid="button-create-account"
              >
                Create Account
              </Button>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>
              <Button 
                onClick={handleGoogleAuth}
                variant="outline"
                className="mt-4 w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                data-testid="button-google-signup"
              >
                <i className="fab fa-google mr-3 text-red-500"></i>
                Sign up with Google
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
