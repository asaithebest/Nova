// pages/api/upload.js
import formidable from "formidable";
import fs from "fs";
import path from "path";
import { saveAttachment, createMessage } from "../../lib/storage.js";
import pdfParse from "pdf-parse";

export const config = {
  api: {
    bodyParser: false
  }
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function ensureDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
  // NOTE: this example is built for demo / small scale. For large scale use S3 etc.
  await ensureDir();

  const form = new formidable.IncomingForm({
    uploadDir: UPLOAD_DIR,
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024
  });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });
    const file = files.file;
    if (!file) return res.status(400).json({ error: "No file" });

    const destPath = file.path;
    const relPath = `/uploads/${path.basename(destPath)}`;

    // save attachment metadata
    const att = await saveAttachment({
      filename: path.basename(destPath),
      originalName: file.name || file.originalFilename || "file",
      mimeType: file.type || file.mimetype || "application/octet-stream",
      size: file.size || 0,
      pathOnDisk: destPath
    });

    // If PDF -> parse text and return extracted text
    let extractedText = null;
    try {
      if ((file.type || file.mimetype || "").includes("pdf") || path.extname(file.name || "").toLowerCase() === ".pdf") {
        const dataBuffer = fs.readFileSync(destPath);
        const parsed = await pdfParse(dataBuffer);
        extractedText = parsed?.text?.trim()?.slice(0, 20000) || "";
      }
    } catch (e) {
      // ignore parse errors
    }

    return res.status(200).json({
      id: att.id,
      url: relPath,
      originalName: att.originalName,
      mimeType: att.mimeType,
      size: att.size,
      extractedText
    });
  });
}
