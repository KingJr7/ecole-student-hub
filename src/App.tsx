
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Index from "./pages/Index";
import Students from "./pages/Students";
import Classes from "./pages/Classes";
import Attendance from "./pages/Attendance";
import Payments from "./pages/Payments";
import Grades from "./pages/Grades";
import Teachers from "./pages/Teachers";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Activation from "./pages/Activation";
import activationService from "./lib/activationService";

const queryClient = new QueryClient();

// Composant de protection des routes pour vérifier l'activation
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isActivated, setIsActivated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkActivation = async () => {
      const activated = await activationService.verifyActivation();
      setIsActivated(activated);
      setLoading(false);
    };

    checkActivation();
  }, []);

  if (loading) {
    // Afficher un écran de chargement
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Vérification de l'activation...</p>
        </div>
      </div>
    );
  }

  // Si l'application n'est pas activée, rediriger vers la page d'activation
  if (!isActivated) {
    return <Navigate to="/activation" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Route d'activation accessible sans protection */}
          <Route path="/activation" element={<Activation />} />
          
          {/* Routes protégées */}
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
          <Route path="/teachers" element={<ProtectedRoute><Teachers /></ProtectedRoute>} />
          <Route path="/classes" element={<ProtectedRoute><Classes /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
          <Route path="/grades" element={<ProtectedRoute><Grades /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          {/* Redirection par défaut vers l'activation */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
