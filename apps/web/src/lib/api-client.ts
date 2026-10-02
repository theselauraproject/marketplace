const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function publicApiUrl(path: string): string {
  return `${PUBLIC_API_URL}${path}`;
}

export function apiUrl(path: string): string {
  if (typeof window === "undefined") {
    const base = process.env.API_INTERNAL_URL || PUBLIC_API_URL;

    if (!base) {
      throw new Error("Set API_INTERNAL_URL or NEXT_PUBLIC_API_URL");
    }

    return `${base}${path}`;
  }

  return publicApiUrl(path);
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const isFormData = init?.body instanceof FormData;

  return fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });
}
