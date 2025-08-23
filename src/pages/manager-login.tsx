import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

interface ManagerLoginProps {
  inviteToken?: string;
}

interface InviteData {
  invite: {
    email: string;
    event: {
      title: string;
    };
  };
  event: {
    title: string;
  };
}

export default function ManagerLogin({ inviteToken }: ManagerLoginProps) {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("login");
  const { toast } = useToast();
  const { user } = useAuth();

  // Redirect if already logged in and no invite token
  useEffect(() => {
    if (user && !inviteToken) {
      setLocation("/");
    }
  }, [user, inviteToken, setLocation]);

  // Fetch invite details if token provided
  const { data: inviteData, isError: inviteError } = useQuery<InviteData>({
    queryKey: ['/api/invites', inviteToken],
    enabled: !!inviteToken,
  });

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: inviteData?.invite?.email || "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  // Update email when invite data loads
  useEffect(() => {
    if (inviteData?.invite?.email) {
      registerForm.setValue("email", inviteData.invite.email);
    }
  }, [inviteData, registerForm]);

  const loginMutation = useMutation({
    mutationFn: async (data: z.infer<typeof loginSchema>) => {
      await apiRequest("POST", "/api/auth/login", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      if (inviteToken) {
        // Accept the invite
        try {
          await apiRequest("POST", `/api/invites/${inviteToken}/accept`);
          toast({
            title: "Success",
            description: "Logged in and joined as event manager!",
          });
        } catch (error) {
          toast({
            title: "Warning",
            description: "Logged in but failed to accept invite. It may have expired.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Logged in successfully!",
        });
      }
      
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Login failed",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof registerSchema>) => {
      await apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      if (inviteToken) {
        // Accept the invite
        try {
          await apiRequest("POST", `/api/invites/${inviteToken}/accept`);
          toast({
            title: "Success",
            description: "Account created and joined as event manager!",
          });
        } catch (error) {
          toast({
            title: "Warning",
            description: "Account created but failed to accept invite. It may have expired.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Account created successfully!",
        });
      }
      
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Registration failed",
        variant: "destructive",
      });
    },
  });

  if (inviteToken && inviteError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <i className="fas fa-exclamation-triangle text-4xl text-accent mb-4"></i>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invite</h2>
              <p className="text-muted mb-6">This invite link is invalid or has expired.</p>
              <Button onClick={() => setLocation("/")}>
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-light-bg">
      <div className="w-full max-w-md">
        {inviteData && (
          <div className="mb-6 p-4 bg-secondary/10 border border-secondary/20 rounded-lg">
            <div className="text-center">
              <i className="fas fa-envelope text-secondary text-2xl mb-2"></i>
              <h3 className="font-semibold text-gray-900">You've been invited!</h3>
              <p className="text-sm text-muted">
                Join as a manager for <strong>{inviteData.event?.title}</strong>
              </p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mr-3">
                  <i className="fas fa-users-cog text-primary text-xl"></i>
                </div>
                Event Manager Access
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Logging in...
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </form>
                </Form>
                <div className="mt-4 text-center">
                  <Link href="/forgot-password">
                    <Button variant="link" className="text-sm text-muted-foreground hover:text-primary">
                      Forgot your password?
                    </Button>
                  </Link>
                </div>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} readOnly={!!inviteData?.invite?.email} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <Button variant="ghost" onClick={() => setLocation("/")}>
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
