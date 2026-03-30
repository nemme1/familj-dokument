import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getToken } from "./auth";

const API_BASE = typeof window !== "undefined" ? (window.location.hostname === 'localhost' ? '' : '') : "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

console.log("🌐 API_BASE set to:", API_BASE);
console.log("🌐 Current location:", typeof window !== "undefined" ? window.location.href : "server-side");
console.log("🌐 Hostname:", typeof window !== "undefined" ? window.location.hostname : "server-side");
console.log("🌐 Protocol:", typeof window !== "undefined" ? window.location.protocol : "server-side");

// Test API connectivity immediately
if (typeof window !== "undefined") {
  console.log("🧪 Testing API connectivity...");
  fetch(`${API_BASE}/api/debug/paths`)
    .then(response => {
      console.log("✅ API connectivity test - Status:", response.status);
      return response.text();
    })
    .then(text => console.log("✅ API response:", text.substring(0, 200) + "..."))
    .catch(error => console.error("❌ API connectivity test failed:", error));
}

async function throwIfResNotOk(res: Response) {
  console.log("🔍 Checking response status:", res.status, "for URL:", res.url);
  if (!res.ok) {
    console.log("❌ Response not OK, getting error details...");
    const text = (await res.text()) || res.statusText;
    console.log("❌ Error text:", text);
    throw new Error(`${res.status}: ${text}`);
  }
  console.log("✅ Response OK");
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log("🚀 apiRequest called:", method, url);
  const token = getToken();
  console.log("🔑 Token available:", !!token);

  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const fullUrl = `${API_BASE}${url}`;
  console.log("🎯 Full request URL:", fullUrl);
  console.log("📋 Request headers:", headers);
  console.log("📦 Request data:", data);

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  console.log("📡 Response received:", res.status, res.statusText);
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${queryKey[0]}`, { headers });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
