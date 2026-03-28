import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Package, LogIn, AlertCircle, Loader2 } from 'lucide-react';

const UserLogin = () => {
    const navigate = useNavigate();
    const [form, setForm]     = useState({ username: '', password: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError]   = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:8080/api/users/login', form);
            const user = res.data;
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            navigate('/user/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-[#0D0F18] overflow-hidden relative font-sans">
            {/* Ambient glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/5 rounded-full blur-[200px] pointer-events-none" />

            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-md mx-4">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_0_30px_rgba(59,130,246,0.4)] mb-4">
                        <Package className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Supply Chain AI</h1>
                    <p className="text-gray-500 text-sm mt-1">Intelligent Logistics Platform</p>
                </div>

                {/* Card */}
                <div className="bg-[#13151F]/80 backdrop-blur-xl border border-white/8 rounded-2xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-white">Welcome back</h2>
                        <p className="text-gray-400 text-sm mt-1">Sign in to your account to continue</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {/* Username */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-gray-300">Username or Email</label>
                            <input
                                id="login-username"
                                type="text"
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                                placeholder="Enter username or email"
                                required
                                autoComplete="username"
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/70 focus:bg-blue-500/5 transition-all text-sm"
                            />
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-300">Password</label>
                                <Link to="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    id="login-password"
                                    type={showPwd ? 'text' : 'password'}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/70 focus:bg-blue-500/5 transition-all text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd(p => !p)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            id="login-submit"
                            type="submit"
                            disabled={loading}
                            className="mt-2 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                            {loading ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-white/8" />
                        <span className="text-xs text-gray-600 font-medium">or</span>
                        <div className="flex-1 h-px bg-white/8" />
                    </div>

                    {/* Register link */}
                    <p className="text-center text-sm text-gray-500">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                            Create account
                        </Link>
                    </p>
                </div>

                {/* Admin link */}
                <p className="text-center text-xs text-gray-700 mt-5">
                    Are you an admin?{' '}
                    <Link to="/admin" className="text-gray-500 hover:text-gray-400 transition-colors">
                        Admin portal →
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default UserLogin;
