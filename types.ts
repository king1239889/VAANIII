
export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  method: 'gmail' | 'phone';
  // Gamification & Settings
  xp: number;
  rank: string;
  theme: 'CYAN' | 'AMBER' | 'PURPLE' | 'GREEN' | 'CYBERPREP'; // Added CYBERPREP (Light Mode)
  font: 'STANDARD' | 'RETRO';
  audioVolume: number; // 0-1
  
  // New Settings
  hotword?: string; // e.g. "Computer"
  avatarTexture?: 'WIRE' | 'GLASS' | 'HOLOGRAM' | 'SWARM';
  showConstellations?: boolean;
  autoLockMinutes?: number; 
  isOfflineMode?: boolean; 
  
  // v10.0 Enhancements
  weatherEffect?: 'NONE' | 'RAIN' | 'SNOW' | 'EMBER';
  enableTilt?: boolean;
  reducedMotion?: boolean;
  showMetrics?: boolean;
  vrMode?: boolean;
}

export interface Thread {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  preview: string;
  isLocked?: boolean;
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
  title?: string;
}

export interface QuizData {
  question: string;
  options: string[];
  correctAnswerIndex: number; // 0-3
  explanation: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  topic: string;
}

export interface ResearchStep {
    id: string;
    action: string;
    status: 'PENDING' | 'WORKING' | 'COMPLETE' | 'FAILED';
    result?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  groundingChunks?: GroundingChunk[];
  attachments?: Attachment[];
  generatedMedia?: GeneratedMedia[];
  sentiment?: 'neutral' | 'happy' | 'angry' | 'curious' | 'cautionary';
  
  isPinned?: boolean;
  reactions?: Record<string, number>; // emoji -> count
  tokenUsage?: { input: number; output: number };
  chartData?: ChartData;
  quizData?: QuizData; // Quiz Data kept for implicit quiz mode
  isGlitch?: boolean;
  
  // New: Deep Research / Thoughts
  thoughtProcess?: ResearchStep[];
}

export interface SystemLog {
  id: string;
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  message: string;
  module: string;
}

export interface Attachment {
  type: 'image' | 'file' | 'video' | 'audio';
  mimeType: string;
  data: string; // base64
  url?: string; // preview url (mainly for images)
  name?: string; // filename for display
}

export interface GeneratedMedia {
  type: 'image' | 'video';
  mimeType: string;
  url: string;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  maps?: {
    uri?: string;
    title?: string;
  };
}

// Universe Specific Types
export interface UniverseMarker {
    id: string;
    bodyId: string;
    lat: number; // pseudo-lat on sphere
    lng: number; // pseudo-lng on sphere
    label: string;
    color: string;
}

export interface CameraBookmark {
    id: string;
    name: string;
    position: { x: number, y: number, z: number };
    target: { x: number, y: number, z: number };
    bodyId: string;
}

export enum AppMode {
  CHAT = 'CHAT',
  LIVE = 'LIVE',
  MAP = 'MAP'
}

export enum Protocol {
  SPEED_LINK = 'SPEED_LINK', 
  DEEP_SEARCH = 'DEEP_SEARCH', 
  CODEY_BRO = 'CODEY_BRO', 
  ETHICAL_HACKING = 'ETHICAL_HACKING', // New Protocol
  LATEST_NEWS = 'LATEST_NEWS', 
  IMG_GEN = 'IMG_GEN', 
  IMG_EDIT = 'IMG_EDIT', 
  VID_GEN = 'VID_GEN',
  DATA_VIZ = 'DATA_VIZ',
  TRANSCRIPTION = 'TRANSCRIPTION',
  VECTOR_GEN = 'VECTOR_GEN'
}

export interface GenerationConfig {
  aspectRatio: string;
  resolution: string;
  style?: string;
  negativePrompt?: string;
  language?: string;
}

export interface AudioVisualizerState {
  isSpeaking: boolean;
  volume: number;
}

export interface Personality {
    id: string;
    name: string;
    description: string;
    systemInstruction: string;
    voice: string; // 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr'
    color: string; // Hex for UI theming
}
