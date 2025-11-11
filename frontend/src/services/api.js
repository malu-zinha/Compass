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
      description: positionData.description
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
    vacancies: 0 // Backend não tem esse campo ainda
  }));
};

export const deletePosition = async (positionId) => {
  const response = await fetch(`${API_BASE_URL}/positions${positionId}`, {
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

export const uploadInterview = async (audioBlob, positionId) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'interview.webm');
  formData.append('position_id', positionId);
  
  const response = await fetch(`${API_BASE_URL}/positions/interviews/?position_id=${positionId}`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Erro ao fazer upload do áudio');
  }
  
  return response.json();
};

export const saveCandidateInfo = async (interviewId, candidateData) => {
  const response = await fetch(`${API_BASE_URL}/positions/interviews/${interviewId}/process/candidate`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: interviewId,
      name: candidateData.name,
      email: candidateData.email,
      number: candidateData.phone,
      notes: candidateData.notes
    }),
  });
  
  if (!response.ok) {
    throw new Error('Erro ao salvar informações do candidato');
  }
  
  return response.json();
};

export const transcribeInterview = async (interviewId) => {
  const response = await fetch(`${API_BASE_URL}/positions/interviews/${interviewId}/process/transcribe`, {
    method: 'PATCH',
  });
  
  if (!response.ok) {
    throw new Error('Erro ao transcrever entrevista');
  }
  
  return response.json();
};

export const labelTranscript = async (interviewId) => {
  const response = await fetch(`${API_BASE_URL}/positions/interviews/${interviewId}/process/lable-transcript`, {
    method: 'PATCH',
  });
  
  if (!response.ok) {
    throw new Error('Erro ao identificar speakers');
  }
  
  return response.json();
};

export const generateAnalysis = async (interviewId) => {
  const response = await fetch(`${API_BASE_URL}/positions/interviews/${interviewId}/process/generate_analysis`, {
    method: 'PATCH',
  });
  
  if (!response.ok) {
    throw new Error('Erro ao gerar análise');
  }
  
  return response.json();
};

export const getInterviews = async (positionId = 0, page = 1, perPage = 100) => {
  const response = await fetch(`${API_BASE_URL}/positions/interviews/${positionId}?page=${page}&per_page=${perPage}`);
  
  if (!response.ok) {
    throw new Error('Erro ao buscar entrevistas');
  }
  
  const data = await response.json();
  return data.interviews;
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

// ============================================
// PROCESSO COMPLETO DE ENTREVISTA
// ============================================

export const processCompleteInterview = async (audioBlob, candidateData, positionId, onProgress) => {
  try {
    // 1. Upload do áudio
    onProgress?.('Fazendo upload do áudio...');
    const uploadResult = await uploadInterview(audioBlob, positionId);
    const interviewId = uploadResult.id;
    
    // 2. Salvar dados do candidato
    onProgress?.('Salvando informações do candidato...');
    await saveCandidateInfo(interviewId, candidateData);
    
    // 3. Transcrever áudio
    onProgress?.('Transcrevendo áudio (isso pode demorar)...');
    await transcribeInterview(interviewId);
    
    // 4. Identificar speakers
    onProgress?.('Identificando quem está falando...');
    await labelTranscript(interviewId);
    
    // 5. Gerar análise completa
    onProgress?.('Gerando análise completa...');
    await generateAnalysis(interviewId);
    
    onProgress?.('Processamento concluído!');
    
    return interviewId;
  } catch (error) {
    console.error('Erro no processamento:', error);
    throw error;
  }
};
