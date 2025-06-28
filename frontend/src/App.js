import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AITextPlatform from './components/AITextPlatform.js';
import Login from './components/Login.js';
import axios from 'axios';
import { supabase } from './supabaseClient';
import './App.css';
import Footer from './components/Footer';
import Impressum from './components/Impressum';
import Datenschutz from './components/Datenschutz';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-800 border-2 border-red-500 rounded-xl p-6 text-center">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-4">Ein Fehler ist aufgetreten</h2>
            <p className="text-slate-300 mb-4">
              Es gab ein Problem beim Laden der Anwendung. Bitte laden Sie die Seite neu.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200"
            >
              Seite neu laden
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-red-400 cursor-pointer">Fehlerdetails anzeigen</summary>
                <pre className="text-xs text-red-300 mt-2 bg-slate-900 p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [redirectToLogin, setRedirectToLogin] = useState(false);

  useEffect(() => {
    // Check for existing Supabase session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setIsAuthenticated(true);
        // Set token for API requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
      }
      setIsLoading(false);
    };
    
    checkSession();
  }, []);

  // Hilfskomponente für geschützte Routen
  function PrivateRoute({ children }) {
    return isAuthenticated ? children : <Navigate to="/login" replace />;
  }

  // Hilfskomponente für Login-Route
  function PublicRoute({ children }) {
    return !isAuthenticated ? children : <Navigate to="/" replace />;
  }

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    // Token is already set in Login component
  };

  const handleLogout = async () => {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear local storage
    localStorage.removeItem('supabaseToken');
    localStorage.removeItem('supabaseUser');
    
    // Clear axios headers
    delete axios.defaults.headers.common['Authorization'];
    
    setUser(null);
    setIsAuthenticated(false);
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Lade Praivio...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        {redirectToLogin && <Navigate to="/login" replace />}
        <div className="min-h-screen flex flex-col">
          <div className="flex-1 flex flex-col">
            <Routes>
              <Route path="/login" element={
                <PublicRoute>
                  <Login onLoginSuccess={handleLoginSuccess} />
                </PublicRoute>
              } />
              <Route path="/impressum" element={<Impressum />} />
              <Route path="/datenschutz" element={<Datenschutz />} />
              <Route path="/" element={
                <PrivateRoute>
                  <AITextPlatform user={user} onLogout={handleLogout} />
                </PrivateRoute>
              } />
              <Route path="/models" element={
                <PrivateRoute>
                  <AITextPlatform user={user} onLogout={handleLogout} />
                </PrivateRoute>
              } />
              <Route path="/templates" element={
                <PrivateRoute>
                  <AITextPlatform user={user} onLogout={handleLogout} />
                </PrivateRoute>
              } />
              <Route path="/statistics" element={
                <PrivateRoute>
                  <AITextPlatform user={user} onLogout={handleLogout} />
                </PrivateRoute>
              } />
              <Route path="/settings" element={
                <PrivateRoute>
                  <AITextPlatform user={user} onLogout={handleLogout} />
                </PrivateRoute>
              } />
              <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App; 