import { type User, type InsertUser, type Document, type InsertDocument, users, documents } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, like, or, sql, desc } from "drizzle-orm";
import path from "path";
import fs from "fs";

// Data directory — stores both the database and uploaded files
const DATA_DIR = path.join(process.cwd(), "data");
const FILES_DIR = path.join(DATA_DIR, "files");
const DB_PATH = path.join(DATA_DIR, "familj-dokument.db");

// Ensure directories exist
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(FILES_DIR, { recursive: true });

// Initialize SQLite
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member'
  );
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserCount(): Promise<number>;

  // Documents
  getDocuments(filters?: { type?: string; category?: string; deleted?: boolean; search?: string }): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined>;
  softDeleteDocument(id: string): Promise<Document | undefined>;
  restoreDocument(id: string): Promise<Document | undefined>;
  permanentlyDeleteDocument(id: string): Promise<boolean>;
  getTrashDocuments(): Promise<Document[]>;
  getDocumentStats(): Promise<{ totalReceipts: number; totalDocuments: number; monthlyTotal: string; recentUploads: number }>;

  // File storage
  saveFile(id: string, buffer: Buffer): Promise<void>;
  getFile(id: string): Promise<Buffer | undefined>;
  deleteFile(id: string): Promise<void>;
}

export class SqliteStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return db.select().from(users).where(eq(users.email, email)).get();
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const role = insertUser.role || "member";
    return db.insert(users).values({ id, ...insertUser, role }).returning().get();
  }

  async getUserCount(): Promise<number> {
    const result = db.select({ count: sql<number>`count(*)` }).from(users).get();
    return result?.count ?? 0;
  }

  // Documents
  async getDocuments(filters?: { type?: string; category?: string; deleted?: boolean; search?: string }): Promise<Document[]> {
    const conditions: any[] = [];

    if (filters) {
      if (filters.deleted !== undefined) {
        conditions.push(eq(documents.deleted, filters.deleted));
      } else {
        conditions.push(eq(documents.deleted, false));
      }
      if (filters.type) {
        conditions.push(eq(documents.type, filters.type));
      }
      if (filters.category) {
        conditions.push(eq(documents.category, filters.category));
      }
      if (filters.search) {
        const pattern = `%${filters.search}%`;
        conditions.push(
          or(
            like(documents.title, pattern),
            like(documents.category, pattern)
          )
        );
      }
    } else {
      conditions.push(eq(documents.deleted, false));
    }

    const query = conditions.length > 0
      ? db.select().from(documents).where(and(...conditions)).orderBy(desc(documents.createdAt))
      : db.select().from(documents).orderBy(desc(documents.createdAt));

    return query.all();
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return db.select().from(documents).where(eq(documents.id, id)).get();
  }

  async createDocument(insertDoc: InsertDocument): Promise<Document> {
    const id = randomUUID();
    return db.insert(documents).values({ id, ...insertDoc }).returning().get();
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const existing = await this.getDocument(id);
    if (!existing) return undefined;

    const updatedFields: any = { ...updates, updatedAt: new Date().toISOString() };
    // Remove id from updates to avoid conflicts
    delete updatedFields.id;

    db.update(documents).set(updatedFields).where(eq(documents.id, id)).run();
    return this.getDocument(id);
  }

  async softDeleteDocument(id: string): Promise<Document | undefined> {
    return this.updateDocument(id, { deleted: true, deletedAt: new Date().toISOString() });
  }

  async restoreDocument(id: string): Promise<Document | undefined> {
    return this.updateDocument(id, { deleted: false, deletedAt: null });
  }

  async permanentlyDeleteDocument(id: string): Promise<boolean> {
    const doc = await this.getDocument(id);
    if (!doc) return false;
    db.delete(documents).where(eq(documents.id, id)).run();
    await this.deleteFile(id);
    return true;
  }

  async getTrashDocuments(): Promise<Document[]> {
    return this.getDocuments({ deleted: true });
  }

  async getDocumentStats(): Promise<{ totalReceipts: number; totalDocuments: number; monthlyTotal: string; recentUploads: number }> {
    const allDocs = await this.getDocuments({ deleted: false });
    const receipts = allDocs.filter((d) => d.type === "receipt");
    const docCount = allDocs.filter((d) => d.type === "document");

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthReceipts = receipts.filter((r) => new Date(r.createdAt) >= monthStart);
    const monthlyAmount = monthReceipts.reduce((sum, r) => {
      const amount = r.ocrAmount ? parseFloat(r.ocrAmount.replace(/[^\d.,]/g, "").replace(",", ".")) : 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentUploads = allDocs.filter((d) => new Date(d.createdAt) >= weekAgo).length;

    return {
      totalReceipts: receipts.length,
      totalDocuments: docCount.length,
      monthlyTotal: monthlyAmount.toFixed(2),
      recentUploads,
    };
  }

  // File storage — files saved to disk
  async saveFile(id: string, buffer: Buffer): Promise<void> {
    const filePath = path.join(FILES_DIR, id);
    fs.writeFileSync(filePath, buffer);
  }

  async getFile(id: string): Promise<Buffer | undefined> {
    const filePath = path.join(FILES_DIR, id);
    try {
      return fs.readFileSync(filePath);
    } catch {
      return undefined;
    }
  }

  async deleteFile(id: string): Promise<void> {
    const filePath = path.join(FILES_DIR, id);
    try {
      fs.unlinkSync(filePath);
    } catch {
      // File might not exist — that's OK
    }
  }
}

export const storage = new SqliteStorage();
