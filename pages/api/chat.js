import fs from "fs";
import path from "path";
import formidable from "formidable";
import pdfParse from "pdf-parse";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY missing" });
  }

  const form = new formidable.IncomingForm({
    multiples: true,
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: "Form parsing error" });
    }

    try {
      const messages = JSON.parse(fields.messages || "[]");

      let extraContext = "";

      /* =======================
         PDF PARSING
      ======================= */
      if (files.file && files.file.mimetype === "application/pdf") {
        const buffer = fs.readFileSync(files.file.filepath);
        const pdf = await pdfParse(buffer);
        extraContext += `\n\n[PDF CONTENT]\n${pdf.text.slice(0, 12000)}`;
      }

      /* =======================
         IMAGE VISION (GPT-4o)
      ======================= */
      let visionMessage = null;

      if (files.file && files.file.mimetype.startsWith("image/")) {
        const imageBase64 = fs
          .readFileSync(files.file.filepath)
          .toString("base64");

        visionMessage = {
          role: "user",
          content: [
            { type: "text", text: messages[messages.length - 1]?.content || "" },
            {
              type: "image_url",
              image_url: {
                url: `data:${files.file.mimetype};base64,${imageBase64}`,
              },
            },
          ],
        };
      }

      /* =======================
         OPENAI REQUEST
      ======================= */
      const payloadMessages = [
        {
          role: "system",
          content:
            "You are NovaGPT. Extremely intelligent, precise, technical, multilingual, structured, and concise. Explain clearly. When given documents or images, analyze them deeply.",
        },
        ...messages,
      ];

      if (extraContext) {
        payloadMessages.push({
          role: "system",
          content: extraContext,
        });
      }

      if (visionMessage) {
        payloadMessages.push(visionMessage);
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: payloadMessages,
          temperature: 0.3,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      return res.status(200).json({
        reply: data.choices[0].message.content,
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
}
