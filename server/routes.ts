import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, registerSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import multer from "multer";
import { randomUUID } from "crypto";
import JSZip from "jszip";
import { WebSocketServer } from "ws";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Simple session tokens (in-memory)
const sessions = new Map<string, string>(); // token -> userId

function generateToken(): string {
  return randomUUID() + "-" + randomUUID();
}

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !sessions.has(token)) {
    res.status(401).json({ error: "Ej autentiserad" });
    return;
  }
  (req as any).userId = sessions.get(token);
  next();
}

function fileAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  let token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    token = req.query.token as string;
  }
  if (!token || !sessions.has(token)) {
    res.status(401).json({ error: "Ej autentiserad" });
    return;
  }
  (req as any).userId = sessions.get(token);
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
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.parse(req.body);
      const userCount = await storage.getUserCount();

      // Max 2 users
      if (userCount >= 2) {
        res.status(403).json({ error: "Max 2 användare tillåtna" });
        return;
      }

      const existing = await storage.getUserByEmail(parsed.email);
      if (existing) {
        res.status(409).json({ error: "E-postadressen finns redan" });
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

      res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Ogiltig data" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(parsed.email);

      if (!user || !(await bcrypt.compare(parsed.password, user.password))) {
        res.status(401).json({ error: "Fel e-post eller lösenord" });
        return;
      }

      const token = generateToken();
      sessions.set(token, user.id);

      res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Ogiltig data" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) sessions.delete(token);
    res.json({ ok: true });
  });

  app.get("/api/auth/me", authMiddleware, async (req: Request, res: Response) => {
    const user = await storage.getUser((req as any).userId);
    if (!user) { res.status(404).json({ error: "Användare hittades inte" }); return; }
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  });

  // Document routes
  app.get("/api/documents", authMiddleware, async (req: Request, res: Response) => {
    const { type, category, search } = req.query as any;
    const docs = await storage.getDocuments({ type, category, search, deleted: false });
    res.json(docs);
  });

  app.get("/api/documents/stats", authMiddleware, async (_req: Request, res: Response) => {
    const stats = await storage.getDocumentStats();
    res.json(stats);
  });

  app.get("/api/documents/trash", authMiddleware, async (_req: Request, res: Response) => {
    const docs = await storage.getTrashDocuments();
    res.json(docs);
  });

  app.get("/api/documents/:id", authMiddleware, async (req: Request, res: Response) => {
    const doc = await storage.getDocument(req.params.id);
    if (!doc || doc.deleted) { res.status(404).json({ error: "Dokument hittades inte" }); return; }
    if (doc.userId !== (req as any).userId) { res.status(403).json({ error: "Åtkomst nekad" }); return; }
    res.json(doc);
  });

  app.post("/api/documents", authMiddleware, upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) { res.status(400).json({ error: "Ingen fil bifogad" }); return; }

      const now = new Date().toISOString();
      const docId = randomUUID();

      const doc = await storage.createDocument({
        userId: (req as any).userId,
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
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Kunde inte spara dokumentet" });
    }
  });

  app.patch("/api/documents/:id", authMiddleware, async (req: Request, res: Response) => {
    const doc = await storage.getDocument(req.params.id);
    if (!doc || doc.deleted) { res.status(404).json({ error: "Dokument hittades inte" }); return; }
    if (doc.userId !== (req as any).userId) { res.status(403).json({ error: "Åtkomst nekad" }); return; }
    const updated = await storage.updateDocument(req.params.id, req.body);
    if (!updated) { res.status(404).json({ error: "Dokument hittades inte" }); return; }
    broadcast("document:updated", updated);
    res.json(updated);
  });

  app.delete("/api/documents/:id", authMiddleware, async (req: Request, res: Response) => {
    const doc = await storage.getDocument(req.params.id);
    if (!doc || doc.deleted) { res.status(404).json({ error: "Dokument hittades inte" }); return; }
    if (doc.userId !== (req as any).userId) { res.status(403).json({ error: "Åtkomst nekad" }); return; }
    const deleted = await storage.softDeleteDocument(req.params.id);
    if (!deleted) { res.status(404).json({ error: "Dokument hittades inte" }); return; }
    broadcast("document:deleted", deleted);
    res.json(deleted);
  });

  app.post("/api/documents/:id/restore", authMiddleware, async (req: Request, res: Response) => {
    const doc = await storage.getDocument(req.params.id);
    if (!doc || !doc.deleted) { res.status(404).json({ error: "Dokument hittades inte" }); return; }
    if (doc.userId !== (req as any).userId) { res.status(403).json({ error: "Åtkomst nekad" }); return; }
    const restored = await storage.restoreDocument(req.params.id);
    if (!restored) { res.status(404).json({ error: "Dokument hittades inte" }); return; }
    broadcast("document:restored", restored);
    res.json(restored);
  });

  app.delete("/api/documents/:id/permanent", authMiddleware, async (req: Request, res: Response) => {
    const doc = await storage.getDocument(req.params.id);
    if (!doc) { res.status(404).json({ error: "Dokument hittades inte" }); return; }
    if (doc.userId !== (req as any).userId) { res.status(403).json({ error: "Åtkomst nekad" }); return; }
    const deleted = await storage.permanentlyDeleteDocument(req.params.id);
    if (!deleted) { res.status(404).json({ error: "Dokument hittades inte" }); return; }
    broadcast("document:permanentlyDeleted", { id: req.params.id });
    res.json({ ok: true });
  });

  // File download
  app.get("/api/files/:id", fileAuthMiddleware, async (req: Request, res: Response) => {
    const doc = await storage.getDocument(req.params.id);
    if (!doc || doc.deleted) { res.status(404).json({ error: "Dokument hittades inte" }); return; }

    if (doc.userId !== (req as any).userId) {
      res.status(403).json({ error: "Åtkomst nekad" });
      return;
    }

    const file = await storage.getFile(doc.id);
    if (!file) { res.status(404).json({ error: "Fil hittades inte" }); return; }

    res.set("Content-Type", doc.mimeType);
    res.set("Content-Disposition", `inline; filename="${doc.fileName}"`);
    res.send(file);
  });

  // Export as ZIP
  app.get("/api/export", authMiddleware, async (req: Request, res: Response) => {
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

    // Add CSV summary for receipts
    if (!type || type === "receipt") {
      const receipts = docs.filter((d) => d.type === "receipt");
      if (receipts.length > 0) {
        let csv = "Titel,Kategori,Belopp,Datum,Butik,Skapad\n";
        receipts.forEach((r) => {
          csv += `"${r.title}","${r.category}","${r.ocrAmount || ""}","${r.ocrDate || ""}","${r.ocrStore || ""}","${r.createdAt}"\n`;
        });
        zip.file("kvitton_sammanställning.csv", csv);
      }
    }

    const content = await zip.generateAsync({ type: "nodebuffer" });
    res.set("Content-Type", "application/zip");
    res.set("Content-Disposition", `attachment; filename="export_${new Date().toISOString().slice(0, 10)}.zip"`);
    res.send(content);
  });

  return httpServer;
}
