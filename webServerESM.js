// webserver.js (ESM)
// package.json must include: { "type": "module" }

import express from "express";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

// --- resolve __dirname in ESM ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// --- Auth token (use env in real deployments) ---
const AUTH_TOKEN = process.env.SSH_API_TOKEN || "mysecrettoken123";

// --- Authentication middleware ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  const token = authHeader.slice(7);
  if (token !== AUTH_TOKEN) {
    return res.status(403).json({ error: "Invalid token" });
  }
  next();
}

// --- Static index.html (optional) ---
app.use(express.static(path.join(__dirname)));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// --- LowDB setup ---
const adapter = new JSONFile("db.json");
// Initial shape: keep your existing collection and add sshFailures
const db = new Low(adapter, { payloads: [], sshFailures: [] });
await db.read();
db.data ||= { payloads: [], sshFailures: [] };

// ---------- Existing /v1/data endpoints (single copy) ----------

// Protected GET /v1/data (latest 10)
app.get("/v1/data", authenticateToken, async (req, res) => {
  try {
    await db.read();
    const items = (db.data.payloads || []).slice(0, 10);
    res.json({ count: items.length, items });
  } catch (err) {
    res.status(500).json({ error: "Read failed", details: err.message });
  }
});

// Protected POST /v1/data (store arbitrary payloads)
app.post("/v1/data", authenticateToken, async (req, res) => {
  try {
    if (typeof req.body !== "object" || req.body === null || Array.isArray(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    const doc = {
      ...req.body,
      createdAt: new Date().toISOString(),
      id: crypto.randomUUID(),
    };
    db.data.payloads.unshift(doc);
    if (db.data.payloads.length > 5000) db.data.payloads.pop();
    await db.write();
    res.status(201).json({ message: "Stored", id: doc.id });
  } catch (err) {
    res.status(500).json({ error: "Write failed", details: err.message });
  }
});

// ---------- New SSH failures API for your Python ----------

// helper: build a de-dup key (or accept Idempotency-Key header)
function composeKey(rec) {
  // Use the client-supplied key if present (via header)
  if (typeof rec._idem === "string" && rec._idem.length > 0) return rec._idem;
  // Otherwise, compose from typical fields (tweak to your schema)
  return [
    rec.timestamp ?? "",
    rec.src_ip ?? rec.ip ?? "",
    rec.username ?? "",
    rec.reason ?? "",
  ].join("|");
}

// POST /v1/ssh-failures : accepts one object or an array
app.post("/v1/ssh-failures", authenticateToken, async (req, res) => {
  try {
    const idemHdr = req.header("Idempotency-Key"); // optional
    const payload = req.body;

    if (!payload || (typeof payload !== "object")) {
      return res.status(400).json({ error: "Body must be an object or array of objects" });
    }

    const list = Array.isArray(payload) ? payload : [payload];

    // Minimal validation (adjust to your actual record)
   // for (const item of list) {
   //   if (!item.timestamp || !(item.src_ip || item.ip)) {
   //     return res.status(422).json({ error: "timestamp and src_ip (or ip) are required" });
   //   }
   // }
    for (const item of list) {
      const hasTime = item.timestamp || item.window_start || item.window_end;
      const hasIP = item.src_ip || item.ip;
      if (!hasTime || !hasIP) {
        return res.status(422).json({ error: "Missing timestamp/window_start and src_ip/ip" });
    }
    // Normalise for storage
    if (!item.timestamp && item.window_start) {
        item.timestamp = item.window_start;
    }
    }
    await db.read();
    const prev = db.data.sshFailures || [];
    const seen = new Set(prev.map(r => r._key).filter(Boolean));

    const toInsert = list.map((item) => {
      const _idem = (idemHdr && !Array.isArray(payload)) ? idemHdr : item._idem;
      const candidate = { ...item };
      const _key = _idem || composeKey(candidate);
      return {
        ...candidate,
        _key,
        _ingested_at: new Date().toISOString(),
        id: candidate.id || crypto.randomUUID(),
      };
    });

    // Filter duplicates by _key (if any)
    const newOnes = toInsert.filter(r => !r._key || !seen.has(r._key));
    if (newOnes.length === 0) {
      return res.status(409).json({ status: "duplicate", inserted: 0 });
    }

    // Prepend newest first, cap size if you want
    db.data.sshFailures = [...newOnes, ...prev].slice(0, 50000);
    await db.write();

    res.status(201).json({ status: "ok", inserted: newOnes.length });
  } catch (err) {
    res.status(500).json({ error: "Write failed", details: err.message });
  }
});

// GET /v1/ssh-failures?limit=100
app.get("/v1/ssh-failures", authenticateToken, async (req, res) => {
  try {
    await db.read();
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || "10", 10), 1000));
    const items = (db.data.sshFailures || []).slice(0, limit);
    res.json({ count: items.length, items });
  } catch (err) {
    res.status(500).json({ error: "Read failed", details: err.message });
  }
});

// --- Start server ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
