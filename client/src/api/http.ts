const TAB_TOKEN_KEY = 'ipl_auction_tab_token';
const GLOBAL_TOKEN_KEY = 'ipl_auction_auth_token';

export function getStoredToken(): string | null {
  try {
    const tabToken = sessionStorage.getItem(TAB_TOKEN_KEY);
    if (tabToken) return tabToken;
    return localStorage.getItem(GLOBAL_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string, tabOnly = false): void {
  try {
    if (tabOnly) {
      sessionStorage.setItem(TAB_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TAB_TOKEN_KEY);
      localStorage.setItem(GLOBAL_TOKEN_KEY, token);
    }
  } catch {
    // Ignore storage errors
  }
}

export function clearStoredToken(): void {
  try {
    sessionStorage.removeItem(TAB_TOKEN_KEY);
    localStorage.removeItem(GLOBAL_TOKEN_KEY);
  } catch {
    // Ignore
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}
