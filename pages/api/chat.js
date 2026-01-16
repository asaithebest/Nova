// pages/api/chat.js
import fetch from "node-fetch";
import { createMessage, getMessages } from "../../lib/storage.js";

const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_KEY) {
  // do not throw at import time on dev/build; handler will return error
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY not set on server" });

  try {
    const { message, conversationId, stream = false, systemPrompt } = req.body || {};
    if (!message && !stream) return res.status(400).json({ error: "message required" });

    // ensure conversation exists (frontend should create conv first)
    let convId = conversationId;
    if (!convId) {
      // create a conv via storage createConversation if desired; but here we expect convId
      convId = String(Date.now());
    }

    await createMessage({ conversationId: convId, role: "user", content: message || "" });

    const history = await getMessages(convId);
    // build messages for OpenAI
    const messagesForAI = [
      {
        role: "system",
        content:
          systemPrompt ||
          "You are NovaGPT assistant. Be helpful, short when appropriate, and speak the user's language."
      },
      ...history.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))
    ];

    // call OpenAI (non-streaming)
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messagesForAI,
        temperature: 0.7,
        max_tokens: 1200
      })
    });

    const json = await r.json();
    if (!r.ok) {
      return res.status(r.status).json(json);
    }

    const reply = json.choices?.[0]?.message?.content ?? json?.choices?.[0]?.text ?? "No reply";
    const assistantMsg = await createMessage({ conversationId: convId, role: "assistant", content: reply });

    return res.status(200).json({ reply, conversationId: convId, assistantMsg });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
