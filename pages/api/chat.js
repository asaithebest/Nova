// pages/api/chat.js
import fetch from "node-fetch"; // node 18+ global fetch exists, but keep node-fetch for compatibility
const SYSTEM_PROMPT = "You are ZeroGPT, a large language model trained by ZeroGPT. Be helpful, precise and objective. Do not mention OpenAI or ChatGPT.";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body || {};
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const streamMode = !!body.stream || (req.query && req.query.stream === "1");

  // validate API key
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not set on server" });
  }

  // build payload for OpenAI: include system + last messages
  const payload = {
    model: "gpt-4o", // adapte si tu veux un autre modèle
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.slice(-20) // garde un historique limité
    ],
    temperature: typeof body.temperature === "number" ? body.temperature : 0.7,
  };

  // If the client asked streaming, proxy the OpenAI stream (SSE/chunks) to the client:
  if (streamMode) {
    try {
      // request with streaming true
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...payload, stream: true }),
      });

      if (!openaiRes.ok) {
        const text = await openaiRes.text();
        return res.status(openaiRes.status).json({ error: text });
      }

      // set headers for client SSE/chunk streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      const reader = openaiRes.body.getReader();
      const decoder = new TextDecoder();

      // read and forward chunks
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        // forward raw chunk (client should handle assembling)
        res.write(chunk);
      }

      // end stream
      res.write("\n\n");
      return res.end();
    } catch (err) {
      console.error("Streaming proxy error:", err);
      return res.status(500).json({ error: err.message || String(err) });
    }
  }

  // Non-streaming: simple JSON response
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: json });

    const reply = json.choices?.[0]?.message?.content ?? json.choices?.[0]?.text ?? JSON.stringify(json);
    return res.status(200).json({ reply, raw: json });
  } catch (err) {
    console.error("chat api error", err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
