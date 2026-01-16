// pages/api/messages/[id].js
import { getMessages } from "../../../lib/storage.js";

export default async function handler(req, res) {
  const { id } = req.query;
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });
  const msgs = await getMessages(id);
  return res.status(200).json(msgs);
}
