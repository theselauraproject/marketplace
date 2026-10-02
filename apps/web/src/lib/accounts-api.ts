import { apiFetch, publicApiUrl } from "@/lib/api-client";

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
  return publicApiUrl("/api/v1/auth/github/link");
}

export async function unlinkAccount(id: string): Promise<ActiveIdentity | null> {
  const response = await apiFetch(`/api/v1/auth/accounts/users/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to remove account");
  }

  const data = (await response.json()) as {
    activeIdentity: ActiveIdentity | null;
  };

  return data.activeIdentity;
}

export async function leaveOrganization(
  id: string,
): Promise<ActiveIdentity | null> {
  const response = await apiFetch(`/api/v1/auth/accounts/orgs/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Failed to remove organization");
  }

  const data = (await response.json()) as {
    activeIdentity: ActiveIdentity | null;
  };

  return data.activeIdentity;
}
