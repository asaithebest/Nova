import fs from "fs";
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

  const form = formidable();

  try {
    const [fields, files] = await form.parse(req);

    const messages = JSON.parse(fields.messages || "[]");

    let extraContext = "";

    // 📄 PDF parsing
    if (files.file && files.file[0]?.mimetype === "application/pdf") {
      const buffer = fs.readFileSync(files.file[0].filepath);
      const pdf = await pdfParse(buffer);
      extraContext += `\nPDF content:\n${pdf.text}\n`;
    }

    // 🖼 Image Vision
    let imagePart = null;
    if (files.file && files.file[0]?.mimetype.startsWith("image/")) {
      const imgBuffer = fs.readFileSync(files.file[0].filepath);
      const base64 = imgBuffer.toString("base64");
      imagePart = {
        type: "input_image",
        image_base64: base64,
      };
    }

    const finalMessages = [
      {
        role: "system",
        content:
          "You are NovaGPT, a powerful, concise, and helpful AI assistant.",
      },
      ...messages,
    ];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: extraContext || "Answer the user." },
              imagePart,
            ].filter(Boolean),
          },
        ],
      }),
    });

    const data = await response.json();

    res.status(200).json({
      reply: data.output_text || "No response",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
