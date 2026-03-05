import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import CoachDashboard from "./pages/CoachDashboard";
import FighterDashboard from "./pages/FighterDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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

            {/* Protected: Organiser */}
            <Route
              path="/organiser/dashboard"
              element={
                <ProtectedRoute requiredRole="organiser">
                  <OrganiserDashboard />
                </ProtectedRoute>
              }
            />

            {/* Protected: Coach */}
            <Route
              path="/coach/dashboard"
              element={
                <ProtectedRoute requiredRole="coach">
                  <CoachDashboard />
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

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
