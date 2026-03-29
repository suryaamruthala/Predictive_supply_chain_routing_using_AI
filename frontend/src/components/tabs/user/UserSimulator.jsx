import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Terminal, Crosshair, Send, Cpu, Fingerprint, Zap } from 'lucide-react';

const UserSimulator = ({ currentUser }) => {
    const [payload, setPayload] = useState({
        name: '',
        origin: '',
        destination: ''
    });
    
    const [isSimulating, setIsSimulating] = useState(false);
    const [terminalLogs, setTerminalLogs] = useState([
        `[${new Date().toLocaleTimeString()}] AUTH_VERIFIED: ${currentUser.username || 'GUEST_OVERRIDE'}`,
        `[${new Date().toLocaleTimeString()}] SYSTEM_READY. AWAITING DISPATCH PARAMETERS...`
    ]);

    const addLog = (msg) => {
        setTerminalLogs(prev => [...prev.slice(-6), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const handleChange = (e) => {
        setPayload({ ...payload, [e.target.name]: e.target.value });
    };

    const handleSimulate = async (e) => {
        e.preventDefault();
        if (!payload.name || !payload.origin || !payload.destination) {
            toast.error('All dispatch coordinates require a value.');
            return;
        }

        setIsSimulating(true);
        addLog(`SEQUENCE_INITIATED: Validating grid vector ${payload.origin} -> ${payload.destination}`);
        
        setTimeout(() => addLog(`AI_HANDSHAKE: Requesting deep-learning path synthesis...`), 800);

        try {
            // Attach current user's username to the simulation payload to establish ownership
            const finalData = { ...payload, username: currentUser.username || 'anonymous' };
            
            await axios.post('http://localhost:8080/api/shipments', finalData);
            
            setTimeout(() => {
                addLog(`DISPATCH_SUCCESS: Payload "${payload.name}" securely locked into telemetry.`);
                toast.success('Simulation Sequence Complete. Neural route generated.');
                setIsSimulating(false);
                setPayload({ name: '', origin: '', destination: '' });
            }, 1800);
            
        } catch (error) {
            addLog(`ERROR: Grid alignment failed. Secure connection dropped.`);
            toast.error('Simulation Failed. Check mainframe connection.');
            setIsSimulating(false);
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-6 relative">
            
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[20%] left-[10%] w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px]"></div>
                <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#07090F]/80 to-[#07090F]"></div>
            </div>

            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 z-10">
                
                {/* Form Section */}
                <div className="bg-[#0D111A]/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                            <Cpu className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-widest uppercase">Simulation Rig</h2>
                            <p className="text-xs text-slate-500 font-mono tracking-widest mt-1">SECURE VECTOR INJECTION</p>
                        </div>
                    </div>

                    <form onSubmit={handleSimulate} className="flex flex-col gap-6 flex-1">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Fingerprint className="w-3 h-3 text-blue-400" /> Cargo Identifier
                            </label>
                            <input 
                                type="text" 
                                name="name" 
                                value={payload.name} 
                                onChange={handleChange} 
                                disabled={isSimulating}
                                placeholder="e.g. Operation Titan, Medical Supplies..."
                                className="bg-[#131825] border border-white/5 focus:border-blue-500/50 rounded-xl px-5 py-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all shadow-inner font-medium"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Crosshair className="w-3 h-3 text-cyan-400" /> Origin Coordinate (City)
                            </label>
                            <input 
                                type="text" 
                                name="origin" 
                                value={payload.origin} 
                                onChange={handleChange} 
                                disabled={isSimulating}
                                placeholder="Enter departure node..."
                                className="bg-[#131825] border border-white/5 focus:border-cyan-500/50 rounded-xl px-5 py-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all shadow-inner font-medium"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Crosshair className="w-3 h-3 text-purple-400" /> Target Coordinate (City)
                            </label>
                            <input 
                                type="text" 
                                name="destination" 
                                value={payload.destination} 
                                onChange={handleChange} 
                                disabled={isSimulating}
                                placeholder="Enter arrival node..."
                                className="bg-[#131825] border border-white/5 focus:border-purple-500/50 rounded-xl px-5 py-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all shadow-inner font-medium"
                            />
                        </div>

                        <div className="mt-auto pt-6">
                            <button 
                                type="submit" 
                                disabled={isSimulating}
                                className={`w-full group relative overflow-hidden flex items-center justify-center gap-3 py-4 rounded-xl font-black text-sm tracking-[0.2em] transition-all duration-500 ${isSimulating ? 'bg-slate-800 text-slate-500 border border-slate-700' : 'bg-blue-600 text-white shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:shadow-[0_0_50px_rgba(37,99,235,0.5)] hover:-translate-y-1 hover:bg-blue-500'}`}
                            >
                                {isSimulating ? (
                                    <>
                                        <Zap className="w-5 h-5 animate-pulse text-blue-400" />
                                        GENERATING...
                                    </>
                                ) : (
                                    <>
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                        <Send className="w-5 h-5" />
                                        INITIATE SEQUENCE
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Terminal Display Section */}
                <div className="bg-[#05060A] border rounded-3xl p-1 border-white/5 shadow-2xl flex flex-col relative overflow-hidden h-[500px] lg:h-auto">
                    {/* Retro CRT scanline effect */}
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-10 opacity-40"></div>
                    
                    <div className="bg-[#0A0D14] flex-1 rounded-[22px] border border-blue-500/10 p-6 flex flex-col relative">
                        <div className="flex items-center justify-between border-b border-blue-500/20 pb-4 mb-4">
                            <div className="flex items-center gap-3">
                                <Terminal className="w-5 h-5 text-green-400" />
                                <span className="text-green-400 font-mono text-xs font-bold tracking-widest">LOGI_OS // TERMINAL OUTPUT</span>
                            </div>
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500/80 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
                            </div>
                        </div>

                        <div className="flex-1 font-mono text-xs leading-relaxed flex flex-col gap-3 z-20">
                            {terminalLogs.map((log, idx) => (
                                <div key={idx} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <span className="text-slate-600 select-none">~</span>
                                    <span className={log.includes('ERROR') ? 'text-red-400' : log.includes('SUCCESS') ? 'text-blue-400 font-bold' : log.includes('AUTH') ? 'text-purple-400' : 'text-green-400/90'}>
                                        {log}
                                        {idx === terminalLogs.length - 1 && !isSimulating && <span className="inline-block w-2 h-[1em] bg-green-400 align-middle ml-1 animate-pulse"></span>}
                                    </span>
                                </div>
                            ))}
                            {isSimulating && (
                                <div className="mt-4 flex gap-3 text-blue-400 animate-pulse">
                                    <span>~</span>
                                    <span>[SYSTEM] Routing Neural Engine... please wait...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
            </div>
        </div>
    );
};

export default UserSimulator;
