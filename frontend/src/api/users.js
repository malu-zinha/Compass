import { request } from './client';

export const getMe = () => request('/users/me');

export const updateMe = (data) => request('/users/me', { method: 'PATCH', body: data });

export const uploadAvatar = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return request('/users/me/avatar', { method: 'POST', formData });
};

export const getSettings = () => request('/users/me/settings');

export const updateSettings = (data) => request('/users/me/settings', { method: 'PATCH', body: data });
