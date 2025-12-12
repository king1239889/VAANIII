
import { User } from '../types';
import { storageService } from './storageService';

// Mock delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const authService = {
  
  // FEATURE 99: Password Strength
  checkPasswordStrength: (password: string): { score: number, label: string, color: string } => {
      if (password.length < 4) return { score: 1, label: 'WEAK // TRIVIAL', color: 'text-red-500' };
      if (password.length < 8) return { score: 2, label: 'MODERATE // CRACKABLE', color: 'text-yellow-500' };
      if (password.match(/[A-Z]/) && password.match(/[0-9]/) && password.match(/[^A-Za-z0-9]/)) {
          return { score: 4, label: 'MILITARY GRADE // ENCRYPTED', color: 'text-van-success' };
      }
      return { score: 3, label: 'STRONG // SECURE', color: 'text-van-accent' };
  },

  // FEATURE 98: TOTP Check
  verifyTOTP: (code: string): boolean => {
      // Mock logic: allow any 6 digit code
      return /^\d{6}$/.test(code);
  },

  // --- Gmail OTP Flow ---
  requestGmailOTP: async (email: string): Promise<boolean> => {
    await delay(2000); 
    console.log(`[VAANIII SECURITY] Email OTP Sent to ${email}. CODE: 123456`);
    return true; 
  },

  verifyGmailOTP: async (email: string, otp: string): Promise<User | null> => {
    await delay(1500);
    if (otp === '123456') {
       const user: User = {
        id: `g_${email.replace(/[@.]/g, '_')}`,
        name: email.split('@')[0], 
        email: email,
        avatar: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=ea4335&color=fff&bold=true`, 
        method: 'gmail',
        xp: 0,
        rank: 'CADET',
        theme: 'CYAN',
        font: 'STANDARD',
        audioVolume: 1.0,
        autoLockMinutes: 5
      };
      storageService.saveUserSession(user);
      return user;
    }
    return null;
  },

  // --- Phone OTP Flow ---
  requestPhoneOTP: async (phoneNumber: string): Promise<boolean> => {
    await delay(1500);
    console.log(`[VAANIII SECURITY] SMS OTP Sent to ${phoneNumber}: 123456`);
    return true; 
  },

  verifyPhoneOTP: async (phoneNumber: string, otp: string): Promise<User | null> => {
    await delay(1500);
    if (otp === '123456') {
      const user: User = {
        id: `p_${phoneNumber.replace(/\D/g, '')}`,
        name: `Agent ${phoneNumber.slice(-4)}`,
        phone: phoneNumber,
        avatar: `https://ui-avatars.com/api/?name=${phoneNumber.slice(-2)}&background=d946ef&color=fff&bold=true`,
        method: 'phone',
        xp: 0,
        rank: 'CADET',
        theme: 'CYAN',
        font: 'STANDARD',
        audioVolume: 1.0,
        autoLockMinutes: 5
      };
      storageService.saveUserSession(user);
      return user;
    }
    return null;
  },

  logout: async () => {
    await delay(500);
    storageService.clearUserSession();
  }
};
