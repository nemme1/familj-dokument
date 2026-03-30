import { apiRequest } from "./queryClient";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

let authToken: string | null = null;
let currentUser: AuthUser | null = null;
const listeners = new Set<() => void>();

// Load from localStorage on init
if (typeof window !== "undefined") {
  authToken = localStorage.getItem("authToken");
  const savedUser = localStorage.getItem("authUser");
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
    } catch {
      currentUser = null;
    }
  }
}

export function getToken(): string | null {
  return authToken;
}

export function getUser(): AuthUser | null {
  return currentUser;
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

export async function login(email: string, password: string): Promise<AuthUser> {
  console.log("🔐 Login attempt for:", email);
  console.log("🌐 Making login request to:", `${API_BASE}/api/auth/login`);
  const res = await apiRequest("POST", "/api/auth/login", { email, password });
  console.log("📡 Login response status:", res.status);
  const data = await res.json();
  console.log("📦 Login response data:", data);

  authToken = data.token;
  currentUser = data.user;
  console.log("💾 Setting auth state - token:", !!authToken, "user:", !!currentUser);

  if (typeof window !== "undefined") {
    localStorage.setItem("authToken", authToken);
    localStorage.setItem("authUser", JSON.stringify(currentUser));
    console.log("💾 Saved to localStorage");
  }

  console.log("📡 Notifying subscribers...");
  notify();
  console.log("✅ Login successful");
  return data.user;
}

export async function register(email: string, password: string, name: string): Promise<AuthUser> {
  const res = await apiRequest("POST", "/api/auth/register", { email, password, name });
  const data = await res.json();
  authToken = data.token;
  currentUser = data.user;
  if (typeof window !== "undefined") {
    localStorage.setItem("authToken", authToken);
    localStorage.setItem("authUser", JSON.stringify(currentUser));
  }
  notify();
  return data.user;
}

export async function logout() {
  try {
    await apiRequest("POST", "/api/auth/logout");
  } catch {}
  authToken = null;
  currentUser = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
  }
  notify();
}

export async function checkAuth(): Promise<AuthUser | null> {
  console.log("🔍 checkAuth called");
  if (!authToken) {
    console.log("❌ No auth token");
    return null;
  }

  console.log("🌐 Making auth check request to:", `${API_BASE}/api/auth/me`);
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log("📡 Auth check response:", res.status);

    if (res.ok) {
      currentUser = await res.json();
      console.log("✅ Auth check successful, user:", currentUser);
      if (typeof window !== "undefined" && currentUser) {
        localStorage.setItem("authUser", JSON.stringify(currentUser));
      }
      notify();
      return currentUser;
    } else {
      console.log("❌ Auth check failed with status:", res.status);
      const text = await res.text();
      console.log("❌ Response body:", text);
    }
  } catch (err) {
    console.error("💥 Auth check error:", err);
  }

  console.log("🧹 Clearing auth state due to failure");
  authToken = null;
  currentUser = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
  }
  notify();
  return null;
}

// Declare the port rewrite variable
declare const __PORT_5000__: string;
