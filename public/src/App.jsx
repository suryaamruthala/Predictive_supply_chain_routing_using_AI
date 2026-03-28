import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import UserLogin from './components/UserLogin';
import UserRegister from './components/UserRegister';
import ForgotPassword from './components/ForgotPassword';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root → public Dashboard (no login required) */}
        <Route path="/" element={<Dashboard />} />

        {/* User auth flow */}
        <Route path="/login"           element={<UserLogin />} />
        <Route path="/register"        element={<UserRegister />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Admin login page */}
        <Route path="/admin" element={<AdminLogin />} />

        {/* Admin dashboard (protected — requires login) */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all → back to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

