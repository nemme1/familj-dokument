import { useState, useEffect, useCallback } from "react";
import { getUser, subscribe, type AuthUser, checkAuth, getToken } from "@/lib/auth";

export function useAuth() {
  console.log("🔑 useAuth hook called");
  const [user, setUser] = useState<AuthUser | null>(getUser());
  const [loading, setLoading] = useState(true);

  console.log("📊 Initial auth state:", { user: !!user, loading });

  useEffect(() => {
    console.log("🔄 useAuth useEffect running...");
    const initAuth = async () => {
      console.log("🔍 Checking auth...");
      if (getToken() && !getUser()) {
        console.log("🔄 Token exists but no user, checking auth...");
        try {
          await checkAuth();
          console.log("✅ Auth check successful");
        } catch (error) {
          console.error("❌ Auth check failed:", error);
        }
      } else {
        console.log("ℹ️ No token or user already exists");
      }
      console.log("🏁 Setting loading to false");
      setLoading(false);
    };
    initAuth();

    const unsubscribe = subscribe(() => {
      console.log("📡 Auth state updated via subscription");
      setUser(getUser());
    });
    return unsubscribe;
  }, []);

  const result = { user, isAuthenticated: !!user, loading };
  console.log("📤 useAuth returning:", result);
  return result;
}
