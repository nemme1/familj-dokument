import { type User, type InsertUser, type Document, type InsertDocument, users, documents } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, like, or, sql, desc } from "drizzle-orm";
import path from "path";
import fs from "fs";

// Data directory — stores both the database and uploaded files
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), "data");
const FILES_DIR = path.join(DATA_DIR, "files");
const DB_PATH = path.join(DATA_DIR, "familj-dokument.db");

// Debug logging for data paths
console.log("🚀 FamiljDokument Data Paths:");
console.log(`  DATA_DIR: ${DATA_DIR}`);
console.log(`  FILES_DIR: ${FILES_DIR}`);
console.log(`  DB_PATH: ${DB_PATH}`);
console.log(`  DATA_DIR env: ${process.env.DATA_DIR || 'not set (using fallback)'}`);
console.log(`  CWD: ${process.cwd()}`);

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
  CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
  CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
  CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
  CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
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
  private static handleDbError(err: unknown): never {
    console.error("SQLite/Drizzle error", err);
    throw new Error("Internal server error");
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      return db.select().from(users).where(eq(users.id, id)).get();
    } catch (err) {
      SqliteStorage.handleDbError(err);
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      return db.select().from(users).where(eq(users.email, email)).get();
    } catch (err) {
      SqliteStorage.handleDbError(err);
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const id = randomUUID();
      const role = insertUser.role || "member";
      return db.insert(users).values({ id, ...insertUser, role }).returning().get();
    } catch (err) {
      SqliteStorage.handleDbError(err);
    }
  }

  async getUserCount(): Promise<number> {
    try {
      const result = db.select({ count: sql<number>`count(*)` }).from(users).get();
      return result?.count ?? 0;
    } catch (err) {
      SqliteStorage.handleDbError(err);
    }
  }

  // Documents
  async getDocuments(filters?: { type?: string; category?: string; deleted?: boolean; search?: string }): Promise<Document[]> {
    try {
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
    } catch (err) {
      SqliteStorage.handleDbError(err);
    }
  }

  async getDocument(id: string): Promise<Document | undefined> {
    try {
      return db.select().from(documents).where(eq(documents.id, id)).get();
    } catch (err) {
      SqliteStorage.handleDbError(err);
    }
  }

  async createDocument(insertDoc: InsertDocument): Promise<Document> {
    try {
      const id = randomUUID();
      return db.insert(documents).values({ id, ...insertDoc }).returning().get();
    } catch (err) {
      SqliteStorage.handleDbError(err);
    }
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    try {
      const existing = await this.getDocument(id);
      if (!existing) return undefined;

      const updatedFields: any = { ...updates, updatedAt: new Date().toISOString() };
      // Remove id from updates to avoid conflicts
      delete updatedFields.id;

      db.update(documents).set(updatedFields).where(eq(documents.id, id)).run();
      return this.getDocument(id);
    } catch (err) {
      SqliteStorage.handleDbError(err);
    }
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
    const totalReceipts = db.select({ count: sql<number>`count(*)` }).from(documents).where(and(eq(documents.deleted, false), eq(documents.type, "receipt"))).get()?.count ?? 0;
    const totalDocuments = db.select({ count: sql<number>`count(*)` }).from(documents).where(and(eq(documents.deleted, false), eq(documents.type, "document"))).get()?.count ?? 0;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const monthlyTotal = db.select({ count: sql<number>`count(*)` }).from(documents).where(and(eq(documents.deleted, false), sql`created_at >= ${monthStart}`)).get()?.count ?? 0;
    const recentUploads = db.select({ count: sql<number>`count(*)` }).from(documents).where(and(eq(documents.deleted, false), sql`created_at >= ${weekAgo}`)).get()?.count ?? 0;

    return {
      totalReceipts,
      totalDocuments,
      monthlyTotal: String(monthlyTotal),
      recentUploads,
    };
  }

  // File storage — files saved to disk
  async saveFile(id: string, buffer: Buffer): Promise<void> {
    const filePath = path.join(FILES_DIR, id);
    try {
      fs.writeFileSync(filePath, buffer);
    } catch (err) {
      SqliteStorage.handleDbError(err);
    }
  }

  async getFile(id: string): Promise<Buffer | undefined> {
    const filePath = path.join(FILES_DIR, id);
    try {
      return fs.readFileSync(filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      SqliteStorage.handleDbError(err);
    }
  }

  async deleteFile(id: string): Promise<void> {
    const filePath = path.join(FILES_DIR, id);
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        SqliteStorage.handleDbError(err);
      }
    }
  }
}

export const storage = new SqliteStorage();
