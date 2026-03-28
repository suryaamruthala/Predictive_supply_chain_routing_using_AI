import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Package, Mail, KeyRound, Lock, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2, Loader2, Copy } from 'lucide-react';

/* ── Step 1: enter email → get token
   Step 2: enter token + new password → reset ── */

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep]         = useState(1);          // 1 = email, 2 = reset
    const [email, setEmail]       = useState('');
    const [token, setToken]       = useState('');
    const [demoToken, setDemoToken] = useState('');       // returned by backend for demo
    const [newPwd, setNewPwd]     = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [showPwd, setShowPwd]   = useState(false);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState('');
    const [success, setSuccess]   = useState('');

    /* ── Step 1: request reset token ── */
    const handleRequestReset = async e => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const res = await axios.post('http://localhost:8080/api/users/forgot-password', { email });
            setDemoToken(res.data.token ?? '');        // demo only – remove in prod
            setSuccess('Reset token sent! Check your email. In this demo, the token is shown below.');
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.error || 'Could not find an account with that email.');
        } finally {
            setLoading(false);
        }
    };

    /* ── Step 2: submit token + new password ── */
    const handleReset = async e => {
        e.preventDefault();
        setError('');
        if (newPwd.length < 6)       { setError('Password must be at least 6 characters.'); return; }
        if (newPwd !== confirmPwd)   { setError('Passwords do not match.'); return; }
        setLoading(true);
        try {
            await axios.post('http://localhost:8080/api/users/reset-password', {
                token:       token.trim().toUpperCase(),
                newPassword: newPwd,
            });
            setSuccess('Password reset successful! Redirecting to login…');
            setTimeout(() => navigate('/login'), 2500);
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid or expired token. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyToken = () => {
        navigator.clipboard.writeText(demoToken);
        setToken(demoToken);
    };

    return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-[#0D0F18] overflow-hidden relative font-sans">
            {/* Ambient glows */}
            <div className="absolute top-[-15%] left-[-5%] w-[550px] h-[550px] bg-cyan-600/8 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[480px] h-[480px] bg-blue-600/8 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-md mx-4">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_30px_rgba(6,182,212,0.35)] mb-4">
                        <Package className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Supply Chain AI</h1>
                    <p className="text-gray-500 text-sm mt-1">Account Recovery</p>
                </div>

                {/* Card */}
                <div className="bg-[#13151F]/80 backdrop-blur-xl border border-white/8 rounded-2xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">

                    {/* Step indicator */}
                    <div className="flex items-center gap-2 mb-6">
                        {[
                            { n: 1, label: 'Verify Email' },
                            { n: 2, label: 'Reset Password' },
                        ].map(({ n, label }, i) => (
                            <React.Fragment key={n}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                        step >= n ? 'bg-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)]' : 'bg-white/10 text-gray-500'
                                    }`}>{n}</div>
                                    <span className={`text-xs font-medium hidden sm:block ${step >= n ? 'text-gray-300' : 'text-gray-600'}`}>{label}</span>
                                </div>
                                {i < 1 && <div className={`flex-1 h-px mx-1 transition-all ${step >= 2 ? 'bg-cyan-500/50' : 'bg-white/8'}`} />}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* ── STEP 1: Email form ── */}
                    {step === 1 && (
                        <>
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-cyan-400" /> Forgot your password?
                                </h2>
                                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                                    Enter the email address associated with your account and we'll send you a secure reset token.
                                </p>
                            </div>

                            <form onSubmit={handleRequestReset} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-gray-300">Email address</label>
                                    <input
                                        id="forgot-email"
                                        type="email"
                                        value={email}
                                        onChange={e => { setEmail(e.target.value); setError(''); }}
                                        placeholder="you@company.com"
                                        required
                                        autoFocus
                                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/70 focus:bg-cyan-500/5 transition-all text-sm"
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                                        <AlertCircle className="w-4 h-4 shrink-0" />{error}
                                    </div>
                                )}

                                <button
                                    id="forgot-send"
                                    type="submit"
                                    disabled={loading}
                                    className="mt-1 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                    {loading ? 'Sending reset token…' : 'Send Reset Token'}
                                </button>
                            </form>
                        </>
                    )}

                    {/* ── STEP 2: Token + new password ── */}
                    {step === 2 && (
                        <>
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <KeyRound className="w-5 h-5 text-cyan-400" /> Enter reset token
                                </h2>
                                <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                                    We sent a token to <span className="text-cyan-400 font-medium">{email}</span>. Enter it below along with your new password.
                                </p>
                            </div>

                            {/* Demo token reveal box */}
                            {demoToken && (
                                <div className="mb-5 bg-cyan-500/8 border border-cyan-500/20 rounded-xl px-4 py-3">
                                    <p className="text-xs text-cyan-400/70 font-medium mb-1.5 uppercase tracking-wider">📬 Demo Mode — Your Reset Token</p>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="font-mono text-xl font-bold text-cyan-300 tracking-[0.3em]">{demoToken}</span>
                                        <button
                                            type="button"
                                            onClick={copyToken}
                                            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-white bg-cyan-500/15 hover:bg-cyan-500/25 px-3 py-1.5 rounded-lg transition-all font-medium border border-cyan-500/20"
                                        >
                                            <Copy className="w-3.5 h-3.5" /> Copy & Fill
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-2">In production, this token is only sent via email.</p>
                                </div>
                            )}

                            <form onSubmit={handleReset} className="flex flex-col gap-4">
                                {/* Token input */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-gray-300">Reset Token</label>
                                    <input
                                        id="forgot-token"
                                        type="text"
                                        value={token}
                                        onChange={e => { setToken(e.target.value.toUpperCase()); setError(''); }}
                                        placeholder="e.g. A1B2C3D4"
                                        required
                                        maxLength={8}
                                        autoFocus
                                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/70 focus:bg-cyan-500/5 transition-all text-sm font-mono tracking-widest text-center"
                                    />
                                </div>

                                {/* New password */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-gray-300">New password</label>
                                    <div className="relative">
                                        <input
                                            id="forgot-newpwd"
                                            type={showPwd ? 'text' : 'password'}
                                            value={newPwd}
                                            onChange={e => { setNewPwd(e.target.value); setError(''); }}
                                            placeholder="Min. 6 characters"
                                            required
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/70 focus:bg-cyan-500/5 transition-all text-sm"
                                        />
                                        <button type="button" onClick={() => setShowPwd(p => !p)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                                            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm password */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-gray-300">Confirm new password</label>
                                    <input
                                        id="forgot-confirmpwd"
                                        type="password"
                                        value={confirmPwd}
                                        onChange={e => { setConfirmPwd(e.target.value); setError(''); }}
                                        placeholder="Re-enter new password"
                                        required
                                        className={`bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition-all text-sm ${
                                            confirmPwd && confirmPwd !== newPwd
                                                ? 'border-red-500/60'
                                                : 'border-white/10 focus:border-cyan-500/70'
                                        }`}
                                    />
                                    {confirmPwd && confirmPwd !== newPwd && (
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

                                <button
                                    id="forgot-reset"
                                    type="submit"
                                    disabled={loading || !!success}
                                    className="mt-1 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                    {loading ? 'Resetting password…' : 'Reset Password'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setStep(1); setError(''); setSuccess(''); setToken(''); }}
                                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors text-center"
                                >
                                    ← Use a different email
                                </button>
                            </form>
                        </>
                    )}

                    {/* Back to login */}
                    <div className="mt-6 pt-5 border-t border-white/8">
                        <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
