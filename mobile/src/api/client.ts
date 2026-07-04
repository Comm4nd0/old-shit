// "/" (or empty) means same-origin — used by the web build served
// alongside the API in production.
const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown
  ) {
    super(`API error ${status}`);
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

function headers(json = true): Record<string, string> {
  const result: Record<string, string> = {};
  if (json) result['Content-Type'] = 'application/json';
  if (authToken) result['Authorization'] = `Token ${authToken}`;
  return result;
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // non-JSON error body; leave as null
    }
    throw new ApiError(response.status, body);
  }
  return (await response.json()) as T;
}

export async function get<T>(path: string): Promise<T> {
  return handle<T>(await fetch(`${BASE_URL}${path}`, { headers: headers(false) }));
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  return handle<T>(
    await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    })
  );
}

export async function postMultipart<T>(path: string, form: FormData): Promise<T> {
  // No Content-Type header: fetch must set the multipart boundary itself.
  return handle<T>(
    await fetch(`${BASE_URL}${path}`, { method: 'POST', headers: headers(false), body: form })
  );
}

/** First human-readable message buried in a DRF error body, if any. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object') {
    for (const value of Object.values(error.body as Record<string, unknown>)) {
      if (typeof value === 'string') return value;
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    }
  }
  return fallback;
}
