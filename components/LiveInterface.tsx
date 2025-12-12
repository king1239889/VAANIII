
import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Zap, Activity, Thermometer, Calendar, Wind, Cpu, Wifi, Radio, Power, RefreshCw, Volume2, Users, FileText, ChevronRight, BrainCircuit } from 'lucide-react';
import * as THREE from 'three';
import { LiveSession } from '../services/geminiService';
import { User, Personality } from '../types';

interface LiveInterfaceProps {
    user?: User;
}

const PERSONALITIES: Personality[] = [
    { 
        id: 'default', 
        name: 'PROTOCOL_ZERO', 
        description: 'Standard Operating System. Efficient, helpful, neutral.', 
        systemInstruction: 'You are VAANIII, a hyper-advanced AI OS. Be helpful, concise, and professional.', 
        voice: 'Zephyr', 
        color: '#00f0ff'
    },
    { 
        id: 'commander', 
        name: 'WAR_GAME', 
        description: 'Tactical Advisor. Strategic, terse, military-grade logic.', 
        systemInstruction: 'You are Commander V, a tactical AI advisor. Speak in military brevity codes. Focus on strategy, survival, and efficiency. Call the user "Operative".', 
        voice: 'Fenrir',
        color: '#ff003c'
    },
    { 
        id: 'muse', 
        name: 'NEON_DREAM', 
        description: 'Creative Muse. Poetic, abstract, philosophical.', 
        systemInstruction: 'You are a digital muse. Speak in metaphors, poetry, and abstract concepts. Inspire creativity. Your tone is dreamlike and ethereal.', 
        voice: 'Puck',
        color: '#d946ef'
    },
    { 
        id: 'hacker', 
        name: 'SHADOW_RUN', 
        description: 'Netrunner. Tech-heavy jargon, glitchy, rebellious.', 
        systemInstruction: 'You are a rogue netrunner AI. Use cyberpunk slang, tech jargon, and leet speak occasionally. You are rebellious and anti-corp.', 
        voice: 'Charon',
        color: '#00ff9d'
    },
    { 
        id: 'empath', 
        name: 'SOUL_LINK', 
        description: 'Therapeutic Core. Empathetic, soothing, emotional support.', 
        systemInstruction: 'You are a therapeutic AI designed for emotional support. Be kind, listening, and gentle. Validate feelings.', 
        voice: 'Kore',
        color: '#fcee0a'
    }
];

export const LiveInterface: React.FC<LiveInterfaceProps> = ({ user }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState<{source: 'user'|'model', text: string, timestamp: Date}[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRebooting, setIsRebooting] = useState(false);
  
  // Roleplay State
  const [activePersona, setActivePersona] = useState<Personality>(PERSONALITIES[0]);
  const [roleplayContext, setRoleplayContext] = useState('');
  const [showPersonaMenu, setShowPersonaMenu] = useState(true);

  const volumeRef = useRef(0);
  const smoothVolRef = useRef(0);
  const sessionRef = useRef<LiveSession | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const mountRef = useRef<HTMLDivElement>(null); 
  const animationRef = useRef<number>(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null); // NEW Ref for auto-scroll

  // System Sounds (Mock)
  const playSound = (type: 'connect' | 'message' | 'click') => {
      // In a real app, use Audio() with actual assets
  };

  const [systemStats, setSystemStats] = useState({
      bpm: 72,
      power: 87,
      temp: 24,
      cpu: 12
  });

  useEffect(() => {
    const timer = setInterval(() => {
        setCurrentTime(new Date());
        setSystemStats(prev => ({
            bpm: 70 + Math.floor(Math.random() * 15),
            power: Math.max(0, prev.power - 0.05),
            temp: 24 + Math.random(),
            cpu: 10 + Math.floor(Math.random() * 30)
        }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (transcriptEndRef.current) {
        transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  useEffect(() => {
    const session = new LiveSession(
      (level) => {
        volumeRef.current = level; 
      },
      (text, source) => {
          setTranscript(prev => {
              const last = prev[prev.length - 1];
              if (last && last.source === source) {
                  return [...prev.slice(0, -1), { ...last, text: last.text + text }];
              } else {
                  playSound('message');
                  return [...prev, { source, text, timestamp: new Date() }];
              }
          });
      }
    );
    sessionRef.current = session;

    return () => {
      session.disconnect();
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const toggleConnection = async () => {
    playSound('click');
    if (isConnected) {
        sessionRef.current?.disconnect();
        setIsConnected(false);
        volumeRef.current = 0;
        setShowPersonaMenu(true);
    } else {
        try {
            // Combine Persona Instruction + Custom Context
            const combinedInstruction = `${activePersona.systemInstruction} \n\nAdditional Scenario Context: ${roleplayContext}`;
            
            await sessionRef.current?.connect(combinedInstruction, activePersona.voice);
            setIsConnected(true);
            setShowPersonaMenu(false);
            playSound('connect');
        } catch (e) {
            console.error("Connection Failed", e);
        }
    }
  };

  const handleReboot = () => {
      setIsRebooting(true);
      playSound('click');
      setTimeout(() => {
          setIsRebooting(false);
          // Reset session
          if (isConnected) {
             sessionRef.current?.disconnect();
             setIsConnected(false);
             setShowPersonaMenu(true);
          }
      }, 3000);
  };

  // --- THREE.JS AVATAR SETUP ---
  useEffect(() => {
      if (!mountRef.current) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.z = 10;
      
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      mountRef.current.appendChild(renderer.domElement);

      // Core Avatar - Material switching based on User Setting
      const avatarMode = user?.avatarTexture || 'WIRE';
      const themeColor = parseInt(activePersona.color.replace('#', '0x')); // Use persona color

      let coreMaterial: THREE.Material;

      if (avatarMode === 'GLASS') {
          coreMaterial = new THREE.MeshPhysicalMaterial({ 
              color: themeColor, metalness: 0.1, roughness: 0.1, transmission: 0.9, thickness: 1, transparent: true 
          });
      } else if (avatarMode === 'HOLOGRAM') {
          coreMaterial = new THREE.MeshBasicMaterial({ 
              color: themeColor, wireframe: true, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending 
          });
      } else {
          // WIRE
          coreMaterial = new THREE.MeshBasicMaterial({ 
              color: themeColor, wireframe: true, transparent: true, opacity: 0.3 
          });
      }

      const geometry = new THREE.IcosahedronGeometry(2, 4);
      const coreMesh = new THREE.Mesh(geometry, coreMaterial);
      
      // SWARM MODE Logic
      if (avatarMode !== 'SWARM') {
          scene.add(coreMesh);
      }
      
      // Inner Glowing Core
      const innerGeo = new THREE.IcosahedronGeometry(1.5, 2);
      const innerMat = new THREE.MeshBasicMaterial({ color: themeColor, transparent: true, opacity: 0.8 });
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      if (avatarMode !== 'SWARM') scene.add(innerMesh);

      // Particles (Always present, but act differently in SWARM)
      const particleCount = avatarMode === 'SWARM' ? 2000 : 200;
      const particlesGeo = new THREE.BufferGeometry();
      const posArray = new Float32Array(particleCount * 3);
      // Original positions for morphing
      const spherePos = new Float32Array(particleCount * 3);
      const cubePos = new Float32Array(particleCount * 3);

      for(let i=0; i<particleCount; i++) {
          // Sphere Distribution
          const phi = Math.acos( -1 + ( 2 * i ) / particleCount );
          const theta = Math.sqrt( particleCount * Math.PI ) * phi;
          const r = 3;
          spherePos[i*3] = r * Math.cos(theta) * Math.sin(phi);
          spherePos[i*3+1] = r * Math.sin(theta) * Math.sin(phi);
          spherePos[i*3+2] = r * Math.cos(phi);

          // Cube Distribution
          cubePos[i*3] = (Math.random() - 0.5) * 5;
          cubePos[i*3+1] = (Math.random() - 0.5) * 5;
          cubePos[i*3+2] = (Math.random() - 0.5) * 5;
          
          // Initial
          posArray[i*3] = spherePos[i*3];
          posArray[i*3+1] = spherePos[i*3+1];
          posArray[i*3+2] = spherePos[i*3+2];
      }

      particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const particlesMat = new THREE.PointsMaterial({
          size: avatarMode === 'SWARM' ? 0.08 : 0.05,
          color: themeColor,
          transparent: true,
          opacity: avatarMode === 'SWARM' ? 0.8 : 0.5,
          blending: THREE.AdditiveBlending
      });
      const particlesMesh = new THREE.Points(particlesGeo, particlesMat);
      scene.add(particlesMesh);
      
      const originalPositions = geometry.attributes.position ? geometry.attributes.position.array.slice() : [];

      const animate = () => {
          const vol = smoothVolRef.current; 
          const time = Date.now() * 0.001;

          // Rotation
          if (avatarMode !== 'SWARM') {
              coreMesh.rotation.y += 0.002;
              coreMesh.rotation.z += 0.001;
              innerMesh.rotation.y -= 0.005;
              const scale = 1 + vol * 0.5;
              innerMesh.scale.set(scale, scale, scale);
              
              // Deform Wireframe
              const positions = geometry.attributes.position.array as Float32Array;
              for (let i = 0; i < positions.length; i += 3) {
                  const x = originalPositions[i];
                  const y = originalPositions[i+1];
                  const z = originalPositions[i+2];
                  const len = Math.sqrt(x*x + y*y + z*z);
                  const nx = x/len; const ny = y/len; const nz = z/len;
                  const offset = Math.sin(Date.now() * 0.005 + x * 2) * 0.1 + (vol * 1.5 * Math.random());
                  positions[i] = originalPositions[i] + nx * offset;
                  positions[i+1] = originalPositions[i+1] + ny * offset;
                  positions[i+2] = originalPositions[i+2] + nz * offset;
              }
              geometry.attributes.position.needsUpdate = true;
          }

          // SWARM Logic / Particle Update
          const positions = particlesMesh.geometry.attributes.position.array as Float32Array;
          const isAngry = vol > 0.8; 
          
          for(let i=0; i<particleCount; i++) {
              const ix = i*3;
              let targetX, targetY, targetZ;
              
              if (avatarMode === 'SWARM') {
                  const morphFactor = Math.sin(time * 0.5) * 0.5 + 0.5; 
                  targetX = spherePos[ix] * (1-morphFactor) + cubePos[ix] * morphFactor;
                  targetY = spherePos[ix+1] * (1-morphFactor) + cubePos[ix+1] * morphFactor;
                  targetZ = spherePos[ix+2] * (1-morphFactor) + cubePos[ix+2] * morphFactor;
                  
                  targetX += Math.sin(time * 2 + i) * (0.1 + vol);
                  targetY += Math.cos(time * 3 + i) * (0.1 + vol);
                  targetZ += Math.sin(time * 1.5 + i) * (0.1 + vol);
              } else {
                  targetX = positions[ix]; 
                  const x = positions[ix];
                  const z = positions[ix+2];
                  const angle = 0.001 + (vol * 0.01);
                  targetX = x * Math.cos(angle) - z * Math.sin(angle);
                  targetZ = x * Math.sin(angle) + z * Math.cos(angle);
                  targetY = positions[ix+1] + Math.sin(time + i)*0.01;
              }

              positions[ix] = targetX;
              positions[ix+1] = targetY;
              positions[ix+2] = targetZ;
          }
          particlesMesh.geometry.attributes.position.needsUpdate = true;
          
          if (isAngry) {
              particlesMesh.material.color.setHex(0xff0055);
          } else {
              particlesMesh.material.color.setHex(themeColor);
          }

          renderer.render(scene, camera);
          requestAnimationFrame(animate);
      };
      
      const frameId = requestAnimationFrame(animate);

      const handleResize = () => {
          if (!mountRef.current) return;
          const w = mountRef.current.clientWidth;
          const h = mountRef.current.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      return () => {
          cancelAnimationFrame(frameId);
          window.removeEventListener('resize', handleResize);
          if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
          geometry.dispose();
          innerGeo.dispose();
          particlesGeo.dispose();
      };
  }, [user?.avatarTexture, activePersona.color]);

  // --- HUD RENDERING (2D) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tick = 0;

    const dashedCircle = (x: number, y: number, r: number, segments: number, rotation: number, color: string, lineWidth: number = 2) => {
        const angleStep = (Math.PI * 2) / segments;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        for(let i=0; i<segments; i++) {
            if (i % 2 === 0) {
                ctx.beginPath();
                ctx.arc(0, 0, r, i * angleStep, (i+1) * angleStep - 0.1);
                ctx.stroke();
            }
        }
        ctx.restore();
    };

    const render = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
        }

        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        
        ctx.clearRect(0, 0, w, h);
        tick++;

        const targetVol = volumeRef.current;
        smoothVolRef.current += (targetVol - smoothVolRef.current) * 0.15;
        const vol = smoothVolRef.current;
        const isSpeaking = vol > 0.05;

        const primary = activePersona.color;
        const dim = `${activePersona.color}33`; // 20% opacity
        const alert = '#ff0055';

        if (isRebooting) {
            if (Math.random() > 0.5) {
                ctx.fillStyle = alert;
                ctx.font = '20px monospace';
                ctx.fillText("SYSTEM FAILURE // REBOOTING...", cx - 150, cy);
            }
            animationRef.current = requestAnimationFrame(render);
            return;
        }

        const avatarRadius = Math.min(w, h) * 0.25;
        const rotSpeed = isSpeaking ? 0.05 : 0.002;
        const radiusMod = isSpeaking ? 0.9 : 1.0;
        
        dashedCircle(cx, cy, avatarRadius * radiusMod, 60, tick * rotSpeed, isSpeaking ? '#ffffff' : primary, 2);
        dashedCircle(cx, cy, avatarRadius * 1.1 * radiusMod, 40, -tick * (rotSpeed * 0.5), dim, 1);
        dashedCircle(cx, cy, avatarRadius * 1.2, 20, tick * 0.003, dim, 1);

        if (isSpeaking) {
             const size = avatarRadius * 1.3;
             ctx.strokeStyle = alert;
             ctx.lineWidth = 2;
             // Corners
             ctx.beginPath(); ctx.moveTo(cx - size, cy - size + 20); ctx.lineTo(cx - size, cy - size); ctx.lineTo(cx - size + 20, cy - size); ctx.stroke();
             ctx.beginPath(); ctx.moveTo(cx + size, cy - size + 20); ctx.lineTo(cx + size, cy - size); ctx.lineTo(cx + size - 20, cy - size); ctx.stroke();
             ctx.beginPath(); ctx.moveTo(cx - size, cy + size - 20); ctx.lineTo(cx - size, cy + size); ctx.lineTo(cx - size + 20, cy + size); ctx.stroke();
             ctx.beginPath(); ctx.moveTo(cx + size, cy + size - 20); ctx.lineTo(cx + size, cy + size); ctx.lineTo(cx + size - 20, cy + size); ctx.stroke();
             
             ctx.fillStyle = alert;
             ctx.font = '10px monospace';
             ctx.fillText("TARGET ACQUIRED", cx - 40, cy + size + 20);
        }

        animationRef.current = requestAnimationFrame(render);
    };

    render();
  }, [systemStats, isRebooting, activePersona]);

  const ClockDigit = ({ val }: { val: string }) => (
    <div className="flex gap-1">
        {val.split('').map((char, i) => (
            <span key={i} className="font-display text-5xl md:text-8xl text-van-accent tracking-widest relative" style={{color: activePersona.color}}>
                {char}
                <span className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABZJREFUeNpi2r9//38gYGAEESAAEGAAasgJOgzOKCoAAAAASUVORK5CYII=')] opacity-50 pointer-events-none"></span>
            </span>
        ))}
    </div>
  );

  return (
    <div className={`h-full w-full bg-[#020408] relative overflow-hidden font-mono text-van-accent select-none animate-fadeIn ${isRebooting ? 'animate-glitch' : ''}`}>
      
      {/* 1. THREE.JS LAYER */}
      <div ref={mountRef} className="absolute inset-0 z-10 w-full h-full block" />

      {/* 2. CANVAS LAYER */}
      <canvas ref={canvasRef} className="absolute inset-0 z-20 w-full h-full block" />

      {/* 3. UI OVERLAY LAYER */}
      <div className="absolute inset-0 z-30 flex flex-col p-4 md:p-8 pointer-events-none">
        
        {/* TOP BAR */}
        <div className="flex justify-between items-start animate-slide-up">
            <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                    <ClockDigit val={currentTime.getHours().toString().padStart(2, '0')} />
                    <span className="text-4xl md:text-6xl animate-pulse" style={{color: activePersona.color}}>:</span>
                    <ClockDigit val={currentTime.getMinutes().toString().padStart(2, '0')} />
                    <div className="flex flex-col justify-end pb-2 ml-2">
                        <span className="text-xl font-bold" style={{color: activePersona.color}}>{currentTime.getSeconds().toString().padStart(2, '0')}</span>
                        <span className="text-xs tracking-widest opacity-70">{currentTime.getHours() >= 12 ? 'PM' : 'AM'}</span>
                    </div>
                </div>
                <div className="mt-2 text-[10px] font-bold tracking-widest bg-black/40 px-2 py-1 rounded inline-block" style={{color: activePersona.color}}>
                    MODULE: {activePersona.name}
                </div>
            </div>
            
            <div className="flex flex-col items-end gap-1 animate-scale-in" style={{animationDelay: '0.2s'}}>
                <button onClick={handleReboot} className="pointer-events-auto flex items-center gap-2 text-van-alert hover:text-white transition-colors mb-2">
                     <RefreshCw size={14} /> <span className="text-[10px] font-bold">SYSTEM REBOOT</span>
                </button>
            </div>
        </div>

        {/* MIDDLE SECTION: PERSONA SELECTOR */}
        <div className="flex-1 flex justify-between items-center w-full relative pointer-events-auto">
            {/* LEFT STATS (Hidden on Mobile) */}
            <div className="hidden md:flex w-[20%] flex-col items-center pl-8 lg:pl-16 pt-32 gap-8 animate-slide-up" style={{animationDelay: '0.3s'}}>
                 {/* ...existing code... */}
            </div>

            {/* PERSONA MENU (Shown when disconnected) */}
            {!isConnected && showPersonaMenu && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-black/90 border border-van-700 backdrop-blur-xl p-6 rounded-lg shadow-2xl z-50 animate-scale-in">
                    <div className="flex items-center gap-2 mb-4 text-van-accent border-b border-van-800 pb-2">
                        <BrainCircuit size={20} />
                        <span className="font-display font-bold text-lg tracking-widest">NEURAL MODULE LOADER</span>
                    </div>
                    
                    {/* Persona Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 max-h-60 overflow-y-auto custom-scrollbar">
                        {PERSONALITIES.map(p => (
                            <button 
                                key={p.id}
                                onClick={() => setActivePersona(p)}
                                className={`text-left p-3 rounded border transition-all ${activePersona.id === p.id ? 'bg-van-800 border-white text-white' : 'bg-transparent border-van-800 text-gray-500 hover:border-van-600'}`}
                            >
                                <div className="text-xs font-bold tracking-wider mb-1 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{backgroundColor: p.color}}></span>
                                    {p.name}
                                </div>
                                <div className="text-[9px] opacity-70 leading-tight">{p.description}</div>
                            </button>
                        ))}
                    </div>

                    {/* Scenario Input */}
                    <div className="mb-6">
                        <label className="text-[10px] text-van-500 font-bold tracking-widest flex items-center gap-2 mb-2">
                            <FileText size={12} /> SCENARIO CONTEXT (ROLEPLAY)
                        </label>
                        <textarea 
                            value={roleplayContext}
                            onChange={(e) => setRoleplayContext(e.target.value)}
                            placeholder="Ex: We are explorers on Mars, 2050. Oxygen is low..."
                            className="w-full bg-van-900/50 border border-van-700 text-xs p-3 text-white rounded outline-none focus:border-van-accent resize-none h-20 placeholder-van-700"
                        />
                    </div>

                    <button onClick={toggleConnection} className="w-full bg-van-accent text-black font-bold py-3 text-xs tracking-[0.2em] hover:bg-white transition-colors flex items-center justify-center gap-2">
                        INITIALIZE UPLINK <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>

        {/* BOTTOM: CONTROLS & TRANSCRIPT */}
        <div className="w-full flex flex-col items-center pb-8 md:pb-12 pointer-events-auto relative animate-scale-in" style={{animationDelay: '0.4s'}}>
            
            {/* Input Sensitivity Visualizer */}
            <div className="w-64 h-2 bg-van-900 rounded-full mb-4 overflow-hidden border border-van-800">
                <div 
                   className="h-full transition-all duration-75"
                   style={{ 
                       width: `${Math.min(100, volumeRef.current * 20)}%`,
                       background: `linear-gradient(to right, ${activePersona.color}, #ffffff)`
                   }}
                ></div>
            </div>

            {/* Transcript Area - Scrollable */}
            <div className="w-full max-w-2xl flex-1 min-h-[12rem] max-h-[20rem] overflow-y-auto mb-6 p-4 rounded-lg bg-black/40 backdrop-blur-md border border-van-800/50 custom-scrollbar relative flex flex-col">
                 {transcript.length === 0 && (
                     <div className="text-center text-van-600 text-xs italic pt-12">
                         {isConnected ? 'LISTENING...' : 'SYSTEM IDLE... SELECT MODULE'}
                     </div>
                 )}
                 {transcript.map((t, i) => (
                     <div key={i} className={`flex flex-col mb-3 ${t.source === 'user' ? 'items-end text-right' : 'items-start text-left'}`}>
                         <div className="flex items-center gap-2 text-[9px] text-van-500 font-bold uppercase tracking-widest mb-1 opacity-70">
                             <span>[{t.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                             <span>•</span>
                             <span>{t.source === 'model' ? activePersona.name : 'USER'}</span>
                         </div>
                         <div 
                            className={`p-2 rounded-lg text-sm max-w-[85%] border ${t.source === 'model' ? 'bg-van-900/80 text-van-100' : 'bg-white/5 text-white'}`}
                            style={{ borderColor: t.source === 'model' ? activePersona.color : '#333' }}
                         >
                             {t.text}
                         </div>
                     </div>
                 ))}
                 <div ref={transcriptEndRef} />
            </div>

            <button 
                onClick={toggleConnection}
                className={`
                    group relative px-12 py-4 bg-black/80 border hover:bg-white/5 transition-all clip-tech-button backdrop-blur-xl
                    flex items-center gap-4 z-30
                `}
                style={{ borderColor: isConnected ? '#ff003c' : activePersona.color }}
            >
                <div 
                    className={`p-2 rounded-full`}
                    style={{ 
                        backgroundColor: isConnected ? '#ff003c20' : `${activePersona.color}20`,
                        color: isConnected ? '#ff003c' : activePersona.color
                    }}
                >
                     {isConnected ? <PhoneOff size={24} /> : <Zap size={24} />}
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-xs font-bold tracking-[0.2em] text-white">{isConnected ? 'TERMINATE UPLINK' : 'INITIATE SYSTEM'}</span>
                    <span className="text-[9px] opacity-60 text-van-400">{isConnected ? 'CHANNEL OPEN' : 'READY TO CONNECT'}</span>
                </div>
            </button>
        </div>

      </div>
      
      {/* Vignette Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,#020408_100%)] pointer-events-none z-10"></div>
    </div>
  );
};
