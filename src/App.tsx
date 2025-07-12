import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Classes from "./pages/Classes";
import Attendance from "./pages/Attendance";
import Payments from "./pages/Payments";
import Grades from "./pages/Grades";
import Teachers from "./pages/Teachers";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import DefaultClasses from "./pages/DefaultClasses";
import Login from "./pages/Login";
import { useSyncAuto } from "./syncAuto";
import { AuthProvider, useAuth } from "./context/AuthContext";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return user ? children : <Navigate to="/login" replace />;
};

const App = () => {
  useSyncAuto();

  useEffect(() => {
    const { ipcRenderer } = window.require('electron');

    const handleSyncLog = (event, { level, message, details }) => {
      console.log(`[SYNC LOG] ${level}: ${message}`, details);
      switch (level) {
        case 'info':
          toast.info(message, { description: details ? JSON.stringify(details) : '' });
          break;
        case 'success':
          toast.success(message, { description: details ? JSON.stringify(details) : '' });
          break;
        case 'warn':
          toast.warning(message, { description: details ? JSON.stringify(details) : '' });
          break;
        case 'error':
          toast.error(message, { description: details ? JSON.stringify(details.error) : '' });
          break;
        default:
          toast(message, { description: details ? JSON.stringify(details) : '' });
      }
    };

    ipcRenderer.on('sync:log', handleSyncLog);

    return () => {
      ipcRenderer.removeListener('sync:log', handleSyncLog);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <HashRouter>
            <Routes>
              {/* Routes publiques */}
              <Route path="/login" element={<Login />} />
              <Route path="/default-classes" element={<DefaultClasses />} />

              {/* Routes protégées */}
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
              <Route path="/teachers" element={<ProtectedRoute><Teachers /></ProtectedRoute>} />
              <Route path="/classes" element={<ProtectedRoute><Classes /></ProtectedRoute>} />
              <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
              <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
              <Route path="/grades" element={<ProtectedRoute><Grades /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              
              {/* Redirection par défaut */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;