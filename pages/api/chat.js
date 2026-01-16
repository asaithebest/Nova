// pages/api/chat.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ message: "OPENAI_API_KEY non défini sur le serveur" });
  }

  const body = req.body || {};
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const model = body.model || process.env.MODEL || "gpt-4";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Tu es Nova — assistant francophone, clair et utile." },
          ...messages.slice(-12)
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      return res.status(500).json({ message: "Réponse OpenAI non JSON", raw: text });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        message: data?.error?.message || "Erreur OpenAI",
        raw: data
      });
    }

    const reply = data?.choices?.[0]?.message?.content ?? null;
    return res.status(200).json({ reply, raw: data });
  } catch (err) {
    return res.status(500).json({ message: err?.message || "Erreur serveur" });
  }
}
