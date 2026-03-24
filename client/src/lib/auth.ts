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
  const res = await apiRequest("POST", "/api/auth/login", { email, password });
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
  if (!authToken) return null;
  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      currentUser = await res.json();
      if (typeof window !== "undefined" && currentUser) {
        localStorage.setItem("authUser", JSON.stringify(currentUser));
      }
      notify();
      return currentUser;
    }
  } catch (err) {
    console.error("checkAuth error", err);
  }
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
