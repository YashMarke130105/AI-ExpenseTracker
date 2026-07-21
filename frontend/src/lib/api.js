const TOKEN_KEY = "ledger_token";

// In dev, Vite's proxy forwards /api to the backend (see vite.config.js).
// In production, set VITE_API_BASE_URL if the frontend is served from a
// different origin than the API; otherwise this defaults to a relative
// path and assumes both are served behind the same host/reverse proxy.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export function getToken() {
  return getStore().getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) getStore().setItem(TOKEN_KEY, token);
  else getStore().removeItem(TOKEN_KEY);
}

// In-memory fallback store: artifacts/sandboxed preview environments can't use
// localStorage, but a real browser deployment of this app can. We use
// localStorage when available and quietly fall back to a module-level object
// otherwise, so the same code works in both contexts.
const memoryStore = { _data: {} };
function getStore() {
  try {
    window.localStorage.setItem("__ledger_probe__", "1");
    window.localStorage.removeItem("__ledger_probe__");
    return window.localStorage;
  } catch {
    return {
      getItem: (k) => memoryStore._data[k] ?? null,
      setItem: (k, v) => {
        memoryStore._data[k] = v;
      },
      removeItem: (k) => {
        delete memoryStore._data[k];
      },
    };
  }
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers,
      body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // no body / non-JSON response
  }

  if (!res.ok) {
    throw new ApiError(payload?.message || payload?.error || `Request failed (${res.status})`, res.status);
  }
  if (payload && payload.success === false) {
    throw new ApiError(payload.error || "Request failed", res.status);
  }

  return payload?.data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
  postForm: (path, formData) => request(path, { method: "POST", body: formData, isForm: true }),
};

export { ApiError };
