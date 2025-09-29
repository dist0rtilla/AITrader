/**
 * API client — centralized fetch wrapper with error handling and JSON parsing.
 * Inputs: path string, options (method, headers, body), optional typed response generic.
 * Outputs: parsed JSON or throws a typed Error with status and body.
 * Errors: throws on non-2xx responses with a typed Error containing `status` and `body`.
 */

export class APIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: any
  ) {
    super(`HTTP ${status} ${statusText}`);
    this.name = 'APIError';
  }
}

export async function apiCall<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  // Read the response body once
  const text = await res.text();
  let body: any;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    throw new APIError(res.status, res.statusText, body);
  }

  return body;
}

export async function getJSON<T>(path: string): Promise<T> {
  return apiCall<T>(path, { method: 'GET' });
}

export async function postJSON<T>(
  path: string,
  data?: any
): Promise<T> {
  return apiCall<T>(path, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function putJSON<T>(
  path: string,
  data?: any
): Promise<T> {
  return apiCall<T>(path, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function deleteJSON<T>(path: string): Promise<T> {
  return apiCall<T>(path, { method: 'DELETE' });
}
