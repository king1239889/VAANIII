
import React, { useState, useEffect, useRef } from 'react';
import { Search, Mic, MicOff, X } from 'lucide-react';
import { Layout } from './components/Layout';
import { ChatInterface } from './components/ChatInterface';
import { LiveInterface } from './components/LiveInterface';
import { EarthInterface } from './components/EarthInterface';
import { AppMode, Message, Protocol, GenerationConfig, Attachment, User, SystemLog, Thread } from './types';
import { sendMessage, generateImage, editImage, generateVideo, generateChartData, transcribeAudio } from './services/geminiService';
import { storageService } from './services/storageService';

const DEFAULT_USER: User = {
  id: 'vaaniii_commander',
  name: 'Commander',
  email: 'authorized@system.ai',
  avatar: 'https://ui-avatars.com/api/?name=Commander&background=00f0ff&color=000&bold=true',
  method: 'gmail',
  xp: 1250,
  rank: 'LIEUTENANT',
  theme: 'CYAN',
  font: 'STANDARD',
  audioVolume: 1.0,
  avatarTexture: 'WIRE',
  showConstellations: false,
  autoLockMinutes: 0
};

const IntroLogo = ({ onComplete }: { onComplete: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onComplete, 2200); 
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[10000] bg-black flex items-center justify-center flex-col overflow-hidden">
             {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.1)_0%,transparent_70%)] pointer-events-none"></div>
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

            <div className="relative animate-logo-entry z-10 flex flex-col items-center">
                <div className="w-32 h-32 md:w-48 md:h-48 relative mb-6 mx-auto">
                     <div className="absolute inset-0 bg-van-accent/20 blur-3xl rounded-full animate-pulse-slow"></div>
                     <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 overflow-visible filter drop-shadow-[0_0_15px_rgba(0,240,255,0.5)]">
                        <defs>
                            <linearGradient id="introGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#00f0ff" />
                                <stop offset="50%" stopColor="#d946ef" />
                                <stop offset="100%" stopColor="#f97316" />
                            </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r="45" fill="none" stroke="url(#introGrad)" strokeWidth="2" opacity="1" strokeDasharray="60 40" strokeLinecap="round" className="animate-spin-slow origin-center" />
                        <circle cx="50" cy="50" r="35" fill="none" stroke="#00f0ff" strokeWidth="1" opacity="0.3" strokeDasharray="10 10" />
                        <path 
                            d="M 20 50 L 30 50 L 35 40 L 40 55 L 45 30 L 65 85 L 85 30 L 90 55 L 95 40 L 100 50"
                            fill="none"
                            stroke="url(#introGrad)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            transform="translate(-10, 0)"
                        />
                    </svg>
                </div>
                <h1 className="text-5xl md:text-8xl font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-van-accent via-van-purple to-orange-500 text-center relative z-20 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    VAANIII
                </h1>
                <div className="h-0.5 w-64 bg-gradient-to-r from-transparent via-van-accent to-transparent mt-4 animate-scan opacity-50"></div>
                <p className="mt-4 text-[10px] font-mono tracking-[0.5em] text-van-400 animate-pulse">HYPER-OS SYSTEM INITIALIZING</p>
            </div>
        </div>
    );
};

const BootSequence = ({ onComplete }: { onComplete: () => void }) => {
    const [lines, setLines] = useState<string[]>([]);
    
    useEffect(() => {
        const bootText = [
            "INITIALIZING KERNEL...",
            "LOADING NEURAL MODULES...",
            "CONNECTING TO VAANIII_NET...",
            "SYNCING CONTEXT STATE...",
            "CHECKING INTEGRITY... OK",
            "MOUNTING FILE SYSTEM...",
            "STARTING AUDIO ENGINE...",
            "SYSTEM READY."
        ];
        
        let i = 0;
        const interval = setInterval(() => {
            if (i < bootText.length) {
                setLines(prev => [...prev, bootText[i]]);
                i++;
            } else {
                clearInterval(interval);
                setTimeout(onComplete, 300);
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-black text-green-500 font-retro text-lg p-8 flex flex-col justify-end pb-20">
            {lines.map((line, i) => (
                <div key={i} className="mb-1">{`> ${line}`}</div>
            ))}
            <div className="animate-pulse mt-2">_</div>
        </div>
    );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeMode, setActiveMode] = useState<AppMode>(AppMode.CHAT);
  const [bootPhase, setBootPhase] = useState<'LOGO' | 'TERMINAL' | 'COMPLETE'>('LOGO');
  
  const [isMigrating, setIsMigrating] = useState(false);
  
  // Thread State
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [mapQuery, setMapQuery] = useState<string>('');
  
  const [worldContext, setWorldContext] = useState<string>('');
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  
  // --- BOOT & INIT ---
  useEffect(() => {
      // Feature 104: Migration Simulation on first load
      const migrated = localStorage.getItem('vaaniii_migrated_v9.5');
      if (!migrated) {
          setIsMigrating(true);
          setTimeout(() => {
             setIsMigrating(false);
             localStorage.setItem('vaaniii_migrated_v9.5', 'true');
          }, 4000);
      }

      // Check Session or Auto-Login
      const session = storageService.getUserSession();
      if (session) {
          setCurrentUser(session);
      } else {
          // Auto-login default user if no session
          setCurrentUser(DEFAULT_USER);
          storageService.saveUserSession(DEFAULT_USER);
      }
      
      // Load geolocation
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.warn("Location permission denied", err)
          );
      }
  }, []);

  // Theme Sync
  useEffect(() => {
      if (!currentUser) return;
      const root = document.documentElement;
      let accent = '#00f0ff';
      let purple = '#d946ef';
      
      switch(currentUser.theme) {
          case 'AMBER': accent = '#f59e0b'; purple = '#ef4444'; break;
          case 'PURPLE': accent = '#d946ef'; purple = '#8b5cf6'; break;
          case 'GREEN': accent = '#10b981'; purple = '#3b82f6'; break;
          default: accent = '#00f0ff'; purple = '#d946ef';
      }
      
      root.style.setProperty('--van-accent', accent);
      root.style.setProperty('--van-purple', purple);
  }, [currentUser?.theme]);

  // Load Data when User Set
  useEffect(() => {
    if (!currentUser) return;
    const loadedThreads = storageService.getThreads(currentUser.id);
    if (loadedThreads.length > 0) {
        setThreads(loadedThreads);
        setActiveThreadId(loadedThreads[0].id);
        setMessages(storageService.getChatHistory(loadedThreads[0].id));
    } else {
        const newThread = storageService.createThread(currentUser.id);
        setThreads([newThread]);
        setActiveThreadId(newThread.id);
        setMessages([]);
    }
  }, [currentUser?.id]);

  const addLog = (message: string, level: SystemLog['level'] = 'INFO', module = 'SYSTEM') => {
      setSystemLogs(prev => [...prev, { id: Date.now().toString(), timestamp: new Date(), level, message, module }].slice(-50));
  };

  // Thread Handlers
  const handleSelectThread = (id: string) => {
      setActiveThreadId(id);
      setMessages(storageService.getChatHistory(id));
      setActiveMode(AppMode.CHAT);
  };

  const handleCreateThread = () => {
      if (!currentUser) return;
      const newThread = storageService.createThread(currentUser.id);
      setThreads(prev => [newThread, ...prev]);
      handleSelectThread(newThread.id);
  };

  const handleDeleteThread = (id: string) => {
      if (!currentUser) return;
      storageService.deleteThread(currentUser.id, id);
      setThreads(prev => prev.filter(t => t.id !== id));
      if (activeThreadId === id) {
          const remaining = threads.filter(t => t.id !== id);
          if (remaining.length > 0) handleSelectThread(remaining[0].id);
          else handleCreateThread();
      }
  };

  // Feature 103: Forget Thread
  const handleForgetThread = () => {
      if (activeThreadId) {
          handleDeleteThread(activeThreadId);
          addLog("Thread memory wiped from local storage.", "WARN", "STORAGE");
      }
  };

  // Feature 95: Export Data
  const handleExportData = async () => {
      if (!currentUser) return;
      const url = await storageService.exportAllData(currentUser.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VAANIII_BACKUP_${new Date().toISOString()}.json`;
      a.click();
      addLog("System data exported successfully.", "INFO", "STORAGE");
  };

  // Feature 80: Universe-to-Terminal Query
  const handleAskVaaniii = (query: string) => {
      setActiveMode(AppMode.CHAT);
      // Automatically send the message
      handleSendMessage(query, Protocol.DEEP_SEARCH, { aspectRatio: '1:1', resolution: '1K', language: 'English' }, []);
  };

  const handleSendMessage = async (text: string, protocol: Protocol, config: GenerationConfig, attachments: Attachment[]) => {
    if (!currentUser) return;

    // Feature 105: Scrubbing
    const scrubbedText = storageService.scrubData(text);
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: scrubbedText, timestamp: new Date(), attachments };
    
    // XP Gain (Mock)
    const newXp = currentUser.xp + 10;
    const newRank = newXp > 5000 ? 'ADMIRAL' : newXp > 2000 ? 'CAPTAIN' : 'LIEUTENANT';
    if (newXp !== currentUser.xp) {
        setCurrentUser({ ...currentUser, xp: newXp, rank: newRank });
    }
    
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    storageService.saveChatHistory(activeThreadId, newHistory);
    
    // Update Thread Preview
    storageService.updateThread(currentUser.id, activeThreadId, { preview: scrubbedText.substring(0, 30) + '...', updatedAt: new Date() });
    setThreads(storageService.getThreads(currentUser.id)); 

    setIsLoading(true);
    addLog(`Processing Request: ${protocol}`, 'INFO', 'CORE');

    try {
        let aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: '', timestamp: new Date() };

        if (protocol === Protocol.IMG_GEN) {
            const media = await generateImage(scrubbedText, config);
            aiMsg.text = media.length > 0 ? "SYNTHESIS_COMPLETE" : "FAILED";
            aiMsg.generatedMedia = media;
        } 
        else if (protocol === Protocol.VID_GEN) {
            const media = await generateVideo(scrubbedText, config);
            aiMsg.text = media ? "VIDEO_GENERATION_COMPLETE" : "VIDEO_FAILED";
            aiMsg.generatedMedia = media ? [media] : [];
        }
        else if (protocol === Protocol.DATA_VIZ) {
             // Pass recent context for data analysis
             const recentContext = messages.slice(-5).map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
             const chartData = await generateChartData(scrubbedText, recentContext);
             if (chartData) {
                 aiMsg.text = "ANALYSIS_COMPLETE :: DATA_VISUALIZED";
                 aiMsg.chartData = chartData;
             } else {
                 aiMsg.text = "ERROR: UNABLE TO PARSE DATA FOR VISUALIZATION. PLEASE PROVIDE STRUCTURED DATA.";
             }
        }
        else if (protocol === Protocol.TRANSCRIPTION) {
             if (attachments.length && attachments[0].type === 'audio') {
                 const txt = await transcribeAudio(attachments[0]);
                 aiMsg.text = txt;
             } else {
                 aiMsg.text = "AUDIO_FILE_REQUIRED";
             }
        }
        else {
            const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
            const response = await sendMessage(history, scrubbedText, attachments, location, protocol, worldContext, config.language);
            aiMsg.text = response.text;
            aiMsg.groundingChunks = response.chunks as any;
            aiMsg.tokenUsage = response.usage;
            
            // Pass through Quiz Data if present
            if ((response as any).quizData) {
                aiMsg.quizData = (response as any).quizData;
            }
            
            const mapChunk = response.chunks?.find((c: any) => c.maps);
            if (activeMode === AppMode.MAP && mapChunk?.maps?.title) {
                setMapQuery(mapChunk.maps.title);
            }
        }
        
        const finalHistory = [...newHistory, aiMsg];
        setMessages(finalHistory);
        storageService.saveChatHistory(activeThreadId, finalHistory);

        // Update Thread Preview with AI Response
        storageService.updateThread(currentUser.id, activeThreadId, { 
            preview: aiMsg.text ? (aiMsg.text.substring(0, 50) + '...') : 'Attachment sent', 
            updatedAt: new Date() 
        });
        setThreads(storageService.getThreads(currentUser.id));
        
        addLog(`Response Generated (${protocol})`, 'INFO', 'CORE');

    } catch (error) {
        console.error("Protocol Error:", error);
        addLog(`Protocol Failed: ${error}`, 'ERROR', 'CORE');
        const errorMsg: Message = { id: Date.now().toString(), role: 'system', text: `SYSTEM_ALERT: ${error instanceof Error ? error.message : 'ERROR'}`, timestamp: new Date() };
        setMessages(prev => {
            const h = [...prev, errorMsg];
            storageService.saveChatHistory(activeThreadId, h);
            return h;
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handleLogout = () => {
      // Just reload to simulate restart since we removed auth
      window.location.reload();
  };

  return (
    <>
        {bootPhase === 'LOGO' && <IntroLogo onComplete={() => setBootPhase('TERMINAL')} />}
        {bootPhase === 'TERMINAL' && <BootSequence onComplete={() => setBootPhase('COMPLETE')} />}

        {bootPhase === 'COMPLETE' && currentUser && (
            <Layout 
                activeMode={activeMode} 
                onModeChange={setActiveMode} 
                currentUser={currentUser} 
                systemLogs={systemLogs}
                onUpdateSettings={(settings) => setCurrentUser(prev => ({ ...prev!, ...settings }))}
                onLogout={handleLogout}
                
                threads={threads}
                activeThreadId={activeThreadId}
                onSelectThread={handleSelectThread}
                onCreateThread={handleCreateThread}
                onDeleteThread={handleDeleteThread}
                
                isMigrating={isMigrating} 
            >
              {activeMode === AppMode.CHAT && (
                  <ChatInterface 
                    messages={messages} 
                    onSendMessage={handleSendMessage} 
                    isLoading={isLoading} 
                    onPlaceSelect={(p) => { setMapQuery(p); setActiveMode(AppMode.MAP); }} 
                    onExportData={handleExportData} 
                    onForgetThread={handleForgetThread} 
                  />
              )}
              
              {activeMode === AppMode.LIVE && <LiveInterface user={currentUser} />}
              
              {activeMode === AppMode.MAP && (
                 <div className="h-full relative bg-van-900">
                    <div className="absolute inset-0 z-0">
                        <EarthInterface 
                            searchQuery={mapQuery} 
                            initialLocation={location} 
                            onAskVaaniii={handleAskVaaniii}
                            showConstellations={currentUser.showConstellations}
                        />
                    </div>
                    <div className="absolute bottom-0 w-full h-[40%] z-30 pointer-events-auto">
                       <ChatInterface messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} compact={true} />
                    </div>
                 </div>
              )}
            </Layout>
        )}
    </>
  );
}
