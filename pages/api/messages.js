// pages/api/messages.js
import { createMessage, getMessages } from "../../lib/storage.js";

export default async function handler(req, res) {
  const userId = req.headers["x-user-id"] || "anonymous";
  if (req.method === "POST") {
    const { conversationId, role = "user", content = "", files = [] } = req.body || {};
    if (!conversationId) return res.status(400).json({ error: "conversationId required" });
    const msg = await createMessage({ conversationId, role, content, files });
    return res.status(201).json(msg);
  }
  if (req.method === "GET") {
    const id = req.query?.conversationId;
    if (!id) return res.status(400).json({ error: "conversationId query required" });
    const msgs = await getMessages(id);
    return res.status(200).json(msgs);
  }
  return res.status(405).json({ error: "Method Not Allowed" });
}

