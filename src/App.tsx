import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Bookmark, 
  BookmarkCheck, 
  Copy, 
  Check, 
  Mic, 
  MicOff, 
  Send, 
  Sparkles, 
  MapPin, 
  Compass, 
  BookOpen, 
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { ChatMessage, SavedResource } from './types';
import { SavedResourcesSection } from './components/SavedResourcesSection';

const CATEGORIES = [
  "Housing", "Treatment", "Meetings", "Food", 
  "Transportation", "Employment", "Legal/reentry", "Healthcare",
  "Job Finder", "Transportation Board", "Activity Finder"
];

function extractTitle(markdownText: string): string {
  const lines = markdownText.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const headerMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headerMatch) return headerMatch[1].replace(/[*_`]/g, '').trim();

    const boldMatch = line.match(/^\*{2}(.+?)\*{2}/);
    if (boldMatch) return boldMatch[1].replace(/[*_`]/g, '').trim();

    const bulletBoldMatch = line.match(/^[-*•\d.]+\s+\*{2}(.+?)\*{2}/);
    if (bulletBoldMatch) return bulletBoldMatch[1].replace(/[*_`]/g, '').trim();
  }
  if (lines.length > 0) {
    const clean = lines[0].replace(/[#*_`]/g, '').trim();
    return clean.length > 50 ? clean.slice(0, 47) + '...' : clean;
  }
  return 'Recovery Resource';
}

function detectCategory(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('housing') || lower.includes('shelter') || lower.includes('sober living') || lower.includes('transitional living')) return 'Housing';
  if (lower.includes('treatment') || lower.includes('detox') || lower.includes('rehab') || lower.includes('inpatient') || lower.includes('outpatient')) return 'Treatment';
  if (lower.includes('meeting') || lower.includes('aa ') || lower.includes('na ') || lower.includes('12-step') || lower.includes('smart recovery')) return 'Meetings';
  if (lower.includes('food') || lower.includes('pantry') || lower.includes('meal') || lower.includes('groceries')) return 'Food';
  if (lower.includes('transportation') || lower.includes('ride') || lower.includes('bus') || lower.includes('transit')) return 'Transportation';
  if (lower.includes('job') || lower.includes('employ') || lower.includes('hiring') || lower.includes('resume') || lower.includes('second-chance')) return 'Employment';
  if (lower.includes('legal') || lower.includes('reentry') || lower.includes('court') || lower.includes('probation') || lower.includes('expungement')) return 'Legal/reentry';
  if (lower.includes('health') || lower.includes('clinic') || lower.includes('medical') || lower.includes('doctor')) return 'Healthcare';
  if (lower.includes('activit') || lower.includes('sober event') || lower.includes('fitness') || lower.includes('hiking')) return 'Activity Finder';
  return undefined;
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'welcome-1',
        role: 'assistant',
        text: "Hi, I'm **Tom**, your recovery mentor and resource navigator. Whether you need immediate housing, detox/treatment, 12-step or SMART meetings, second-chance jobs, or sober community activities, I'm here to support you.\n\nEnter your **ZIP code** above to get localized recommendations for your area, or choose a category below to get started.",
        timestamp: new Date().toISOString()
      }
    ];
  });

  const [input, setInput] = useState('');
  const [zipCode, setZipCode] = useState('85225');
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'saved'>('chat');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [lastSelectedCategory, setLastSelectedCategory] = useState<string>('');

  // Session-persisted saved resources state
  const [savedResources, setSavedResources] = useState<SavedResource[]>(() => {
    try {
      const stored = sessionStorage.getItem('recovery_navigator_saved_resources');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading saved resources from sessionStorage', e);
      return [];
    }
  });

  // Sync to sessionStorage on state change
  useEffect(() => {
    try {
      sessionStorage.setItem('recovery_navigator_saved_resources', JSON.stringify(savedResources));
    } catch (e) {
      console.error('Error writing saved resources to sessionStorage', e);
    }
  }, [savedResources]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 3500);
  };

  const handleToggleSaveResource = (message: ChatMessage) => {
    const existing = savedResources.find(r => r.sourceMessageId === message.id);
    if (existing) {
      setSavedResources(prev => prev.filter(r => r.id !== existing.id));
      showToast('Removed from Saved Resources');
    } else {
      const title = extractTitle(message.text);
      const category = detectCategory(message.text) || lastSelectedCategory || undefined;
      const newResource: SavedResource = {
        id: `res-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title,
        content: message.text,
        category,
        zipCode: zipCode.trim() || undefined,
        savedAt: new Date().toISOString(),
        sourceMessageId: message.id,
      };
      setSavedResources(prev => [newResource, ...prev]);
      showToast(`Saved "${title}" to your list! 🔖`);
    }
  };

  const handleRemoveSavedResource = (id: string) => {
    setSavedResources(prev => prev.filter(r => r.id !== id));
    showToast('Resource removed');
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    setSavedResources(prev => prev.map(r => r.id === id ? { ...r, notes } : r));
    showToast('Personal note updated');
  };

  const handleClearAllSaved = () => {
    setSavedResources([]);
    showToast('All saved resources cleared');
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const sendMessage = async (text: string, categoryContext?: string) => {
    if (!text.trim()) return;
    if (categoryContext) {
      setLastSelectedCategory(categoryContext);
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: newMessages.slice(0, -1).map(m => ({ role: m.role, parts: [{ text: m.text }] })),
          message: text,
          zipCode,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to communicate with AI');
      }

      const assistantMessage: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        text: data.text,
        timestamp: new Date().toISOString()
      };
      setMessages([...newMessages, assistantMessage]);
    } catch (error: any) {
      console.error(error);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: `Sorry, I encountered an issue: ${error.message}. Please try again in a moment.`,
        timestamp: new Date().toISOString()
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to convert float32 to base64 pcm for live voice
  const pcmToBase64 = (data: Float32Array) => {
    const int16Array = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
      int16Array[i] = Math.max(-1, Math.min(1, data[i])) * 32767;
    }
    const bytes = new Uint8Array(int16Array.buffer);
    return btoa(String.fromCharCode(...bytes));
  };

  const playAudioChunk = (ctx: AudioContext, base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const buffer = ctx.createBuffer(1, bytes.length / 2, 24000);
    const float32 = new Float32Array(bytes.length / 2);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < bytes.length / 2; i++) float32[i] = view.getInt16(i * 2, true) / 32768;
    buffer.getChannelData(0).set(float32);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  };

  const startLive = async () => {
    try {
      setIsLive(true);
      const ws = new WebSocket(`ws://${location.host}/live`);
      const inputAudioCtx = new AudioContext({ sampleRate: 16000 });
      const outputAudioCtx = new AudioContext({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = inputAudioCtx.createMediaStreamSource(stream);
      const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(inputAudioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ audio: pcmToBase64(e.inputBuffer.getChannelData(0)) }));
        }
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.audio) playAudioChunk(outputAudioCtx, msg.audio);
      };

      (window as any).liveSession = { ws, inputAudioCtx, outputAudioCtx, stream, processor };
      showToast('Live voice session connected with Tom 🎙️');
    } catch (err: any) {
      console.error('Failed to start live session', err);
      setIsLive(false);
      showToast('Microphone access or voice connection failed');
    }
  };

  const stopLive = () => {
    const session = (window as any).liveSession;
    if (session) {
      session.ws?.close();
      session.stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      session.inputAudioCtx?.close();
      session.outputAudioCtx?.close();
      session.processor?.disconnect();
    }
    setIsLive(false);
    showToast('Voice session ended');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2.5 animate-fade-in border border-gray-700">
          <span>{toastMessage}</span>
          {activeTab === 'chat' && savedResources.length > 0 && (
            <button
              onClick={() => setActiveTab('saved')}
              className="text-blue-300 hover:text-blue-200 underline font-medium text-xs ml-1"
            >
              View list →
            </button>
          )}
        </div>
      )}

      {/* Main Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  Recovery Resource Navigator
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Tom Active
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Local recovery housing, treatment, meetings, and second-chance support
              </p>
            </div>
          </div>

          {/* Navigation Controls & Saved Resources Counter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition ${
                activeTab === 'chat'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Navigator Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition relative ${
                activeTab === 'saved'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${savedResources.length > 0 ? 'fill-current' : ''}`} />
              <span>Saved Resources</span>
              {savedResources.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'saved' ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'
                }`}>
                  {savedResources.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Chat Navigator Column */}
          <div className={`${activeTab === 'chat' ? 'block' : 'hidden lg:block'} lg:col-span-7 xl:col-span-7 space-y-4`}>
            
            {/* Top Config Card: Location & Category Filters */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1 shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  Local ZIP Code:
                </label>
                <div className="relative flex-1">
                  <input
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="Enter ZIP (e.g. 85225 Chandler, AZ)"
                  />
                  {zipCode && (
                    <span className="absolute right-2.5 top-2 text-[10px] text-gray-400 font-medium pointer-events-none">
                      Search Area
                    </span>
                  )}
                </div>
              </div>

              {/* Categories */}
              <div>
                <p className="text-[11px] font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Select a need to ask Tom for localized resources:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(category => (
                    <button 
                      key={category}
                      onClick={() => sendMessage(`Find local resources for ${category} in or near ${zipCode || 'Chandler, AZ'}`, category)}
                      className="bg-gray-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-gray-700 px-2.5 py-1 rounded-full text-xs border border-gray-200 transition active:scale-95 font-medium"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Conversation Area */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 flex flex-col h-[520px]">
              {/* Message History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((m) => {
                  const isAssistant = m.role === 'assistant';
                  const isSaved = isAssistant && savedResources.some(r => r.sourceMessageId === m.id);

                  return (
                    <div 
                      key={m.id} 
                      className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                    >
                      {/* Sender label */}
                      <div className="text-[11px] text-gray-400 mb-1 px-1 flex items-center gap-1.5">
                        <span className="font-semibold text-gray-600">
                          {isAssistant ? 'Tom (Recovery Mentor)' : 'You'}
                        </span>
                        <span>•</span>
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      {/* Bubble */}
                      <div 
                        className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 text-xs shadow-xs ${
                          isAssistant 
                            ? 'bg-gray-50 text-gray-800 border border-gray-200 rounded-tl-xs' 
                            : 'bg-blue-600 text-white rounded-tr-xs'
                        }`}
                      >
                        {isAssistant ? (
                          <div className="prose prose-xs prose-blue max-w-none text-gray-800 leading-relaxed">
                            <ReactMarkdown>{m.text}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                        )}

                        {/* Assistant Message Actions (Bookmark & Copy) */}
                        {isAssistant && m.id !== 'welcome-1' && (
                          <div className="mt-3 pt-2.5 border-t border-gray-200/80 flex items-center justify-between gap-2">
                            <button
                              onClick={() => handleToggleSaveResource(m)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                                isSaved 
                                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                                  : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                              }`}
                            >
                              {isSaved ? (
                                <>
                                  <BookmarkCheck className="w-3.5 h-3.5 fill-blue-600 text-blue-600" />
                                  <span>Saved in List</span>
                                </>
                              ) : (
                                <>
                                  <Bookmark className="w-3.5 h-3.5 text-gray-500" />
                                  <span>Save Resource</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleCopyMessage(m.id, m.text)}
                              title="Copy response"
                              className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200/60 transition"
                            >
                              {copiedMsgId === m.id ? (
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex items-start gap-2">
                    <div className="bg-gray-100 rounded-2xl rounded-tl-xs p-3 text-xs text-gray-500 italic flex items-center gap-2 border border-gray-200">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      </div>
                      <span>Tom is searching local recovery resources...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <div className="flex gap-2 items-center">
                  <input
                    className="border border-gray-300 rounded-lg px-3 py-2 flex-grow text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                    placeholder="Ask Tom a question (e.g. sober living homes, AA meetings tonight)..."
                  />
                  <button 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                  <button
                    className={`px-3 py-2 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 transition ${
                      isLive ? 'bg-red-600 hover:bg-red-700 animate-pulse-fast' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                    onClick={isLive ? stopLive : startLive}
                    title={isLive ? 'Stop Live Voice Chat' : 'Start Live Voice Chat with Tom'}
                  >
                    {isLive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isLive ? 'End Voice' : 'Voice'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated Saved Resources Column */}
          <div className={`${activeTab === 'saved' ? 'block' : 'hidden lg:block'} lg:col-span-5 xl:col-span-5`}>
            <SavedResourcesSection
              savedResources={savedResources}
              onRemoveResource={handleRemoveSavedResource}
              onUpdateNotes={handleUpdateNotes}
              onClearAll={handleClearAllSaved}
            />
          </div>

        </div>
      </main>

      {/* Footer Info */}
      <footer className="mt-auto border-t border-gray-200 bg-white py-3 px-4 text-center text-[11px] text-gray-500">
        <p>
          Recovery Resource Navigator • Local support modeled after community outreach initiatives in Chandler, AZ •
          If in acute medical crisis, dial 911 or call/text the Suicide & Crisis Lifeline at 988.
        </p>
      </footer>
    </div>
  );
}
