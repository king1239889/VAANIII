
import React, { useState } from 'react';
import { Shield, Smartphone, Mail, ArrowRight, Loader2, Key, Lock, AlertCircle, CheckCircle2, Globe, FileKey } from 'lucide-react';
import { authService } from '../services/authService';
import { User } from '../types';

interface AuthOverlayProps {
  onLoginSuccess: (user: User) => void;
  isLocked?: boolean; // For re-auth
  onUnlock?: () => void;
}

type AuthMode = 'SELECT' | 'PHONE_INPUT' | 'PHONE_OTP' | 'EMAIL_INPUT' | 'EMAIL_OTP' | 'PASSWORD_SET';

export const AuthOverlay: React.FC<AuthOverlayProps> = ({ onLoginSuccess, isLocked, onUnlock }) => {
  const [mode, setMode] = useState<AuthMode>('SELECT');
  const [loading, setLoading] = useState(false);
  
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState(''); // For feature 99
  
  const [error, setError] = useState('');

  // 99: Password Strength
  const strength = authService.checkPasswordStrength(password);

  const handleEmailRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { 
        setError("INVALID EMAIL FORMAT"); return; 
    }
    
    setLoading(true);
    setError('');
    try {
      await authService.requestGmailOTP(email);
      setMode('EMAIL_OTP');
      setOtp('');
    } catch (e) {
      setError("TRANSMISSION FAILED");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    // 98: TOTP Simulation Check
    if (!authService.verifyTOTP(otp)) {
        setError("INVALID TOTP TOKEN");
        return;
    }

    setLoading(true);
    setError('');
    try {
      const user = await authService.verifyGmailOTP(email, otp);
      if (user) {
        if (isLocked && onUnlock) onUnlock();
        else onLoginSuccess(user);
      } else {
        setError("INVALID VERIFICATION CODE");
      }
    } catch (e) {
      setError("AUTHENTICATION ERROR");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
      e.preventDefault();
      // Simple mock unlock
      if (otp === '123456') {
          if (onUnlock) onUnlock();
      } else {
          setError("INVALID UNLOCK CODE");
      }
  };

  if (isLocked) {
      return (
          <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center p-4">
               <div className="w-full max-w-sm text-center">
                   <Lock size={48} className="mx-auto text-red-500 mb-4 animate-pulse" />
                   <h2 className="text-2xl font-display text-red-500 tracking-widest mb-2">SESSION LOCKED</h2>
                   <p className="text-van-600 font-mono text-xs mb-6">SECURITY PROTOCOL 106 ENABLED</p>
                   
                   <form onSubmit={handleUnlock} className="space-y-4">
                       <input 
                         type="password" 
                         value={otp}
                         onChange={e => setOtp(e.target.value)}
                         placeholder="ENTER PASSCODE"
                         className="bg-van-900 border border-red-900 text-red-500 text-center p-3 w-full outline-none font-mono tracking-[0.5em]"
                         autoFocus
                       />
                       {error && <div className="text-red-500 text-xs">{error}</div>}
                       <button className="w-full bg-red-900/20 border border-red-500 text-red-500 py-2 hover:bg-red-500 hover:text-black transition-colors">UNLOCK</button>
                   </form>
               </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-van-950/90 backdrop-blur-xl flex items-center justify-center p-4">
      {/* Background Cyber Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-van-900 border border-van-700 relative overflow-hidden shadow-[0_0_50px_rgba(0,240,255,0.1)] group clip-message-ai">
        
        {/* Decorative Header */}
        <div className="bg-van-950 p-6 border-b border-van-700 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <Shield className="text-van-accent animate-pulse" size={24} />
              <div>
                  <h2 className="text-xl font-display font-bold text-white tracking-wider">IDENTITY CHECK</h2>
                  <p className="text-[10px] text-van-500 font-mono tracking-[0.2em]">SECURE GATEWAY v9.5</p>
              </div>
           </div>
           <Lock size={16} className="text-van-600" />
        </div>

        <div className="p-8 relative z-10 min-h-[300px] flex flex-col justify-center">
          
          {error && (
             <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 text-red-400 text-xs font-mono text-center tracking-widest flex items-center justify-center gap-2 animate-pulse">
                <AlertCircle size={14} /> {error}
             </div>
          )}

          {/* --- MODE: SELECT --- */}
          {mode === 'SELECT' && (
            <div className="space-y-4 animate-slide-up">
               <button onClick={() => setMode('EMAIL_INPUT')} className="w-full group/btn relative flex items-center gap-4 p-4 bg-van-800/50 border border-van-600 hover:border-red-500 hover:bg-red-500/10 transition-all clip-tech-button">
                   <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black font-bold">
                       <Mail size={20} className="text-red-600" />
                   </div>
                   <div className="text-left">
                       <div className="text-sm font-bold text-white tracking-wide group-hover/btn:text-red-400">GMAIL UPLINK</div>
                       <div className="text-[10px] text-van-400 font-mono">Verify via Google Mail</div>
                   </div>
                   <ArrowRight className="absolute right-4 text-van-700 group-hover/btn:text-white transition-colors" size={16} />
               </button>

               <button onClick={() => setMode('PASSWORD_SET')} className="w-full group/btn relative flex items-center gap-4 p-4 bg-van-800/50 border border-van-600 hover:border-van-purple hover:bg-van-purple/10 transition-all clip-tech-button">
                   <div className="w-10 h-10 bg-van-700 rounded-full flex items-center justify-center text-van-white"><FileKey size={20} /></div>
                   <div className="text-left">
                       <div className="text-sm font-bold text-white tracking-wide group-hover/btn:text-van-purple">PASSWORD TEST</div>
                       <div className="text-[10px] text-van-400 font-mono">Test Strength Protocol</div>
                   </div>
                   <ArrowRight className="absolute right-4 text-van-700 group-hover/btn:text-white transition-colors" size={16} />
               </button>
            </div>
          )}

          {/* --- MODE: EMAIL INPUT --- */}
          {mode === 'EMAIL_INPUT' && (
            <form onSubmit={handleEmailRequest} className="space-y-6 animate-slide-up">
               <div className="space-y-2">
                   <label className="text-xs text-red-400 font-mono tracking-widest flex justify-between">
                       <span>ENTER GMAIL ADDRESS</span>
                   </label>
                   <div className="flex bg-van-950 border border-van-700 focus-within:border-red-500 transition-colors p-3">
                       <Mail className="text-van-600 mr-3" size={20} />
                       <input 
                         type="email" 
                         value={email}
                         onChange={e => setEmail(e.target.value)}
                         placeholder="user@gmail.com"
                         className="bg-transparent w-full text-white placeholder-van-700 outline-none font-mono"
                         autoFocus
                       />
                   </div>
               </div>
               <div className="flex gap-3">
                   <button type="button" onClick={() => { setMode('SELECT'); setError(''); }} className="flex-1 p-3 border border-van-700 text-van-500 hover:text-white hover:bg-van-800 text-xs font-bold tracking-widest">BACK</button>
                   <button type="submit" disabled={loading} className="flex-[2] bg-red-600 text-white font-bold p-3 hover:bg-red-500 transition-colors flex items-center justify-center gap-2">
                       {loading ? <Loader2 className="animate-spin" size={16} /> : <>SEND CODE <ArrowRight size={16} /></>}
                   </button>
               </div>
            </form>
          )}
          
          {/* --- MODE: PASSWORD STRENGTH TEST (99) --- */}
          {mode === 'PASSWORD_SET' && (
            <div className="space-y-6 animate-slide-up">
               <div className="space-y-2">
                   <label className="text-xs text-van-purple font-mono tracking-widest">PASSWORD STRENGTH ANALYZER</label>
                   <div className="flex bg-van-950 border border-van-700 focus-within:border-van-purple transition-colors p-3">
                       <Key className="text-van-600 mr-3" size={20} />
                       <input 
                         type="text" 
                         value={password}
                         onChange={e => setPassword(e.target.value)}
                         placeholder="Type to analyze..."
                         className="bg-transparent w-full text-white placeholder-van-700 outline-none font-mono"
                         autoFocus
                       />
                   </div>
                   {/* Strength Meter */}
                   <div className="flex gap-1 h-1 mt-2">
                       {[1,2,3,4].map(s => (
                           <div key={s} className={`flex-1 transition-colors duration-300 ${strength.score >= s ? (strength.score > 3 ? 'bg-van-success' : strength.score > 2 ? 'bg-van-accent' : 'bg-red-500') : 'bg-van-800'}`}></div>
                       ))}
                   </div>
                   <div className={`text-right text-[10px] font-bold font-mono mt-1 ${strength.color}`}>{strength.label}</div>
               </div>
               <button type="button" onClick={() => { setMode('SELECT'); setPassword(''); }} className="w-full p-3 border border-van-700 text-van-500 hover:text-white hover:bg-van-800 text-xs font-bold tracking-widest">BACK</button>
            </div>
          )}

          {/* --- MODE: EMAIL OTP (With TOTP Simulation) --- */}
          {mode === 'EMAIL_OTP' && (
            <form onSubmit={handleEmailVerify} className="space-y-6 animate-slide-up">
               <div className="text-center mb-6 bg-van-950/50 p-4 border border-van-800 rounded">
                   <div className="text-xs text-van-400 font-mono mb-1">TOTP AUTHENTICATOR REQ.</div>
                   <div className="text-sm text-white font-bold">{email}</div>
                   <div className="text-[9px] text-van-700 mt-1">(Use Mock Authenticator: 123456)</div>
               </div>
               <div className="space-y-2">
                   <label className="text-xs text-van-success font-mono tracking-widest">6-DIGIT TOTP CODE</label>
                   <div className="flex bg-van-950 border border-van-700 focus-within:border-van-success transition-colors p-3">
                       <Key className="text-van-600 mr-3" size={20} />
                       <input 
                         type="text" 
                         value={otp}
                         onChange={e => setOtp(e.target.value)}
                         placeholder="000000"
                         maxLength={6}
                         className="bg-transparent w-full text-white placeholder-van-700 outline-none font-mono tracking-[0.5em] text-center font-bold"
                         autoFocus
                       />
                   </div>
               </div>
               <div className="flex gap-3">
                   <button type="button" onClick={() => { setMode('EMAIL_INPUT'); setError(''); }} className="flex-1 p-3 border border-van-700 text-van-500 hover:text-white hover:bg-van-800 text-xs font-bold tracking-widest">RETRY</button>
                   <button type="submit" disabled={loading} className="flex-[2] bg-van-success text-black font-bold p-3 hover:bg-white transition-colors flex items-center justify-center gap-2">
                       {loading ? <Loader2 className="animate-spin" size={16} /> : 'AUTHENTICATE'}
                   </button>
               </div>
            </form>
          )}

        </div>
        
        {/* Animated Scanline at bottom */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-van-accent to-transparent absolute bottom-0 animate-scan opacity-50"></div>
      </div>
    </div>
  );
};
