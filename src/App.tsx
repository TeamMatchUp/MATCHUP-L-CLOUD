import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Fighters from "./pages/Fighters";
import FighterDetail from "./pages/FighterDetail";
import Gyms from "./pages/Gyms";
import GymDetail from "./pages/GymDetail";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import CreateEvent from "./pages/organiser/CreateEvent";
import EventManager from "./pages/organiser/EventManager";
import RegisterGym from "./pages/RegisterGym";
import AccountSettings from "./pages/AccountSettings";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RecordAccuracyPolicy from "./pages/RecordAccuracyPolicy";
import Contact from "./pages/Contact";
import Feedback from "./pages/Feedback";
import AdvertiseEnquiry from "./pages/AdvertiseEnquiry";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import Explore from "./pages/Explore";
import Matchmaking from "./pages/Matchmaking";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="matchup-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/events" element={<Explore />} />
            <Route path="/fighters" element={<Explore />} />
            <Route path="/gyms" element={<Explore />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/events/:eventId/matchmaking" element={<ProtectedRoute requiredRole="organiser"><Matchmaking /></ProtectedRoute>} />
            <Route path="/fighters/:id" element={<FighterDetail />} />
            <Route path="/gyms/:id" element={<GymDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/record-accuracy" element={<RecordAccuracyPolicy />} />
            <Route path="/advertise" element={<AdvertiseEnquiry />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
            <Route path="/admin" element={<Admin />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            {/* Unified Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organiser/dashboard"
              element={
                <ProtectedRoute requiredRole="organiser">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organiser/create-event"
              element={
                <ProtectedRoute requiredRole="organiser">
                  <CreateEvent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organiser/events/:id"
              element={
                <ProtectedRoute requiredRole="organiser">
                  <EventManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gym-owner/dashboard"
              element={
                <ProtectedRoute requiredRole="gym_owner">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coach/dashboard"
              element={
                <ProtectedRoute requiredRole="gym_owner">
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/register-gym"
              element={
                <ProtectedRoute requiredRole="gym_owner">
                  <RegisterGym />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fighter/dashboard"
              element={
                <ProtectedRoute requiredRole="fighter">
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Protected: Account Settings */}
            <Route
              path="/account/settings"
              element={
                <ProtectedRoute>
                  <AccountSettings />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
