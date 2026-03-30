import { getToken } from "./auth";

const API_BASE = typeof window !== "undefined" ? (window.location.hostname === 'localhost' ? '' : '') : "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

console.log("🌐 API_BASE (api.ts) set to:", API_BASE);

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  console.log("🌐 authFetch called with URL:", url);
  const token = getToken();
  console.log("🔑 Token available:", !!token);

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const fullUrl = `${API_BASE}${url}`;
  console.log("🎯 Making request to:", fullUrl);
  console.log("📋 Headers:", headers);

  const res = await fetch(fullUrl, { ...options, headers });
  console.log("📡 Response status:", res.status, res.statusText);

  if (!res.ok) {
    console.log("❌ Request failed, getting error details...");
    const text = await res.text();
    let errorMsg = res.statusText;
    try {
      const json = JSON.parse(text);
      errorMsg = json.error || errorMsg;
      console.log("❌ Error response JSON:", json);
    } catch {
      errorMsg = text || errorMsg;
      console.log("❌ Error response text:", text);
    }
    console.log("💥 Throwing error:", errorMsg);
    throw new Error(errorMsg);
  }

  console.log("✅ Request successful");
  return res;
}

export async function uploadDocument(
  file: File,
  data: {
    type: string;
    category: string;
    title: string;
  }
): Promise<any> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(data).forEach(([key, value]) => {
    if (value) formData.append(key, value);
  });

  const res = await fetch(`${API_BASE}/api/documents`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    let errorMsg = res.statusText;
    try { errorMsg = JSON.parse(text).error; } catch {}
    throw new Error(errorMsg);
  }
  return res.json();
}

export function getFileUrl(docId: string): string {
  const token = getToken();
  return `${API_BASE}/api/files/${docId}?token=${encodeURIComponent(token || "")}`;
}
