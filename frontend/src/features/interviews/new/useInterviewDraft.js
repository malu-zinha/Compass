import { useState } from 'react';

const DRAFT_KEY = 'compass.interviewDraft';

function readDraft() {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function useInterviewDraft() {
  const [draft, setDraft] = useState(readDraft);

  const saveDraft = (data) => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    setDraft(data);
  };

  const clearDraft = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    setDraft(null);
  };

  return { draft, saveDraft, clearDraft };
}
