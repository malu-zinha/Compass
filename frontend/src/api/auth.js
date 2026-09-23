import { request } from './client';

export const register = ({ name, email, username, password }) => request('/auth/register', {
  method: 'POST',
  body: { name, email, username, password },
});

export const login = (username, password) => request('/auth/login', {
  method: 'POST',
  body: { username, password },
});
