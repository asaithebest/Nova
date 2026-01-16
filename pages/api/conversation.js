// pages/api/conversations.js
import { getConversations, createConversation, renameConversation, deleteConversation } from "../../lib/storage.js";

export default async function handler(req, res) {
  const userId = req.headers["x-user-id"] || "anonymous"; // replace with real auth middleware in prod
  if (req.method === "GET") {
    const convs = await getConversations(userId);
    return res.status(200).json(convs);
  }
  if (req.method === "POST") {
    const { title } = req.body || {};
    const conv = await createConversation({ userId, title });
    return res.status(201).json(conv);
  }
  if (req.method === "PUT") {
    const { id, title } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });
    const conv = await renameConversation(id, title);
    return res.status(200).json(conv);
  }
  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });
    await deleteConversation(id);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: "Method Not Allowed" });
}

