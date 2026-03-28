import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
  const currentUser = sessionStorage.getItem('currentUser');

  if (adminOnly && !isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (!adminOnly && !currentUser && !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
