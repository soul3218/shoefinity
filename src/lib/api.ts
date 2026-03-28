const envApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

export const API_BASE_URL =
  envApiUrl ||
  (import.meta.env.DEV
    ? "http://localhost:5000"
    : "https://shoefinity-shoes-e-commerce-t6q0.onrender.com");
  
export function withApiBase(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiJson<T>(
  path: string,
  init: RequestInit & { token?: string } = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const { token, headers, ...rest } = init;

  const res = await fetch(withApiBase(path), {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
  });

  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}
