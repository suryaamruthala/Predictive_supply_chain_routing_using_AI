import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
  const currentUser = sessionStorage.getItem('currentUser');
  const navigate = useNavigate();

  useEffect(() => {
    // Only set up auto-logout if the user is authenticated in some way
    if (!isAdmin && !currentUser) return;

    let timeoutId;
    
    const logout = () => {
      sessionStorage.removeItem('currentUser');
      sessionStorage.removeItem('isAdmin');
      // Redirect based on whether it was an admin route or user route
      navigate(adminOnly ? '/admin' : '/login', { replace: true });
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // Set auto-logout timeout to 15 minutes (900000 ms)
      timeoutId = setTimeout(logout, 900000);
    };

    // Initialize timer
    resetTimer();

    // Specific events to reset the inactivity timer
    const events = ['mousemove', 'keydown', 'scroll', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAdmin, currentUser, adminOnly, navigate]);

  if (adminOnly && !isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (!adminOnly && !currentUser && !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
