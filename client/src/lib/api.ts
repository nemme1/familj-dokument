import { getToken } from "./auth";

const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });

  if (!res.ok) {
    const text = await res.text();
    let errorMsg = res.statusText;
    try {
      const json = JSON.parse(text);
      errorMsg = json.error || errorMsg;
    } catch {
      errorMsg = text || errorMsg;
    }
    throw new Error(errorMsg);
  }
  return res;
}

export async function uploadDocument(
  file: File,
  data: {
    type: string;
    category: string;
    title: string;
    ocrText?: string;
    ocrAmount?: string;
    ocrDate?: string;
    ocrStore?: string;
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
