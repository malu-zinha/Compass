import { request } from './client';

export const listQuestions = (positionId = null) => {
  const query = positionId != null ? `?position_id=${positionId}` : '';
  return request(`/questions${query}`);
};

export const createQuestion = (text, positionId = null) => request('/questions', {
  method: 'POST',
  body: { text, position_id: positionId },
});

export const updateQuestion = (id, text) => request(`/questions/${id}`, { method: 'PATCH', body: { text } });

export const deleteQuestion = (id) => request(`/questions/${id}`, { method: 'DELETE' });
