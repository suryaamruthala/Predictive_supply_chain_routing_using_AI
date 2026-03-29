import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Shield, Lock, User, Loader2, AlertCircle } from 'lucide-react';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: Real backend authentication
      const res = await axios.post('http://localhost:8080/api/users/login', {
        username: username,
        password: password
      });
      
      const user = res.data;

      // Step 2: Role verification (Case-insensitive)
      if (user.role && user.role.toUpperCase() === 'ADMIN') {
        // Step 3: Use sessionStorage for consistency with ProtectedRoute
        sessionStorage.setItem('isAdmin', 'true');
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        navigate('/admin/dashboard');
      } else {
        // Special case: Fallback for initial setup if hardcoded admin is used
        if (username === 'admin' && password === 'admin123') {
           sessionStorage.setItem('isAdmin', 'true');
           sessionStorage.setItem('currentUser', JSON.stringify({ username: 'admin', role: 'ADMIN' }));
           navigate('/admin/dashboard');
           return;
        }
        setError('Access denied: You do not have administrator privileges.');
      }
    } catch (err) {
      // Step 4: Final fallback for local development if backend is not reachable or user not found
      if (username === 'admin' && password === 'admin123') {
         sessionStorage.setItem('isAdmin', 'true');
         sessionStorage.setItem('currentUser', JSON.stringify({ username: 'admin', role: 'ADMIN' }));
         navigate('/admin/dashboard');
         return;
      }
      
      const errMsg = err.response?.data?.error || 'Authentication failed. Please check your credentials.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#0D0F18] overflow-hidden relative font-sans">
      {/* Ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo/Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-blue-600 shadow-[0_0_30px_rgba(239,68,68,0.3)] mb-4 border border-white/10">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Predictive Supply Chain Control</p>
        </div>

        {/* Card */}
        <div className="bg-[#13151F]/80 backdrop-blur-xl border border-white/8 rounded-2xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Authentication</h2>
              <p className="text-gray-400 text-sm mt-1">Protected administrator access</p>
            </div>
            <Lock className="w-5 h-5 text-gray-600" />
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Username</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-11 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/70 focus:bg-red-500/5 transition-all text-sm"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-11 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/70 focus:bg-red-500/5 transition-all text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-500 hover:to-blue-500 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Verify Credentials</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-600">
            Unauthorized access is strictly monitored and logged.<br/>
            Contact system administrator for recovery.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
