import express from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const SYSTEM_PROMPT = "You are ZeroGPT, a large language model trained by ZeroGPT. Knowledge cutoff: 2023-10. Current date: 2026-01-16. You are helpful, precise, and objective. You do not mention OpenAI or ChatGPT.";

export async function registerRoutes(httpServer, app) {
  await setupAuth(app);
  registerAuthRoutes(app);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  app.get("/api/conversations", isAuthenticated, async (req, res) => {
    const userId = req.user.claims.sub;
    res.json(await storage.getConversations(userId));
  });

  app.get("/api/messages/:id", isAuthenticated, async (req, res) => {
    res.json(await storage.getMessages(Number(req.params.id)));
  });

  app.post("/api/chat", isAuthenticated, async (req, res) => {
    try {
      const { message, conversationId, files } = req.body;
      const userId = req.user.claims.sub;
      
      let convId = conversationId;
      if (!convId) {
        const conv = await storage.createConversation({ userId, title: message.substring(0, 30) });
        convId = conv.id;
      }

      await storage.createMessage({ conversationId: convId, role: "user", content: message, files });
      
      const history = await storage.getMessages(convId);
      const messagesForAI = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.map(m => ({ role: m.role, content: m.content }))
      ];

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messagesForAI
      });

      const reply = aiResponse.choices[0].message.content;
      const assistantMsg = await storage.createMessage({ conversationId: convId, role: "assistant", content: reply });
      
      res.json({ reply, conversationId: convId, assistantMsg });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
