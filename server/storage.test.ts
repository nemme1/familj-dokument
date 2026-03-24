import assert from "node:assert";
import { randomUUID } from "node:crypto";
import { storage } from "./storage";

async function run() {
  const initialCount = await storage.getUserCount();

  const email = `test-${randomUUID()}@example.com`;
  const user = await storage.createUser({
    email,
    password: "test-password",
    name: "Test User",
    role: "member",
  });

  assert.ok(user.id, "Created user must have an id");
  assert.equal(user.email, email);

  const afterCount = await storage.getUserCount();
  assert.equal(afterCount, initialCount + 1);

  const found = await storage.getUserByEmail(email);
  assert.ok(found, "User should be found by email");
  assert.equal(found?.id, user.id);

  const stats = await storage.getDocumentStats();
  assert.strictEqual(typeof stats.totalReceipts, "number");
  assert.strictEqual(typeof stats.totalDocuments, "number");
  assert.strictEqual(typeof stats.monthlyTotal, "string");
  assert.strictEqual(typeof stats.recentUploads, "number");

  console.log("✅ server/storage test passed");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
