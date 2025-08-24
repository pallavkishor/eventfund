import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { useToast } from "@/hooks/use-toast";
import ContributionFormModal from "@/components/modals/ContributionFormModal.tsx";
import { type Contribution, type Expense, type EventWithDetails } from "../../shared/schema.ts";

export default function ContributorEvent() {
  const { code } = useParams();
  const [, setLocation] = useLocation();
  const { } = useToast();
 
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [contributorName, setContributorName] = useState("");
  const [showMyContributions, setShowMyContributions] = useState(false);

  const { data: event, isLoading: eventLoading, error } = useQuery<EventWithDetails>({
    queryKey: ["/api/events/access", code],
    enabled: !!code,
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
      queryKey: ["/api/events", event?.id, "expenses/public"],
      enabled: !!event?.id,
  });

  const { data: myContributions = [], isLoading: contributionsLoading } = useQuery<Contribution[]>({
    queryKey: ["/api/events", event?.id, "contributions/contributor", contributorName],
    enabled: !!event?.id && !!contributorName && showMyContributions,
  });

  const backToLanding = () => {
    setLocation("/");
  };

  const handleShowMyContributions = () => {
    const name = prompt("Please enter your full name to view your contributions:");
    if (name?.trim()) {
      setContributorName(name.trim());
      setShowMyContributions(true);
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

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-2xl text-red-600"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-gray-600 mb-6">The event code you entered is invalid or the event doesn't exist.</p>
          <button 
            onClick={backToLanding}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors"
            data-testid="button-back-to-landing"
          >
            Try Another Code
          </button>
        </div>
      </div>
    );
  }

  // Calculate remaining funds
  const remainingFunds = parseFloat(event.totalCollected) - parseFloat(event.totalExpenses);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Contributor Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary mr-8">EventFund</h1>
            </div>
            <div className="flex items-center">
              <button 
                onClick={backToLanding}
                className="text-gray-500 hover:text-gray-700"
                data-testid="button-exit-event"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Exit Event
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-event-title">{event.title}</h1>
            <div className="flex items-center justify-center space-x-6 text-gray-600 mb-4">
              <div className="flex items-center">
                <i className="fas fa-calendar w-4 mr-2"></i>
                <span data-testid="text-event-date">{new Date(event.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center">
                <i className="fas fa-map-marker-alt w-4 mr-2"></i>
                <span data-testid="text-event-venue">{event.venue}</span>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 inline-block">
              <p className="text-sm text-gray-600">Total Funds Collected</p>
              <p className="text-3xl font-bold text-green-600" data-testid="text-total-collected">₹{parseFloat(event.totalCollected).toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1" data-testid="text-contributors-count">from {event.contributorsCount} contributors</p>
            </div>
          </div>
        </div>

        {/* Contribution Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Submit Contribution Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-hand-holding-usd text-2xl text-green-600"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Make a Contribution</h3>
              <p className="text-gray-600 mb-6">Submit your contribution to support this event</p>
              <button 
                onClick={() => setShowContributionForm(true)}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium"
                data-testid="button-contribute-now"
              >
                Contribute Now
              </button>
            </div>
          </div>

          {/* My Contributions Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-receipt text-2xl text-blue-600"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">My Contributions</h3>
              <p className="text-gray-600 mb-6">View your contribution history for this event</p>
              <button 
                onClick={handleShowMyContributions}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                data-testid="button-view-history"
              >
                View History
              </button>
            </div>
          </div>
        </div>

        {/* My Contributions List */}
        {showMyContributions && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">My Contributions</h3>
              <button 
                onClick={() => setShowMyContributions(false)}
                className="text-gray-400 hover:text-gray-600"
                data-testid="button-close-contributions"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            {contributionsLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ) : myContributions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-receipt text-2xl text-gray-400"></i>
                </div>
                <p className="text-gray-500">No contributions found for "{contributorName}"</p>
                <p className="text-sm text-gray-400 mt-2">Make sure you've entered the exact name used when contributing.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myContributions.map((contribution: Contribution) => (
                  <div key={contribution.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900" data-testid={`my-contribution-amount-${contribution.id}`}>
                          ₹{parseFloat(contribution.amount).toLocaleString()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          contribution.status === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : contribution.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`} data-testid={`my-contribution-status-${contribution.id}`}>
                          {contribution.status === 'approved' ? 'Approved' : 
                           contribution.status === 'pending' ? 'Pending Review' : 'Rejected'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p data-testid={`my-contribution-method-${contribution.id}`}>Payment: {contribution.paymentMethod}</p>
                        <p data-testid={`my-contribution-date-${contribution.id}`}>Submitted: {new Date(contribution.createdAt!).toLocaleDateString()}</p>
                        {contribution.comments && (
                          <p className="mt-1 italic" data-testid={`my-contribution-comments-${contribution.id}`}>"{contribution.comments}"</p>
                        )}
                        {contribution.status === 'rejected' && contribution.rejectionReason && (
                          <p className="mt-1 text-red-600" data-testid={`my-contribution-rejection-${contribution.id}`}>
                            Reason: {contribution.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fund Usage Transparency */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">How Your Money is Being Used</h3>
          
          {/* Fund Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Total Collected</p>
              <p className="text-2xl font-bold text-green-600" data-testid="summary-total-collected">₹{parseFloat(event.totalCollected).toLocaleString()}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold text-red-600" data-testid="summary-total-spent">₹{parseFloat(event.totalExpenses).toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Remaining</p>
              <p className="text-2xl font-bold text-blue-600" data-testid="summary-remaining">₹{remainingFunds.toLocaleString()}</p>
            </div>
          </div>

          {/* Expense Breakdown */}
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h4>
          {expensesLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-16 bg-gray-200 rounded-lg"></div>
              <div className="h-16 bg-gray-200 rounded-lg"></div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-receipt text-2xl text-gray-400"></i>
              </div>
              <p className="text-gray-500">No expenses recorded yet</p>
              <p className="text-sm text-gray-400 mt-1">Expenses will appear here as they are added by event managers</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense: Expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <i className="fas fa-receipt text-blue-600"></i>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900" data-testid={`expense-title-${expense.id}`}>{expense.title}</h5>
                      <p className="text-sm text-gray-600" data-testid={`expense-description-${expense.id}`}>{expense.description}</p>
                      <p className="text-xs text-gray-500" data-testid={`expense-date-${expense.id}`}>
                        {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-red-600" data-testid={`expense-amount-${expense.id}`}>₹{parseFloat(expense.amount).toLocaleString()}</span>
                    {expense.receiptUrl && (
                      <div className="mt-1">
                        <a 
                          href={expense.receiptUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                          data-testid={`expense-receipt-${expense.id}`}
                        >
                          View Receipt
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ContributionFormModal 
        isOpen={showContributionForm} 
        onClose={() => setShowContributionForm(false)}
        eventId={event.id}
      />
    </div>
  );
}