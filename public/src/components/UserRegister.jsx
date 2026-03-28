import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Package, UserPlus, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

const ROLES = ['ANALYST', 'MANAGER', 'LOGISTICS_OFFICER'];

const strength = pwd => {
    if (!pwd) return 0;
    let s = 0;
    if (pwd.length >= 8)      s++;
    if (/[A-Z]/.test(pwd))    s++;
    if (/[0-9]/.test(pwd))    s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    return s; // 0-4
};

const strengthLabel = s => ['', 'Weak', 'Fair', 'Good', 'Strong'][s];
const strengthColor = s => ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][s];

const UserRegister = () => {
    const navigate = useNavigate();
    const [form, setForm]       = useState({ username: '', email: '', password: '', confirm: '', role: 'ANALYST' });
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError]     = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [usernameTaken, setUsernameTaken] = useState(false);
    const [checkingUsername, setCheckingUsername] = useState(false);

    const handleChange = e => {
        const { name, value } = e.target;
        setForm(p => ({ ...p, [name]: value }));
        setError('');
        if (name === 'username') setUsernameTaken(false);
    };

    const checkUsername = async () => {
        if (form.username.length < 3) return;
        setCheckingUsername(true);
        try {
            const res = await axios.get(`http://localhost:8080/api/users/check-username/${form.username}`);
            setUsernameTaken(res.data.taken);
        } catch (_) {}
        setCheckingUsername(false);
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
        if (form.password.length < 6)        { setError('Password must be at least 6 characters'); return; }
        if (usernameTaken)                   { setError('Username is already taken'); return; }

        setLoading(true);
        try {
            await axios.post('http://localhost:8080/api/users/register', {
                username: form.username,
                email:    form.email,
                password: form.password,
                role:     form.role,
            });
            setSuccess('Account created! Redirecting to login…');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const pwd = form.password;
    const pwdStrength = strength(pwd);

    return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-[#0D0F18] overflow-hidden relative font-sans py-8">
            {/* Ambient glows */}
            <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-md mx-4">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_30px_rgba(99,102,241,0.4)] mb-4">
                        <Package className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Supply Chain AI</h1>
                    <p className="text-gray-500 text-sm mt-1">Create your account</p>
                </div>

                {/* Card */}
                <div className="bg-[#13151F]/80 backdrop-blur-xl border border-white/8 rounded-2xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-white">Create account</h2>
                        <p className="text-gray-400 text-sm mt-1">Join the platform to get started</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {/* Username */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-gray-300">Username</label>
                            <div className="relative">
                                <input
                                    id="reg-username"
                                    type="text"
                                    name="username"
                                    value={form.username}
                                    onChange={handleChange}
                                    onBlur={checkUsername}
                                    placeholder="Choose a username"
                                    required
                                    minLength={3}
                                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 pr-10 text-white placeholder-gray-600 focus:outline-none transition-all text-sm ${
                                        usernameTaken ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-indigo-500/70 focus:bg-indigo-500/5'
                                    }`}
                                />
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                    {checkingUsername && <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />}
                                    {!checkingUsername && usernameTaken && <AlertCircle className="w-4 h-4 text-red-400" />}
                                    {!checkingUsername && !usernameTaken && form.username.length >= 3 && (
                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                    )}
                                </div>
                            </div>
                            {usernameTaken && <p className="text-xs text-red-400">Username is already taken</p>}
                        </div>

                        {/* Email */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-gray-300">Email address</label>
                            <input
                                id="reg-email"
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="you@company.com"
                                required
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/70 focus:bg-indigo-500/5 transition-all text-sm"
                            />
                        </div>

                        {/* Role */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-gray-300">Role</label>
                            <select
                                id="reg-role"
                                name="role"
                                value={form.role}
                                onChange={handleChange}
                                className="bg-[#1A1D2A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500/70 transition-all text-sm appearance-none cursor-pointer"
                            >
                                {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                            </select>
                        </div>

                        {/* Password */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-gray-300">Password</label>
                            <div className="relative">
                                <input
                                    id="reg-password"
                                    type={showPwd ? 'text' : 'password'}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="Min. 6 characters"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/70 focus:bg-indigo-500/5 transition-all text-sm"
                                />
                                <button type="button" onClick={() => setShowPwd(p => !p)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {/* Strength meter */}
                            {pwd && (
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex gap-1 flex-1">
                                        {[1,2,3,4].map(i => (
                                            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= pwdStrength ? strengthColor(pwdStrength) : 'bg-white/10'}`} />
                                        ))}
                                    </div>
                                    <span className={`text-xs font-medium ${strengthColor(pwdStrength).replace('bg-','text-')}`}>
                                        {strengthLabel(pwdStrength)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Confirm */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-gray-300">Confirm password</label>
                            <input
                                id="reg-confirm"
                                type="password"
                                name="confirm"
                                value={form.confirm}
                                onChange={handleChange}
                                placeholder="Re-enter your password"
                                required
                                className={`bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition-all text-sm ${
                                    form.confirm && form.confirm !== form.password
                                        ? 'border-red-500/60'
                                        : 'border-white/10 focus:border-indigo-500/70'
                                }`}
                            />
                            {form.confirm && form.confirm !== form.password && (
                                <p className="text-xs text-red-400">Passwords do not match</p>
                            )}
                        </div>

                        {/* Error / Success */}
                        {error && (
                            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                                <AlertCircle className="w-4 h-4 shrink-0" />{error}
                            </div>
                        )}
                        {success && (
                            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-sm text-green-400">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />{success}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            id="reg-submit"
                            type="submit"
                            disabled={loading || !!success}
                            className="mt-2 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            {loading ? 'Creating account…' : 'Create Account'}
                        </button>
                    </form>

                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-white/8" />
                        <span className="text-xs text-gray-600 font-medium">or</span>
                        <div className="flex-1 h-px bg-white/8" />
                    </div>

                    <p className="text-center text-sm text-gray-500">
                        Already have an account?{' '}
                        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UserRegister;
