import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';

dotenv.config();

async function createServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/live' });

  app.use(express.json());
  app.use(cors());

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  wss.on("connection", async (clientWs) => {
    const session = await ai.live.connect({
      model: "gemini-3.8-live",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        },
        systemInstruction: "You are Tom, a compassionate and supportive recovery mentor. Your goal is to provide resources for individuals in recovery, including help with housing, treatment, meetings, food, transportation, employment, legal/reentry, and healthcare. Keep your answers supportive and professional.",
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          const audio =
            message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audio) clientWs.send(JSON.stringify({ audio }));
          if (message.serverContent?.interrupted)
            clientWs.send(JSON.stringify({ interrupted: true }));
        },
      },
    });

    clientWs.on("message", (data) => {
      const { audio } = JSON.parse(data.toString());
      session.sendRealtimeInput({
        audio: { data: audio, mimeType: "audio/pcm;rate=16000" },
      });
    });
  });

  app.post('/api/gemini/chat', async (req, res) => {
    const { history, message, zipCode } = req.body;
    try {
      const contextMessage = zipCode ? `[Context: User is located in ZIP code ${zipCode}. Provide resources relevant to this area.] ${message}` : message;
      const chat = ai.chats.create({
        model: 'gemini-3.5-flash',
        history: history,
        config: {
          systemInstruction: "You are Tom, a compassionate and supportive recovery mentor. Your goal is to provide resources for individuals in recovery, including help with housing, treatment, meetings, food, transportation, employment, legal/reentry, healthcare, job searching (focusing on second-chance friendly, immediate hiring, transportation-supported roles), transportation coordination, and sober social activities. Keep your answers supportive, professional, and tailored to local needs like those in Chandler.",
          tools: [{ googleSearch: {} }],
        },
      });
      const response = await chat.sendMessage({ message: contextMessage });
      res.json({ text: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to communicate with AI' });
    }
  });

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
}

createServer();
