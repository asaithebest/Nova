// pages/api/chat.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      message: "OPENAI_API_KEY non défini sur le serveur"
    });
  }

  const body = req.body || {};
  const messages = Array.isArray(body.messages) ? body.messages : [];

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Tu es ZeroGPT, un assistant clair et précis. Tu es la aussi pour rigoler mais fait ce que la personne te demande." },
          ...messages.slice(-10)
        ],
        temperature: 0.7
      })
    });

    const text = await r.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return res.status(500).json({
        message: "Réponse OpenAI invalide",
        raw: text
      });
    }

    if (!r.ok) {
      return res.status(r.status).json({
        message: json?.error?.message || "Erreur OpenAI inconnue",
        raw: json
      });
    }

    return res.status(200).json({
      reply: json.choices[0].message.content
    });

  } catch (err) {
    return res.status(500).json({
      message: err.message || "Erreur serveur"
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.status(200).json({ reply: data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
