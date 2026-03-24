import { useState, useEffect, useCallback } from "react";
import { getUser, subscribe, type AuthUser, checkAuth, getToken } from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (getToken() && !getUser()) {
        try {
          await checkAuth();
        } catch {}
      }
      setLoading(false);
    };
    initAuth();

    const unsubscribe = subscribe(() => {
      setUser(getUser());
    });
    return unsubscribe;
  }, []);

  return { user, isAuthenticated: !!user, loading };
}
