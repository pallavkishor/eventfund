import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { NavigationHeader } from "@/components/navigation-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { Event, Contribution, Expense } from "../../shared/schema";

interface EventStats {
  totalRaised: number;
  totalSpent: number;
  pendingContributions: number;
  totalCollected: number;
  totalContributors: number;
  totalExpenses: number;
  pendingRequests: number;
}

interface EventData {
  event: Event;
  stats: EventStats;
  contributions: Contribution[];
  expenses: Expense[];
}

const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  venue: z.string().min(1, "Venue is required"),
  targetAmount: z.string().optional(),
});

const expenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.string().min(1, "Amount is required"),
  eventId: z.string().min(1, "Event ID is required"),
});

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  eventId: z.string().min(1, "Event ID is required"),
});

const editEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  venue: z.string().min(1, "Venue is required"),
});

const editExpenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.string().min(1, "Amount is required"),
});

export default function ManagerDashboard() {
  const [selectedEventId, ] = useState<string>("");
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showInviteManager, setShowInviteManager] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch manager's events
  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events/my"],
  });

  // Select first event by default
  const currentEvent = events?.[0];
  const eventId = selectedEventId || currentEvent?.id;

  // Fetch current event details
  const { data: eventData, isLoading: eventLoading } = useQuery<EventData>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  // WebSocket for real-time updates
  useWebSocket(eventId, (data) => {
    if (data.type === 'new_contribution' || data.type === 'contribution_updated' || data.type === 'expense_added') {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      
      if (data.type === 'new_contribution') {
        toast({
          title: "New Contribution",
          description: `${data.contribution.contributor.name} submitted a contribution request`,
        });
      }
    }
  });

  const createEventForm = useForm({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      date: "",
      venue: "",
      targetAmount: "",
    },
  });

  const expenseForm = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      category: "",
      amount: "",
      eventId: eventId || "",
    },
  });

  const inviteForm = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      eventId: "",
    },
  });

  const editEventForm = useForm({
    resolver: zodResolver(editEventSchema),
    defaultValues: {
      title: "",
      date: "",
      venue: "",
    },
  });

  const editExpenseForm = useForm({
    resolver: zodResolver(editExpenseSchema),
    defaultValues: {
      description: "",
      category: "",
      amount: "",
    },
  });

  // Update form values when eventId changes
  useEffect(() => {
    if (eventId) {
      expenseForm.setValue("eventId", eventId);
      inviteForm.setValue("eventId", eventId);
    }
  }, [eventId, expenseForm, inviteForm]);

  // Update edit event form when event data changes
  useEffect(() => {
    if (eventData?.event && showEditEvent) {
      editEventForm.setValue("title", eventData.event.title);
      editEventForm.setValue("date", eventData.event.date.toISOString().split("T")[0]); // ✅ works with Date
      editEventForm.setValue("venue", eventData.event.venue);
    }
  }, [eventData?.event, showEditEvent, editEventForm]);

  // Update edit expense form when editing expense changes
  useEffect(() => {
    if (editingExpense) {
      editExpenseForm.setValue("description", editingExpense.description);
      editExpenseForm.setValue("category", editingExpense.category);
      editExpenseForm.setValue("amount", editingExpense.amount);
    }
  }, [editingExpense, editExpenseForm]);



  const createEventMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createEventSchema>) => {
      const payload = {
        ...data,
        date: new Date(data.date).toISOString(),
        targetAmount: data.targetAmount ? parseFloat(data.targetAmount) : undefined,
      };
      await apiRequest("POST", "/api/events", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events/my"] });
      setShowCreateEvent(false);
      createEventForm.reset();
      toast({
        title: "Success",
        description: "Event created successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
      });
    },
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof expenseSchema>) => {
      const payload = {
        ...data,
        amount: parseFloat(data.amount),
      };
      await apiRequest("POST", "/api/expenses", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      setShowAddExpense(false);
      expenseForm.reset();
      toast({
        title: "Success",
        description: "Expense added successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  const inviteManagerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof inviteSchema>) => {
      const response = await apiRequest("POST", "/api/invites", data);
      return response.json();
    },
    onSuccess: (data) => {
      setShowInviteManager(false);
      inviteForm.reset();
      const inviteUrl = `${window.location.origin}/invite/${data.invite.token}`;
      navigator.clipboard.writeText(inviteUrl);
      toast({
        title: "Invite Created",
        description: data.emailSent 
          ? "Invite sent via email and copied to clipboard! It expires in 2 hours."
          : "Invite link copied to clipboard! It expires in 2 hours.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invite",
        variant: "destructive",
      });
    },
  });

  const editEventMutation = useMutation({
    mutationFn: async (data: z.infer<typeof editEventSchema>) => {
      const payload = {
        ...data,
        date: new Date(data.date).toISOString(),
      };
      await apiRequest("PUT", `/api/events/${eventId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/my"] });
      setShowEditEvent(false);
      toast({
        title: "Success",
        description: "Event updated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update event",
        variant: "destructive",
      });
    },
  });

  const editExpenseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof editExpenseSchema>) => {
      const payload = {
        ...data,
        amount: parseFloat(data.amount),
        eventId: eventId,
      };
      await apiRequest("PUT", `/api/expenses/${editingExpense.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      setEditingExpense(null);
      editExpenseForm.reset();
      toast({
        title: "Success",
        description: "Expense updated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update expense",
        variant: "destructive",
      });
    },
  });

  const approveContributionMutation = useMutation({
    mutationFn: async ({ contributionId, status }: { contributionId: string; status: "approved" | "rejected" }) => {
      await apiRequest("PATCH", `/api/contributions/${contributionId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      toast({
        title: "Success",
        description: "Contribution updated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update contribution",
        variant: "destructive",
      });
    },
  });

  if (eventsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted">Loading events...</p>
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div>
        <NavigationHeader userRole="manager" userName={user ? `${user.firstName} ${user.lastName}` : ""} />
        <div className="min-h-screen pt-8 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-16">
              <i className="fas fa-calendar-plus text-6xl text-muted mb-6"></i>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Your First Event</h2>
              <p className="text-muted mb-8">Get started by creating an event and sharing the access code with contributors.</p>
              <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
                <DialogTrigger asChild>
                  <Button size="lg">
                    <i className="fas fa-plus mr-2"></i>
                    Create Event
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Event</DialogTitle>
                  </DialogHeader>
                  <Form {...createEventForm}>
                    <form onSubmit={createEventForm.handleSubmit((data) => createEventMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={createEventForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Title</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createEventForm.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Date</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createEventForm.control}
                        name="venue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Venue</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createEventForm.control}
                        name="targetAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Amount (Optional)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex space-x-2">
                        <Button type="submit" disabled={createEventMutation.isPending} className="flex-1">
                          {createEventMutation.isPending ? "Creating..." : "Create Event"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowCreateEvent(false)}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (eventLoading) {
    return (
      <div>
        <NavigationHeader userRole="manager" userName={user ? `${user.firstName} ${user.lastName}` : ""} />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted">Loading event details...</p>
          </div>
        </div>
      </div>
    );
  }

  const { event, stats, contributions, expenses } = eventData || {};

  return (
    <div>
      <NavigationHeader 
        userRole="manager" 
        userName={user ? `${user.firstName} ${user.lastName}` : ""} 
        eventCode={event?.accessCode}
      />
      
      <div className="min-h-screen pt-8 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Dashboard Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{event?.title}</h1>
                  <Dialog open={showEditEvent} onOpenChange={setShowEditEvent}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <i className="fas fa-edit mr-2"></i>
                        Edit Event
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Event Details</DialogTitle>
                      </DialogHeader>
                      <Form {...editEventForm}>
                        <form onSubmit={editEventForm.handleSubmit((data) => editEventMutation.mutate(data))} className="space-y-4">
                          <FormField
                            control={editEventForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Event Title</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editEventForm.control}
                            name="date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Event Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editEventForm.control}
                            name="venue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Venue</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex space-x-2">
                            <Button type="submit" disabled={editEventMutation.isPending} className="flex-1">
                              {editEventMutation.isPending ? "Updating..." : "Update Event"}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setShowEditEvent(false)}>
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
                <p className="text-muted mt-2">
                  <i className="fas fa-calendar mr-2"></i>
                  {event?.date && format(new Date(event.date), "PPP")}
                  <span className="mx-2">•</span>
                  <i className="fas fa-map-marker-alt mr-2"></i>
                  {event?.venue}
                </p>
              </div>
              <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
                <Dialog open={showInviteManager} onOpenChange={setShowInviteManager}>
                  <DialogTrigger asChild>
                    <Button>
                      <i className="fas fa-user-plus mr-2"></i>
                      Invite Co-Manager
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Co-Manager</DialogTitle>
                    </DialogHeader>
                    <Form {...inviteForm}>
                      <form onSubmit={inviteForm.handleSubmit((data) => inviteManagerMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={inviteForm.control}
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
                        <div className="flex space-x-2">
                          <Button type="submit" disabled={inviteManagerMutation.isPending} className="flex-1">
                            {inviteManagerMutation.isPending ? "Sending..." : "Send Invite"}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setShowInviteManager(false)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
                  <DialogTrigger asChild>
                    <Button variant="secondary">
                      <i className="fas fa-plus mr-2"></i>
                      Add Expense
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Expense</DialogTitle>
                    </DialogHeader>
                    <Form {...expenseForm}>
                      <form onSubmit={expenseForm.handleSubmit((data) => addExpenseMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={expenseForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={expenseForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="food">Food & Catering</SelectItem>
                                  <SelectItem value="equipment">Equipment</SelectItem>
                                  <SelectItem value="venue">Venue</SelectItem>
                                  <SelectItem value="decorations">Decorations</SelectItem>
                                  <SelectItem value="gifts">Gifts</SelectItem>
                                  <SelectItem value="transport">Transportation</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={expenseForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount (₹)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex space-x-2">
                          <Button type="submit" disabled={addExpenseMutation.isPending} className="flex-1">
                            {addExpenseMutation.isPending ? "Adding..." : "Add Expense"}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setShowAddExpense(false)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <i className="fas fa-plus mr-2"></i>
                      New Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Event</DialogTitle>
                    </DialogHeader>
                    <Form {...createEventForm}>
                      <form onSubmit={createEventForm.handleSubmit((data) => createEventMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={createEventForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Event Title</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={createEventForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Event Date</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={createEventForm.control}
                          name="venue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Venue</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={createEventForm.control}
                          name="targetAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Amount (Optional)</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex space-x-2">
                          <Button type="submit" disabled={createEventMutation.isPending} className="flex-1">
                            {createEventMutation.isPending ? "Creating..." : "Create Event"}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setShowCreateEvent(false)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-rupee-sign text-primary text-xl"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted">Total Collected</p>
                    <p className="text-2xl font-bold text-gray-900">₹{stats?.totalCollected || "0"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-users text-secondary text-xl"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted">Contributors</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalContributors || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-receipt text-warning text-xl"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">₹{stats?.totalExpenses || "0"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <i className="fas fa-clock text-accent text-xl"></i>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted">Pending Requests</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.pendingRequests || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contribution Requests */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Contribution Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {contributions && contributions.length > 0 ? (
                    <div className="space-y-4">
                      {contributions.map((contribution: any) => (
                        <div
                          key={contribution.id}
                          className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                            contribution.status === "approved" ? "bg-secondary/5 border-secondary/20" : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-primary font-medium text-sm">
                                {contribution.contributor?.name?.charAt(0) || "?"}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{contribution.contributor?.name}</p>
                              <p className="text-sm text-muted">{contribution.contributor?.email}</p>
                              <p className="text-xs text-muted">
                                {contribution.createdAt && format(new Date(contribution.createdAt), "PPp")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">₹{contribution.amount}</p>
                              <Badge variant={
                                contribution.status === "approved" ? "default" :
                                contribution.status === "rejected" ? "destructive" : "secondary"
                              }>
                                {contribution.status}
                              </Badge>
                            </div>
                            {contribution.status === "pending" && (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => approveContributionMutation.mutate({
                                    contributionId: contribution.id,
                                    status: "approved"
                                  })}
                                  disabled={approveContributionMutation.isPending}
                                >
                                  <i className="fas fa-check text-secondary"></i>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => approveContributionMutation.mutate({
                                    contributionId: contribution.id,
                                    status: "rejected"
                                  })}
                                  disabled={approveContributionMutation.isPending}
                                >
                                  <i className="fas fa-times text-accent"></i>
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted">
                      <i className="fas fa-inbox text-4xl mb-4"></i>
                      <p>No contribution requests yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Event Code */}
              <Card>
                <CardHeader>
                  <CardTitle>Event Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-sm text-muted mb-3">Share this code with contributors:</p>
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4">
                      <p className="text-2xl font-bold text-primary font-mono">{event?.accessCode}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        className="flex-1"
                        onClick={() => {
                          navigator.clipboard.writeText(event?.accessCode || "");
                          toast({ title: "Copied!", description: "Access code copied to clipboard" });
                        }}
                      >
                        <i className="fas fa-copy mr-2"></i>
                        Copy Code
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          const url = `${window.location.origin}/event/${event?.accessCode}`;
                          navigator.clipboard.writeText(url);
                          toast({ title: "Copied!", description: "Event link copied to clipboard" });
                        }}
                      >
                        <i className="fas fa-share mr-2"></i>
                        Share Link
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Expenses */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  {expenses && expenses.length > 0 ? (
                    <div className="space-y-4">
                      {expenses.slice(0, 5).map((expense: any) => (
                        <div key={expense.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                              <i className="fas fa-receipt text-accent text-sm"></i>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{expense.description}</p>
                              <p className="text-xs text-muted">{expense.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <p className="font-semibold text-gray-900">₹{expense.amount}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingExpense(expense)}
                            >
                              <i className="fas fa-edit text-xs"></i>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted">
                      <p className="text-sm">No expenses added yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Expense Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <Form {...editExpenseForm}>
            <form onSubmit={editExpenseForm.handleSubmit((data) => editExpenseMutation.mutate(data))} className="space-y-4">
              <FormField
                control={editExpenseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editExpenseForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editExpenseForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex space-x-2">
                <Button type="submit" disabled={editExpenseMutation.isPending} className="flex-1">
                  {editExpenseMutation.isPending ? "Updating..." : "Update Expense"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingExpense(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
