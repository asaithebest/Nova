// pages/api/chat.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = req.body || {};
  const clientMessages = Array.isArray(body.messages) ? body.messages : (body.message ? [{role:"user", content: body.message}] : []);

  const SYSTEM_PROMPT = {
    role: "system",
    content: "Tu es Nova, un assistant utile et francophone. Reste poli, clair et concis."
  };

  const MAX_HISTORY = 10;
  const lastMessages = clientMessages.slice(-MAX_HISTORY);
  const messages = [SYSTEM_PROMPT, ...lastMessages];

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const MODEL = process.env.MODEL || "gpt-3.5-turbo";

  if (!OPENAI_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY non défini sur le serveur." });
  }

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({ error: data });
    }

    const reply = data.choices?.[0]?.message?.content || "";
    const usage = data.usage || null;

    return res.status(200).json({ reply, usage });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Erreur interne serveur" });
  }
}
