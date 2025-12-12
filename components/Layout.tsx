
import React, { useEffect, useState, useRef } from 'react';
import { MessageSquare, Radio, Globe, Settings, Activity, Cpu, Wifi, Database, Shield, LogOut, User as UserIcon, Terminal, Volume2, Palette, X, ChevronUp, ChevronDown, Plus, Trash2, Search, Menu, LayoutTemplate, Mic, WifiOff, HardDrive, CloudRain, CloudSnow, Move, Eye, Monitor } from 'lucide-react';
import { AppMode, User, SystemLog, Thread } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  currentUser: User | null;
  onLogout?: () => void; 
  systemLogs: SystemLog[];
  onUpdateSettings?: (settings: Partial<User>) => void;
  
  // Thread Props
  threads: Thread[];
  activeThreadId: string;
  onSelectThread: (id: string) => void;
  onCreateThread: () => void;
  onDeleteThread: (id: string) => void;
  
  isMigrating?: boolean; 
}

// --- SUB-COMPONENTS ---

const SystemMetrics = () => {
    const [metrics, setMetrics] = useState({ fps: 60, ping: 24, ram: 140 });
    const framesRef = useRef(0);
    const lastTimeRef = useRef(performance.now());

    useEffect(() => {
        const loop = (time: number) => {
            framesRef.current++;
            if (time - lastTimeRef.current >= 1000) {
                setMetrics(prev => ({
                    fps: framesRef.current,
                    ping: 20 + Math.floor(Math.random() * 30),
                    ram: 140 + Math.floor(Math.random() * 50)
                }));
                framesRef.current = 0;
                lastTimeRef.current = time;
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }, []);

    return (
        <div className="fixed bottom-10 right-4 z-[90] flex flex-col gap-1 text-[9px] font-mono text-van-600 bg-black/80 p-2 rounded border border-van-800 pointer-events-none select-none">
            <div className="flex justify-between gap-4"><span>FPS</span><span className="text-van-accent">{metrics.fps}</span></div>
            <div className="flex justify-between gap-4"><span>PING</span><span className={metrics.ping > 100 ? 'text-red-500' : 'text-van-success'}>{metrics.ping}ms</span></div>
            <div className="flex justify-between gap-4"><span>MEM</span><span className="text-van-purple">{metrics.ram}MB</span></div>
        </div>
    );
};

const WeatherOverlay = ({ type }: { type: 'RAIN' | 'SNOW' | 'EMBER' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let particles: {x: number, y: number, speed: number, size: number, opacity: number}[] = [];
        const count = 150;
        
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize);
        resize();

        for(let i=0; i<count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                speed: type === 'SNOW' ? 1 + Math.random() : type === 'EMBER' ? 0.5 + Math.random() : 15 + Math.random() * 10,
                size: type === 'SNOW' ? 2 + Math.random() : 1,
                opacity: Math.random() * 0.5
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = type === 'EMBER' ? '#f97316' : type === 'SNOW' ? '#ffffff' : '#00f0ff';
            
            particles.forEach(p => {
                ctx.globalAlpha = p.opacity;
                if (type === 'RAIN') {
                    ctx.fillRect(p.x, p.y, 1, p.speed); // Rain streak
                } else if (type === 'SNOW') {
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
                } else { // EMBER
                     ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
                }

                p.y += type === 'EMBER' ? -p.speed : p.speed;
                if (type === 'SNOW') p.x += Math.sin(Date.now() * 0.001 + p.y) * 0.5;
                if (type === 'EMBER') p.x += Math.cos(Date.now() * 0.002 + p.y) * 0.5;

                if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
                if (p.y < -10 && type === 'EMBER') { p.y = canvas.height; p.x = Math.random() * canvas.width; }
            });
            requestAnimationFrame(animate);
        };
        const animId = requestAnimationFrame(animate);
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, [type]);

    return <canvas ref={canvasRef} className="absolute inset-0 z-[80] pointer-events-none opacity-40" />;
};

export const Layout: React.FC<LayoutProps> = ({ 
    children, activeMode, onModeChange, currentUser, systemLogs, onUpdateSettings,
    threads, activeThreadId, onSelectThread, onCreateThread, onDeleteThread, isMigrating
}) => {
  const [time, setTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showThreads, setShowThreads] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Tilt State
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Tilt Effect
  useEffect(() => {
      if (!currentUser?.enableTilt) return;
      
      const handleMove = (e: MouseEvent) => {
          const x = (e.clientX / window.innerWidth - 0.5) * 20; // Max tilt deg
          const y = (e.clientY / window.innerHeight - 0.5) * 20;
          setTilt({ x: -y, y: x }); // Invert y
      };
      
      // Mobile Device Orientation
      const handleOrient = (e: DeviceOrientationEvent) => {
           if (e.beta && e.gamma) {
               setTilt({ x: (e.beta - 45) * 0.5, y: e.gamma * 0.5 });
           }
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('deviceorientation', handleOrient);
      return () => {
          window.removeEventListener('mousemove', handleMove);
          window.removeEventListener('deviceorientation', handleOrient);
      };
  }, [currentUser?.enableTilt]);

  const loadColor = systemLogs.length % 2 === 0 ? 'bg-van-success' : 'bg-van-warn';
  const loadWidth = 30 + (new Date().getSeconds());

  const filteredThreads = threads.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  // Theme Classes
  const isCyberprep = currentUser?.theme === 'CYBERPREP';
  const bgColor = isCyberprep ? 'bg-slate-100' : 'bg-van-950';
  const textColor = isCyberprep ? 'text-slate-800' : 'text-slate-300';
  const sidebarColor = isCyberprep ? 'bg-white/80 border-slate-200' : 'bg-van-950/95 border-van-700/50';

  return (
    <div 
        ref={containerRef}
        className={`flex flex-col lg:flex-row h-[100dvh] ${bgColor} ${textColor} ${currentUser?.font === 'RETRO' ? 'font-retro' : 'font-sans'} overflow-hidden relative selection:bg-van-accent selection:text-van-950 touch-manipulation animate-fadeIn`}
        style={{
            perspective: '1000px',
        }}
    >
      
      {/* GLOBAL TRANSFORM WRAPPER FOR TILT */}
      <div className="absolute inset-0 z-0 flex flex-col lg:flex-row h-full w-full transition-transform duration-100 ease-out"
           style={{
               transform: currentUser?.enableTilt ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.02)` : 'none'
           }}>

      {/* FEATURE: WEATHER */}
      {currentUser?.weatherEffect && currentUser.weatherEffect !== 'NONE' && <WeatherOverlay type={currentUser.weatherEffect} />}
      
      {/* FEATURE: METRICS */}
      {currentUser?.showMetrics && <SystemMetrics />}

      {/* FEATURE 93: Offline Mode Banner */}
      {currentUser?.isOfflineMode && (
          <div className="absolute top-8 lg:top-0 left-0 right-0 h-6 bg-yellow-500/20 border-b border-yellow-500/50 z-[55] flex items-center justify-center gap-2 text-[10px] font-bold text-yellow-500 tracking-widest backdrop-blur-md">
              <WifiOff size={12} />
              <span>OFFLINE PROTOCOL ACTIVE // LOCAL STORAGE MODE</span>
          </div>
      )}

      {/* FEATURE 104: Migration Status Bar */}
      {isMigrating && (
          <div className="absolute top-0 left-0 right-0 h-1 z-[100] bg-van-900">
              <div className="h-full bg-van-accent animate-pulse-slow w-full origin-left transition-transform duration-1000"></div>
              <div className="absolute top-2 right-2 bg-black border border-van-accent px-2 py-1 text-[10px] text-van-accent font-mono shadow-[0_0_20px_var(--van-accent)]">
                  MIGRATING DATABASE...
              </div>
          </div>
      )}
      
      {/* Dynamic Animated Grid Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute inset-0 animate-grid-flow"
             style={{
               backgroundImage: `linear-gradient(to right, var(--van-accent) 1px, transparent 1px), linear-gradient(to bottom, var(--van-accent) 1px, transparent 1px)`,
               backgroundSize: '40px 40px',
               height: '200%',
               opacity: isCyberprep ? 0.05 : 0.1
             }}>
        </div>
        <div className={`absolute inset-0 bg-gradient-to-b ${isCyberprep ? 'from-slate-100 via-transparent to-slate-100' : 'from-van-950 via-transparent to-van-950'}`}></div>
      </div>

      {/* TOP SYSTEM HUD */}
      <div className={`absolute top-0 left-0 right-0 h-8 ${isCyberprep ? 'bg-white border-slate-200 text-slate-600' : 'bg-van-900 border-van-700'} border-b flex items-center justify-between px-4 z-[60] text-[10px] font-mono tracking-widest select-none`}>
          <div className="flex items-center gap-4">
              <span className="text-van-accent font-bold">VAANIII_OS v10.0</span>
              <div className="hidden md:flex items-center gap-2">
                  <span className="opacity-50">CPU:</span>
                  <div className={`w-16 h-1.5 ${isCyberprep ? 'bg-slate-200' : 'bg-van-800'} rounded-sm overflow-hidden`}>
                      <div className={`h-full ${loadColor}`} style={{ width: `${loadWidth}%` }}></div>
                  </div>
              </div>
          </div>
          <div className="flex items-center gap-4">
              {currentUser && (
                  <div className="flex items-center gap-2 text-van-purple">
                      <UserIcon size={10} />
                      <span>{currentUser.rank} // LVL {Math.floor(currentUser.xp / 100)}</span>
                  </div>
              )}
              <div className={`w-[1px] h-4 ${isCyberprep ? 'bg-slate-300' : 'bg-van-700'}`}></div>
              <button onClick={() => setShowSettings(true)} className="hover:text-van-accent transition-colors"><Settings size={12} /></button>
              <span>{time.toLocaleTimeString()}</span>
          </div>
      </div>

      {/* Side Tech Rail (Main Nav) */}
      <aside className={`
          w-full h-auto min-h-[3.5rem] lg:w-72 lg:h-full 
          ${sidebarColor} backdrop-blur-xl border-t lg:border-t-0 lg:border-r 
          flex flex-row lg:flex-col justify-between shrink-0 z-50 transition-all duration-300 relative group 
          order-2 lg:order-1
          shadow-[0_-5px_20px_rgba(0,0,0,0.1)] lg:shadow-[10px_0_30px_rgba(0,0,0,0.1)]
          pb-[env(safe-area-inset-bottom)]
          pt-8 lg:pt-0 
      `}>
        {!isCyberprep && <div className="absolute inset-0 opacity-5 pointer-events-none bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,var(--van-accent)_10px,var(--van-accent)_11px)]"></div>}
        
        <div className="flex flex-row lg:flex-col w-full h-full relative z-10 lg:pt-8">
            {/* Logo Area */}
            <div className={`hidden lg:flex p-6 border-b ${isCyberprep ? 'border-slate-200' : 'border-van-700/50'} relative overflow-hidden items-center gap-4`}>
                <div className="w-16 h-16 relative shrink-0 group/logo cursor-pointer animate-float">
                     <div className="absolute inset-0 bg-van-accent/5 blur-xl rounded-full group-hover/logo:bg-van-accent/20 transition-all duration-500"></div>
                     <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 overflow-visible filter drop-shadow-[0_0_5px_rgba(0,240,255,0.3)]">
                        <defs>
                            <linearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="var(--van-accent)" />
                                <stop offset="50%" stopColor="var(--van-purple)" />
                                <stop offset="100%" stopColor="#f97316" />
                            </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r="45" fill="none" stroke="url(#pulseGrad)" strokeWidth="1.5" opacity="0.4" strokeDasharray="60 40" strokeLinecap="round" className="animate-spin-slower" />
                        <circle cx="50" cy="50" r="38" fill="none" stroke="var(--van-accent)" strokeWidth="0.5" opacity="0.2" />
                        <path 
                            d="M 5 50 L 15 50 L 20 40 L 25 55 L 30 30 L 50 85 L 70 30 L 75 55 L 80 40 L 85 50 L 95 50"
                            fill="none"
                            stroke="url(#pulseGrad)"
                            strokeWidth="5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]"
                        />
                    </svg>
                </div>
                <div className="relative z-10">
                    <h1 className="text-2xl font-display font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400">VAANIII</h1>
                    <p className={`text-[9px] font-mono tracking-[0.2em] uppercase ${isCyberprep ? 'text-slate-400' : 'text-van-500'}`}>Hyper-OS v10.0</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-1 lg:py-8 px-1 lg:px-4 flex flex-row lg:flex-col justify-around lg:justify-start items-center lg:items-stretch gap-2 lg:gap-6">
                <NavItem 
                  icon={<MessageSquare className="w-5 h-5 lg:w-5 lg:h-5" />} 
                  label="TERMINAL" 
                  sub="SECURE_CHAT"
                  active={activeMode === AppMode.CHAT} 
                  onClick={() => onModeChange(AppMode.CHAT)} 
                  lightMode={isCyberprep}
                />
                <NavItem 
                  icon={<Radio className="w-5 h-5 lg:w-5 lg:h-5" />} 
                  label="LINK" 
                  sub="VOICE_UPLINK"
                  active={activeMode === AppMode.LIVE} 
                  onClick={() => onModeChange(AppMode.LIVE)} 
                  lightMode={isCyberprep}
                />
                <NavItem 
                  icon={<Globe className="w-5 h-5 lg:w-5 lg:h-5" />} 
                  label="UNIVERSE" 
                  sub="SOLAR_SYSTEM"
                  active={activeMode === AppMode.MAP} 
                  onClick={() => onModeChange(AppMode.MAP)} 
                  lightMode={isCyberprep}
                />
                
                <div className={`lg:hidden w-[1px] h-8 ${isCyberprep ? 'bg-slate-300' : 'bg-van-700'} mx-2`}></div>
                
                {/* Mobile Thread Toggle */}
                <button 
                  onClick={() => setShowThreads(!showThreads)} 
                  className={`lg:hidden flex flex-col items-center gap-1 p-2 rounded-lg ${showThreads ? (isCyberprep ? 'bg-slate-200 text-slate-900' : 'bg-van-800 text-van-accent') : (isCyberprep ? 'text-slate-400' : 'text-van-500')}`}
                >
                    <LayoutTemplate size={20} />
                    <span className="text-[8px] font-bold">THREADS</span>
                </button>
            </nav>
            
            {/* Desktop Thread List */}
            <div className={`hidden lg:flex flex-col border-t ${isCyberprep ? 'border-slate-200' : 'border-van-700/50'} p-4 h-1/3 overflow-hidden`}>
                <div className="flex justify-between items-center mb-2">
                    <span className={`text-[10px] font-bold tracking-widest ${isCyberprep ? 'text-slate-500' : 'text-van-500'}`}>ACTIVE THREADS</span>
                    <button onClick={onCreateThread} className="text-van-accent hover:bg-van-800 p-1 rounded"><Plus size={14} /></button>
                </div>
                <div className="relative mb-2">
                    <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-50" />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..." 
                      className={`w-full border rounded py-1 pl-6 pr-2 text-[10px] focus:border-van-accent outline-none ${isCyberprep ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-van-900 border-van-800 text-van-300'}`}
                    />
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                    {filteredThreads.map(t => (
                        <div key={t.id} onClick={() => onSelectThread(t.id)} className={`group flex items-center justify-between p-2 rounded cursor-pointer text-xs border border-transparent ${activeThreadId === t.id ? (isCyberprep ? 'bg-slate-200 text-slate-900' : 'bg-van-800/50 text-white') : (isCyberprep ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' : 'text-van-400 hover:text-van-200 hover:border-van-700')}`}>
                             <div className="flex flex-col overflow-hidden mr-2 w-full">
                                <div className="truncate font-bold mb-0.5">{t.title}</div>
                                <div className="truncate text-[10px] opacity-60">{t.preview || "No messages yet"}</div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteThread(t.id); }} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 shrink-0"><Trash2 size={10} /></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative z-0 flex flex-col h-full overflow-hidden order-1 lg:order-2 pt-8">
         {children}
      </main>

      {/* MOBILE THREAD DRAWER */}
      {showThreads && (
          <div className="fixed inset-0 z-[80] lg:hidden bg-black/80 backdrop-blur-sm" onClick={() => setShowThreads(false)}>
              <div className={`absolute left-0 top-0 bottom-0 w-64 border-r p-4 ${isCyberprep ? 'bg-white border-slate-200' : 'bg-van-950 border-van-700'}`} onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4 text-van-accent font-bold">
                      <span>THREADS</span>
                      <button onClick={onCreateThread}><Plus size={20} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 h-[80%]">
                    {filteredThreads.map(t => (
                        <div key={t.id} onClick={() => { onSelectThread(t.id); setShowThreads(false); }} className={`p-3 rounded border cursor-pointer transition-colors ${activeThreadId === t.id ? (isCyberprep ? 'bg-slate-200 border-slate-300 text-slate-900' : 'border-van-accent bg-van-900/50 text-white') : (isCyberprep ? 'border-slate-200 text-slate-500 bg-slate-50' : 'border-van-800 text-van-400 bg-van-950')}`}>
                             <div className="font-bold text-xs mb-1">{t.title}</div>
                             <div className="text-[10px] opacity-60 truncate">{t.preview || "No messages yet"}</div>
                             <div className="text-[8px] opacity-40 mt-1 text-right">{t.updatedAt.toLocaleTimeString()}</div>
                        </div>
                    ))}
                    {filteredThreads.length === 0 && <div className="text-center opacity-50 text-xs mt-4">No threads found.</div>}
                  </div>
              </div>
          </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className={`border w-full max-w-md shadow-2xl relative overflow-hidden ${isCyberprep ? 'bg-white border-slate-200 text-slate-900' : 'bg-van-950 border-van-700 text-white'}`}>
                  <div className={`p-4 border-b flex justify-between items-center ${isCyberprep ? 'bg-slate-100 border-slate-200' : 'bg-van-900 border-van-700'}`}>
                      <div className="flex items-center gap-2 text-van-accent font-display font-bold">
                          <Settings size={18} /> <span>SYSTEM CONFIG</span>
                      </div>
                      <button onClick={() => setShowSettings(false)} className="opacity-50 hover:opacity-100"><X size={18} /></button>
                  </div>
                  <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                      
                      {/* Theme Selector */}
                      <div className="space-y-3">
                          <label className="text-xs font-mono opacity-60 tracking-widest flex items-center gap-2"><Palette size={12} /> AESTHETIC PROTOCOL</label>
                          <div className="grid grid-cols-3 gap-2">
                              {['CYAN', 'AMBER', 'PURPLE', 'GREEN', 'CYBERPREP'].map(t => (
                                  <button 
                                    key={t}
                                    onClick={() => onUpdateSettings?.({ theme: t as any })}
                                    className={`h-10 border hover:border-van-accent transition-all relative group ${currentUser?.theme === t ? 'ring-1 ring-van-accent' : 'border-transparent'}`}
                                    style={{ background: t === 'CYAN' ? '#00f0ff' : t === 'AMBER' ? '#f59e0b' : t === 'PURPLE' ? '#d946ef' : t === 'GREEN' ? '#10b981' : '#ffffff' }}
                                  >
                                      {t === 'CYBERPREP' && <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-black">LIGHT</span>}
                                  </button>
                              ))}
                          </div>
                      </div>

                       {/* Audio Volume */}
                      <div className="space-y-3">
                           <label className="text-xs font-mono opacity-60 tracking-widest flex items-center gap-2"><Volume2 size={12} /> AUDIO MIXER</label>
                           <input 
                             type="range" 
                             min="0" max="1" step="0.1" 
                             value={currentUser?.audioVolume || 1}
                             onChange={(e) => onUpdateSettings?.({ audioVolume: parseFloat(e.target.value) })}
                             className="w-full h-1 bg-van-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-van-accent [&::-webkit-slider-thumb]:rounded-full"
                           />
                      </div>

                      {/* Toggles Grid */}
                      <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                               <label className="text-xs font-mono opacity-60 tracking-widest block">VISUAL FX</label>
                               
                               <button onClick={() => onUpdateSettings?.({ enableTilt: !currentUser?.enableTilt })} className={`w-full flex justify-between items-center p-2 border rounded text-xs ${currentUser?.enableTilt ? 'bg-van-accent text-black' : 'opacity-50'}`}>
                                   <span className="flex items-center gap-2"><Move size={12}/> TILT / PARALLAX</span>
                               </button>

                               <button onClick={() => onUpdateSettings?.({ weatherEffect: currentUser?.weatherEffect === 'NONE' ? 'RAIN' : currentUser?.weatherEffect === 'RAIN' ? 'SNOW' : currentUser?.weatherEffect === 'SNOW' ? 'EMBER' : 'NONE' })} className={`w-full flex justify-between items-center p-2 border rounded text-xs ${currentUser?.weatherEffect !== 'NONE' ? 'bg-van-accent text-black' : 'opacity-50'}`}>
                                   <span className="flex items-center gap-2"><CloudRain size={12}/> WEATHER: {currentUser?.weatherEffect || 'OFF'}</span>
                               </button>
                           </div>
                           
                           <div className="space-y-2">
                               <label className="text-xs font-mono opacity-60 tracking-widest block">SYSTEM</label>
                               
                               <button onClick={() => onUpdateSettings?.({ showMetrics: !currentUser?.showMetrics })} className={`w-full flex justify-between items-center p-2 border rounded text-xs ${currentUser?.showMetrics ? 'bg-van-accent text-black' : 'opacity-50'}`}>
                                   <span className="flex items-center gap-2"><Monitor size={12}/> METRICS HUD</span>
                               </button>

                               <button onClick={() => onUpdateSettings?.({ isOfflineMode: !currentUser?.isOfflineMode })} className={`w-full flex justify-between items-center p-2 border rounded text-xs ${currentUser?.isOfflineMode ? 'bg-yellow-500 text-black' : 'opacity-50'}`}>
                                   <span className="flex items-center gap-2"><WifiOff size={12}/> OFFLINE MODE</span>
                               </button>
                           </div>
                      </div>

                  </div>
                  <div className={`p-4 border-t flex justify-end ${isCyberprep ? 'bg-slate-100 border-slate-200' : 'bg-van-900 border-van-700'}`}>
                      <button onClick={() => setShowSettings(false)} className="px-4 py-2 bg-van-accent text-black font-bold text-xs rounded hover:bg-white transition-colors">APPLY CHANGES</button>
                  </div>
              </div>
          </div>
      )}
      
      </div> 
      {/* END GLOBAL WRAPPER */}
    </div>
  );
};

// --- REFACTORED NAV ITEM WITH HIGH CONTRAST & GLOW ---
const NavItem = ({ icon, label, sub, active, onClick, lightMode }: { icon: React.ReactNode, label: string, sub: string, active: boolean, onClick: () => void, lightMode?: boolean }) => (
  <button 
    onClick={onClick}
    className={`
      group relative flex flex-col lg:flex-row items-center lg:gap-4 p-2 lg:p-4 rounded-xl transition-all duration-300 w-full lg:w-auto
      overflow-hidden
      ${active 
        ? (lightMode 
            ? 'bg-slate-900 text-white shadow-lg scale-105' 
            : 'bg-van-accent text-black shadow-[0_0_20px_var(--van-accent)] scale-105') 
        : (lightMode 
            ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-200' 
            : 'text-van-600 hover:text-white hover:bg-van-800/50')
      }
    `}
  >
    {/* Active Glow Background Effect */}
    {active && !lightMode && (
         <div className="absolute inset-0 bg-white/20 blur-xl"></div>
    )}

    <div className={`relative z-10 p-2 rounded-lg transition-all duration-300 ${active ? (lightMode ? 'bg-white/10' : 'bg-black/10') : ''}`}>
      {icon}
    </div>
    
    <div className="hidden lg:flex flex-col items-start relative z-10">
      <span className={`text-sm font-black tracking-wider uppercase ${active ? '' : ''}`}>
        {label}
      </span>
      <span className={`text-[9px] font-mono uppercase tracking-[0.2em] opacity-80 ${active ? (lightMode ? 'text-slate-300' : 'text-black/70 font-bold') : ''}`}>
        {sub}
      </span>
    </div>

    <span className="lg:hidden text-[8px] font-bold uppercase mt-1 tracking-wider opacity-80 relative z-10">{label.split(' ')[0]}</span>
    
    {/* Active Indicator Bar */}
    {active && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${lightMode ? 'bg-slate-400' : 'bg-white'} hidden lg:block`}></div>
    )}
  </button>
);
