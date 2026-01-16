// pages/api/chat-stream.js
import fetch from "node-fetch";
import { createMessage, getMessages } from "../../lib/storage.js";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY not set" });

  try {
    const buf = [];
    for await (const chunk of req) buf.push(chunk);
    const body = JSON.parse(Buffer.concat(buf).toString("utf8"));

    const { message, conversationId, systemPrompt } = body;
    if (!message) return res.status(400).json({ error: "message required" });

    let convId = conversationId || String(Date.now());
    await createMessage({ conversationId: convId, role: "user", content: message });

    const history = await getMessages(convId);
    const messagesForAI = [
      {
        role: "system",
        content: systemPrompt || "You are NovaGPT assistant. Be concise and helpful."
      },
      ...history.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))
    ];

    // proxy streaming from OpenAI and forward as SSE to client
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    });

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messagesForAI,
        temperature: 0.7,
        stream: true
      })
    });

    if (!openaiRes.ok) {
      const txt = await openaiRes.text();
      res.write(`event: error\ndata: ${JSON.stringify({ error: txt })}\n\n`);
      return res.end();
    }

    const reader = openaiRes.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let assistantText = "";

    async function pump() {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const str = decoder.decode(value);
        // OpenAI streaming uses lines starting with "data: "
        const lines = str.split("\n").filter(Boolean);
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.replace(/^data: /, "");
            if (data === "[DONE]") {
              // finished
              res.write(`event: done\ndata: {}\n\n`);
              await createMessage({ conversationId: convId, role: "assistant", content: assistantText });
              return res.end();
            }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              const token = (delta?.content) || delta?.text || "";
              if (token) {
                assistantText += token;
                // send incremental token to client
                res.write(`data: ${JSON.stringify({ token })}\n\n`);
              }
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      }
      // fallback finalize
      await createMessage({ conversationId: convId, role: "assistant", content: assistantText });
      res.write(`event: done\ndata: {}\n\n`);
      res.end();
    }

    pump().catch((err) => {
      console.error("stream pump error", err);
      try { res.write(`event: error\ndata: ${JSON.stringify({ error: String(err) })}\n\n`); } catch(e){}
      res.end();
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
