import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Bookings from "@/pages/bookings";
import Analytics from "@/pages/analytics";
import Expenses from "@/pages/expenses";
import AdSpendPage from "@/pages/ad-spend";
import AdAnalyticsPage from "@/pages/ad-analytics";
import DailyIncomePage from "@/pages/daily-income";
import LeaveManagement from "@/pages/leave-management";
import UserManagement from "@/pages/user-management";
import Configuration from "@/pages/configuration";
import CRM from "@/pages/crm";
import FollowUps from "@/pages/follow-ups";
import FeedbackManagement from "@/pages/feedback-management";
import RefundsPage from "@/pages/refunds";
import AdminSettings from "@/pages/admin-settings";
import LoginTrackerPage from "@/pages/login-tracker";
import NotFound from "@/pages/not-found";
import CustomerTicketsPage from "@/pages/customer-tickets";
import AdminLeavePage from "@/pages/admin-leave";
import NotificationsPage from "@/pages/notifications";
import LeadInfoPage from "@/pages/lead-info";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-lg">Loading ROSAE Theatre Management...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/bookings" component={Bookings} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/ad-spend" component={AdSpendPage} />
      <Route path="/ad-analytics" component={AdAnalyticsPage} />
      <Route path="/daily-income" component={DailyIncomePage} />
      <Route path="/leave-management" component={LeaveManagement} />
      <Route path="/admin/leave" component={AdminLeavePage} />
      <Route path="/user-management" component={UserManagement} />
      <Route path="/configuration" component={Configuration} />
      <Route path="/crm" component={CRM} />
      <Route path="/follow-ups" component={FollowUps} />
      <Route path="/feedback-management" component={FeedbackManagement} />
      <Route path="/refunds" component={RefundsPage} />
      <Route path="/admin-settings" component={AdminSettings} />
      <Route path="/customer-tickets" component={CustomerTicketsPage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/lead-info" component={LeadInfoPage} />
      <Route path="/login-tracker" component={LoginTrackerPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </SidebarProvider>
    </QueryClientProvider>
  );
}

export default App;
