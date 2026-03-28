import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Simple hardcoded check for the admin panel
    if (username === 'admin' && password === 'admin123') {
      sessionStorage.setItem('isAdmin', 'true');
      navigate('/admin/dashboard');
    } else {
      setError('Invalid admin credentials');
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0a0f1c] text-white">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="glass-panel p-10 rounded-2xl w-full max-w-md z-10 relative overflow-hidden border border-white/10 backdrop-blur-xl bg-black/40 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Admin Access
          </h1>
          <p className="text-gray-400 mt-2 text-sm">Secure Logistics Portal</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
              placeholder="Enter admin username"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="mt-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 shadow-[0_0_20px_rgba(var(--color-primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--color-primary),0.5)] active:scale-[0.98]"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
