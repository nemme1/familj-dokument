import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, registerSchema, type Document } from "@shared/schema";
import bcrypt from "bcryptjs";
import multer from "multer";
import { randomUUID } from "crypto";
import JSZip from "jszip";
import { WebSocketServer } from "ws";
import path from "path";
import fs from "fs";

const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE || 20 * 1024 * 1024);
const sessionsFilePath = path.join(process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), "data"), "sessions.json");

// Debug logging for sessions path
console.log("🔐 Sessions file path:", sessionsFilePath);

// Session tokens persisted to disk (data/sessions.json) for restart resilience
const sessions = new Map<string, string>(); // token -> userId

if (fs.existsSync(sessionsFilePath)) {
  try {
    const raw = fs.readFileSync(sessionsFilePath, "utf8");
    const loaded = JSON.parse(raw) as Record<string, string>;
    Object.entries(loaded).forEach(([token, userId]) => sessions.set(token, userId));
  } catch (err) {
    console.error("Failed to read sessions file", err);
  }
}

function saveSessionsToDisk() {
  try {
    fs.writeFileSync(sessionsFilePath, JSON.stringify(Object.fromEntries(sessions)), "utf8");
  } catch (err) {
    console.error("Failed to save sessions file", err);
  }
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } });

function asyncHandler(fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function generateToken(): string {
  return randomUUID() + "-" + randomUUID();
}

interface AuthRequest extends Request {
  userId?: string;
  requestedDoc?: Document;
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !sessions.has(token)) {
    res.status(401).json({ error: "Ej autentiserad", code: "UNAUTHORIZED" });
    return;
  }
  req.userId = sessions.get(token);
  next();
}

function fileAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  let token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    token = req.query.token as string;
  }
  if (!token || !sessions.has(token)) {
    res.status(401).json({ error: "Ej autentiserad", code: "UNAUTHORIZED" });
    return;
  }
  req.userId = sessions.get(token);
  next();
}

async function requireDocument(req: AuthRequest, res: Response, next: NextFunction) {
  const doc = await storage.getDocument(req.params.id);
  if (!doc || doc.deleted) {
    res.status(404).json({ error: "Dokument hittades inte", code: "DOCUMENT_NOT_FOUND" });
    return;
  }
  if (doc.userId !== req.userId) {
    res.status(403).json({ error: "Åtkomst nekad", code: "FORBIDDEN" });
    return;
  }
  req.requestedDoc = doc;
  next();
}

async function requireDocumentIncludingDeleted(req: AuthRequest, res: Response, next: NextFunction) {
  const doc = await storage.getDocument(req.params.id);
  if (!doc) {
    res.status(404).json({ error: "Dokument hittades inte", code: "DOCUMENT_NOT_FOUND" });
    return;
  }
  if (doc.userId !== req.userId) {
    res.status(403).json({ error: "Atkomst nekad", code: "FORBIDDEN" });
    return;
  }
  req.requestedDoc = doc;
  next();
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // WebSocket for real-time sync
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const clients = new Set<any>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.on("close", () => clients.delete(ws));
  });

  function broadcast(event: string, data: any) {
    const msg = JSON.stringify({ event, data });
    clients.forEach((ws) => {
      try { ws.send(msg); } catch {}
    });
  }

  // Auth routes
  app.post("/api/auth/register", asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsed = registerSchema.parse(req.body);
    const userCount = await storage.getUserCount();

    // Max 2 users
    if (userCount >= 2) {
      res.status(403).json({ error: "Max 2 användare tillåtna", code: "MAX_USERS_REACHED" });
      return;
    }

    const existing = await storage.getUserByEmail(parsed.email);
    if (existing) {
      res.status(409).json({ error: "E-postadressen finns redan", code: "EMAIL_EXISTS" });
      return;
    }

    const hashedPassword = await bcrypt.hash(parsed.password, 10);
    const role = userCount === 0 ? "admin" : "member";
    const user = await storage.createUser({
      email: parsed.email,
      password: hashedPassword,
      name: parsed.name,
      role,
    });

    const token = generateToken();
    sessions.set(token, user.id);
    saveSessionsToDisk();

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }));

  app.post("/api/auth/login", asyncHandler(async (req: AuthRequest, res: Response) => {
    const parsed = loginSchema.parse(req.body);
    const user = await storage.getUserByEmail(parsed.email);

    if (!user || !(await bcrypt.compare(parsed.password, user.password))) {
      res.status(401).json({ error: "Fel e-post eller lösenord", code: "INVALID_CREDENTIALS" });
      return;
    }

    const token = generateToken();
    sessions.set(token, user.id);
    saveSessionsToDisk();

    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }));

  app.post("/api/auth/logout", asyncHandler(async (req: AuthRequest, res: Response) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      sessions.delete(token);
      saveSessionsToDisk();
    }
    res.json({ ok: true });
  }));

  app.get("/api/auth/me", authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await storage.getUser(req.userId!);
    if (!user) {
      res.status(404).json({ error: "Användare hittades inte", code: "USER_NOT_FOUND" });
      return;
    }
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  }));

  app.get("/api/auth/sessions", authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await storage.getUser(req.userId!);
    if (!user) {
      res.status(404).json({ error: "Användare hittades inte", code: "USER_NOT_FOUND" });
      return;
    }
    if (user.role !== "admin") {
      res.status(403).json({ error: "Endast admin kan se sessioner", code: "FORBIDDEN" });
      return;
    }

    const userIds = new Set(Array.from(sessions.values()));
    const users = await Promise.all(Array.from(userIds).map((id) => storage.getUser(id)));
    const usersById = Object.fromEntries(users.filter(Boolean).map((u) => [u!.id, { id: u!.id, email: u!.email, name: u!.name, role: u!.role }]));

    const entries = Array.from(sessions.entries()).map(([token, uid]) => ({
      token,
      userId: uid,
      user: usersById[uid] || null,
    }));

    res.json({ totalSessions: entries.length, sessions: entries });
  }));

  app.delete("/api/auth/sessions/all", authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await storage.getUser(req.userId!);
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Endast admin kan logga ut alla", code: "FORBIDDEN" });
      return;
    }
    const count = sessions.size;
    sessions.clear();
    saveSessionsToDisk();
    res.json({ ok: true, cleared: count });
  }));

  app.delete("/api/auth/sessions/:token", authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await storage.getUser(req.userId!);
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Endast admin kan logga ut sessioner", code: "FORBIDDEN" });
      return;
    }
    const token = req.params.token as string;
    if (!sessions.has(token)) {
      res.status(404).json({ error: "Session hittades inte", code: "NOT_FOUND" });
      return;
    }
    sessions.delete(token);
    saveSessionsToDisk();
    res.json({ ok: true });
  }));


  // Debug endpoint to check data paths
  app.get("/api/debug/paths", (req: Request, res: Response) => {
    const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), "data");
    const filesDir = path.join(dataDir, "files");
    const dbPath = path.join(dataDir, "familj-dokument.db");
    
    // Check if directories/files exist
    const dataDirExists = fs.existsSync(dataDir);
    const filesDirExists = fs.existsSync(filesDir);
    const dbExists = fs.existsSync(dbPath);
    
    // Get file sizes
    let dbSize = 0;
    let filesCount = 0;
    if (dbExists) {
      try {
        dbSize = fs.statSync(dbPath).size;
      } catch (e) {
        // ignore
      }
    }
    if (filesDirExists) {
      try {
        const files = fs.readdirSync(filesDir);
        filesCount = files.length;
      } catch (e) {
        // ignore
      }
    }

    res.json({
      environment: {
        DATA_DIR: process.env.DATA_DIR || 'not set',
        CWD: process.cwd(),
        NODE_ENV: process.env.NODE_ENV || 'not set'
      },
      paths: {
        dataDir,
        filesDir,
        dbPath,
        sessionsFilePath
      },
      status: {
        dataDirExists,
        filesDirExists,
        dbExists,
        dbSize: `${(dbSize / 1024 / 1024).toFixed(2)} MB`,
        filesCount
      }
    });
  });

  // Document routes
  app.get("/api/documents", authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { type, category, search } = req.query as any;
    const docs = await storage.getDocuments({ type, category, search, deleted: false });
    res.json(docs);
  }));

  app.get("/api/documents/stats", authMiddleware, asyncHandler(async (_req: AuthRequest, res: Response) => {
    const stats = await storage.getDocumentStats();
    res.json(stats);
  }));

  app.get("/api/documents/trash", authMiddleware, asyncHandler(async (_req: AuthRequest, res: Response) => {
    const docs = await storage.getTrashDocuments();
    res.json(docs);
  }));

  app.get("/api/documents/:id", authMiddleware, requireDocument, asyncHandler(async (req: AuthRequest, res: Response) => {
    const doc = await storage.getDocument(req.params.id);
    res.json(doc);
  }));

  app.post("/api/documents", authMiddleware, upload.single("file"), asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "Ingen fil bifogad", code: "NO_FILE" });
      return;
    }

    const now = new Date().toISOString();

    const doc = await storage.createDocument({
      userId: req.userId!,
      type: req.body.type || "receipt",
      category: req.body.category || "Övrigt",
      title: req.body.title || req.file.originalname,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      deleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await storage.saveFile(doc.id, req.file.buffer);
    broadcast("document:created", doc);
    res.json(doc);
  }));

  app.patch("/api/documents/:id", authMiddleware, requireDocument, asyncHandler(async (req: AuthRequest, res: Response) => {
    const updated = await storage.updateDocument(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: "Dokument hittades inte", code: "DOCUMENT_NOT_FOUND" });
      return;
    }
    broadcast("document:updated", updated);
    res.json(updated);
  }));

  app.delete("/api/documents/:id", authMiddleware, requireDocument, asyncHandler(async (req: AuthRequest, res: Response) => {
    const deleted = await storage.softDeleteDocument(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Dokument hittades inte", code: "DOCUMENT_NOT_FOUND" });
      return;
    }
    broadcast("document:deleted", deleted);
    res.json(deleted);
  }));

  app.post("/api/documents/:id/restore", authMiddleware, requireDocumentIncludingDeleted, asyncHandler(async (req: AuthRequest, res: Response) => {
    const restored = await storage.restoreDocument(req.params.id);
    if (!restored) {
      res.status(404).json({ error: "Dokument hittades inte", code: "DOCUMENT_NOT_FOUND" });
      return;
    }
    broadcast("document:restored", restored);
    res.json(restored);
  }));

  app.delete("/api/documents/:id/permanent", authMiddleware, requireDocumentIncludingDeleted, asyncHandler(async (req: AuthRequest, res: Response) => {
    const deleted = await storage.permanentlyDeleteDocument(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Dokument hittades inte", code: "DOCUMENT_NOT_FOUND" });
      return;
    }
    broadcast("document:permanentlyDeleted", { id: req.params.id });
    res.json({ ok: true });
  }));

  // File download
  app.get("/api/files/:id", fileAuthMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
    const doc = await storage.getDocument(req.params.id);
    if (!doc || doc.deleted) {
      res.status(404).json({ error: "Dokument hittades inte", code: "DOCUMENT_NOT_FOUND" });
      return;
    }
    if (doc.userId !== req.userId) {
      res.status(403).json({ error: "Åtkomst nekad", code: "FORBIDDEN" });
      return;
    }

    const file = await storage.getFile(doc.id);
    if (!file) {
      res.status(404).json({ error: "Fil hittades inte", code: "FILE_NOT_FOUND" });
      return;
    }

    res.set("Content-Type", doc.mimeType);
    res.set("Content-Disposition", `inline; filename="${doc.fileName}"`);
    res.send(file);
  }));

  // Export as ZIP
  app.get("/api/export", authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { type, category } = req.query as any;
    const docs = await storage.getDocuments({ type, category, deleted: false });

    const zip = new JSZip();
    for (const doc of docs) {
      const file = await storage.getFile(doc.id);
      if (file) {
        const ext = doc.fileName.split(".").pop() || "bin";
        zip.file(`${doc.category}/${doc.title}.${ext}`, file);
      }
    }

    // Add CSV summary
    const csvRows = docs.map((d) => `"${d.title}","${d.category}","${d.createdAt}"\n`);
    if (csvRows.length > 0) {
      zip.file("dokument_sammanstallning.csv", "Titel,Kategori,Skapad\n" + csvRows.join(""));
    }

    const content = await zip.generateAsync({ type: "nodebuffer" });
    res.set("Content-Type", "application/zip");
    res.set("Content-Disposition", "attachment; filename=documents.zip");
    res.send(content);
  }));

  return httpServer;
}
