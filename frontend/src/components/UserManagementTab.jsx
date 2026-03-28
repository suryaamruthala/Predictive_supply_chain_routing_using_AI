import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserPlus, X, Shield, CheckCircle2 } from 'lucide-react';

// roleColor utility removed for project simplification

const UserManagementTab = ({ toast }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ username: '', password: '' });

    const fetchUsers = async () => {
        try {
            const res = await axios.get('http://localhost:8080/api/users');
            setUsers(res.data);
        } catch (e) {
            // Fallback mock
            setUsers([
                { id: 1, username: 'admin' },
                { id: 2, username: 'fleet_cmd_01' },
                { id: 3, username: 'logistics_mgr' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:8080/api/users/register', form);
            toast.success(`Operator "${form.username}" provisioned successfully.`);
            setForm({ username: '', password: '' });
            setShowForm(false);
            fetchUsers();
        } catch (err) {
            toast.error('Registration failed. Check backend connection.');
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-[#1A1D27] rounded-lg border border-[#262A38] p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#2A2E3E]">
                <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-purple-500"/>
                    <h2 className="text-xl font-bold text-gray-200">Access Control & Operators</h2>
                </div>
                <button onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/40 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    {showForm ? <X className="w-4 h-4"/> : <UserPlus className="w-4 h-4"/>}
                    {showForm ? 'Cancel' : 'Provision Operator'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleRegister} className="mb-5 bg-[#242A38] border border-[#3A435A] rounded-lg p-5 flex flex-col gap-4">
                    <h3 className="font-semibold text-gray-200 text-sm">New Operator Registration</h3>
                    <div className="flex gap-4">
                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-xs text-gray-500 font-semibold uppercase">Username</label>
                            <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} required
                                className="bg-[#1A1D27] border border-[#3A435A] rounded px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500 transition-colors"
                                placeholder="e.g. fleet_cmd_02" />
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-xs text-gray-500 font-semibold uppercase">Password</label>
                            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required
                                className="bg-[#1A1D27] border border-[#3A435A] rounded px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500 transition-colors"
                                placeholder="••••••••" />
                        </div>
                        <div className="flex flex-col justify-end">
                            <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4"/> Create
                            </button>
                        </div>
                    </div>
                </form>
            )}

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-[#1C1F2B] z-10">
                        <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-[#2A2E3E]">
                            <th className="py-3 px-4 text-left">ID</th>
                            <th className="py-3 px-4 text-left">Username</th>
                            <th className="py-3 px-4 text-left">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#262A38]">
                        {loading ? (
                            <tr><td colSpan={4} className="py-12 text-center text-gray-500 italic">Loading operators...</td></tr>
                        ) : users.map((user) => (
                            <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                <td className="py-3 px-4 font-mono text-gray-500 text-xs">#{user.id}</td>
                                <td className="py-3 px-4 font-semibold text-gray-200 flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                                        {user.username?.charAt(0).toUpperCase()}
                                    </div>
                                    {user.username}
                                </td>
                                <td className="py-3 px-4">
                                    <span className="text-xs font-semibold text-green-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span> Active
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagementTab;
