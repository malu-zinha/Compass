import { request } from './client';

export const listPositions = ({ page = 1, perPage = 100 } = {}) => {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  return request(`/positions?${params.toString()}`);
};

export const getPosition = (id) => request(`/positions/${id}`);

export const createPosition = (data) => request('/positions', { method: 'POST', body: data });

export const updatePosition = (id, data) => request(`/positions/${id}`, { method: 'PATCH', body: data });

export const deletePosition = (id) => request(`/positions/${id}`, { method: 'DELETE' });
