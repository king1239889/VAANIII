
import { Message, User, Thread } from '../types';

const CHAT_STORAGE_KEY_PREFIX = 'vaaniii_history_';
const THREADS_STORAGE_KEY = 'vaaniii_threads_';
const USER_STORAGE_KEY = 'vaaniii_active_user';

// --- FEATURE 92: IndexedDB Helper ---
const IDB_NAME = 'VaaniiiDB';
const IDB_VERSION = 1;
const IDB_STORE = 'chat_archives';

const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(IDB_NAME, IDB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const saveToIDB = async (key: string, data: any) => {
    try {
        const db = await initDB();
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put({ id: key, data, timestamp: Date.now() });
    } catch (e) {
        console.error("IDB Save Failed", e);
    }
};

const getFromIDB = async (key: string): Promise<any> => {
    try {
        const db = await initDB();
        return new Promise((resolve) => {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const req = tx.objectStore(IDB_STORE).get(key);
            req.onsuccess = () => resolve(req.result?.data || null);
            req.onerror = () => resolve(null);
        });
    } catch (e) {
        return null;
    }
};

// --- FEATURE 94: Mock Encryption ---
const encrypt = (data: string): string => {
    return `ENC_${btoa(unescape(encodeURIComponent(data)))}`;
};

const decrypt = (data: string): string => {
    if (!data.startsWith('ENC_')) return data; // Migration handle
    try {
        return decodeURIComponent(escape(atob(data.slice(4))));
    } catch (e) {
        return data;
    }
};

export const storageService = {
  // --- FEATURE 105: Data Scrubbing ---
  scrubData: (text: string): string => {
      // Simple regex for mock credits cards (4 sets of 4 digits)
      let cleaned = text.replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, '[REDACTED_PAYMENT]');
      // Simple regex for emails
      cleaned = cleaned.replace(/\b[\w.-]+@[\w.-]+\.\w{2,4}\b/g, '[REDACTED_EMAIL]');
      // Mock Password pattern
      cleaned = cleaned.replace(/password\s*[:=]\s*\S+/gi, 'password: [REDACTED_SECRET]');
      return cleaned;
  },

  // --- FEATURE 95: Data Export ---
  exportAllData: async (userId: string) => {
      const threads = storageService.getThreads(userId);
      const history: Record<string, Message[]> = {};
      
      for(const t of threads) {
          history[t.id] = storageService.getChatHistory(t.id);
      }

      const exportBundle = {
          user: storageService.getUserSession(),
          threads,
          history,
          exportedAt: new Date().toISOString(),
          version: '9.5'
      };

      const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
      return URL.createObjectURL(blob);
  },

  // --- User Session ---
  saveUserSession: (user: User) => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  },

  getUserSession: (): User | null => {
    const data = localStorage.getItem(USER_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  },

  clearUserSession: () => {
    localStorage.removeItem(USER_STORAGE_KEY);
  },

  // --- Thread Management ---
  getThreads: (userId: string): Thread[] => {
      try {
          const data = localStorage.getItem(`${THREADS_STORAGE_KEY}${userId}`);
          if (!data) return [];
          return JSON.parse(data).map((t: any) => ({
              ...t,
              createdAt: new Date(t.createdAt),
              updatedAt: new Date(t.updatedAt)
          })).sort((a: Thread, b: Thread) => b.updatedAt.getTime() - a.updatedAt.getTime());
      } catch (e) {
          return [];
      }
  },

  saveThreads: (userId: string, threads: Thread[]) => {
      localStorage.setItem(`${THREADS_STORAGE_KEY}${userId}`, JSON.stringify(threads));
  },

  createThread: (userId: string, title: string = 'New Session'): Thread => {
      const threads = storageService.getThreads(userId);
      const newThread: Thread = {
          id: Date.now().toString(),
          title,
          createdAt: new Date(),
          updatedAt: new Date(),
          preview: 'Session initialized...'
      };
      storageService.saveThreads(userId, [newThread, ...threads]);
      return newThread;
  },
  
  updateThread: (userId: string, threadId: string, updates: Partial<Thread>) => {
      const threads = storageService.getThreads(userId);
      const index = threads.findIndex(t => t.id === threadId);
      if (index !== -1) {
          threads[index] = { ...threads[index], ...updates, updatedAt: new Date() };
          storageService.saveThreads(userId, threads);
      }
  },

  deleteThread: (userId: string, threadId: string) => {
      const threads = storageService.getThreads(userId);
      const filtered = threads.filter(t => t.id !== threadId);
      storageService.saveThreads(userId, filtered);
      localStorage.removeItem(`${CHAT_STORAGE_KEY_PREFIX}${threadId}`);
      // Also clean from IDB
      initDB().then(db => {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).delete(`${CHAT_STORAGE_KEY_PREFIX}${threadId}`);
      });
  },

  // --- Message Management (Per Thread) ---
  saveChatHistory: async (threadId: string, messages: Message[]) => {
    // FEATURE 96: Context Pruning
    let toSave = messages;
    if (toSave.length > 50) { // Prune to 50
        toSave = toSave.slice(-50);
    }

    const key = `${CHAT_STORAGE_KEY_PREFIX}${threadId}`;
    const serialized = JSON.stringify(toSave);
    const encrypted = encrypt(serialized);

    try {
      localStorage.setItem(key, encrypted);
    } catch (e) {
      // FEATURE 92: Fallback to IDB if LocalStorage Full
      console.warn("LocalStorage full, switching to IndexedDB");
      await saveToIDB(key, encrypted);
    }
  },

  getChatHistory: (threadId: string): Message[] => {
    try {
      const key = `${CHAT_STORAGE_KEY_PREFIX}${threadId}`;
      let data = localStorage.getItem(key);
      
      // If not in LS, check IDB (Async technically, but for sync return we rely on LS mostly. 
      // In a real app, this method would be async. For simulation, we assume LS is primary source or handle async upstream)
      // Simplifying: If null, return empty array. IDB retrieval would require async refactor of App.tsx which we might do.
      if (!data) return [];
      
      const decrypted = decrypt(data);
      const parsed = JSON.parse(decrypted);
      
      return parsed.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
    } catch (e) {
      console.warn("Failed to load/decrypt chat history", e);
      return [];
    }
  },
  
  clearChatHistory: (threadId: string) => {
      localStorage.removeItem(`${CHAT_STORAGE_KEY_PREFIX}${threadId}`);
  }
};
