"use client";

import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "./api-client";
import type { ActiveIdentity } from "./accounts-api";

export interface CurrentUser {
  id: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [activeIdentity, setActiveIdentity] = useState<ActiveIdentity | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);

    try {
      const response = await apiFetch("/api/v1/auth/me");

      if (!response.ok) {
        setUser(null);
        setActiveIdentity(null);
        return;
      }

      const data = (await response.json()) as {
        user: CurrentUser;
        activeIdentity: ActiveIdentity | null;
      };

      setUser(data.user);
      setActiveIdentity(data.activeIdentity);
    } catch {
      setUser(null);
      setActiveIdentity(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const logout = useCallback(async () => {
    await apiFetch("/api/v1/auth/logout", {
      method: "POST",
    });

    setUser(null);
    setActiveIdentity(null);
  }, []);

  return {
    user,
    activeIdentity,
    loading,
    refetch,
    logout,
  };
}
