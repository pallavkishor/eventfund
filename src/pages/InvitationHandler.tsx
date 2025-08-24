import { useState } from "react";
import { useQuery,  } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

import EventCard from "@/components/EventCard";
import CreateEventModal from "@/components/modals/CreateEventModal";
import InviteCoManagerModal from "@/components/modals/InviteCoManagerModal";
import type { EventWithDetails, Contribution } from "../../shared/schema.ts";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"events" | "statistics" | "invites">("events");
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const { data: events = [], isLoading: eventsLoading } = useQuery<EventWithDetails[]>({
    queryKey: ["/api/events"],
    enabled: !!user,
  });

  const { data: highValueContributors = [], isLoading: contributorsLoading } = useQuery<Contribution[]>({
    queryKey: ["/api/statistics/high-value-contributors"],
    enabled: !!user && activeTab === "statistics",
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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

  const totalEvents = events.length;
  const totalCollected = events.reduce((sum, event) => sum + parseFloat(event.totalCollected || '0'), 0);
  const totalContributors = events.reduce((sum, event) => sum + (event.contributorsCount || 0), 0);
  const avgContribution = totalContributors > 0 ? totalCollected / totalContributors : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary mr-8">EventFund</h1>
              <div className="hidden md:flex space-x-8">
                <button 
                  onClick={() => setActiveTab("events")}
                  className={`px-1 pt-1 pb-4 text-sm font-medium ${
                    activeTab === "events" 
                      ? "text-primary border-primary border-b-2" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  data-testid="tab-events"
                >
                  Events
                </button>
                <button 
                  onClick={() => setActiveTab("statistics")}
                  className={`px-1 pt-1 pb-4 text-sm font-medium ${
                    activeTab === "statistics" 
                      ? "text-primary border-primary border-b-2" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  data-testid="tab-statistics"
                >
                  Statistics
                </button>
                <button 
                  onClick={() => setActiveTab("invites")}
                  className={`px-1 pt-1 pb-4 text-sm font-medium ${
                    activeTab === "invites" 
                      ? "text-primary border-primary border-b-2" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  data-testid="tab-invites"
                >
                  Co-Managers
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary" data-testid="text-user-initials">{userInitials}</span>
                </div>
                <span className="text-sm font-medium text-gray-700" data-testid="text-user-name">{userName}</span>
              </div>
              <Button 
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                data-testid="button-logout"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Events Tab Content */}
      {activeTab === "events" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header with Create Button */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
              <p className="text-gray-600 mt-1">Manage your events and track contributions</p>
            </div>
            <button 
              onClick={() => setShowCreateEvent(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center"
              data-testid="button-create-event"
            >
              <i className="fas fa-plus mr-2"></i>
              Create Event
            </button>
          </div>

          {/* Events Grid */}
          {eventsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-calendar-plus text-3xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No events yet</h3>
              <p className="text-gray-600 mb-6">Get started by creating your first event</p>
              <button 
                onClick={() => setShowCreateEvent(true)}
                className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors"
                data-testid="button-create-first-event"
              >
                Create Your First Event
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Statistics Tab Content */}
      {activeTab === "statistics" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Statistics Overview</h1>
            <p className="text-gray-600 mt-1">Analyze contribution patterns and event performance</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="stat-total-events">{totalEvents}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-calendar text-primary"></i>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Collected</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="stat-total-collected">₹{totalCollected.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-coins text-green-600"></i>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Contributors</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="stat-total-contributors">{totalContributors}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-users text-blue-600"></i>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Contribution</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="stat-avg-contribution">₹{avgContribution.toFixed(0)}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-chart-bar text-amber-600"></i>
                </div>
              </div>
            </div>
          </div>

          {/* High-Value Contributors */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">High-Value Contributors ({'>'}₹100)</h3>
            </div>
            {contributorsLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : highValueContributors.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No high-value contributors yet</p>
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
                    {highValueContributors.map((contribution: Contribution) => (
                      <tr key={contribution.id} className="border-b">
                        <td className="py-3 px-4 text-gray-900" data-testid={`contributor-name-${contribution.id}`}>
                          {contribution.contributorName}
                        </td>
                        <td className="py-3 px-4 font-semibold text-green-600" data-testid={`contribution-amount-${contribution.id}`}>
                          ₹{parseFloat(contribution.amount).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-gray-600" data-testid={`payment-method-${contribution.id}`}>
                          {contribution.paymentMethod}
                        </td>
                        <td className="py-3 px-4 text-gray-600" data-testid={`contribution-date-${contribution.id}`}>
                          {new Date(contribution.createdAt!).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Co-Managers Tab Content */}
      {activeTab === "invites" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Co-Manager Invitations</h1>
              <p className="text-gray-600 mt-1">Invite team members to help manage events</p>
            </div>
            <button 
              onClick={() => setShowInviteModal(true)}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors flex items-center"
              data-testid="button-invite-co-manager"
            >
              <i className="fas fa-user-plus mr-2"></i>
              Invite Co-Manager
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h3>
            <div className="text-gray-600">
              <p className="mb-4">
                To invite co-managers, you'll need to select a specific event first. Co-managers are invited on a per-event basis and can help you:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Review and approve contribution requests</li>
                <li>Add and manage event expenses</li>
                <li>View detailed event statistics</li>
                <li>Ensure transparent fund management</li>
              </ul>
              <p className="mt-4 text-sm text-gray-500">
                Go to a specific event's page to send co-manager invitations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateEventModal 
        isOpen={showCreateEvent} 
        onClose={() => setShowCreateEvent(false)} 
      />

      <InviteCoManagerModal 
        isOpen={showInviteModal} 
        onClose={() => setShowInviteModal(false)}
        events={events}
      />
    </div>
  );
}