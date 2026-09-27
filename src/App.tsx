import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const CATEGORIES = [
  "Housing", "Treatment", "Meetings", "Food", 
  "Transportation", "Employment", "Legal/reentry", "Healthcare",
  "Job Finder", "Transportation Board", "Activity Finder"
];

export default function App() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const newMessages = [...messages, { role: 'user' as const, text }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

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
    setMessages([...newMessages, { role: 'assistant', text: data.text }]);
    setIsLoading(false);
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

    // Store references to clean up
    (window as any).liveSession = { ws, inputAudioCtx, outputAudioCtx, stream, processor };
  };

  const stopLive = () => {
    const session = (window as any).liveSession;
    if (session) {
      session.ws.close();
      session.stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      session.inputAudioCtx.close();
      session.outputAudioCtx.close();
      session.processor.disconnect();
    }
    setIsLive(false);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Recovery Resource Navigator</h1>
      
      <input
        className="border p-2 w-full mb-4"
        value={zipCode}
        onChange={(e) => setZipCode(e.target.value)}
        placeholder="Enter ZIP Code for local resources"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {CATEGORIES.map(category => (
          <button 
            key={category}
            onClick={() => sendMessage(`Find resources for ${category}`)}
            className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full text-sm border"
          >
            {category}
          </button>
        ))}
      </div>

      <div className="border p-4 h-96 overflow-y-auto mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`mb-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block p-2 rounded text-left ${m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              {m.role === 'user' ? m.text : <ReactMarkdown className="prose prose-sm">{m.text}</ReactMarkdown>}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="text-left mb-2">
            <span className="inline-block p-2 rounded bg-gray-200 text-gray-500 italic">
              Tom is typing...
            </span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="border p-2 flex-grow"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask Tom a question..."
        />
        <button className="bg-blue-500 text-white p-2" onClick={() => sendMessage(input)}>Send</button>
        <button
          className={`p-2 rounded ${isLive ? 'bg-red-500 animate-pulse-fast' : 'bg-green-500'} text-white`}
          onClick={isLive ? stopLive : startLive}
        >
          {isLive ? 'Stop Voice' : 'Start Voice'}
        </button>
      </div>
    </div>
  );
}
