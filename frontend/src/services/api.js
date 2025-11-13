// API Service - Centraliza todas as chamadas ao backend
const API_BASE_URL = 'http://localhost:8000';

// ============================================
// POSITIONS (Cargos)
// ============================================

export const createPosition = async (positionData) => {
  const response = await fetch(`${API_BASE_URL}/positions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      position: positionData.name,
      skills: positionData.competencies,
      description: positionData.description,
      vacancies: parseInt(positionData.vacancies) || 0
    }),
  });
  
  if (!response.ok) {
    throw new Error('Erro ao criar cargo');
  }
  
  return response.json();
};

export const getPositions = async (page = 1, perPage = 100) => {
  const response = await fetch(`${API_BASE_URL}/positions?page=${page}&per_page=${perPage}`);
  
  if (!response.ok) {
    throw new Error('Erro ao buscar cargos');
  }
  
  const data = await response.json();
  return data.positions.map(pos => ({
    id: pos.id,
    name: pos.position,
    description: pos.description,
    competencies: pos.skills,
    vacancies: pos.vacancies || 0
  }));
};

export const getPosition = async (positionId) => {
  const response = await fetch(`${API_BASE_URL}/positions/${positionId}`);
  
  if (!response.ok) {
    throw new Error('Erro ao buscar cargo');
  }
  
  const data = await response.json();
  return {
    id: data.id,
    name: data.position,
    description: data.description,
    competencies: data.skills,
    vacancies: data.vacancies || 0
  };
};

export const updatePosition = async (positionId, positionData) => {
  const response = await fetch(`${API_BASE_URL}/positions/${positionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      position: positionData.name,
      skills: positionData.competencies,
      description: positionData.description,
      vacancies: parseInt(positionData.vacancies) || 0
    }),
  });
  
  if (!response.ok) {
    throw new Error('Erro ao atualizar cargo');
  }
  
  return response.json();
};

export const deletePosition = async (positionId) => {
  const response = await fetch(`${API_BASE_URL}/positions/${positionId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Erro ao deletar cargo');
  }
  
  return response.json();
};

// ============================================
// INTERVIEWS (Entrevistas)
// ============================================

export const createCandidate = async (candidateData) => {
  const response = await fetch(`${API_BASE_URL}/positions/interviews/candidate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: candidateData.name,
      email: candidateData.email,
      number: candidateData.phone,
      notes: candidateData.notes || '',
      position_id: candidateData.position_id
    }),
  });
  
  if (!response.ok) {
    throw new Error('Erro ao criar candidato');
  }
  
  return response.json();
};

export const uploadAudioFile = async (interviewId, audioFile) => {
  const formData = new FormData();
  formData.append('audio', audioFile);
  
  const response = await fetch(`${API_BASE_URL}/positions/interviews/${interviewId}/audio-file`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Erro ao fazer upload do áudio');
  }
  
  return response.json();
};

export const transcribeAudioFile = async (interviewId) => {
  const response = await fetch(`${API_BASE_URL}/positions/interviews/${interviewId}/transcribe_audio_file`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error('Erro ao transcrever entrevista');
  }
  
  return response.json();
};

export const generateAnalysis = async (interviewId) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutos de timeout
  
  try {
    const response = await fetch(`${API_BASE_URL}/positions/interviews/${interviewId}/process/analysis`, {
      method: 'PATCH',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Erro ao gerar análise');
    }
    
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Timeout ao gerar análise. A análise pode estar demorando mais que o esperado.');
    }
    throw error;
  }
};

export const getInterviews = async (positionId = 0, page = 1, perPage = 100) => {
  const response = await fetch(`${API_BASE_URL}/positions/interviews/${positionId}?page=${page}&per_page=${perPage}`);
  
  if (!response.ok) {
    throw new Error('Erro ao buscar entrevistas');
  }
  
  const data = await response.json();
  return data.interviews;
};

export const getInterviewById = async (interviewId) => {
  const interviews = await getInterviews();
  const interview = interviews.find(i => i.id === parseInt(interviewId));
  
  if (!interview) {
    throw new Error('Entrevista não encontrada');
  }
  
  return interview;
};

export const deleteInterview = async (interviewId) => {
  const response = await fetch(`${API_BASE_URL}/positions/interviews/${interviewId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Erro ao deletar entrevista');
  }
  
  return response.json();
};

export const getAudioUrl = (interviewId) => {
  return `${API_BASE_URL}/positions/interviews/audio/${interviewId}`;
};

export const updateInterviewNotes = async (interviewId, notes) => {
  const response = await fetch(`${API_BASE_URL}/positions/interviews/${interviewId}/notes`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      notes: notes
    }),
  });
  
  if (!response.ok) {
    throw new Error('Erro ao atualizar anotações');
  }
  
  return response.json();
};

// ============================================
// QUESTIONS (Perguntas)
// ============================================

export const createQuestion = async (question, interviewId) => {
  const response = await fetch(`${API_BASE_URL}/positions/interviews/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question: question,
      interview_id: interviewId
    }),
  });
  
  if (!response.ok) {
    throw new Error('Erro ao criar pergunta');
  }
  
  return response.json();
};

export const getQuestions = async (interviewId) => {
  const response = await fetch(`${API_BASE_URL}/positions/interviews/${interviewId}/questions`);
  
  if (!response.ok) {
    throw new Error('Erro ao buscar perguntas');
  }
  
  return response.json();
};

export const deleteQuestion = async (questionId) => {
  const response = await fetch(`${API_BASE_URL}/positions/interviews/questions/${questionId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Erro ao deletar pergunta');
  }
  
  return response.json();
};

// ============================================
// GLOBAL QUESTIONS (Perguntas Gerais)
// ============================================

export const getGlobalQuestions = async (positionId = null) => {
  const url = positionId 
    ? `${API_BASE_URL}/questions?position_id=${positionId}`
    : `${API_BASE_URL}/questions`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Erro ao buscar perguntas');
  }
  
  const data = await response.json();
  return data.questions || [];
};

export const createGlobalQuestion = async (question, positionId = null) => {
  const response = await fetch(`${API_BASE_URL}/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question: question,
      position_id: positionId
    }),
  });
  
  if (!response.ok) {
    throw new Error('Erro ao criar pergunta');
  }
  
  return response.json();
};

export const deleteGlobalQuestion = async (questionId) => {
  const response = await fetch(`${API_BASE_URL}/questions/${questionId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Erro ao deletar pergunta');
  }
  
  return response.json();
};

// ============================================
// PROCESSO COMPLETO DE UPLOAD
// ============================================

export const processUploadedInterview = async (interviewId, onProgress) => {
  try {
    // 1. Transcrever áudio
    onProgress?.('Transcrevendo áudio (isso pode demorar)...');
    await transcribeAudioFile(interviewId);
    
    // 2. Gerar análise completa
    onProgress?.('Gerando análise completa...');
    await generateAnalysis(interviewId);
    
    onProgress?.('Processamento concluído!');
    
    return interviewId;
  } catch (error) {
    console.error('Erro no processamento:', error);
    throw error;
  }
};
