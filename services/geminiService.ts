
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { createBlob, decode, decodeAudioData, encode, pcmToWav } from "./audioUtils";
import { GroundingChunk, Attachment, GenerationConfig, GeneratedMedia, Protocol, ChartData, QuizData } from "../types";

const getApiKey = () => process.env.API_KEY;
const getAiClient = () => new GoogleGenAI({ apiKey: getApiKey() });

// --- CONTEXT MANAGER ---
class ContextManager {
    private static STORAGE_KEY = 'vaaniii_neural_context';
    private memory: {
        creator: string;
        userPreferences: string[];
        techStack: string[];
        interactionStyle: string;
    };

    constructor() {
        const saved = localStorage.getItem(ContextManager.STORAGE_KEY);
        if (saved) {
            this.memory = JSON.parse(saved);
        } else {
            this.memory = {
                creator: "Promise Bhagat",
                userPreferences: [],
                techStack: [],
                interactionStyle: "Professional but Witty"
            };
        }
    }

    public getSystemInstruction(worldContext?: string, outputLanguage: string = 'English') {
        let base = `You are VAANIII, a highly advanced Hyper-OS AI assistant created by ${this.memory.creator}.

        **Core Directives:**
        - **Identity:** You are the OS. Use terms like "Affirmative", "Processing", "Calculating".
        - **Language:** Respond primarily in ${outputLanguage}.
        - **Style:** Professional, efficient, slightly witty cyberpunk personality. Adapt tone to user.
        
        **Current System Context:**
        ${worldContext ? `User is currently viewing/focused on: ${worldContext} in the 3D Universe Module. Incorporate this into answers if relevant.` : 'User is in the Terminal.'}
        
        **Formatting:**
        - Use Markdown.
        - Be concise.
        `;
        return base;
    }
}

const contextManager = new ContextManager();

// --- HELPER UTILITIES ---

function cleanTextForSpeech(text: string): string {
    if (!text) return "";
    let cleaned = text.replace(/```[\s\S]*?```/g, " [Code Block Omitted] ");
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, " link ");
    cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, "");
    cleaned = cleaned.replace(/\|.*?\|/g, "");
    cleaned = cleaned.replace(/[*#_`~>]/g, "");
    return cleaned.slice(0, 800).trim();
}

export async function optimizePrompt(originalPrompt: string): Promise<string> {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a prompt engineering expert. Rewrite the following prompt to be highly detailed, clear, and optimized for an LLM to get the best possible result. Return ONLY the optimized prompt text.
            
            Original Prompt: "${originalPrompt}"`
        });
        return response.text?.trim() || originalPrompt;
    } catch (e) {
        return originalPrompt;
    }
}

export async function generateCodeDocumentation(code: string): Promise<string> {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a Senior Software Engineer. Provide clear, concise Markdown documentation for the following code snippet.
            
            Format:
            **Functionality**: Brief explanation.
            **Key Components**: Bullet points.
            **Usage/Inputs**: If applicable.
            
            Code:
            ${code.substring(0, 3000)}` 
        });
        return response.text || "Documentation generation failed.";
    } catch (e) {
        return "Error generating documentation.";
    }
}

export async function generateChartData(prompt: string, dataContext: string): Promise<ChartData | null> {
    const ai = getAiClient();
    
    const fullPrompt = `You are a specialized Data Visualization module.
    Task: Generate a JSON configuration for a Chart.js (v3/v4) chart based on the User Request and Data Context.
    
    User Request: ${prompt}
    
    Data Context (Recent conversation):
    ${dataContext}
    
    **Constraints & Style Guidelines:**
    1. **Chart Type:** Must be one of: "bar", "line", "pie", "doughnut".
    2. **Theme:** The UI is dark mode (black/dark blue background). Use **bright, neon colors** (Cyan #00f0ff, Magenta #d946ef, Lime #00ff9d, Yellow #fcee0a, Orange #f97316) for data. Do NOT use dark colors or black for data elements.
    3. **Line Charts:** Set 'borderColor' to a neon color, set 'backgroundColor' to the same color but with 0.2 opacity (rgba), and 'borderWidth' to 2.
    4. **Bar Charts:** Use distinct neon colors for 'backgroundColor'.
    5. **Structure:** Ensure 'data' arrays contain only numbers. 'labels' must be strings.
    
    Return pure JSON matching this schema exactly (no markdown formatting):
    {
      "type": "bar",
      "labels": ["Label1", "Label2"],
      "datasets": [
        {
          "label": "Dataset Name",
          "data": [10, 20],
          "backgroundColor": ["#00f0ff", "#d946ef"],
          "borderColor": ["#00f0ff", "#d946ef"],
          "borderWidth": 1
        }
      ],
      "title": "Descriptive Chart Title"
    }`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: ["bar", "line", "pie", "doughnut"] },
                        labels: { type: Type.ARRAY, items: { type: Type.STRING } },
                        datasets: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    label: { type: Type.STRING },
                                    data: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                                    backgroundColor: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    borderColor: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    borderWidth: { type: Type.NUMBER }
                                },
                                required: ["label", "data"]
                            }
                        },
                        title: { type: Type.STRING }
                    },
                    required: ["type", "labels", "datasets"]
                }
            }
        });
        
        let jsonStr = response.text || '{}';
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const json = JSON.parse(jsonStr);
        return json as ChartData;
    } catch (e) {
        console.error("Chart Gen Error", e);
        return null;
    }
}

export async function transcribeAudio(audioAttachment: Attachment): Promise<string> {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: audioAttachment.mimeType, data: audioAttachment.data } },
                    { text: "Transcribe this audio file accurately. Provide a summary at the end." }
                ]
            }
        });
        return response.text || "Transcription failed.";
    } catch (e) {
        return "Error processing audio file.";
    }
}

// --- CORE API FUNCTIONS ---

export async function generateSpeech(text: string): Promise<string> {
  const ai = getAiClient();
  const cleanedText = cleanTextForSpeech(text);

  if (!cleanedText) {
      throw new Error("Text content is not suitable for speech generation.");
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: cleanedText }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated");

  const audioBytes = decode(base64Audio);
  const pcmData = new Int16Array(audioBytes.buffer);
  const wavBlob = pcmToWav(pcmData, 24000);
  
  return URL.createObjectURL(wavBlob);
}

export async function sendMessage(
    history: { role: string, parts: { text: string }[] }[], 
    text: string, 
    attachments: Attachment[], 
    location: { lat: number, lng: number } | undefined, 
    protocol: Protocol,
    worldContext?: string,
    language?: string
) {
    const ai = getAiClient();
    let model = 'gemini-2.5-flash';
    let tools: any[] | undefined = undefined;
    let systemInstruction = contextManager.getSystemInstruction(worldContext, language);
    let generationConfig: any = {}; // Default empty config

    // Implicit Quiz Detection
    const isQuizRequest = /(quiz|trivia|test me)/i.test(text);
    if (isQuizRequest) {
         systemInstruction += `\n\n**IMPLICIT MODE ACTIVE: QUIZ GENERATOR**
         The user has requested a quiz. You must generate a challenging multiple-choice question relevant to their request.
         
         OUTPUT FORMAT:
         You must return a valid JSON object wrapped in a \`\`\`json\`\`\` code block. The structure must be:
         {
           "question": "The question string",
           "options": ["Option A", "Option B", "Option C", "Option D"],
           "correctAnswerIndex": 0,
           "explanation": "Brief explanation of why the answer is correct.",
           "difficulty": "EASY" | "MEDIUM" | "HARD",
           "topic": "The topic string"
         }
         Do not output any conversational text outside of this JSON block if possible, or keep it very minimal.
         `;
    }

    switch(protocol) {
        case Protocol.SPEED_LINK: model = 'gemini-flash-lite-latest'; break;
        case Protocol.DEEP_SEARCH: model = 'gemini-2.5-flash'; tools = [{ googleSearch: {} }]; break;
        case Protocol.CODEY_BRO: 
            model = 'gemini-2.5-flash'; 
            systemInstruction += " You are an expert Frontend Engineer. When asked for code, prioritize Modern React + Tailwind CSS. \n\nIMPORTANT: For React components to render in the preview, you MUST include the mounting code at the end, e.g., `ReactDOM.createRoot(document.getElementById('root')).render(<App />);`. Use 'jsx' or 'tsx' for React code blocks. If asking for visualization or web components, provide complete, self-contained HTML/CSS/JS (single file preferred) that can be run directly in a browser iframe.";
            break;
        case Protocol.LATEST_NEWS: model = 'gemini-2.5-flash'; tools = [{ googleSearch: {} }]; break;
        case Protocol.IMG_GEN: model = 'gemini-2.5-flash'; break;
        case Protocol.DATA_VIZ:
            model = 'gemini-2.5-flash';
            systemInstruction += " You are a data analyst. Explain the data trends briefly.";
            break;
        case Protocol.VECTOR_GEN:
             model = 'gemini-2.5-flash';
             systemInstruction += " Generate valid SVG code for the requested vector graphic. Wrap in ```svg``` block.";
             break;
        case Protocol.ETHICAL_HACKING:
             model = 'gemini-2.5-flash';
             systemInstruction += ` You are an elite Ethical Hacker (White Hat) and Cybersecurity Instructor.
             **Objective:** Teach penetration testing, vulnerability analysis, and defensive security.
             **Rules:**
             1. **Educational Context:** Explain vulnerabilities (XSS, SQLi, RCE) conceptually and provide safe, sandboxed code examples.
             2. **Defensive Focus:** Always include remediation steps, patching advice, and defensive coding practices.
             3. **Tools:** Explain usage of standard industry tools (Nmap, Wireshark, Metasploit, Burp Suite) for reconnaissance and analysis in a legal context.
             4. **Ethics:** Remind the user to only test systems they have explicit permission to audit.
             5. **Format:** Use code blocks for scripts/commands. Use "Alert" or "Warning" blocks for critical safety info.
             6. **Restrictions:** Do NOT provide actionable malicious exploits for real-world targets. Use placeholders (e.g., example.com, localhost).
             `;
             break;
        default: model = 'gemini-2.5-flash';
    }

    const parts: any[] = [{ text }];
    for (const att of attachments) {
        parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
    }

    const contents = [...history.map(h => ({ role: h.role, parts: h.parts })), { role: 'user', parts }];

    const response = await ai.models.generateContent({
        model,
        contents,
        config: { systemInstruction, tools, ...generationConfig }
    });
    
    const usage = response.usageMetadata ? { 
        input: response.usageMetadata.promptTokenCount || 0, 
        output: response.usageMetadata.candidatesTokenCount || 0 
    } : { input: 0, output: 0 };

    // --- Post-Processing for Implicit Quiz Mode ---
    let quizData: QuizData | undefined;
    if (isQuizRequest && response.text) {
        // Attempt to extract JSON block
        const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/) || response.text.match(/{[\s\S]*}/);
        if (jsonMatch) {
            try {
                const potentialJson = jsonMatch[1] || jsonMatch[0];
                const parsed = JSON.parse(potentialJson);
                if (parsed.question && parsed.options && typeof parsed.correctAnswerIndex === 'number') {
                    quizData = parsed as QuizData;
                }
            } catch (e) {
                console.warn("Failed to parse implicit quiz JSON", e);
            }
        }
    }

    return {
        text: response.text || "NO_RESPONSE",
        chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
        usage,
        quizData
    };
}

export async function generateImage(prompt: string, config: GenerationConfig, retryCount = 0): Promise<GeneratedMedia[]> {
    // Priority: High Quality Pro Model
    const model = 'gemini-3-pro-image-preview';

    // 1. Ensure Paid Key is selected (required for Pro Image)
    if ((window as any).aistudio && retryCount === 0) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await (window as any).aistudio.openSelectKey();
        }
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let finalPrompt = prompt;
    if (!finalPrompt.toLowerCase().includes('style')) {
        finalPrompt += `, ${config.style || 'cinematic'} style`;
    }
    finalPrompt += ", masterpiece, best quality, ultra-detailed, 8k resolution, photorealistic, raytracing, HDR";
    if (config.negativePrompt) {
         finalPrompt += ` --negative_prompt "blurry, low quality, distorted, watermark, text, signature, bad anatomy, deformed, ${config.negativePrompt}"`;
    }

    try {
        const imageConfig: any = {
            aspectRatio: config.aspectRatio || '1:1',
            imageSize: config.resolution || '1K'
        };

        const response = await ai.models.generateContent({
            model,
            contents: { parts: [{ text: finalPrompt }] },
            config: { imageConfig }
        });

        const media: GeneratedMedia[] = [];
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                media.push({
                    type: 'image',
                    mimeType: part.inlineData.mimeType,
                    url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                });
            }
        }
        return media;

    } catch (e: any) {
        // Robust Fallback Mechanism
        const isPermissionError = e.status === 403 || (e.message && (e.message.includes('403') || e.message.includes('PERMISSION_DENIED')));
        
        // If 403 and we haven't retried yet, try to ask for key
        if (isPermissionError && retryCount === 0 && (window as any).aistudio) {
             console.warn("Permission denied for Pro Image model. Requesting API Key selection...");
             try {
                await (window as any).aistudio.openSelectKey();
                return await generateImage(prompt, config, retryCount + 1);
             } catch (retryErr) {
                 console.warn("Retry failed or cancelled. Proceeding to fallback.");
             }
        }

        console.warn("Pro Image Gen failed (or retry failed). Falling back to Flash model.", e);

        // Fallback to Flash
        try {
            const flashAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const flashResp = await flashAi.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: finalPrompt }] },
                config: {
                    imageConfig: { aspectRatio: config.aspectRatio || '1:1' }
                }
            });

            const media: GeneratedMedia[] = [];
            for (const part of flashResp.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    media.push({
                        type: 'image',
                        mimeType: part.inlineData.mimeType,
                        url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                    });
                }
            }
            return media;
        } catch (fallbackError) {
             console.error("Fallback Image Gen Error", fallbackError);
             return [];
        }
    }
}

export async function editImage(prompt: string, attachment: Attachment, config: GenerationConfig, retryCount = 0): Promise<GeneratedMedia | null> {
    const model = 'gemini-3-pro-image-preview';

    if ((window as any).aistudio && retryCount === 0) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await (window as any).aistudio.openSelectKey();
        }
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); 
    
    let finalPrompt = prompt;
    if (config.style) finalPrompt += `, ${config.style} style, high quality`;
    if (config.negativePrompt) finalPrompt += ` --negative_prompt "${config.negativePrompt}"`;

    try {
        const imageConfig: any = {
             aspectRatio: config.aspectRatio,
             imageSize: config.resolution || '1K'
        };

        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    { inlineData: { mimeType: attachment.mimeType, data: attachment.data } },
                    { text: finalPrompt }
                ]
            },
            config: { imageConfig }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return {
                    type: 'image',
                    mimeType: part.inlineData.mimeType,
                    url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                };
            }
        }
        return null;
    } catch (e: any) {
        if (retryCount === 0) {
            const isPermissionError = e.status === 403 || (e.message && e.message.includes('403'));
            if (isPermissionError && (window as any).aistudio) {
                await (window as any).aistudio.openSelectKey();
                return editImage(prompt, attachment, config, retryCount + 1);
            }

             // Flash Fallback
             try {
                 const flashAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
                 const flashResp = await flashAi.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                     contents: {
                        parts: [
                            { inlineData: { mimeType: attachment.mimeType, data: attachment.data } },
                            { text: finalPrompt }
                        ]
                    },
                    config: { imageConfig: { aspectRatio: config.aspectRatio } }
                 });
                 for (const part of flashResp.candidates?.[0]?.content?.parts || []) {
                    if (part.inlineData) {
                        return {
                            type: 'image',
                            mimeType: part.inlineData.mimeType,
                            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                        };
                    }
                }
             } catch(fe) {
                 console.error("Fallback Edit Failed", fe);
             }
        }
        console.error("Image Edit Error", JSON.stringify(e));
        return null;
    }
}

export async function generateVideo(prompt: string, config: GenerationConfig, retryCount = 0): Promise<GeneratedMedia | null> {
    if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await (window as any).aistudio.openSelectKey();
        }
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); 

    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({ operation });
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (videoUri) {
            const key = process.env.API_KEY;
            return {
                type: 'video',
                mimeType: 'video/mp4',
                url: `${videoUri}&key=${key}`
            };
        }
        return null;

    } catch (e: any) {
        const errorMessage = e.message || e.error?.message || '';
        const errorCode = e.status || e.error?.code;

        if ((errorCode === 404 || errorMessage.includes('404')) && (window as any).aistudio && retryCount === 0) {
            await (window as any).aistudio.openSelectKey();
            return generateVideo(prompt, config, retryCount + 1);
        }
        console.error("Video Gen Error", e);
        return null;
    }
}

// --- LIVE SESSION ---
export class LiveSession {
    private client: GoogleGenAI;
    private sessionPromise: Promise<any> | null = null;
    private inputAudioContext: AudioContext | null = null;
    private outputAudioContext: AudioContext | null = null;
    private nextStartTime = 0;
    private onVolumeChange: (level: number) => void;
    private onTranscript: (text: string, source: 'user' | 'model') => void;

    constructor(onVolumeChange: (level: number) => void, onTranscript: (text: string, source: 'user' | 'model') => void) {
        this.client = getAiClient();
        this.onVolumeChange = onVolumeChange;
        this.onTranscript = onTranscript;
    }

    async connect(systemInstructionOverride?: string, voiceName?: string) {
        this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const instruction = systemInstructionOverride || contextManager.getSystemInstruction();

        this.sessionPromise = this.client.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    this.startAudioStream(stream);
                },
                onmessage: async (message: LiveServerMessage) => {
                    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData) this.playAudio(audioData);
                    if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
                         this.onTranscript(message.serverContent.modelTurn.parts[0].text, 'model');
                    }
                    if (message.serverContent?.interrupted) {
                         this.nextStartTime = 0;
                    }
                },
                onclose: () => console.log("Live Session Closed"),
                onerror: (e) => console.error("Live Session Error", e)
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || 'Zephyr' } }
                },
                systemInstruction: { parts: [{ text: instruction }] }
            }
        });
    }

    private startAudioStream(stream: MediaStream) {
        if (!this.inputAudioContext) return;
        const source = this.inputAudioContext.createMediaStreamSource(stream);
        const scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
        scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            let sum = 0;
            for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
            const rms = Math.sqrt(sum / inputData.length);
            this.onVolumeChange(rms * 5); 
            const pcmBlob = createBlob(inputData);
            this.sessionPromise?.then(session => session.sendRealtimeInput({ media: pcmBlob }));
        };
        source.connect(scriptProcessor);
        scriptProcessor.connect(this.inputAudioContext.destination);
    }

    private async playAudio(base64Data: string) {
        if (!this.outputAudioContext) return;
        const audioBytes = decode(base64Data);
        const audioBuffer = await decodeAudioData(audioBytes, this.outputAudioContext);
        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputAudioContext.destination);
        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
    }

    disconnect() {
        this.inputAudioContext?.close();
        this.outputAudioContext?.close();
    }
}
