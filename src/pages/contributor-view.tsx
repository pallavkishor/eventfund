import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { NavigationHeader } from "@/components/navigation-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { Event, Contribution, Expense } from "../../shared/schema";

interface EventStats {
  totalRaised: number;
  totalSpent: number;
  pendingContributions: number;
  totalCollected: number;
  totalContributors: number;
  totalExpenses: number;
}

interface EventData {
  event: Event;
  stats: EventStats;
  expenses: Expense[];
}

const contributionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  amount: z.string().min(1, "Amount is required").refine((val) => parseFloat(val) > 0, "Amount must be greater than 0"),
  message: z.string().optional(),
});

interface ContributorViewProps {
  params: { accessCode: string };
}

export default function ContributorView({ params }: ContributorViewProps) {
  const { accessCode } = params;
  const [contributorId, setContributorId] = useState<string>("");
  const { toast } = useToast();

  // Fetch event details by access code
  const { data: eventData, isLoading, isError } = useQuery<EventData>({
    queryKey: ["/api/events/access", accessCode],
    retry: false,
  });

  // Fetch contributor's contributions if contributor ID is available
  const { data: userContributions } = useQuery<Contribution[]>({
    queryKey: ["/api/contributors", contributorId, "contributions"],
    enabled: !!contributorId,
  });

  // WebSocket for real-time updates
  useWebSocket(eventData?.event?.id, (data) => {
    if (data.type === 'contribution_updated' || data.type === 'expense_added') {
      queryClient.invalidateQueries({ queryKey: ["/api/events/access", accessCode] });
      if (contributorId) {
        queryClient.invalidateQueries({ queryKey: ["/api/contributors", contributorId, "contributions"] });
      }
      
      if (data.type === 'expense_added') {
        toast({
          title: "New Expense Added",
          description: `${data.expense.description} - ₹${data.expense.amount}`,
        });
      }
    }
  });

  const form = useForm({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      amount: "",
      message: "",
    },
  });

  const contributionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof contributionSchema>) => {
      if (!eventData?.event?.id) {
        throw new Error("Event not found");
      }

      const contributorData = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        eventId: eventData.event.id,
      };

      const contributionData = {
        amount: parseFloat(data.amount),
        message: data.message,
        eventId: eventData.event.id,
        contributorId: "", // Will be set by the server
      };

      const response = await apiRequest("POST", "/api/contributions", {
        contributorData,
        contributionData,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setContributorId(data.contributor.id);
      queryClient.invalidateQueries({ queryKey: ["/api/events/access", accessCode] });
      queryClient.invalidateQueries({ queryKey: ["/api/contributors", data.contributor.id, "contributions"] });
      
      form.reset();
      toast({
        title: "Success",
        description: "Your contribution request has been submitted for approval!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit contribution",
        variant: "destructive",
      });
    },
  });

  // Get contributor ID from localStorage if available
  useEffect(() => {
    const storedContributorId = localStorage.getItem(`contributor_${accessCode}`);
    if (storedContributorId) {
      setContributorId(storedContributorId);
    }
  }, [accessCode]);

  // Store contributor ID when mutation succeeds
  useEffect(() => {
    if (contributorId) {
      localStorage.setItem(`contributor_${accessCode}`, contributorId);
    }
  }, [contributorId, accessCode]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted">Loading event...</p>
        </div>
      </div>
    );
  }

  if (isError || !eventData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <i className="fas fa-exclamation-triangle text-4xl text-accent mb-4"></i>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Event Not Found</h2>
              <p className="text-muted mb-6">The event code "{accessCode}" is invalid or the event no longer exists.</p>
              <Button onClick={() => window.location.href = "/"}>
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { event, stats, expenses } = eventData;
  const totalCollected = parseFloat(String(stats.totalCollected || 0));
  const totalExpenses = parseFloat(String(stats.totalExpenses || 0));
  const remaining = totalCollected - totalExpenses;

  return (
    <div>
      <NavigationHeader userRole="contributor" eventCode={accessCode} />
      
      <div className="min-h-screen pt-8 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Event Header */}
          <Card className="p-8 mb-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-calendar-check text-3xl text-primary"></i>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{event.title}</h1>
              <div className="flex items-center justify-center space-x-6 text-muted">
                <div className="flex items-center">
                  <i className="fas fa-calendar mr-2"></i>
                  <span>{format(new Date(event.date), "PPP")}</span>
                </div>
                <div className="flex items-center">
                  <i className="fas fa-map-marker-alt mr-2"></i>
                  <span>{event.venue}</span>
                </div>
                <div className="flex items-center">
                  <i className="fas fa-users mr-2"></i>
                  <span>{stats.totalContributors} Contributors</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Funding Overview */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Total Funds Collected */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-secondary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-rupee-sign text-2xl text-secondary"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Collected</h3>
                  <p className="text-4xl font-bold text-secondary mb-2">₹{stats.totalCollected}</p>
                  <p className="text-sm text-muted">From {stats.totalContributors} contributors</p>
                </div>
              </CardContent>
            </Card>

            {/* Funds Spent */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-warning/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-receipt text-2xl text-warning"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Funds Spent</h3>
                  <p className="text-4xl font-bold text-warning mb-2">₹{stats.totalExpenses}</p>
                  <p className="text-sm text-muted">
                    {totalCollected > 0 ? Math.round((totalExpenses / totalCollected) * 100) : 0}% of collected funds
                  </p>
                  <div className="mt-4 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-warning h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: totalCollected > 0 ? `${Math.min((totalExpenses / totalCollected) * 100, 100)}%` : "0%" 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-secondary mt-2">₹{remaining.toFixed(2)} remaining</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contribution Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Make a Contribution</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => contributionMutation.mutate(data))} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contribution Amount</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-muted">₹</span>
                              <Input type="number" step="0.01" className="pl-8" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number (Optional)</FormLabel>
                          <FormControl>
                            <Input type="tel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message (Optional)</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={contributionMutation.isPending}>
                    {contributionMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Submitting...
                      </>
                    ) : (
                      "Submit Contribution Request"
                    )}
                  </Button>

                  <p className="text-xs text-muted text-center">
                    Your contribution request will be reviewed and approved by event managers.
                  </p>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Your Contributions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Contributions</CardTitle>
            </CardHeader>
            <CardContent>
              {userContributions && userContributions.length > 0 ? (
                <div className="space-y-4">
                  {userContributions.map((contribution: any) => (
                    <div key={contribution.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">₹{contribution.amount}</p>
                        <p className="text-sm text-muted">
                          Submitted {format(new Date(contribution.createdAt), "PPp")}
                        </p>
                        {contribution.message && (
                          <p className="text-sm text-gray-600 mt-1">"{contribution.message}"</p>
                        )}
                      </div>
                      <Badge variant={
                        contribution.status === "approved" ? "default" :
                        contribution.status === "rejected" ? "destructive" : "secondary"
                      }>
                        {contribution.status === "pending" ? "Pending Approval" : contribution.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted">
                  <i className="fas fa-hand-holding-heart text-4xl mb-4"></i>
                  <p>You haven't made any contributions yet.</p>
                  <p className="text-sm">Use the form above to submit your first contribution.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>How Funds Are Being Used</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses && expenses.length > 0 ? (
                <div className="space-y-4">
                  {expenses.map((expense: any) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                          <i className="fas fa-receipt text-accent"></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{expense.description}</p>
                          <p className="text-sm text-muted">{expense.category}</p>
                          <p className="text-xs text-muted">
                            Added {format(new Date(expense.createdAt), "PPp")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">₹{expense.amount}</p>
                        <p className="text-xs text-muted">
                          {totalCollected > 0 ? Math.round((parseFloat(expense.amount) / totalCollected) * 100) : 0}% of total
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted">
                  <i className="fas fa-receipt text-4xl mb-4"></i>
                  <p>No expenses have been added yet.</p>
                  <p className="text-sm">Expense details will appear here as managers add them.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
