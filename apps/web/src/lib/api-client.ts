const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function apiUrl(path: string): string {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }

  return `${API_URL}${path}`;
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const isFormData = init?.body instanceof FormData;

  return fetch(apiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });
}
