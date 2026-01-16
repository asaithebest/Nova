// lib/storage.js
import fs from "fs";
import path from "path";
import fse from "fs-extra";
import { v4 as uuidv4 } from "uuid";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fse.mkdirpSync(DATA_DIR);
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({ conversations: [], messages: [], attachments: [] }, null, 2)
    );
  }
}

function readDB() {
  ensure();
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

export async function getConversations(userId) {
  const db = readDB();
  return db.conversations.filter((c) => c.userId === userId).sort((a,b)=>b.updatedAt-a.updatedAt);
}

export async function createConversation({ userId, title = "New chat" }) {
  const db = readDB();
  const now = Date.now();
  const conv = { id: uuidv4(), userId, title: title || "New chat", createdAt: now, updatedAt: now };
  db.conversations.push(conv);
  writeDB(db);
  return conv;
}

export async function getMessages(conversationId) {
  const db = readDB();
  return db.messages.filter((m) => m.conversationId === conversationId).sort((a,b)=>a.createdAt-b.createdAt);
}

export async function createMessage({ conversationId, role = "user", content = "", files = [] }) {
  const db = readDB();
  const now = Date.now();
  const msg = { id: uuidv4(), conversationId, role, content: content || "", files, createdAt: now };
  db.messages.push(msg);
  // update conversation updatedAt
  const conv = db.conversations.find((c) => c.id === conversationId);
  if (conv) conv.updatedAt = now;
  writeDB(db);
  return msg;
}

export async function deleteConversation(conversationId) {
  const db = readDB();
  db.conversations = db.conversations.filter((c) => c.id !== conversationId);
  db.messages = db.messages.filter((m) => m.conversationId !== conversationId);
  writeDB(db);
  return true;
}

export async function renameConversation(conversationId, title) {
  const db = readDB();
  const conv = db.conversations.find((c) => c.id === conversationId);
  if (conv) {
    conv.title = title;
    conv.updatedAt = Date.now();
    writeDB(db);
    return conv;
  }
  return null;
}

export async function saveAttachment({ filename, originalName, mimeType, size, pathOnDisk }) {
  const db = readDB();
  const att = { id: uuidv4(), filename, originalName, mimeType, size, path: pathOnDisk, createdAt: Date.now() };
  db.attachments.push(att);
  writeDB(db);
  return att;
}
