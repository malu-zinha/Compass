import { request } from './client';

export const compareInterviews = (ids) => request('/comparisons', {
  method: 'POST',
  body: { interview_ids: ids },
});
