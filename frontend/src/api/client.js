import { API_URL } from './config';

let authToken = null;
let onUnauthorized = () => {};

export const setAuthToken = (token) => { authToken = token; };
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };
export const apiUrl = (path) => (path.startsWith('http') ? path : `${API_URL}${path}`);

export class ApiError extends Error {
  constructor(status, detail) { super(detail); this.status = status; this.detail = detail; }
}

const readDetail = (data) => {
  if (typeof data?.detail === 'string') return data.detail;
  if (Array.isArray(data?.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  return 'Erro inesperado. Tente novamente.';
};

export async function request(path, { method = 'GET', body, formData, signal } = {}) {
  const headers = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(apiUrl(path), {
      method, headers, signal, body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, `Não foi possível conectar ao servidor (${API_URL}).`);
  }
  if (response.status === 401 && authToken) onUnauthorized();
  if (!response.ok) throw new ApiError(response.status, readDetail(await response.json().catch(() => null)));
  return response.status === 204 ? null : response.json();
}
