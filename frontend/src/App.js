import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AITextPlatform from './components/AITextPlatform.js';
import Login from './components/Login.js';
import axios from 'axios';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [redirectToLogin, setRedirectToLogin] = useState(false);

  useEffect(() => {
    // Immer zuerst abgemeldet starten, aber NICHT localStorage löschen!
    setIsAuthenticated(false);
    setUser(null);
    setIsLoading(false);
    // Kein automatisches Token-Setzen, kein Auto-Login!
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
    // Nach Login: Token für Axios setzen
    const token = localStorage.getItem('praivio_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('praivio_token');
    localStorage.removeItem('praivio_user');
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
    <Router>
      {redirectToLogin && <Navigate to="/login" replace />}
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <Login onLoginSuccess={handleLoginSuccess} />
          </PublicRoute>
        } />
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
    </Router>
  );
}

export default App; 