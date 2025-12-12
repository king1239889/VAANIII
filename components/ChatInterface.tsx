
import React, { useState, useRef, useEffect } from 'react';
import { Send, MapPin, Search, Loader2, Mic, MicOff, Terminal, ChevronRight, Cpu, Copy, Check, Database, Pencil, X, ChevronDown, Paperclip, Image as ImageIcon, Zap, Layers, Maximize, Sparkles, FileText, ChevronUp, Eye, Code as CodeIcon, History, Clock, Radio, Video as VideoIcon, Volume2, RefreshCw, Share, ThumbsUp, ThumbsDown, MoreHorizontal, Palette, Ban, Play, Pause, AlertTriangle, Languages, Pin, BarChart, FileAudio, LayoutTemplate, MessageCircle, AlertOctagon, Download, Trash2, Bug, BookOpen, FileCode, Brain, Network, ScanLine, Maximize2, RotateCw, Lightbulb, GraduationCap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, GroundingChunk, Protocol, GenerationConfig, Attachment, ChartData, ResearchStep, QuizData } from '../types';
import { generateSpeech, optimizePrompt, generateChartData, transcribeAudio, generateCodeDocumentation } from '../services/geminiService';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string, protocol: Protocol, config: GenerationConfig, attachments: Attachment[]) => void;
  onEditMessage?: (id: string, newText: string) => void;
  isLoading: boolean;
  onPlaceSelect?: (place: string) => void;
  compact?: boolean;
  onExportData?: () => void; 
  onForgetThread?: () => void;
}

const ChartRenderer = ({ data }: { data: ChartData }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (!canvasRef.current || !(window as any).Chart) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        if (chartRef.current) chartRef.current.destroy();
        
        try {
            chartRef.current = new (window as any).Chart(ctx, {
                type: data.type,
                data: data,
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 1000, easing: 'easeOutQuart' },
                    plugins: {
                        legend: { labels: { color: '#94a3b8', font: { family: 'JetBrains Mono' } } },
                        title: { display: !!data.title, text: data.title, color: '#e2e8f0', font: { family: 'Orbitron', size: 14 } }
                    },
                    scales: data.type !== 'pie' && data.type !== 'doughnut' ? {
                        y: { grid: { color: 'rgba(30, 41, 59, 0.5)' }, ticks: { color: '#64748b' }, border: { display: false } },
                        x: { grid: { color: 'rgba(30, 41, 59, 0.5)' }, ticks: { color: '#64748b' }, border: { display: false } }
                    } : { x: { display: false }, y: { display: false } }
                }
            });
        } catch(e) { console.error(e); }
        return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
    }, [data]);

    return (
        <div className="w-full h-72 bg-van-900/40 backdrop-blur-sm rounded-lg p-4 border border-van-700/50 relative mb-4">
            <canvas ref={canvasRef} />
        </div>
    );
};

const QuizRenderer = ({ data, onNext }: { data: QuizData, onNext: () => void }) => {
    const [selected, setSelected] = useState<number | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    
    const isCorrect = selected === data.correctAnswerIndex;

    const handleSelect = (idx: number) => {
        if (isSubmitted) return;
        setSelected(idx);
        setIsSubmitted(true);
    };

    return (
        <div className="bg-van-900/50 border border-van-700/50 rounded-xl p-6 max-w-lg mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-md">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 text-van-purple font-mono text-[10px] uppercase tracking-widest border border-van-purple/30 px-2 py-1 rounded-full">
                    <GraduationCap size={12} />
                    <span>{data.topic} // {data.difficulty}</span>
                </div>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-6 leading-relaxed">{data.question}</h3>
            
            <div className="space-y-3 mb-6">
                {data.options.map((opt, i) => {
                    let stateClass = 'border-van-800 bg-van-950/50 hover:bg-van-800 text-gray-300';
                    if (isSubmitted) {
                        if (i === data.correctAnswerIndex) stateClass = 'border-green-500 bg-green-500/10 text-green-400';
                        else if (i === selected && i !== data.correctAnswerIndex) stateClass = 'border-red-500 bg-red-500/10 text-red-400';
                        else stateClass = 'border-van-800 opacity-50';
                    } else if (selected === i) {
                        stateClass = 'border-van-accent bg-van-accent/10 text-white';
                    }

                    return (
                        <button 
                            key={i} 
                            onClick={() => handleSelect(i)}
                            disabled={isSubmitted}
                            className={`w-full text-left p-4 rounded-lg border transition-all duration-300 flex items-center justify-between group ${stateClass}`}
                        >
                            <span className="text-sm font-medium">{opt}</span>
                            {isSubmitted && i === data.correctAnswerIndex && <Check size={16} className="text-green-500" />}
                            {isSubmitted && i === selected && i !== data.correctAnswerIndex && <X size={16} className="text-red-500" />}
                        </button>
                    );
                })}
            </div>

            {isSubmitted && (
                <div className="animate-slide-up">
                    <div className={`p-4 rounded-lg border mb-4 text-sm ${isCorrect ? 'bg-green-500/5 border-green-500/30' : 'bg-red-500/5 border-red-500/30'}`}>
                        <div className={`font-bold mb-1 flex items-center gap-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                            {isCorrect ? <Check size={16} /> : <AlertTriangle size={16} />}
                            {isCorrect ? 'CORRECT' : 'INCORRECT'}
                        </div>
                        <p className="text-gray-400 leading-relaxed">{data.explanation}</p>
                    </div>
                    <button 
                        onClick={onNext}
                        className="w-full py-3 bg-van-accent text-black font-bold rounded-lg hover:bg-white transition-colors flex items-center justify-center gap-2"
                    >
                        NEXT QUESTION <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

const CodeBlock = ({ inline, className, children, ...props }: any) => {
    const [mode, setMode] = useState<'CODE' | 'PREVIEW'>('CODE');
    const [copied, setCopied] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); 
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    const match = /language-(\w+)/.exec(className || '');
    const language = (match ? match[1] : 'text').toLowerCase();
    const code = String(children).replace(/\n$/, '');
    
    // Highlight Code on mount
    useEffect(() => {
        if ((window as any).Prism) (window as any).Prism.highlightAll();
    }, [mode, code]);

    // Handle refresh loading state
    useEffect(() => {
        if (mode === 'PREVIEW') {
            setIsLoadingPreview(true);
        }
    }, [refreshKey, mode]);

    // Capability Detection
    const isMermaid = language === 'mermaid';
    const isReact = ['jsx', 'tsx'].includes(language);
    const isWeb = ['html', 'xml', 'svg'].includes(language);
    const isJS = ['javascript', 'js', 'typescript', 'ts'].includes(language);
    const isCSS = ['css', 'scss'].includes(language);
    // Python support in Code View only for now, unless we fetch Pyodide, 
    // but user asked for preview improvements. We'll ensure it renders cleanly in code view.
    const isPython = ['python', 'py'].includes(language);
    
    // Auto-switch to preview for React/Web if clearly intended
    const canPreview = isWeb || isJS || isCSS || isReact || isMermaid;

    if (inline) return <code className="bg-van-900/50 text-van-accent px-1 rounded text-xs font-mono" {...props}>{children}</code>;
    
    const getPreviewContent = () => {
        const commonHead = `
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Inter', sans-serif; background-color: #0f172a; color: #e2e8f0; }
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
            </style>
        `;

        // 1. MERMAID
        if (isMermaid) {
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    ${commonHead}
                </head>
                <body class="flex items-center justify-center min-h-screen bg-van-950 p-4">
                    <pre class="mermaid">${code}</pre>
                    <script type="module">
                        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
                        mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose' });
                    </script>
                </body>
                </html>
            `;
        }

        // 2. HTML / CSS
        if (isWeb || isCSS) {
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    ${commonHead}
                    ${isCSS ? `<style>${code}</style>` : ''}
                </head>
                <body class="p-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white min-h-screen">
                    ${isCSS ? `
                        <div class="preview-box p-4 border rounded">
                            <h1>CSS Preview Context</h1>
                            <p>Elements here are styled by your CSS.</p>
                            <button class="px-4 py-2 bg-blue-500 text-white rounded mt-2">Sample Button</button>
                        </div>
                    ` : code}
                </body>
                </html>
            `;
        }

        // 3. REACT / JS / TS (Sandboxed Environment)
        if (isReact || isJS) {
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    ${commonHead}
                    <!-- React & ReactDOM -->
                    <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
                    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
                    <!-- Babel for JSX -->
                    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                    <style>
                        #console { 
                            margin-top: 2rem; 
                            border-top: 1px solid #334155; 
                            padding-top: 1rem; 
                            font-family: 'JetBrains Mono', monospace; 
                            font-size: 12px; 
                            color: #94a3b8;
                        }
                        .log-entry { 
                            border-left: 2px solid transparent; 
                            padding-left: 8px; 
                            margin-bottom: 4px; 
                            white-space: pre-wrap;
                        }
                        .log-log { border-color: #00f0ff; color: #e2e8f0; }
                        .log-error { border-color: #ff003c; color: #ff003c; background: rgba(255, 0, 60, 0.1); }
                        .log-warn { border-color: #fcee0a; color: #fcee0a; }
                    </style>
                </head>
                <body class="p-4 bg-slate-950 text-slate-200 min-h-screen">
                    <div id="root"></div>
                    <div id="console"></div>
                    
                    <script type="text/babel">
                        // Console Capture
                        const consoleDiv = document.getElementById('console');
                        function appendLog(type, args) {
                            const div = document.createElement('div');
                            div.className = 'log-entry log-' + type;
                            div.textContent = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
                            consoleDiv.appendChild(div);
                        }
                        ['log', 'error', 'warn'].forEach(type => {
                            const original = console[type];
                            console[type] = (...args) => {
                                original.apply(console, args);
                                appendLog(type, args);
                            };
                        });
                        
                        window.onerror = (msg) => console.error(msg);

                        try {
                           ${code}
                        } catch (err) {
                           console.error(err.message);
                        }
                    </script>
                </body>
                </html>
            `;
        }

        return code;
    };

    return (
        <div className="my-6 rounded-xl border border-van-700/50 bg-[#0A0F1C] overflow-hidden text-sm shadow-[0_8px_30px_rgba(0,0,0,0.4)] group transition-all hover:border-van-600/50">
            {/* Header */}
            <div className="bg-[#050A10] px-4 py-2.5 flex justify-between items-center border-b border-van-800/50 select-none">
                <div className="flex items-center gap-4">
                    {/* Mac-like dots for aesthetic */}
                    <div className="flex gap-1.5 mr-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-van-400 font-mono text-[11px] font-bold uppercase tracking-wider">
                        {isReact ? <CodeIcon size={14} className="text-blue-400" /> : <Terminal size={14} />}
                        <span>{language || 'PLAINTEXT'}</span>
                    </div>

                    {canPreview && (
                        <div className="hidden sm:flex bg-van-900/80 rounded-lg p-0.5 border border-van-800">
                             <button 
                               onClick={() => setMode('CODE')}
                               className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-widest transition-all flex items-center gap-1.5 ${mode === 'CODE' ? 'bg-van-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                             >
                                <CodeIcon size={10} /> CODE
                             </button>
                             <button 
                               onClick={() => setMode('PREVIEW')}
                               className={`px-3 py-1 rounded-md text-[10px] font-bold tracking-widest transition-all flex items-center gap-1.5 ${mode === 'PREVIEW' ? 'bg-van-accent text-black shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'text-gray-500 hover:text-gray-300'}`}
                             >
                                <Eye size={10} /> PREVIEW
                             </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {mode === 'PREVIEW' && (
                        <button onClick={() => setRefreshKey(k => k + 1)} className="p-1.5 text-gray-500 hover:text-white hover:bg-van-800 rounded transition-colors" title="Rerun Preview">
                            <RotateCw size={14} />
                        </button>
                    )}
                    <button 
                        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
                        className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-van-800 rounded transition-colors text-gray-400 hover:text-white"
                        title="Copy Code"
                    >
                        {copied ? <Check size={14} className="text-green-500"/> : <Copy size={14} />}
                        <span className="text-[10px] font-bold hidden sm:inline">{copied ? 'COPIED' : 'COPY'}</span>
                    </button>
                </div>
            </div>
            
            {/* Content Body */}
            <div className="relative">
                {mode === 'CODE' ? (
                    <div className="relative group/code">
                        <pre className="p-4 overflow-x-auto text-gray-300 custom-scrollbar font-mono leading-relaxed text-[13px] bg-[#0B1221] min-h-[50px] max-h-[500px]">
                            <code className={className} {...props}>{children}</code>
                        </pre>
                        {/* Gradient fade at bottom if too long */}
                        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#0B1221] to-transparent pointer-events-none"></div>
                    </div>
                ) : (
                    <div className="w-full bg-[#0f172a] relative border-t border-van-800/30 h-[400px]">
                         {/* Sandbox Header Decoration */}
                         <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-van-accent via-van-purple to-van-accent opacity-20 z-10"></div>
                         
                         {isLoadingPreview && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a] z-20">
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 size={32} className="text-van-accent animate-spin" />
                                    <span className="text-xs text-van-400 font-mono tracking-widest animate-pulse">COMPILING SANDBOX...</span>
                                </div>
                            </div>
                         )}

                         <iframe 
                            key={refreshKey}
                            title="Code Preview"
                            srcDoc={getPreviewContent()}
                            className="w-full h-full border-none bg-[#0f172a]"
                            sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                            onLoad={() => setIsLoadingPreview(false)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
const MarkdownComponents = { code: CodeBlock };

const ThoughtProcess = ({ steps }: { steps: ResearchStep[] }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    
    return (
        <div className="mb-4 rounded-lg border border-van-700/50 bg-black/40 overflow-hidden">
            <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center justify-between px-4 py-2 bg-van-900/50 hover:bg-van-800/50 transition-colors">
                 <div className="flex items-center gap-2 text-van-accent text-xs font-bold tracking-widest">
                     <Brain size={14} className="animate-pulse" />
                     <span>DEEP RESEARCH PROTOCOL</span>
                 </div>
                 {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
            
            {isExpanded && (
                <div className="p-4 space-y-3">
                    {steps.map((step) => (
                        <div key={step.id} className="flex items-start gap-3 text-xs font-mono">
                            <div className={`mt-0.5 w-3 h-3 flex items-center justify-center rounded-full border ${
                                step.status === 'COMPLETE' ? 'border-van-success bg-van-success/20 text-van-success' : 
                                step.status === 'WORKING' ? 'border-van-warn bg-van-warn/20 text-van-warn animate-pulse' : 
                                step.status === 'FAILED' ? 'border-red-500 bg-red-500/20 text-red-500' : 'border-gray-600'
                            }`}>
                                {step.status === 'COMPLETE' && <Check size={8} />}
                                {step.status === 'WORKING' && <Loader2 size={8} className="animate-spin" />}
                                {step.status === 'FAILED' && <X size={8} />}
                            </div>
                            <div className="flex-1">
                                <div className={`font-bold ${
                                    step.status === 'WORKING' ? 'text-van-warn' : 'text-gray-400'
                                }`}>{step.action}</div>
                                {step.result && <div className="mt-1 text-[10px] text-gray-500 border-l border-gray-700 pl-2">{step.result}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const MessageActionBar = ({ msg, onSpeak, isPlaying, isLoadingSpeech }: any) => (
    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 opacity-50 hover:opacity-100 transition-opacity">
        <div className="flex gap-2">
            <button onClick={onSpeak} className="hover:text-white"><Volume2 size={14} /></button>
            <button onClick={() => navigator.clipboard.writeText(msg.text)} className="hover:text-white"><Copy size={14} /></button>
        </div>
    </div>
);

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, onSendMessage, isLoading, onPlaceSelect, compact = false, onExportData, onForgetThread
}) => {
  const [input, setInput] = useState('');
  const [protocol, setProtocol] = useState<Protocol>(Protocol.DEEP_SEARCH);
  const [genConfig, setGenConfig] = useState<GenerationConfig>({ aspectRatio: '1:1', resolution: '1K', style: 'Cinematic', negativePrompt: '', language: 'English' });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showProtocolMenu, setShowProtocolMenu] = useState(false);
  const [playback, setPlayback] = useState<{id: string, isPlaying: boolean}>({id: '', isPlaying: false});
  const [isLoadingSpeech, setIsLoadingSpeech] = useState(false);
  
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading, attachments]);

  const handleSpeak = async (text: string, id: string) => {
      console.log("Speaking", text);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (ev) => {
              const base64 = (ev.target?.result as string).split(',')[1];
              let type: any = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : 'file';
              setAttachments([{ type, mimeType: file.type, data: base64, url: URL.createObjectURL(file), name: file.name }]);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;
    onSendMessage(input, protocol, genConfig, attachments);
    setInput(''); setAttachments([]);
  };
  
  const protocols = [
    { id: Protocol.DEEP_SEARCH, label: 'DEEP_SEARCH', icon: <Sparkles size={14} />, color: 'text-van-accent' },
    { id: Protocol.SPEED_LINK, label: 'SPEED_LINK', icon: <Zap size={14} />, color: 'text-van-warn' },
    { id: Protocol.CODEY_BRO, label: 'CODEY_BRO', icon: <Terminal size={14} />, color: 'text-green-400' },
    { id: Protocol.ETHICAL_HACKING, label: 'WHITE_HAT', icon: <Bug size={14} />, color: 'text-red-500' }, // Added Ethical Hacking
    { id: Protocol.IMG_GEN, label: 'IMG_GEN', icon: <ImageIcon size={14} />, color: 'text-van-purple' },
    { id: Protocol.DATA_VIZ, label: 'DATA_VIZ', icon: <BarChart size={14} />, color: 'text-orange-400' },
  ];
  const currentProtocol = protocols.find(p => p.id === protocol) || protocols[0];

  return (
    <div className={`flex flex-col h-full relative font-sans text-sm ${compact ? '' : ''}`}>
      {!compact && (
          <div className="absolute top-0 right-0 p-4 z-20 flex gap-2">
               {onExportData && <button onClick={onExportData} className="p-2 bg-van-800 border border-van-700 text-van-400 rounded hover:text-white"><Download size={14}/></button>}
               {onForgetThread && <button onClick={onForgetThread} className="p-2 bg-van-800 border border-van-700 text-van-400 rounded hover:text-red-500"><Trash2 size={14}/></button>}
          </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-van-700 scrollbar-track-transparent">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-slide-up group relative`}>
             <div className={`flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold ${msg.role === 'user' ? 'text-van-400 mb-1' : 'text-van-accent mb-1'}`}>
                {msg.role === 'model' && <Terminal size={10} />}
                <span>{msg.role === 'user' ? 'USER' : 'VAANIII'}</span>
             </div>
             
             <div className={`w-full max-w-[85%] relative p-4 backdrop-blur-sm rounded-lg ${msg.role === 'user' ? 'bg-van-800/80 border border-van-700 text-right' : 'bg-van-950/80 border border-van-800 shadow-lg'}`}>
                
                {msg.role === 'model' && msg.thoughtProcess && <ThoughtProcess steps={msg.thoughtProcess} />}

                {msg.generatedMedia?.map((media, i) => (
                    <div key={i} className="mb-4 rounded-lg overflow-hidden border border-van-800 bg-black">
                        {media.type === 'image' && <img src={media.url} className="w-full h-auto object-cover" />}
                        {media.type === 'video' && <video src={media.url} controls className="w-full h-auto" />}
                    </div>
                ))}
                
                {msg.chartData && <ChartRenderer data={msg.chartData} />}

                {/* QUIZ RENDERER INTEGRATION */}
                {msg.quizData && (
                    <QuizRenderer 
                        data={msg.quizData} 
                        onNext={() => onSendMessage(`Give me another question about ${msg.quizData?.topic || 'this topic'}.`, Protocol.DEEP_SEARCH, genConfig, [])}
                    />
                )}

                {/* Only render text if not purely a quiz object (sometimes intro text exists) */}
                {(!msg.quizData || msg.text !== "QUIZ_GENERATED") && (
                    <div className={`prose prose-invert max-w-none ${msg.role === 'user' ? 'prose-sm text-gray-100' : 'prose-base md:prose-lg text-gray-100 leading-relaxed'}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>{msg.text}</ReactMarkdown>
                    </div>
                )}

                {msg.role === 'model' && <MessageActionBar msg={msg} onSpeak={() => handleSpeak(msg.text, msg.id)} isPlaying={false} isLoadingSpeech={false} />}
             </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex items-start gap-4 animate-pulse p-4">
                <div className="w-2 h-2 rounded-full bg-van-accent mt-2"></div>
                <div className="space-y-2 w-full max-w-sm">
                    <div className="h-4 bg-van-800 rounded w-3/4"></div>
                    <div className="h-4 bg-van-800 rounded w-1/2"></div>
                </div>
            </div>
        )}
        <div ref={endRef} />
      </div>

      <div className={`p-4 bg-van-950/95 backdrop-blur-xl border-t border-van-700/50 pb-[calc(1rem+env(safe-area-inset-bottom))]`}>
         <div className="flex justify-between items-center mb-2">
             <div className="relative">
                <button onClick={() => setShowProtocolMenu(!showProtocolMenu)} className={`flex items-center gap-2 text-[10px] font-bold uppercase ${currentProtocol?.color} hover:bg-white/5 px-3 py-1.5 rounded border border-van-700/50`}>
                    {currentProtocol?.icon} <span>{currentProtocol?.label}</span> <ChevronDown size={10} />
                </button>
                {showProtocolMenu && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-van-950 border border-van-700 rounded shadow-xl z-50">
                        {protocols.map(p => (
                            <button key={p.id} onClick={() => { setProtocol(p.id as Protocol); setShowProtocolMenu(false); }} className={`w-full flex items-center gap-2 px-3 py-3 text-xs hover:bg-van-800 ${p.id === protocol ? p.color : 'text-gray-400'}`}>
                                {p.icon} <span>{p.label}</span>
                            </button>
                        ))}
                    </div>
                )}
             </div>
             <div className="flex items-center gap-1 opacity-50">
                 <div className="w-1 h-3 bg-van-success rounded-full animate-pulse"></div>
                 <div className="w-1 h-5 bg-van-accent rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                 <div className="w-1 h-2 bg-van-purple rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                 <span className="text-[9px] font-mono ml-1 text-van-500">VOICE_ANALYSIS</span>
             </div>
         </div>
         
         <form onSubmit={handleSubmit} className="flex gap-2">
             <div className="flex-1 bg-van-900 border border-van-700 rounded-lg flex items-center p-2 focus-within:border-van-accent transition-colors">
                 <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-van-500 hover:text-van-accent"><Paperclip size={18} /></button>
                 <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                 {attachments.length > 0 && <span className="text-xs bg-van-800 px-2 py-1 rounded text-van-accent mr-2">{attachments.length} file(s)</span>}
                 <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter command..."
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-van-700 font-mono text-sm"
                 />
             </div>
             <button type="submit" disabled={isLoading} className="bg-van-accent text-black p-3 rounded-lg hover:bg-white transition-colors">
                 {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
             </button>
         </form>
      </div>
    </div>
  );
};
