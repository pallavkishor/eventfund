import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import ContributionItem from "@/components/ContributionItem";
import ExpenseItem from "@/components/ExpenseItem";
import AddExpenseModal from "@/components/modals/AddExpenseModal";
import InviteCoManagerModal from "@/components/modals/InviteCoManagerModal";
import type { EventWithDetails, Contribution, Expense, User, EventManager, ManagerInvitation } from "../../shared/schema";

// Additional interfaces for API responses
interface InvitationsData {
  pendingInvitations: ManagerInvitation[];
  activeManagers: (EventManager & { user: User })[];
}

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "contributions" | "expenses">("overview");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { data: event, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ["/api/events", id],
    enabled: !!id,
  }) as { data: EventWithDetails | undefined; isLoading: boolean; error: Error | null };

  // Handle error in useEffect instead of onError callback
  React.useEffect(() => {
    if (eventError && isUnauthorizedError(eventError)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [eventError, toast]);

  const { data: contributions = [], isLoading: contributionsLoading } = useQuery({
    queryKey: ["/api/events", id, "contributions"],
    enabled: !!id && activeTab === "contributions",
  }) as { data: Contribution[]; isLoading: boolean };

  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["/api/events", id, "expenses"],
    enabled: !!id && activeTab === "expenses",
  }) as { data: Expense[]; isLoading: boolean };

  const { data: invitationsData,  } = useQuery({
    queryKey: ["/api/events", id, "invitations"],
    enabled: !!id,
  }) as { data: InvitationsData | undefined; isLoading: boolean };

  const approveContributionMutation = useMutation({
    mutationFn: async (contributionId: string) => {
      await apiRequest("PUT", `/api/contributions/${contributionId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", id, "contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", id] });
      toast({ title: "Success", description: "Contribution approved successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve contribution", variant: "destructive" });
    },
  });

  const rejectContributionMutation = useMutation({
    mutationFn: async ({ contributionId, reason }: { contributionId: string; reason: string }) => {
      await apiRequest("PUT", `/api/contributions/${contributionId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", id, "contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", id] });
      toast({ title: "Success", description: "Contribution rejected" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject contribution", variant: "destructive" });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      await apiRequest("DELETE", `/api/expenses/${expenseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", id, "expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", id] });
      toast({ title: "Success", description: "Expense deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete expense", variant: "destructive" });
    },
  });

  const backToDashboard = () => {
    setLocation("/");
  };

  const handleApproveContribution = (contributionId: string) => {
    approveContributionMutation.mutate(contributionId);
  };

  const handleRejectContribution = (contributionId: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (reason) {
      rejectContributionMutation.mutate({ contributionId, reason });
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteExpenseMutation.mutate(expenseId);
    }
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event not found</h2>
          <p className="text-gray-600 mb-4">The event you're looking for doesn't exist or you don't have access to it.</p>
          <button 
            onClick={backToDashboard}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const userInitials = user 
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'
    : 'U';
  
  const userName = user 
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User'
    : 'User';

  const pendingContributions = contributions.filter((c: Contribution) => c.status === 'pending');
  const approvedContributions = contributions.filter((c: Contribution) => c.status === 'approved');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Event Details Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button 
                onClick={backToDashboard}
                className="text-gray-500 hover:text-gray-700 mr-4"
                data-testid="button-back-dashboard"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              <h1 className="text-2xl font-bold text-primary mr-8">EventFund</h1>
              <div className="hidden md:flex space-x-8">
                <button 
                  onClick={() => setActiveTab("overview")}
                  className={`px-1 pt-1 pb-4 text-sm font-medium ${
                    activeTab === "overview" 
                      ? "text-primary border-primary border-b-2" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  data-testid="tab-overview"
                >
                  Overview
                </button>
                <button 
                  onClick={() => setActiveTab("contributions")}
                  className={`px-1 pt-1 pb-4 text-sm font-medium ${
                    activeTab === "contributions" 
                      ? "text-primary border-primary border-b-2" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  data-testid="tab-contributions"
                >
                  Contributions
                </button>
                <button 
                  onClick={() => setActiveTab("expenses")}
                  className={`px-1 pt-1 pb-4 text-sm font-medium ${
                    activeTab === "expenses" 
                      ? "text-primary border-primary border-b-2" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  data-testid="tab-expenses"
                >
                  Expenses
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowInviteModal(true)}
                className="text-gray-500 hover:text-primary"
                data-testid="button-invite-managers"
              >
                <i className="fas fa-user-plus mr-2"></i>
                Invite Co-Managers
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary" data-testid="text-user-initials">{userInitials}</span>
                </div>
                <span className="text-sm font-medium text-gray-700" data-testid="text-user-name">{userName}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Overview Tab Content */}
      {activeTab === "overview" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Event Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-event-title">{event.title}</h1>
                <div className="flex items-center space-x-6 text-gray-600">
                  <div className="flex items-center">
                    <i className="fas fa-calendar w-4 mr-2"></i>
                    <span data-testid="text-event-date">{new Date(event.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-map-marker-alt w-4 mr-2"></i>
                    <span data-testid="text-event-venue">{event.venue}</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-code w-4 mr-2"></i>
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded" data-testid="text-access-code">{event.accessCode}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Collected</p>
                <p className="text-3xl font-bold text-green-600" data-testid="text-total-collected">₹{parseFloat(event.totalCollected || '0').toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Contributors</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="stat-contributors">{event.contributorsCount}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-users text-blue-600"></i>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Requests</p>
                  <p className="text-2xl font-bold text-amber-600" data-testid="stat-pending">{event.pendingRequests}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-clock text-amber-600"></i>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600" data-testid="stat-expenses">₹{parseFloat(event.totalExpenses || '0').toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-receipt text-red-600"></i>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Remaining</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="stat-remaining">₹{(parseFloat(event.totalCollected || '0') - parseFloat(event.totalExpenses || '0')).toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-piggy-bank text-green-600"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Co-Managers Section */}
          {invitationsData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Team</h3>
              
              {invitationsData.pendingInvitations?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <span className="w-3 h-3 bg-amber-500 rounded-full mr-2"></span>
                    Pending Invitations ({invitationsData.pendingInvitations.length})
                  </h4>
                  <div className="space-y-2">
                    {invitationsData.pendingInvitations.map((invitation: ManagerInvitation) => (
                      <div key={invitation.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-3">
                            <i className="fas fa-clock text-amber-600 text-sm"></i>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900" data-testid={`pending-invite-email-${invitation.id}`}>{invitation.email}</p>
                            <p className="text-sm text-gray-600">
                              Expires {new Date(invitation.expiresAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {invitationsData.activeManagers?.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    Active Managers ({invitationsData.activeManagers.length})
                  </h4>
                  <div className="space-y-2">
                    {invitationsData.activeManagers.map((manager: EventManager & { user: User }) => (
                      <div key={manager.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-green-600">
                              {`${manager.user.firstName?.[0] || ''}${manager.user.lastName?.[0] || ''}`.toUpperCase() || manager.user.email?.[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900" data-testid={`active-manager-name-${manager.id}`}>
                              {`${manager.user.firstName || ''} ${manager.user.lastName || ''}`.trim() || manager.user.email}
                            </p>
                            <p className="text-sm text-gray-600" data-testid={`active-manager-email-${manager.id}`}>{manager.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`text-sm font-medium ${manager.role === 'owner' ? 'text-blue-600' : 'text-green-600'}`}>
                            {manager.role === 'owner' ? 'Owner' : 'Co-Manager'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contributions Tab Content */}
      {activeTab === "contributions" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Contributions Management</h2>
          </div>

          {contributionsLoading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : (
            <>
              {/* Pending Contributions */}
              {pendingContributions.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-3 h-3 bg-amber-500 rounded-full mr-2"></span>
                    Pending Approval ({pendingContributions.length})
                  </h3>
                  <div className="space-y-4">
                    {pendingContributions.map((contribution: Contribution) => (
                      <ContributionItem 
                        key={contribution.id} 
                        contribution={contribution}
                        onApprove={handleApproveContribution}
                        onReject={handleRejectContribution}
                        isLoading={approveContributionMutation.isPending || rejectContributionMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Approved Contributions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  Approved Contributions ({approvedContributions.length})
                </h3>
                {approvedContributions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No approved contributions yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Contributor</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Payment Method</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvedContributions.map((contribution: Contribution) => (
                          <tr key={contribution.id} className="border-b">
                            <td className="py-3 px-4 text-gray-900" data-testid={`approved-contributor-${contribution.id}`}>
                              {contribution.contributorName}
                            </td>
                            <td className="py-3 px-4 font-semibold text-green-600" data-testid={`approved-amount-${contribution.id}`}>
                              ₹{parseFloat(contribution.amount).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-gray-600" data-testid={`approved-method-${contribution.id}`}>
                              {contribution.paymentMethod}
                            </td>
                            <td className="py-3 px-4 text-gray-600" data-testid={`approved-date-${contribution.id}`}>
                              {contribution.createdAt && new Date(contribution.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Expenses Tab Content */}
      {activeTab === "expenses" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Expense Management</h2>
            <button 
              onClick={() => setShowAddExpense(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center"
              data-testid="button-add-expense"
            >
              <i className="fas fa-plus mr-2"></i>
              Add Expense
            </button>
          </div>

          {/* Expense Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600" data-testid="summary-total-expenses">₹{parseFloat(event.totalExpenses || '0').toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-receipt text-red-600"></i>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Available Funds</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="summary-available-funds">₹{parseFloat(event.totalCollected || '0').toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-coins text-green-600"></i>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Remaining</p>
                  <p className="text-2xl font-bold text-blue-600" data-testid="summary-remaining">₹{(parseFloat(event.totalCollected || '0') - parseFloat(event.totalExpenses || '0')).toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-piggy-bank text-blue-600"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Expenses List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Details</h3>
            {expensesLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-receipt text-2xl text-gray-400"></i>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No expenses yet</h4>
                <p className="text-gray-600 mb-6">Start tracking expenses to maintain transparency</p>
                <button 
                  onClick={() => setShowAddExpense(true)}
                  className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors"
                  data-testid="button-add-first-expense"
                >
                  Add First Expense
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {expenses.map((expense: Expense) => (
                  <ExpenseItem 
                    key={expense.id} 
                    expense={expense}
                    onDelete={handleDeleteExpense}
                    isLoading={deleteExpenseMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddExpenseModal 
        isOpen={showAddExpense} 
        onClose={() => setShowAddExpense(false)}
        eventId={id!}
      />
      
      <InviteCoManagerModal 
        isOpen={showInviteModal} 
        onClose={() => setShowInviteModal(false)}
        events={event ? [event] : []}
        selectedEventId={id}
      />
    </div>
  );
}