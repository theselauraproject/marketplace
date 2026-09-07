import { apiFetch, apiUrl } from "@/lib/api-client";

export interface Account {
  kind: "user" | "org";
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface ActiveIdentity {
  kind: "user" | "org";
  id: string;
  username: string;
  avatarUrl: string | null;
}

export async function getAccounts(): Promise<Account[]> {
  const response = await apiFetch("/api/v1/auth/accounts");

  if (!response.ok) {
    throw new Error("Failed to load accounts");
  }

  const data = (await response.json()) as {
    accounts: Account[];
  };

  return data.accounts;
}

export async function switchAccount(
  kind: "user" | "org",
  id: string,
): Promise<ActiveIdentity> {
  const response = await apiFetch("/api/v1/auth/switch", {
    method: "POST",
    body: JSON.stringify({ kind, id }),
  });

  if (!response.ok) {
    throw new Error("Failed to switch account");
  }

  const data = (await response.json()) as {
    activeIdentity: ActiveIdentity;
  };

  return data.activeIdentity;
}

export function getLinkAccountUrl(): string {
  return apiUrl("/api/v1/auth/github/link");
}
