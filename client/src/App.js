import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { API_URL } from './config';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AddWorkout from './components/AddWorkout';
import ActiveSession from './components/ActiveSession';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

export const AuthContext = createContext();

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await fetch(`${API_URL}/api/auth/user`, {
            headers: { 'x-auth-token': token }
          });
          if (!isMounted) return;
          
          if (res.ok) {
            const data = await res.json();
            setUser(data);
          } else {
            // Only log out if we are sure the token is invalid
            if (res.status === 401 || res.status === 404) {
              console.log('Token invalid or user not found, logging out...');
              logout();
            }
          }
        } catch (error) {
          console.error('Failed to fetch user:', error);
          // Do not log out on network errors
        }
      }
    };
    
    fetchUser();
    
    return () => {
      isMounted = false;
    };
  }, [token]);

  // V7.0 Offline Sync Architecture
  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      <ToastProvider>
        <Router>
          <div className="app">
            <ErrorBoundary>
              <Routes>
                <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
                <Route path="/register" element={!token ? <Register /> : <Navigate to="/" />} />
                <Route path="/" element={token ? <Dashboard /> : <Navigate to="/login" />} />
                <Route path="/add" element={token ? <AddWorkout /> : <Navigate to="/login" />} />
                <Route path="/session" element={token ? <ActiveSession /> : <Navigate to="/login" />} />
              </Routes>
            </ErrorBoundary>
          </div>
        </Router>
      </ToastProvider>
    </AuthContext.Provider>
  );
};

export default App;