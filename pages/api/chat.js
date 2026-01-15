// pages/api/chat.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method Not Allowed" } });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(500).json({
      error: {
        message: "OPENAI_API_KEY non défini sur le serveur"
      }
    });
  }

  const body = req.body || {};
  const messages = Array.isArray(body.messages) ? body.messages : [];

  const finalMessages = [
    {
      role: "system",
      content: "Tu es Nova, un assistant intelligent, clair et précis."
    },
    ...messages.slice(-10)
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: finalMessages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    return res.status(200).json({
      reply: data.choices[0].message.content
    });
  } catch (err) {
    return res.status(500).json({
      error: { message: "Erreur serveur OpenAI" }
    });
  }
}
