// pages/api/vision.js
import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = { api: { bodyParser: false } };

const uploadDir = path.join(process.cwd(), "tmp_uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const form = new formidable.IncomingForm({ uploadDir, keepExtensions: true, maxFileSize: 20 * 1024 * 1024 });
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });

    const file = files.image || files.file;
    if (!file) return res.status(400).json({ error: "No image uploaded (field image)" });

    // file.path points to the saved image; you can now:
    //  - upload to a public storage (S3) and send URL to OpenAI vision endpoint
    //  - or read bytes and send in a multipart request to OpenAI (depending on API)
    // For now we return file info and path (note: serverless ephemeral)
    res.status(200).json({
      ok: true,
      file: {
        filename: path.basename(file.path),
        originalFilename: file.name || file.originalFilename,
        mime: file.type || file.mimetype,
        size: file.size,
        path: file.path,
      },
    });
  });
}
