// pages/api/upload.js
import formidable from "formidable";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";

export const config = {
  api: {
    bodyParser: false, // important pour formidable
  },
};

const uploadDir = path.join(process.cwd(), "tmp_uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const form = new formidable.IncomingForm({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("formidable error", err);
      return res.status(500).json({ error: "Upload failed", details: err.message });
    }

    const file = files.file;
    if (!file) return res.status(400).json({ error: "No file uploaded (field name: file)" });

    const out = {
      filename: path.basename(file.path),
      originalFilename: file.name || file.originalFilename || file.newFilename,
      mimetype: file.type || file.mimetype || null,
      size: file.size || null,
      path: file.path,
    };

    // If PDF -> parse text with pdf-parse
    try {
      if ((out.mimetype || "").includes("pdf") || /\.pdf$/i.test(out.originalFilename || "")) {
        const dataBuffer = fs.readFileSync(file.path);
        const pdfData = await pdfParse(dataBuffer);
        out.parsedText = pdfData.text || "";
      } else {
        out.parsedText = null;
      }
    } catch (e) {
      console.warn("PDF parse failed:", e);
      out.parsedText = null;
    }

    res.status(200).json({ ok: true, file: out });
  });
}
