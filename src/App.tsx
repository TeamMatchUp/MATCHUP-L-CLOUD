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
import OrganiserDashboard from "./pages/OrganiserDashboard";
import CreateEvent from "./pages/organiser/CreateEvent";
import EventManager from "./pages/organiser/EventManager";
import GymOwnerDashboard from "./pages/GymOwnerDashboard";
import RegisterGym from "./pages/RegisterGym";
import FighterDashboard from "./pages/FighterDashboard";
import AccountSettings from "./pages/AccountSettings";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RecordAccuracyPolicy from "./pages/RecordAccuracyPolicy";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="matchup-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/fighters" element={<Fighters />} />
            <Route path="/fighters/:id" element={<FighterDetail />} />
            <Route path="/gyms" element={<Gyms />} />
            <Route path="/gyms/:id" element={<GymDetail />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/record-accuracy" element={<RecordAccuracyPolicy />} />
            <Route path="/contact" element={<Contact />} />

            {/* Protected: Organiser */}
            <Route
              path="/organiser/dashboard"
              element={
                <ProtectedRoute requiredRole="organiser">
                  <OrganiserDashboard />
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

            {/* Protected: Coach (inherits organiser + fighter) */}
            <Route
              path="/gym-owner/dashboard"
              element={
                <ProtectedRoute requiredRole="gym_owner">
                  <GymOwnerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Backward compat: /coach/dashboard redirects to gym-owner */}
            <Route
              path="/coach/dashboard"
              element={
                <ProtectedRoute requiredRole="gym_owner">
                  <GymOwnerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Protected: Coach – Register Gym */}
            <Route
              path="/register-gym"
              element={
                <ProtectedRoute requiredRole="gym_owner">
                  <RegisterGym />
                </ProtectedRoute>
              }
            />

            {/* Protected: Fighter */}
            <Route
              path="/fighter/dashboard"
              element={
                <ProtectedRoute requiredRole="fighter">
                  <FighterDashboard />
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
