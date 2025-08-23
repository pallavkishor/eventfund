import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [accessCode, setAccessCode] = useState("");
  const { toast } = useToast();

  const handleJoinEvent = () => {
    if (!accessCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter an event code",
        variant: "destructive",
      });
      return;
    }
    setLocation(`/event/${accessCode.trim().toUpperCase()}`);
  };

  const handleManagerLogin = () => {
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Hero Section */}
      <div className="relative pt-16 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Transparent Event
              <span className="text-primary"> Funding</span>
            </h1>
            <p className="text-xl text-muted mb-8 max-w-3xl mx-auto">
              Build trust with contributors through complete transparency. Track contributions, manage expenses, and show exactly how every penny is used.
            </p>
            
            {/* Role Selection Cards */}
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-16">
              {/* Event Manager Card */}
              <Card className="shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <i className="fas fa-users-cog text-2xl text-primary"></i>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">Event Manager</h3>
                  <p className="text-muted mb-6">Create events, manage contributions, track expenses, and invite co-managers.</p>
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center text-sm text-muted">
                      <i className="fas fa-check text-secondary mr-2"></i>
                      Create and manage multiple events
                    </div>
                    <div className="flex items-center text-sm text-muted">
                      <i className="fas fa-check text-secondary mr-2"></i>
                      Verify and approve contributions
                    </div>
                    <div className="flex items-center text-sm text-muted">
                      <i className="fas fa-check text-secondary mr-2"></i>
                      Track expenses and generate reports
                    </div>
                    <div className="flex items-center text-sm text-muted">
                      <i className="fas fa-check text-secondary mr-2"></i>
                      Invite co-managers with secure links
                    </div>
                  </div>
                  <Button onClick={handleManagerLogin} className="w-full">
                    Get Started as Manager
                  </Button>
                </CardContent>
              </Card>

              {/* Contributor Card */}
              <Card className="shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-secondary/10 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <i className="fas fa-hand-holding-heart text-2xl text-secondary"></i>
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">Contributor</h3>
                  <p className="text-muted mb-6">Join events with access codes and track how your contributions are used.</p>
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center text-sm text-muted">
                      <i className="fas fa-check text-secondary mr-2"></i>
                      No registration required
                    </div>
                    <div className="flex items-center text-sm text-muted">
                      <i className="fas fa-check text-secondary mr-2"></i>
                      Submit contribution requests
                    </div>
                    <div className="flex items-center text-sm text-muted">
                      <i className="fas fa-check text-secondary mr-2"></i>
                      View real-time fund tracking
                    </div>
                    <div className="flex items-center text-sm text-muted">
                      <i className="fas fa-check text-secondary mr-2"></i>
                      See detailed expense reports
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Input
                      type="text"
                      placeholder="Enter Event Code"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleJoinEvent()}
                      className="text-center font-mono"
                    />
                    <Button onClick={handleJoinEvent} variant="secondary" className="w-full">
                      Join Event
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Built for Complete Transparency</h2>
            <p className="text-xl text-muted max-w-2xl mx-auto">Every contribution tracked, every expense documented, every decision transparent.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-shield-alt text-3xl text-primary"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Secure & Trusted</h3>
              <p className="text-muted">Enterprise-grade security with role-based access control and encrypted data storage.</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-chart-line text-3xl text-secondary"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Real-time Updates</h3>
              <p className="text-muted">See contributions and expenses update instantly with live tracking and notifications.</p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-warning/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-users text-3xl text-warning"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Team Collaboration</h3>
              <p className="text-muted">Invite co-managers with secure links and manage events together seamlessly.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

