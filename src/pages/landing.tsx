import { useState } from "react";
import AuthModal from "@/components/modals/AuthModal";
import ForgotPasswordModal from "@/components/modals/ForgotPasswordModal";
import ContributorAccessModal from "@/components/modals/ContributorAccessModal";

export default function Landing() {
  const [showManagerAuth, setShowManagerAuth] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showContributorAccess, setShowContributorAccess] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-primary">EventFund</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowManagerAuth(true)}
                className="text-secondary hover:text-primary transition-colors"
                data-testid="button-manager-login"
              >
                Manager Login
              </button>
              <button 
                onClick={() => setShowContributorAccess(true)}
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
                data-testid="button-access-event"
              >
                Access Event
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              Transparent Event Funding
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Track contributions and expenses with complete transparency. Perfect for Teachers' Day events, community gatherings, and more.
            </p>
          </div>

          {/* Dual Access Cards */}
          <div className="mt-16 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Manager Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-user-cog text-2xl text-primary"></i>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">Event Managers</h3>
                <p className="text-gray-600 mb-8">Create events, manage contributions, track expenses, and invite co-managers.</p>
                <button 
                  onClick={() => setShowManagerAuth(true)}
                  className="w-full bg-primary text-white py-3 px-6 rounded-lg hover:bg-primary-dark transition-colors font-medium"
                  data-testid="button-get-started-manager"
                >
                  Get Started as Manager
                </button>
              </div>
            </div>

            {/* Contributor Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-users text-2xl text-green-600"></i>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">Contributors</h3>
                <p className="text-gray-600 mb-8">Submit contributions and view transparent fund usage with your event code.</p>
                <button 
                  onClick={() => setShowContributorAccess(true)}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  data-testid="button-access-event-contributor"
                >
                  Access Event
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-lg text-gray-600">Simple, transparent, and secure event funding management</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-calendar-plus text-primary"></i>
              </div>
              <h3 className="text-xl font-semibold mb-3">Create Events</h3>
              <p className="text-gray-600">Set up events with details, invite co-managers, and generate contributor access codes.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-hand-holding-usd text-green-600"></i>
              </div>
              <h3 className="text-xl font-semibold mb-3">Track Contributions</h3>
              <p className="text-gray-600">Contributors submit requests that managers verify before adding to the total fund.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-receipt text-amber-600"></i>
              </div>
              <h3 className="text-xl font-semibold mb-3">Monitor Expenses</h3>
              <p className="text-gray-600">Add expenses with receipts and provide complete transparency to all contributors.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AuthModal 
        isOpen={showManagerAuth} 
        onClose={() => setShowManagerAuth(false)}
        onForgotPassword={() => {
          setShowManagerAuth(false);
          setShowForgotPassword(true);
        }}
      />
      
      <ForgotPasswordModal 
        isOpen={showForgotPassword} 
        onClose={() => setShowForgotPassword(false)}
        onBackToSignIn={() => {
          setShowForgotPassword(false);
          setShowManagerAuth(true);
        }}
      />
      
      <ContributorAccessModal 
        isOpen={showContributorAccess} 
        onClose={() => setShowContributorAccess(false)} 
      />
    </div>
  );
}
