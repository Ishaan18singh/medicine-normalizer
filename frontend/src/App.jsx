import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from './components/ui/sonner';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BulkProcessing from './pages/BulkProcessing';
import PrescriptionScanner from './pages/PrescriptionScanner';
import Analytics from './pages/Analytics';
import ApiPlayground from './pages/ApiPlayground';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const GlobalShortcuts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const handler = (e) => {
      const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!user) return;
        if (location.pathname === '/dashboard') {
          document.getElementById('medicine-input')?.focus();
        } else {
          navigate('/dashboard', { state: { focusSearch: true } });
        }
      } else if (e.key === '/' && !isTyping && user && location.pathname === '/dashboard') {
        e.preventDefault();
        document.getElementById('medicine-input')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, location.pathname, user]);

  return null;
};

function AppRoutes() {
  return (
    <BrowserRouter>
      <GlobalShortcuts />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/bulk" element={<ProtectedRoute><BulkProcessing /></ProtectedRoute>} />
        <Route path="/scanner" element={<ProtectedRoute><PrescriptionScanner /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/api-playground" element={<ProtectedRoute><ApiPlayground /></ProtectedRoute>} />
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;