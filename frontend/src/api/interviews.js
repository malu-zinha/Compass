import { WS_URL } from './config';
import { apiUrl, request } from './client';

export const createInterview = (data) => request('/interviews', { method: 'POST', body: data });

export const listInterviews = ({ positionId, status, sort, page = 1, perPage = 20 } = {}) => {
  const params = new URLSearchParams();
  if (positionId != null) params.set('position_id', positionId);
  if (status != null) {
    if (Array.isArray(status)) status.forEach((s) => params.append('status', s));
    else params.append('status', status);
  }
  if (sort != null) params.set('sort', sort);
  params.set('page', String(page));
  params.set('per_page', String(perPage));
  return request(`/interviews?${params.toString()}`);
};

export const getInterview = (id) => request(`/interviews/${id}`);

export const updateInterview = (id, data) => request(`/interviews/${id}`, { method: 'PATCH', body: data });

export const deleteInterview = (id) => request(`/interviews/${id}`, { method: 'DELETE' });

export const uploadInterviewAudio = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return request(`/interviews/${id}/audio`, { method: 'POST', formData });
};

export const getAudioUrl = async (id) => {
  const data = await request(`/interviews/${id}/audio-url`);
  return { ...data, url: apiUrl(data.url) };
};

export const reprocessInterview = (id, step) => request(`/interviews/${id}/reprocess`, {
  method: 'POST',
  body: { step },
});

export const listInterviewQuestions = (id) => request(`/interviews/${id}/questions`);

export const setQuestionAsked = (id, qid, asked) => request(`/interviews/${id}/questions/${qid}`, {
  method: 'PATCH',
  body: { asked },
});

export const liveSocketUrl = (id) => `${WS_URL}/interviews/${id}/live`;
